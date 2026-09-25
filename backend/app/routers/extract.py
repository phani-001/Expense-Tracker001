"""Extract router — POST /extract.

Phase 4: vision extraction via the active extractor provider.
  1. Read uploaded image bytes.
  2. Save a copy to backend/uploads/ (timestamped).
  3. Call _Extractor.extract(image_bytes).
  4. Return ExtractResponse — NEVER saves an expense.

Graceful degradation: any extraction error returns all-null ExtractResponse
instead of a 500, because the user can always fill in the form manually.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from app.schemas import ExtractResponse

from app.services.extractor.gemini import GeminiExtractor as _Extractor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/extract", tags=["extract"])

# Uploads directory lives next to the backend package root
_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def _ensure_uploads_dir() -> Path:
    _UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return _UPLOADS_DIR


def _save_upload(image_bytes: bytes, content_type: str) -> str:
    """Save image bytes to uploads/ and return the relative path."""
    ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = _ensure_uploads_dir() / filename
    dest.write_bytes(image_bytes)
    logger.debug("Saved upload: %s (%d bytes)", dest, len(image_bytes))
    return f"uploads/{filename}"


@router.post("", response_model=ExtractResponse)
async def extract_image(image: UploadFile = File(...)) -> ExtractResponse:
    """Extract expense fields from an uploaded image via the active vision provider.

    Always returns 200. Unknown fields are null — never guessed.
    Saving an expense always goes through POST /expenses after user review.
    """
    image_bytes = await image.read()
    content_type = image.content_type or "image/jpeg"

    # Save the original upload (Phase 5 can surface this in the UI)
    try:
        _save_upload(image_bytes, content_type)
    except OSError as exc:
        logger.warning("Could not save upload: %s", exc)

    # Extract — degrade gracefully on any error
    try:
        extractor = _Extractor()
        return await extractor.extract(image_bytes)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Extraction failed, returning null prefill: %s", exc)
        return ExtractResponse()
