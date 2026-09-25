"""Tests for POST /extract — Phase 4 real implementation.

Strategy:
  - Mock _Extractor.extract (GeminiExtractor) to avoid hitting the real API in tests.
  - Test: successful extraction → 200 with correct fields.
  - Test: extractor raises → 200 with all-null (graceful degradation).
  - Test: uploaded file is saved to uploads/ directory.
"""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.schemas import ExtractResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # minimal fake PNG bytes


def _upload(client: TestClient, data: bytes = _FAKE_PNG, filename: str = "photo.jpg"):
    return client.post(
        "/extract",
        files={"image": (filename, io.BytesIO(data), "image/jpeg")},
    )


_POPULATED = ExtractResponse(
    item="Amul Taaza Milk",
    price=60.0,
    quantity=1.0,
    category="Groceries",
    expiry_date="2026-10-01",
    purchase_date="2026-09-20",
    confidence=0.92,
)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_extract_returns_200_with_fields(client: TestClient, tmp_path, monkeypatch) -> None:
    """Successful extraction → 200 with populated fields."""
    monkeypatch.setattr(
        "app.routers.extract._UPLOADS_DIR", tmp_path
    )
    with patch(
        "app.routers.extract._Extractor.extract",
        new=AsyncMock(return_value=_POPULATED),
    ):
        resp = _upload(client)

    assert resp.status_code == 200
    data = resp.json()
    assert data["item"] == "Amul Taaza Milk"
    assert data["price"] == pytest.approx(60.0)
    assert data["quantity"] == pytest.approx(1.0)
    assert data["category"] == "Groceries"
    assert data["expiry_date"] == "2026-10-01"
    assert data["purchase_date"] == "2026-09-20"
    assert data["confidence"] == pytest.approx(0.92)


def test_extract_graceful_degradation_on_error(client: TestClient, tmp_path, monkeypatch) -> None:
    """If the extractor raises, endpoint returns 200 with all-null fields."""
    monkeypatch.setattr("app.routers.extract._UPLOADS_DIR", tmp_path)
    with patch(
        "app.routers.extract._Extractor.extract",
        new=AsyncMock(side_effect=RuntimeError("Gemini API unreachable")),
    ):
        resp = _upload(client)

    assert resp.status_code == 200
    data = resp.json()
    assert data["item"] is None
    assert data["price"] is None
    assert data["confidence"] is None


def test_extract_saves_upload_to_disk(client: TestClient, tmp_path, monkeypatch) -> None:
    """The uploaded image must be persisted to the uploads directory."""
    monkeypatch.setattr("app.routers.extract._UPLOADS_DIR", tmp_path)
    with patch(
        "app.routers.extract._Extractor.extract",
        new=AsyncMock(return_value=ExtractResponse()),
    ):
        _upload(client, data=b"fake image bytes")

    saved_files = list(tmp_path.glob("*.jpg"))
    assert len(saved_files) == 1, f"Expected 1 saved file, got {saved_files}"
    assert saved_files[0].read_bytes() == b"fake image bytes"


def test_extract_no_api_key_returns_all_null(client: TestClient, tmp_path, monkeypatch) -> None:
    """When GROQ_API_KEY is not set, extractor returns all-null (no crash)."""
    monkeypatch.setattr("app.routers.extract._UPLOADS_DIR", tmp_path)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    # Do NOT mock the extractor — exercise the real no-key path
    resp = _upload(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["item"] is None
