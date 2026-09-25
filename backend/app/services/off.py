"""Open Food Facts barcode lookup service — Phase 3 full implementation.

Strategy:
  1. Check barcode_cache. If hit and < 24 hours old, return cached result.
  2. Otherwise, call the OFf API v2.
  3. Write result to cache (even if product not found, to avoid hammering).
  4. Return result or None.

Never raises — all errors are caught and None is returned.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from app.models import BarcodeCache
from app.schemas import BarcodeLookupResponse

logger = logging.getLogger(__name__)

_OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
_CACHE_TTL = timedelta(hours=24)
_TIMEOUT = 8.0  # seconds


def _is_fresh(fetched_at: datetime) -> bool:
    """Return True if the cache entry is younger than TTL."""
    age = datetime.now(UTC).replace(tzinfo=None) - fetched_at
    return age < _CACHE_TTL


def _read_cache(db: Session, barcode: str) -> BarcodeLookupResponse | None:
    """Return a cached result if it exists and is still fresh."""
    entry: BarcodeCache | None = db.get(BarcodeCache, barcode)
    if entry and _is_fresh(entry.fetched_at):
        logger.debug("Cache HIT for barcode %s", barcode)
        return BarcodeLookupResponse(
            barcode=entry.barcode,
            name=entry.name,
            brand=entry.brand,
            category=entry.category,
        )
    return None


def _write_cache(
    db: Session,
    barcode: str,
    result: BarcodeLookupResponse | None,
) -> None:
    """Upsert cache entry (write even on miss to rate-limit repeated lookups)."""
    entry = db.get(BarcodeCache, barcode)
    now = datetime.now(UTC).replace(tzinfo=None)
    if entry:
        entry.name = result.name if result else None
        entry.brand = result.brand if result else None
        entry.category = result.category if result else None
        entry.fetched_at = now
    else:
        db.add(
            BarcodeCache(
                barcode=barcode,
                name=result.name if result else None,
                brand=result.brand if result else None,
                category=result.category if result else None,
                fetched_at=now,
            )
        )
    db.commit()


def _parse_off_response(barcode: str, data: dict) -> BarcodeLookupResponse | None:
    """Parse Open Food Facts v2 API response into our schema."""
    if data.get("status") != 1:
        return None  # product not found in OFf

    product = data.get("product", {})
    name: str | None = product.get("product_name") or None
    brand: str | None = product.get("brands") or None

    # categories_tags looks like ["en:beverages", "en:sodas"]
    raw_cats: list[str] = product.get("categories_tags", [])
    category: str | None = None
    if raw_cats:
        # Take the most specific (last) English tag, strip "en:" prefix
        en_cats = [c for c in raw_cats if c.startswith("en:")]
        if en_cats:
            category = en_cats[-1].replace("en:", "").replace("-", " ").title()

    # A product with no name is not useful
    if not name:
        return None

    return BarcodeLookupResponse(
        barcode=barcode,
        name=name.strip(),
        brand=brand.strip() if brand else None,
        category=category,
    )


async def lookup_barcode(
    barcode: str, db: Session
) -> BarcodeLookupResponse | None:
    """Look up a barcode — cache first, then Open Food Facts.

    Returns None if the product is not found or on any error.
    """
    # 1. Cache check
    cached = _read_cache(db, barcode)
    if cached is not None:
        return cached

    # 2. Fetch from Open Food Facts
    logger.info("Fetching OFf for barcode %s", barcode)
    result: BarcodeLookupResponse | None = None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                _OFF_URL.format(barcode=barcode),
                headers={"User-Agent": "SpendSense/1.0 (expense tracker)"},
            )
            resp.raise_for_status()
            result = _parse_off_response(barcode, resp.json())
    except httpx.HTTPStatusError as exc:
        logger.warning("OFf HTTP %s for barcode %s", exc.response.status_code, barcode)
    except httpx.RequestError as exc:
        logger.warning("OFf network error for barcode %s: %s", barcode, exc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Unexpected OFf error for barcode %s: %s", barcode, exc)

    # 3. Write to cache (even None — avoids repeated failed fetches)
    try:
        _write_cache(db, barcode, result)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cache write failed for barcode %s: %s", barcode, exc)

    return result
