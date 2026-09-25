"""Barcode scan and product lookup router — POST /api/scan/barcode.

Decodes barcodes from an uploaded image using zxing-cpp (zxingcpp) with OpenCV
preprocessing and fallbacks (center crop, grayscale, and 2x upscale), then retrieves
product details from Open Food Facts API for EAN/UPC barcodes.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

import cv2
import numpy as np
import requests
import zxingcpp
from fastapi import APIRouter, File, UploadFile

from app.schemas import BarcodeItem, BarcodeScanResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scan", tags=["scan"])

_OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
_OFF_TIMEOUT = 5.0  # seconds


def _decode_barcodes_with_fallbacks(file_bytes: bytes) -> list[BarcodeItem]:
    """Decode barcodes using zxingcpp with OpenCV multi-stage fallbacks.

    1. Original color image (cv2.IMREAD_COLOR) with zxingcpp.read_barcodes(img)
    2. Center crop (where camera viewfinder is aligned)
    3. Grayscale conversion
    4. 2x upscaled grayscale image (INTER_CUBIC)
    """
    if not file_bytes:
        return []

    try:
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as exc:
        logger.warning("Failed to decode image bytes: %s", exc)
        return []

    if img is None or img.size == 0:
        return []

    # 1. Primary attempt: original image (matches user's exact snippet)
    try:
        results = zxingcpp.read_barcodes(img)
    except Exception as exc:
        logger.warning("zxingcpp direct decode error: %s", exc)
        results = []

    # 2. Fallback attempt 1: center crop (camera viewfinder target area)
    if not results:
        try:
            h, w = img.shape[:2]
            if h > 100 and w > 100:
                center = img[int(h * 0.15) : int(h * 0.85), int(w * 0.15) : int(w * 0.85)]
                results = zxingcpp.read_barcodes(center)
        except Exception as exc:
            logger.warning("zxingcpp center crop decode error: %s", exc)

    # 3. Fallback attempt 2: grayscale
    gray = None
    if not results:
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            results = zxingcpp.read_barcodes(gray)
        except Exception as exc:
            logger.warning("zxingcpp grayscale decode error: %s", exc)

    # 4. Fallback attempt 3: 2x upscaled image
    if not results:
        try:
            target = gray if gray is not None else img
            upscaled = cv2.resize(
                target, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC
            )
            results = zxingcpp.read_barcodes(upscaled)
        except Exception as exc:
            logger.warning("zxingcpp 2x upscaled decode error: %s", exc)

    items: list[BarcodeItem] = []
    for r in results:
        # text is strictly kept as a string to preserve leading zeros
        items.append(BarcodeItem(format=r.format.name, text=str(r.text)))

    return items


def _parse_quantity(product_data: dict[str, Any]) -> float | None:
    """Extract numeric quantity from OFf product details."""
    pq = product_data.get("product_quantity")
    if pq is not None:
        try:
            return float(pq)
        except (ValueError, TypeError):
            pass

    raw = product_data.get("quantity")
    if raw and isinstance(raw, str):
        match = re.search(r"(\d+(?:\.\d+)?)", raw)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, TypeError):
                pass
    return None


def _lookup_product(barcode_str: str) -> dict[str, Any]:
    """Query Open Food Facts for EAN/UPC product info with a 5s timeout."""
    details: dict[str, Any] = {
        "name": None,
        "brand": None,
        "category": None,
        "quantity": None,
    }

    try:
        url = _OFF_URL.format(barcode=barcode_str)
        resp = requests.get(
            url,
            headers={"User-Agent": "SpendSense/1.0 (expense tracker)"},
            timeout=_OFF_TIMEOUT,
        )
        if resp.status_code != 200:
            return details

        data = resp.json()
        if data.get("status") != 1:
            return details

        product = data.get("product", {})
        name = product.get("product_name") or None
        brand = product.get("brands") or None
        quantity = _parse_quantity(product)

        # Parse category tags
        raw_cats = product.get("categories_tags", [])
        category = None
        if raw_cats:
            en_cats = [c for c in raw_cats if c.startswith("en:")]
            if en_cats:
                category = en_cats[-1].replace("en:", "").replace("-", " ").title()

        details["name"] = name.strip() if name else None
        details["brand"] = brand.strip() if brand else None
        details["category"] = category
        details["quantity"] = quantity
    except Exception as exc:
        logger.warning("OFf lookup failed for %s: %s", barcode_str, exc)

    return details


@router.post("/barcode", response_model=BarcodeScanResponse)
async def scan_barcode_endpoint(
    image: UploadFile = File(...),
) -> BarcodeScanResponse:
    """Scan and decode barcode from uploaded image, then lookup product."""
    file_bytes = await image.read()
    barcodes = _decode_barcodes_with_fallbacks(file_bytes)

    if not barcodes:
        return BarcodeScanResponse(
            found=False,
            barcodes=[],
            barcode=None,
            name=None,
            brand=None,
            category=None,
            quantity=None,
        )

    primary_barcode = barcodes[0]
    barcode_text = primary_barcode.text

    # Lookup product details in a worker thread so event loop is not blocked
    product_details = await asyncio.to_thread(_lookup_product, barcode_text)

    return BarcodeScanResponse(
        found=True,
        barcodes=barcodes,
        barcode=barcode_text,
        name=product_details.get("name"),
        brand=product_details.get("brand"),
        category=product_details.get("category"),
        quantity=product_details.get("quantity"),
    )
