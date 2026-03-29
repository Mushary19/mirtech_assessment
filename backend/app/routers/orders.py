from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, cast
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import selectinload
from typing import Optional
import base64
import json
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.models import Order, User, Product
from app.schemas import OrderListResponse, OrderOut, MetaResponse, StatusBreakdown
from app.cache import cache_get, cache_set

router = APIRouter(prefix="/api/orders", tags=["orders"])

VALID_SORT_FIELDS = {"created_at", "total_amount", "id", "status", "quantity"}
VALID_STATUSES = {"pending", "processing", "shipped", "delivered", "cancelled"}


def encode_cursor(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


def decode_cursor(cursor: str) -> dict:
    try:
        return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cursor")


@router.get("", response_model=OrderListResponse)
async def list_orders(
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    if sort_by not in VALID_SORT_FIELDS:
        raise HTTPException(
            status_code=400, detail=f"Invalid sort_by. Choose from: {VALID_SORT_FIELDS}"
        )
    if sort_dir not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="sort_dir must be asc or desc")
    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400, detail=f"Invalid status. Choose from: {VALID_STATUSES}"
        )

    cache_key = f"orders:list:cursor={cursor}:status={status}:search={search}:sort={sort_by}:{sort_dir}:min={min_amount}:max={max_amount}:limit={limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    sort_col = getattr(Order, sort_by)
    direction = desc if sort_dir == "desc" else asc

    filters = []

    if status:
        filters.append(Order.status == status)

    if min_amount is not None:
        filters.append(Order.total_amount >= min_amount)

    if max_amount is not None:
        filters.append(Order.total_amount <= max_amount)

    if cursor:
        cursor_data = decode_cursor(cursor)
        cursor_val = cursor_data.get("val")
        cursor_id = cursor_data.get("id")

        if sort_by == "created_at":
            typed_val = datetime.fromisoformat(cursor_val)
        elif sort_by == "total_amount":
            typed_val = Decimal(cursor_val)
        elif sort_by == "quantity":
            typed_val = int(cursor_val)
        else:
            typed_val = cursor_val

        if sort_by == "id":
            if sort_dir == "desc":
                filters.append(Order.id < cursor_id)
            else:
                filters.append(Order.id > cursor_id)
        else:
            if sort_dir == "desc":
                filters.append(
                    or_(
                        sort_col < typed_val,
                        and_(sort_col == typed_val, Order.id < cursor_id),
                    )
                )
            else:
                filters.append(
                    or_(
                        sort_col > typed_val,
                        and_(sort_col == typed_val, Order.id > cursor_id),
                    )
                )

    stmt = (
        select(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.product),
        )
        .join(Order.user)
        .join(Order.product)
    )

    if search:
        search_term = f"%{search.lower()}%"
        filters.append(
            or_(
                func.lower(User.name).like(search_term),
                func.lower(User.email).like(search_term),
                func.lower(Product.name).like(search_term),
            )
        )

    if filters:
        stmt = stmt.where(and_(*filters))

    stmt = stmt.order_by(direction(sort_col), desc(Order.id)).limit(limit + 1)

    result = await db.execute(stmt)
    orders = result.scalars().all()

    has_next = len(orders) > limit
    orders = orders[:limit]

    next_cursor = None
    if has_next and orders:
        last = orders[-1]
        cursor_data = {
            "val": str(getattr(last, sort_by)),
            "id": last.id,
        }
        next_cursor = encode_cursor(cursor_data)

    count_cache_key = f"orders:count:status={status}:search={search}:min={min_amount}:max={max_amount}"
    total = await cache_get(count_cache_key)

    if total is None:
        count_filters = []
        if status:
            count_filters.append(Order.status == status)
        if min_amount is not None:
            count_filters.append(Order.total_amount >= min_amount)
        if max_amount is not None:
            count_filters.append(Order.total_amount <= max_amount)

        count_stmt = (
            select(func.count()).select_from(Order).join(Order.user).join(Order.product)
        )

        if search:
            search_term = f"%{search.lower()}%"
            count_filters.append(
                or_(
                    func.lower(User.name).like(search_term),
                    func.lower(User.email).like(search_term),
                    func.lower(Product.name).like(search_term),
                )
            )

        if count_filters:
            count_stmt = count_stmt.where(and_(*count_filters))

        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        await cache_set(count_cache_key, total, ttl=60)

    response = {
        "data": [OrderOut.model_validate(o).model_dump() for o in orders],
        "next_cursor": next_cursor,
        "has_next": has_next,
        "total": total,
    }

    await cache_set(cache_key, response, ttl=30)
    return response


@router.get("/meta", response_model=MetaResponse)
async def get_meta(db: AsyncSession = Depends(get_db)):
    cached = await cache_get("orders:meta")
    if cached:
        return cached

    total_orders = await db.scalar(select(func.count()).select_from(Order))
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_products = await db.scalar(select(func.count()).select_from(Product))
    avg_value = await db.scalar(select(func.avg(Order.total_amount)))

    status_result = await db.execute(
        select(Order.status, func.count().label("count"))
        .group_by(Order.status)
        .order_by(func.count().desc())
    )
    status_breakdown = [
        {"status": row.status, "count": row.count} for row in status_result.all()
    ]

    response = {
        "total_orders": total_orders,
        "total_users": total_users,
        "total_products": total_products,
        "status_breakdown": status_breakdown,
        "avg_order_value": str(round(avg_value, 2)) if avg_value else "0.00",
    }

    await cache_set("orders:meta", response, ttl=300)
    return response


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    cache_key = f"orders:detail:{order_id}"
    cached = await cache_get(cache_key)
    if cached:
        print("detail returned from cache")
        return cached

    print("cache miss")
    stmt = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.product))
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    response = OrderOut.model_validate(order).model_dump()
    await cache_set(cache_key, response, ttl=600)
    return response
