from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

class ListingCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: str
    brand: str = Field(default="", max_length=80)
    model: str = Field(default="", max_length=80)
    city: str = Field(min_length=1, max_length=64)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    summary: str = Field(default="", max_length=4000)
    images: List[str] = Field(default_factory=list, max_length=12)
    delivery: List[str] = Field(default_factory=list, max_length=2)
    sn: Optional[str] = Field(default=None, max_length=80)
    stock: int = Field(default=1, ge=1, le=1000)
    @field_validator("category")
    @classmethod
    def category_allowed(cls, value: str) -> str:
        if value not in {"drone", "new_drone", "accessory", "rental"}: raise ValueError("unsupported category")
        return value

class CartItemUpdate(BaseModel):
    productId: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=99)

class OrderQuote(BaseModel):
    productId: int
    quantity: int = Field(default=1, ge=1, le=100)
    rentalPlanId: Optional[int] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None

class OrderCreate(OrderQuote):
    address: Dict[str, Any] = Field(default_factory=dict)

class OrderAction(BaseModel):
    action: str
    reason: str = Field(default="", max_length=1000)


class RepairBookingCreate(BaseModel):
    providerId: int = Field(gt=0)
    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    issueType: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=2000)
    serviceMode: str = Field(default="到店", max_length=32)
    preferredDate: datetime

    @field_validator("serviceMode")
    @classmethod
    def service_mode_allowed(cls, value: str) -> str:
        if value not in {"到店", "寄修", "上门评估"}:
            raise ValueError("unsupported service mode")
        return value
