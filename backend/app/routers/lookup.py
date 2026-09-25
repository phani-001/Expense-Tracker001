"""Lookup router — GET /lookup/{barcode}.

Phase 3: Real Open Food Facts integration with 24-hour SQLite cache.
Returns 200 on hit, 404 if product not found, 504 on network failure.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import BarcodeLookupResponse
from app.services.off import lookup_barcode

router = APIRouter(prefix="/lookup", tags=["lookup"])


@router.get("/{barcode}", response_model=BarcodeLookupResponse)
async def lookup_barcode_route(
    barcode: str, db: Session = Depends(get_db)
) -> BarcodeLookupResponse:
    """Look up a barcode via Open Food Facts (cached 24h).

    - 200: product found (name always present; brand/category may be null)
    - 404: barcode unknown or OFf has no record
    """
    result = await lookup_barcode(barcode, db)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found for barcode {barcode!r}.",
        )
    return result
