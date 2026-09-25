"""Stats router.

GET /stats/summary?month=YYYY-MM&start_date=...&end_date=...
GET /stats/by-category?month=YYYY-MM&start_date=...&end_date=...
GET /stats/trend?range=30d|12w&start_date=...&end_date=...
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, Expense
from app.schemas import ByCategoryItem, StatsSummaryOut, TrendPoint

router = APIRouter(prefix="/stats", tags=["stats"])


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    """Return (start, end) datetime for a given 'YYYY-MM' string."""
    year, mon = int(month[:4]), int(month[5:])
    start = datetime(year, mon, 1)
    end = datetime(year + 1, 1, 1) if mon == 12 else datetime(year, mon + 1, 1)
    return start, end


def _total_for_period(db: Session, start: datetime, end: datetime) -> int:
    result = (
        db.query(func.coalesce(func.sum(Expense.price_paise), 0))
        .filter(Expense.purchase_date >= start, Expense.purchase_date < end)
        .scalar()
    )
    return int(result)


def _count_for_period(db: Session, start: datetime, end: datetime) -> int:
    return (
        db.query(func.count(Expense.id))
        .filter(Expense.purchase_date >= start, Expense.purchase_date < end)
        .scalar()
        or 0
    )


def _prev_month(month: str) -> str:
    year, mon = int(month[:4]), int(month[5:])
    if mon == 1:
        return f"{year - 1}-12"
    return f"{year}-{mon - 1:02d}"


def _resolve_bounds(
    month: str | None,
    start_date: str | None,
    end_date: str | None,
) -> tuple[datetime, datetime, datetime, datetime, str]:
    """Resolve start/end and prior comparison window from date params or month."""
    now = datetime.now(UTC).replace(tzinfo=None)

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

        # If end date had no time component, advance to end of day
        if len(end_date) <= 10:
            end = end + timedelta(days=1)

        duration = end - start
        prev_end = start
        prev_start = start - duration
        return start, end, prev_start, prev_end, start.strftime("%Y-%m")

    if not month:
        month = now.strftime("%Y-%m")

    start, end = _month_bounds(month)
    prev = _prev_month(month)
    prev_start, prev_end = _month_bounds(prev)
    return start, end, prev_start, prev_end, month


@router.get("/summary", response_model=StatsSummaryOut)
def summary(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    db: Session = Depends(get_db),
) -> StatsSummaryOut:
    """Return total spend and item count for period, and delta vs previous period."""
    start, end, prev_start, prev_end, month_label = _resolve_bounds(
        month, start_date, end_date
    )
    total = _total_for_period(db, start, end)
    count = _count_for_period(db, start, end)
    prev_total = _total_for_period(db, prev_start, prev_end)

    return StatsSummaryOut(
        month=month_label,
        total_paise=total,
        item_count=count,
        vs_last_month_paise=total - prev_total,
    )


@router.get("/by-category", response_model=list[ByCategoryItem])
def by_category(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[ByCategoryItem]:
    """Return spend grouped by category for the given period."""
    start, end, _, _, _ = _resolve_bounds(month, start_date, end_date)
    rows = (
        db.query(
            Expense.category_id,
            Category.name,
            func.sum(Expense.price_paise).label("total"),
        )
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(Expense.purchase_date >= start, Expense.purchase_date < end)
        .group_by(Expense.category_id, Category.name)
        .order_by(func.sum(Expense.price_paise).desc())
        .all()
    )
    return [
        ByCategoryItem(
            category_id=row.category_id,
            category_name=row.name or "Uncategorised",
            total_paise=int(row.total),
        )
        for row in rows
    ]


@router.get("/trend", response_model=list[TrendPoint])
def trend(
    range: str | None = Query(None, pattern=r"^(\d+d|\d+w)$"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[TrendPoint]:
    """Return spend trend series (daily or weekly buckets) for the period."""
    now = datetime.now(UTC).replace(tzinfo=None)

    if start_date and end_date:
        start, end, _, _, _ = _resolve_bounds(None, start_date, end_date)
        duration_days = (end - start).days

        if duration_days > 60:
            # Group by week for long ranges
            rows = (
                db.query(
                    func.strftime("%Y-W%W", Expense.purchase_date).label("bucket"),
                    func.sum(Expense.price_paise).label("total"),
                )
                .filter(Expense.purchase_date >= start, Expense.purchase_date < end)
                .group_by("bucket")
                .order_by("bucket")
                .all()
            )
        else:
            # Group by day
            rows = (
                db.query(
                    func.strftime("%Y-%m-%d", Expense.purchase_date).label("bucket"),
                    func.sum(Expense.price_paise).label("total"),
                )
                .filter(Expense.purchase_date >= start, Expense.purchase_date < end)
                .group_by("bucket")
                .order_by("bucket")
                .all()
            )
        return [
            TrendPoint(date=row.bucket, total_paise=int(row.total)) for row in rows
        ]

    # Default range behavior (e.g. 30d, 12w)
    active_range = range or "30d"
    weekly = active_range.endswith("w")
    n = int(active_range[:-1])

    if weekly:
        start = now - timedelta(weeks=n)
        rows = (
            db.query(
                func.strftime("%Y-W%W", Expense.purchase_date).label("bucket"),
                func.sum(Expense.price_paise).label("total"),
            )
            .filter(Expense.purchase_date >= start)
            .group_by("bucket")
            .order_by("bucket")
            .all()
        )
    else:
        start = now - timedelta(days=n)
        rows = (
            db.query(
                func.strftime("%Y-%m-%d", Expense.purchase_date).label("bucket"),
                func.sum(Expense.price_paise).label("total"),
            )
            .filter(Expense.purchase_date >= start)
            .group_by("bucket")
            .order_by("bucket")
            .all()
        )

    return [
        TrendPoint(date=row.bucket, total_paise=int(row.total)) for row in rows
    ]
