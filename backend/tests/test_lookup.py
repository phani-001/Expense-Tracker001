"""Tests for GET /lookup/{barcode} — Phase 3 real implementation.

All OFf HTTP calls are mocked via unittest.mock.patch so tests never
hit the real internet.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _off_hit(name: str, brand: str, category_tag: str) -> dict:
    """Minimal OFf v2 response for a found product."""
    return {
        "status": 1,
        "product": {
            "product_name": name,
            "brands": brand,
            "categories_tags": [f"en:{category_tag}"],
        },
    }


def _off_miss() -> dict:
    """OFf v2 response for a not-found product."""
    return {"status": 0}


# ---------------------------------------------------------------------------
# Found product
# ---------------------------------------------------------------------------


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_known_barcode_returns_200(mock_client_cls, client: TestClient) -> None:
    """A barcode found in OFf returns 200 with correct fields."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = _off_hit("Amul Butter", "Amul", "dairy-products")

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(return_value=mock_resp)
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    response = client.get("/lookup/8901058851626")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Amul Butter"
    assert data["brand"] == "Amul"
    assert data["barcode"] == "8901058851626"
    assert data["category"] is not None


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_returns_name_brand_category(mock_client_cls, client: TestClient) -> None:
    """Response shape has all expected fields."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = _off_hit("Maggi Noodles", "Nestlé", "instant-noodles")

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(return_value=mock_resp)
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    response = client.get("/lookup/8901058000000")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "brand" in data
    assert "category" in data
    assert "barcode" in data


# ---------------------------------------------------------------------------
# Unknown / not-found product
# ---------------------------------------------------------------------------


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_unknown_barcode_returns_404(mock_client_cls, client: TestClient) -> None:
    """A barcode not in OFf returns 404."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = _off_miss()

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(return_value=mock_resp)
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    response = client.get("/lookup/0000000000000")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Network error → graceful 404
# ---------------------------------------------------------------------------


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_network_error_returns_404(mock_client_cls, client: TestClient) -> None:
    """A network failure is swallowed and returns 404 (never 500)."""
    import httpx as _httpx

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(
        side_effect=_httpx.RequestError("connection refused", request=MagicMock())
    )
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    response = client.get("/lookup/9999999999999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Cache hit — OFf must NOT be called a second time
# ---------------------------------------------------------------------------


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_cache_hit_skips_network(mock_client_cls, client: TestClient) -> None:
    """Second lookup for same barcode is served from cache without a network call."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = _off_hit("Parle-G", "Parle", "biscuits")

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(return_value=mock_resp)
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    barcode = "8901719110091"

    # First call — hits network
    r1 = client.get(f"/lookup/{barcode}")
    assert r1.status_code == 200

    # Second call — must use cache (network mock not called again)
    r2 = client.get(f"/lookup/{barcode}")
    assert r2.status_code == 200

    # AsyncClient.get should have been called exactly once total
    assert mock_aclient.get.call_count == 1


# ---------------------------------------------------------------------------
# Product with no name → 404
# ---------------------------------------------------------------------------


@patch("app.services.off.httpx.AsyncClient")
def test_lookup_product_without_name_returns_404(mock_client_cls, client: TestClient) -> None:
    """OFf products with no product_name are treated as not found."""
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "status": 1,
        "product": {"product_name": "", "brands": "Unknown"},
    }

    mock_aclient = AsyncMock()
    mock_aclient.get = AsyncMock(return_value=mock_resp)
    mock_aclient.__aenter__ = AsyncMock(return_value=mock_aclient)
    mock_aclient.__aexit__ = AsyncMock(return_value=False)
    mock_client_cls.return_value = mock_aclient

    response = client.get("/lookup/1111111111111")
    assert response.status_code == 404
