"""Tests for /stats/* endpoints."""

from fastapi.testclient import TestClient


def _add(client: TestClient, price_paise: int, purchase_date: str, category_id: int | None = None) -> None:
    payload = {
        "item": "item",
        "price_paise": price_paise,
        "source": "manual",
        "purchase_date": purchase_date,
    }
    if category_id:
        payload["category_id"] = category_id
    r = client.post("/expenses", json=payload)
    assert r.status_code == 201, r.text


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


def test_summary_empty_month(client: TestClient) -> None:
    response = client.get("/stats/summary?month=2020-01")
    assert response.status_code == 200
    data = response.json()
    assert data["total_paise"] == 0
    assert data["item_count"] == 0
    assert data["vs_last_month_paise"] == 0


def test_summary_correct_totals(client: TestClient) -> None:
    _add(client, 10000, "2026-09-05T10:00:00")
    _add(client, 5000,  "2026-09-20T10:00:00")
    _add(client, 2000,  "2026-08-15T10:00:00")  # different month — excluded

    response = client.get("/stats/summary?month=2026-09")
    data = response.json()
    assert data["total_paise"] == 15000
    assert data["item_count"] == 2


def test_summary_vs_last_month(client: TestClient) -> None:
    _add(client, 10000, "2026-09-05T10:00:00")
    _add(client, 6000,  "2026-08-10T10:00:00")

    response = client.get("/stats/summary?month=2026-09")
    data = response.json()
    # Sep=10000, Aug=6000 → delta = +4000
    assert data["vs_last_month_paise"] == 4000


def test_summary_invalid_month_format(client: TestClient) -> None:
    response = client.get("/stats/summary?month=September")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# By-category
# ---------------------------------------------------------------------------


def test_by_category_grouping(client: TestClient) -> None:
    cats = client.get("/categories").json()
    groceries_id = next(c["id"] for c in cats if c["name"] == "Groceries")
    dining_id = next(c["id"] for c in cats if c["name"] == "Dining")

    _add(client, 5000,  "2026-09-01T10:00:00", category_id=groceries_id)
    _add(client, 3000,  "2026-09-01T10:00:00", category_id=groceries_id)
    _add(client, 8000,  "2026-09-01T10:00:00", category_id=dining_id)

    response = client.get("/stats/by-category?month=2026-09")
    assert response.status_code == 200
    data = {row["category_name"]: row["total_paise"] for row in response.json()}
    assert data["Groceries"] == 8000
    assert data["Dining"] == 8000


def test_by_category_empty_month(client: TestClient) -> None:
    response = client.get("/stats/by-category?month=2020-01")
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Trend
# ---------------------------------------------------------------------------


def test_trend_daily_returns_list(client: TestClient) -> None:
    _add(client, 1000, "2026-09-18T10:00:00")
    response = client.get("/stats/trend?range=30d")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert "date" in data[0]
        assert "total_paise" in data[0]


def test_trend_weekly_returns_list(client: TestClient) -> None:
    _add(client, 2000, "2026-09-10T10:00:00")
    response = client.get("/stats/trend?range=12w")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_trend_invalid_range(client: TestClient) -> None:
    response = client.get("/stats/trend?range=bad")
    assert response.status_code == 422
