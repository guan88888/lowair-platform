from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    avatar_asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"))
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    visibility: Mapped[str] = mapped_column(String(16), default="public", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "resource_type", "resource_id", name="uq_favorite"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resource_type: Mapped[str] = mapped_column(String(32), index=True)
    resource_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Wallet(Base):
    __tablename__ = "wallets"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    available: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    frozen: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    escrow: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    wallet_user_id: Mapped[int] = mapped_column(ForeignKey("wallets.user_id", ondelete="RESTRICT"), index=True)
    direction: Mapped[str] = mapped_column(String(8), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    entry_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    biz_type: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    biz_id: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    request_id: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProviderWebhookEvent(Base):
    __tablename__ = "provider_webhook_events"
    provider_event_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="received", nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
