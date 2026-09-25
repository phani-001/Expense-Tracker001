"""Expenses router.

GET  /expenses            — list with optional filters
POST /expenses            — create
PATCH /expenses/{id}      — partial update
DELETE /expenses/{id}     — delete
GET  /expenses/expiring   — expiring within N days
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Expense
from app.schemas import (
    ExpenseCreate,
    ExpenseOut,
    ExpenseUpdate,
    PaginatedExpensesOut,
)
from app.websocket import ws_manager

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _get_or_404(expense_id: int, db: Session) -> Expense:
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense {expense_id} not found.",
        )
    return expense


@router.get("/expiring", response_model=list[ExpenseOut])
def expiring_soon(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
) -> list[Expense]:
    """Return expenses whose expiry_date is within the next `days` days."""
    now = datetime.now(UTC).replace(tzinfo=None)
    cutoff = now + timedelta(days=days)
    return (
        db.query(Expense)
        .filter(Expense.expiry_date.isnot(None))
        .filter(Expense.expiry_date >= now)
        .filter(Expense.expiry_date <= cutoff)
        .order_by(Expense.expiry_date)
        .all()
    )


@router.get("", response_model=PaginatedExpensesOut)
def list_expenses(
    cursor: int | None = Query(
        None, description="Cursor for pagination: expense ID to fetch before"
    ),
    limit: int = Query(20, ge=1, le=100, description="Max number of items to return"),
    month: str | None = Query(
        None,
        description="Filter by month, format YYYY-MM",
        pattern=r"^\d{4}-\d{2}$",
    ),
    category_id: int | None = Query(None),
    q: str | None = Query(None, description="Search in item name and notes"),
    start_date: str | None = Query(None, description="Start date ISO string"),
    end_date: str | None = Query(None, description="End date ISO string"),
    db: Session = Depends(get_db),
) -> PaginatedExpensesOut:
    """Return expenses newest-first with cursor-based pagination and optional filters."""
    query = db.query(Expense)

    if cursor is not None:
        query = query.filter(Expense.id < cursor)

    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00")).replace(
                tzinfo=None
            )
        except Exception:
            start = datetime.strptime(start_date[:10], "%Y-%m-%d")
        try:
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00")).replace(
                tzinfo=None
            )
        except Exception:
            end = datetime.strptime(end_date[:10], "%Y-%m-%d")
        if len(end_date) <= 10:
            end = end + timedelta(days=1)
        query = query.filter(
            Expense.purchase_date >= start, Expense.purchase_date < end
        )
    elif month:
        year, mon = int(month[:4]), int(month[5:])
        start = datetime(year, mon, 1)
        if mon == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, mon + 1, 1)
        query = query.filter(
            Expense.purchase_date >= start, Expense.purchase_date < end
        )

    if category_id is not None:
        query = query.filter(Expense.category_id == category_id)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Expense.item.ilike(pattern)) | (Expense.notes.ilike(pattern))
        )

    items = query.order_by(Expense.id.desc()).limit(limit + 1).all()

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]
        next_cursor = items[-1].id
    else:
        next_cursor = None

    return PaginatedExpensesOut(
        items=items,
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate, db: Session = Depends(get_db)
) -> Expense:
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    ws_manager.broadcast_sync({"type": "expense_changed", "action": "create", "id": expense.id})
    return expense


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
) -> Expense:
    expense = _get_or_404(expense_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    expense.updated_at = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(expense)
    ws_manager.broadcast_sync({"type": "expense_changed", "action": "update", "id": expense.id})
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(get_db)) -> None:
    expense = _get_or_404(expense_id, db)
    db.delete(expense)
    db.commit()
    ws_manager.broadcast_sync({"type": "expense_changed", "action": "delete", "id": expense_id})

