"""Tests for POST /api/scan/barcode endpoint using zxingcpp."""

from __future__ import annotations

import io
from unittest.mock import patch

import cv2
import numpy as np
import pytest
import zxingcpp
from fastapi.testclient import TestClient


def _make_valid_barcode_jpeg(code: str = "8901030000003") -> bytes:
    """Generate a clean EAN-13 barcode image in JPEG format using zxingcpp."""
    bc = zxingcpp.create_barcode(code, zxingcpp.BarcodeFormat.EAN13)
    img = zxingcpp.write_barcode_to_image(bc)
    _, encoded = cv2.imencode(".jpg", np.array(img))
    return encoded.tobytes()


def _make_blank_jpeg() -> bytes:
    """Generate a plain white JPEG image with no barcode."""
    blank = np.full((200, 200, 3), 255, dtype=np.uint8)
    _, encoded = cv2.imencode(".jpg", blank)
    return encoded.tobytes()


def test_scan_barcode_valid_image(client: TestClient) -> None:
    """A valid barcode image is decoded and product details are returned."""
    jpeg_bytes = _make_valid_barcode_jpeg("8901030000003")

    mock_product = {
        "name": "Tata Tea Gold",
        "brand": "Tata Tea",
        "category": "Beverages",
        "quantity": 500.0,
    }

    with patch("app.routers.scan._lookup_product", return_value=mock_product):
        resp = client.post(
            "/api/scan/barcode",
            files={"image": ("barcode.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    assert data["barcode"] == "8901030000003"
    assert len(data["barcodes"]) >= 1
    assert data["barcodes"][0]["text"] == "8901030000003"
    assert data["barcodes"][0]["format"] == "EAN13"
    assert data["name"] == "Tata Tea Gold"
    assert data["brand"] == "Tata Tea"
    assert data["category"] == "Beverages"
    assert data["quantity"] == pytest.approx(500.0)


def test_scan_barcode_blank_image(client: TestClient) -> None:
    """A blank image returns found=False with empty barcodes list and null fields."""
    blank_bytes = _make_blank_jpeg()

    resp = client.post(
        "/api/scan/barcode",
        files={"image": ("blank.jpg", io.BytesIO(blank_bytes), "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is False
    assert data["barcodes"] == []
    assert data["barcode"] is None
    assert data["name"] is None


def test_scan_barcode_invalid_file(client: TestClient) -> None:
    """An invalid/corrupt file returns found=False gracefully without a 500 error."""
    corrupt_bytes = b"not a real image at all, just corrupt binary data"

    resp = client.post(
        "/api/scan/barcode",
        files={"image": ("corrupt.bin", io.BytesIO(corrupt_bytes), "application/octet-stream")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is False
    assert data["barcodes"] == []
    assert data["barcode"] is None


def test_scan_barcode_off_miss(client: TestClient) -> None:
    """When a barcode is found but not in Open Food Facts, barcode is preserved."""
    jpeg_bytes = _make_valid_barcode_jpeg("8901030000003")

    mock_empty = {
        "name": None,
        "brand": None,
        "category": None,
        "quantity": None,
    }

    with patch("app.routers.scan._lookup_product", return_value=mock_empty):
        resp = client.post(
            "/api/scan/barcode",
            files={"image": ("barcode.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is True
    assert data["barcode"] == "8901030000003"
    assert data["name"] is None
