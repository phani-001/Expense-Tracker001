"""FastAPI application entry point.

Startup tasks:
  - Create all DB tables (idempotent).
  - Seed default categories if the table is empty.
CORS is open to localhost ports for local development.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import Base, SessionLocal, engine
from app.models import Category
from app.routers import barcode, categories, expenses, extract, lookup, scan, stats
from app.websocket import ws_manager

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

_DEFAULT_CATEGORIES: list[dict[str, str]] = [
    {"name": "Groceries",  "color": "#4CAF50", "icon": "🛒"},
    {"name": "Dining",     "color": "#FF9800", "icon": "🍽️"},
    {"name": "Transport",  "color": "#2196F3", "icon": "🚌"},
    {"name": "Health",     "color": "#E91E63", "icon": "💊"},
    {"name": "Household",  "color": "#9C27B0", "icon": "🏠"},
    {"name": "Other",      "color": "#607D8B", "icon": "📦"},
]


def _seed_categories(db) -> None:
    if db.query(Category).count() == 0:
        for data in _DEFAULT_CATEGORIES:
            db.add(Category(**data))
        db.commit()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_categories(db)
    finally:
        db.close()
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


app = FastAPI(
    title="Expense Tracker API",
    version="1.0.0",
    description="Personal expense tracker — INR, single-user, no auth.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(barcode.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(stats.router)
app.include_router(extract.router)
app.include_router(lookup.router)
app.include_router(scan.router)

_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOADS_DIR)), name="uploads")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; accept any client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}

