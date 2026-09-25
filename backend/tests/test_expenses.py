"""Tests for the expenses router."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_expense(
    client: TestClient,
    item: str = "Milk",
    price_paise: int = 6000,
    source: str = "manual",
    purchase_date: str | None = None,
    category_id: int | None = None,
    expiry_date: str | None = None,
    notes: str | None = None,
) -> dict:
    payload: dict = {
        "item": item,
        "price_paise": price_paise,
        "source": source,
    }
    if purchase_date:
        payload["purchase_date"] = purchase_date
    if category_id:
        payload["category_id"] = category_id
    if expiry_date:
        payload["expiry_date"] = expiry_date
    if notes:
        payload["notes"] = notes
    response = client.post("/expenses", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# ---------------------------------------------------------------------------
# Create & read
# ---------------------------------------------------------------------------


def test_create_and_read_expense(client: TestClient) -> None:
    expense = _make_expense(client, item="Bread", price_paise=4500)
    response = client.get("/expenses")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    ids = [e["id"] for e in data["items"]]
    assert expense["id"] in ids


def test_create_expense_returns_correct_fields(client: TestClient) -> None:
    expense = _make_expense(client, item="Eggs", price_paise=9000, source="scan")
    assert expense["item"] == "Eggs"
    assert expense["price_paise"] == 9000
    assert expense["source"] == "scan"
    assert "id" in expense
    assert "created_at" in expense


def test_create_expense_with_zero_price(client: TestClient) -> None:
    expense = _make_expense(client, price_paise=0)
    assert expense["price_paise"] == 0


def test_create_expense_negative_price_rejected(client: TestClient) -> None:
    response = client.post(
        "/expenses", json={"item": "Bad", "price_paise": -1, "source": "manual"}
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# List with filters & pagination
# ---------------------------------------------------------------------------


def test_list_expenses_month_filter(client: TestClient) -> None:
    _make_expense(client, item="Sep item", purchase_date="2026-09-10T10:00:00")
    _make_expense(client, item="Aug item", purchase_date="2026-08-15T10:00:00")

    response = client.get("/expenses?month=2026-09")
    assert response.status_code == 200
    names = [e["item"] for e in response.json()["items"]]
    assert "Sep item" in names
    assert "Aug item" not in names


def test_list_expenses_search_by_name(client: TestClient) -> None:
    _make_expense(client, item="Organic Almond Milk")
    _make_expense(client, item="Butter")

    response = client.get("/expenses?q=almond")
    assert response.status_code == 200
    items = [e["item"] for e in response.json()["items"]]
    assert "Organic Almond Milk" in items
    assert "Butter" not in items


def test_list_expenses_search_in_notes(client: TestClient) -> None:
    _make_expense(client, item="Misc", notes="birthday cake supplies")
    _make_expense(client, item="Other")

    response = client.get("/expenses?q=birthday")
    items = [e["item"] for e in response.json()["items"]]
    assert "Misc" in items
    assert "Other" not in items


def test_list_expenses_category_filter(client: TestClient) -> None:
    cats = client.get("/categories").json()
    groceries_id = next(c["id"] for c in cats if c["name"] == "Groceries")

    _make_expense(client, item="Rice", category_id=groceries_id)
    _make_expense(client, item="Bus pass")

    response = client.get(f"/expenses?category_id={groceries_id}")
    items = [e["item"] for e in response.json()["items"]]
    assert "Rice" in items
    assert "Bus pass" not in items


def test_list_expenses_cursor_pagination(client: TestClient) -> None:
    # Create 5 items
    e1 = _make_expense(client, item="Item 1")
    e2 = _make_expense(client, item="Item 2")
    e3 = _make_expense(client, item="Item 3")
    e4 = _make_expense(client, item="Item 4")
    e5 = _make_expense(client, item="Item 5")

    # Fetch page 1 (limit 2)
    p1 = client.get("/expenses?limit=2").json()
    assert len(p1["items"]) == 2
    assert p1["has_more"] is True
    assert p1["next_cursor"] == p1["items"][-1]["id"]

    # Fetch page 2
    p2 = client.get(f"/expenses?limit=2&cursor={p1['next_cursor']}").json()
    assert len(p2["items"]) == 2
    assert p2["has_more"] is True
    assert p2["next_cursor"] == p2["items"][-1]["id"]

    # Ensure no overlap between page 1 and page 2
    p1_ids = {item["id"] for item in p1["items"]}
    p2_ids = {item["id"] for item in p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)

    # Fetch page 3
    p3 = client.get(f"/expenses?limit=2&cursor={p2['next_cursor']}").json()
    # At least 1 item remaining
    assert len(p3["items"]) >= 1


def test_list_expenses_cursor_end_of_list(client: TestClient) -> None:
    response = client.get("/expenses?cursor=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["has_more"] is False
    assert data["next_cursor"] is None


# ---------------------------------------------------------------------------
# PATCH
# ---------------------------------------------------------------------------


def test_update_expense(client: TestClient) -> None:
    expense = _make_expense(client, item="Old Name", price_paise=1000)
    expense_id = expense["id"]

    response = client.patch(
        f"/expenses/{expense_id}", json={"item": "New Name", "price_paise": 2000}
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["item"] == "New Name"
    assert updated["price_paise"] == 2000


def test_update_nonexistent_expense_returns_404(client: TestClient) -> None:
    response = client.patch("/expenses/99999", json={"item": "Ghost"})
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------


def test_delete_expense(client: TestClient) -> None:
    expense = _make_expense(client, item="Trash me")
    expense_id = expense["id"]

    response = client.delete(f"/expenses/{expense_id}")
    assert response.status_code == 204

    all_ids = [e["id"] for e in client.get("/expenses").json()["items"]]
    assert expense_id not in all_ids


def test_delete_nonexistent_expense_returns_404(client: TestClient) -> None:
    response = client.delete("/expenses/99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Expiring soon
# ---------------------------------------------------------------------------


def test_expiring_soon(client: TestClient) -> None:
    now = datetime.now(UTC).replace(tzinfo=None)
    soon = (now + timedelta(days=3)).isoformat()
    far = (now + timedelta(days=30)).isoformat()
    past = (now - timedelta(days=1)).isoformat()

    _make_expense(client, item="Expiring soon", expiry_date=soon)
    _make_expense(client, item="Expires far", expiry_date=far)
    _make_expense(client, item="Already expired", expiry_date=past)

    response = client.get("/expenses/expiring?days=7")
    assert response.status_code == 200
    items = [e["item"] for e in response.json()]
    assert "Expiring soon" in items
    assert "Expires far" not in items
    assert "Already expired" not in items
