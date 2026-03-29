from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    country: str

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    price: Decimal
    stock: int

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    status: str
    quantity: int
    total_amount: Decimal
    created_at: datetime
    user: UserOut
    product: ProductOut

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    data: list[OrderOut]
    next_cursor: Optional[str] = None
    has_next: bool
    total: int


class StatusBreakdown(BaseModel):
    status: str
    count: int


class MetaResponse(BaseModel):
    total_orders: int
    total_users: int
    total_products: int
    status_breakdown: list[StatusBreakdown]
    avg_order_value: Decimal
