"""Tests for GET /categories and POST /categories."""

from fastapi.testclient import TestClient


def test_list_categories_returns_seeded(client: TestClient) -> None:
    response = client.get("/categories")
    assert response.status_code == 200
    names = {cat["name"] for cat in response.json()}
    assert names == {"Groceries", "Dining", "Transport", "Health", "Household", "Other"}


def test_list_categories_has_required_fields(client: TestClient) -> None:
    response = client.get("/categories")
    for cat in response.json():
        assert "id" in cat
        assert "name" in cat
        assert "color" in cat
        assert "icon" in cat


def test_create_category(client: TestClient) -> None:
    payload = {"name": "Entertainment", "color": "#FF5722", "icon": "🎬"}
    response = client.post("/categories", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Entertainment"
    assert data["color"] == "#FF5722"
    assert data["icon"] == "🎬"
    assert "id" in data


def test_create_duplicate_category_returns_409(client: TestClient) -> None:
    payload = {"name": "Groceries", "color": "#000000", "icon": "🛍️"}
    response = client.post("/categories", json=payload)
    assert response.status_code == 409


def test_created_category_appears_in_list(client: TestClient) -> None:
    client.post("/categories", json={"name": "Travel", "color": "#00BCD4", "icon": "✈️"})
    response = client.get("/categories")
    names = {cat["name"] for cat in response.json()}
    assert "Travel" in names
