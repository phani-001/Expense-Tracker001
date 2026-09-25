"""Pydantic v2 schemas for all request/response types."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=64)
    color: str = Field(..., max_length=16, description="Hex color, e.g. #4CAF50")
    icon: str = Field(..., max_length=64, description="Emoji or icon name")


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    icon: str


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------


class ExpenseCreate(BaseModel):
    item: str = Field(..., max_length=256)
    price_paise: int = Field(..., ge=0, description="Price in paise (INR × 100)")
    quantity: float | None = Field(None, gt=0)
    category_id: int | None = None
    purchase_date: datetime | None = None
    expiry_date: datetime | None = None
    barcode: str | None = Field(None, max_length=64)
    source: Literal["scan", "photo", "manual"] = "manual"
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    item: str | None = Field(None, max_length=256)
    price_paise: int | None = Field(None, ge=0)
    quantity: float | None = None
    category_id: int | None = None
    purchase_date: datetime | None = None
    expiry_date: datetime | None = None
    barcode: str | None = Field(None, max_length=64)
    source: Literal["scan", "photo", "manual"] | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item: str
    price_paise: int
    quantity: float | None
    category_id: int | None
    category: CategoryOut | None
    purchase_date: datetime | None
    expiry_date: datetime | None
    barcode: str | None
    image_path: str | None
    source: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PaginatedExpensesOut(BaseModel):
    items: list[ExpenseOut]
    next_cursor: int | None = None
    has_more: bool = False



# ---------------------------------------------------------------------------
# Extractor (photo → prefill)
# ---------------------------------------------------------------------------


class ExtractResponse(BaseModel):
    """Prefill JSON returned by POST /extract.
    All fields may be null — never guessed."""

    item: str | None = None
    price: float | None = Field(
        None, description="Selling price in INR (frontend converts to paise)"
    )
    quantity: float | None = None
    category: str | None = None
    expiry_date: str | None = Field(None, description="ISO date string or null")
    purchase_date: str | None = Field(None, description="ISO date string or null")
    confidence: float | None = Field(None, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Barcode lookup
# ---------------------------------------------------------------------------


class BarcodeLookupResponse(BaseModel):
    barcode: str
    name: str | None = None
    brand: str | None = None
    category: str | None = None


class BarcodeItem(BaseModel):
    format: str
    text: str


class BarcodeScanResponse(BaseModel):
    found: bool
    barcodes: list[BarcodeItem] = Field(default_factory=list)
    barcode: str | None = None
    name: str | None = None
    brand: str | None = None
    category: str | None = None
    quantity: float | None = None


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


class StatsSummaryOut(BaseModel):
    month: str  # "YYYY-MM"
    total_paise: int
    item_count: int
    vs_last_month_paise: int  # positive = spent more, negative = spent less


class ByCategoryItem(BaseModel):
    category_id: int | None
    category_name: str
    total_paise: int


class TrendPoint(BaseModel):
    date: str  # "YYYY-MM-DD" for daily, "YYYY-WNN" for weekly
    total_paise: int
