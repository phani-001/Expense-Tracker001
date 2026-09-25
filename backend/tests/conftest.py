"""pytest fixtures: in-memory SQLite DB and a synchronous test client.

Strategy
--------
* One file-backed SQLite DB per test run (avoids :memory: connection-scope issues).
* ``app.dependency_overrides[get_db]`` is set at module level to point to the
  test DB so every request goes through the test session.
* The app lifespan is replaced with a no-op at module level so it never touches
  the real ``expenses.db`` or tries to seed on the wrong connection.
* Tables are created/dropped per test so each test starts clean.
"""

import os
import tempfile
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import _seed_categories

# ---------------------------------------------------------------------------
# Test engine — use a named temp file so all threads/sessions share the same DB
# ---------------------------------------------------------------------------

_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)

TEST_DATABASE_URL = f"sqlite:///{_tmp_db_path}"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Patch the app BEFORE TestClient is created
# ---------------------------------------------------------------------------

from app.main import app  # noqa: E402

# Override DB dependency
app.dependency_overrides[get_db] = _override_get_db

# Replace the lifespan with a no-op so TestClient(app) doesn't touch the
# real engine or real .env database.
@asynccontextmanager
async def _noop_lifespan(application):
    yield

app.router.lifespan_context = _noop_lifespan


# ---------------------------------------------------------------------------
# Per-test table lifecycle
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables, seed categories; drop everything after the test."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        _seed_categories(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


# ---------------------------------------------------------------------------
# TestClient
# ---------------------------------------------------------------------------


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=True)
