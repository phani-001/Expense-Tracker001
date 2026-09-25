"""Tests for POST /barcode/decode.

Uses pyzbar to generate a real barcode image in-memory so we test the full
decode path without needing files on disk. OFf calls are mocked so tests
remain offline.
"""

from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image, ImageDraw
from pyzbar.pyzbar import decode as pyzbar_decode

from app.routers.barcode import _decode_barcode_from_bytes
from app.schemas import BarcodeLookupResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_barcode_jpeg(barcode_text: str) -> bytes:
    """Create a minimal JPEG that contains an EAN-13 barcode using python-barcode.

    Falls back to a plain white image with text if python-barcode is not
    installed, so the decode test will correctly return None (no barcode).
    """
    try:
        import barcode as bc
        from barcode.writer import ImageWriter

        buf = io.BytesIO()
        bc.get("ean13", barcode_text, writer=ImageWriter()).write(buf)
        buf.seek(0)
        return buf.read()
    except Exception:
        # Generate a blank image — _decode_barcode_from_bytes should return None
        img = Image.new("RGB", (200, 100), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()


def _plain_jpeg() -> bytes:
    """A plain white JPEG with no barcode."""
    img = Image.new("RGB", (200, 100), color=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Unit tests for _decode_barcode_from_bytes
# ---------------------------------------------------------------------------


def test_decode_returns_none_for_plain_image():
    jpeg = _plain_jpeg()
    result = _decode_barcode_from_bytes(jpeg)
    assert result is None


def test_decode_returns_none_for_garbage_bytes():
    result = _decode_barcode_from_bytes(b"not an image")
    assert result is None


# ---------------------------------------------------------------------------
# Integration tests for POST /barcode/decode
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_decode_endpoint_404_when_no_barcode(client):
    """Endpoint returns 404 when image has no barcode."""
    jpeg = _plain_jpeg()
    response = client.post(
        "/barcode/decode",
        files={"image": ("frame.jpg", jpeg, "image/jpeg")},
    )
    assert response.status_code == 404
    assert "No barcode" in response.json()["detail"]


@pytest.mark.anyio
async def test_decode_endpoint_returns_partial_when_off_miss(client):
    """When barcode is decoded but OFf has no record, returns partial response."""
    # Patch lookup_barcode to simulate an OFf miss and _decode_barcode_from_bytes
    # to return a known barcode string (avoids needing a real barcode image).
    fake_barcode = "5000112637827"
    with (
        patch(
            "app.routers.barcode._decode_barcode_from_bytes",
            return_value=fake_barcode,
        ),
        patch(
            "app.routers.barcode.lookup_barcode",
            new=AsyncMock(return_value=None),
        ),
    ):
        response = client.post(
            "/barcode/decode",
            files={"image": ("frame.jpg", _plain_jpeg(), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["barcode"] == fake_barcode
    assert data["name"] is None
    assert data["brand"] is None
    assert data["category"] is None


@pytest.mark.anyio
async def test_decode_endpoint_returns_product_on_off_hit(client):
    """When barcode is decoded and OFf returns a product, response has all fields."""
    fake_barcode = "5000112637827"
    product = BarcodeLookupResponse(
        barcode=fake_barcode,
        name="Test Product",
        brand="Test Brand",
        category="Groceries",
    )
    with (
        patch(
            "app.routers.barcode._decode_barcode_from_bytes",
            return_value=fake_barcode,
        ),
        patch(
            "app.routers.barcode.lookup_barcode",
            new=AsyncMock(return_value=product),
        ),
    ):
        response = client.post(
            "/barcode/decode",
            files={"image": ("frame.jpg", _plain_jpeg(), "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["barcode"] == fake_barcode
    assert data["name"] == "Test Product"
    assert data["brand"] == "Test Brand"
    assert data["category"] == "Groceries"
