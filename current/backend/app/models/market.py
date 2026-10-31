from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MarketProduct(Base):
    __tablename__ = "market_products"
    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(24), index=True)
    brand: Mapped[str] = mapped_column(String(80), default="")
    model: Mapped[str] = mapped_column(String(80), default="")
    city: Mapped[str] = mapped_column(String(64), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    summary: Mapped[str] = mapped_column(Text, default="")
    images: Mapped[List[Any]] = mapped_column(JSON, default=list)
    delivery: Mapped[List[Any]] = mapped_column(JSON, default=list)
    sn: Mapped[Optional[str]] = mapped_column(String(80), index=True)
    verification_status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    listing_status: Mapped[str] = mapped_column(String(24), default="reviewing", index=True)
    stock: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MarketCartItem(Base):
    __tablename__ = "market_cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_market_cart_user_product"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("market_products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DeviceHistoryEvent(Base):
    __tablename__ = "market_device_history_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    sn: Mapped[str] = mapped_column(String(80), index=True)
    event_type: Mapped[str] = mapped_column(String(40))
    note: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(160))
    verification_status: Mapped[str] = mapped_column(String(24), default="pending")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)


class InspectionReport(Base):
    __tablename__ = "market_inspection_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("market_products.id"), index=True)
    source: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(24), default="pending")
    report_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class RentalPlan(Base):
    __tablename__ = "market_rental_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("market_products.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    daily_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    deposit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    available_units: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class MarketOrder(Base):
    __tablename__ = "market_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("market_products.id"), index=True)
    rental_plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("market_rental_plans.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    status: Mapped[str] = mapped_column(String(32), default="pending_payment", index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
    lease_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    lease_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    address: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    after_sale_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MarketOrderAction(Base):
    __tablename__ = "market_order_actions"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("market_orders.id"), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(40))
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RepairProvider(Base):
    __tablename__ = "market_repair_providers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    city: Mapped[str] = mapped_column(String(64), index=True)
    district: Mapped[str] = mapped_column(String(64), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    brands: Mapped[List[Any]] = mapped_column(JSON, default=list)
    services: Mapped[List[Any]] = mapped_column(JSON, default=list)
    contact_mode: Mapped[str] = mapped_column(String(64), default="平台内联系")
    verification_status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    source: Mapped[str] = mapped_column(String(160), default="平台服务商目录")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RepairBooking(Base):
    __tablename__ = "market_repair_bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("market_repair_providers.id"), index=True)
    brand: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(80))
    issue_type: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(Text, default="")
    service_mode: Mapped[str] = mapped_column(String(32), default="到店")
    preferred_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(32), default="submitted", index=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text)
    estimate_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
