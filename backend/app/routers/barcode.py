"""Barcode decode router — POST /barcode/decode.

Accepts a camera-frame image (JPEG/PNG), decodes the barcode on the server
using pyzbar + Pillow, then looks up the product via Open Food Facts.

Response codes:
  200  barcode decoded (name/brand/category may be null if OFf has no record)
  404  no barcode found in the image — client should try the next frame
"""

from __future__ import annotations

import io
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image
from pyzbar.pyzbar import decode as pyzbar_decode
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import BarcodeLookupResponse
from app.services.off import lookup_barcode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/barcode", tags=["barcode"])


def _decode_barcode_from_bytes(image_bytes: bytes) -> str | None:
    """Decode the first barcode found in image_bytes using pyzbar.

    Converts raw bytes -> PIL Image -> pyzbar decode.
    Returns the barcode text (the sequence number passed to OFf), or None
    if no barcode is found or the image cannot be read.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = pyzbar_decode(img)
        if not results:
            return None
        return results[0].data.decode("utf-8")
    except Exception as exc:
        logger.warning("Barcode decode error: %s", exc)
        return None


@router.post("/decode", response_model=BarcodeLookupResponse)
async def decode_barcode_image(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> BarcodeLookupResponse:
    """Decode a barcode from an uploaded camera frame and look up the product.

    Steps:
      1. Decode the barcode sequence number from the image bytes using pyzbar.
      2. Pass the sequence number to lookup_barcode() (OFf, cache-first).
      3. Return BarcodeLookupResponse:
           - barcode is always set to the decoded sequence number
           - name/brand/category are null if OFf has no record for the barcode
      4. Return 404 if no barcode could be found in the image.

    The client should retry with the next frame on 404.
    Saving an expense always goes through POST /expenses after user review.
    """
    image_bytes = await image.read()

    barcode_text = _decode_barcode_from_bytes(image_bytes)
    if barcode_text is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No barcode found in image.",
        )

    logger.info("Decoded barcode sequence number: %s", barcode_text)

    result = await lookup_barcode(barcode_text, db)

    if result is not None:
        return result

    return BarcodeLookupResponse(
        barcode=barcode_text,
        name=None,
        brand=None,
        category=None,
    )
