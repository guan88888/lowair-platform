from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, JSON, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AdPlacement(Base):
    __tablename__ = "ad_placements"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100)); city: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default=""); status: Mapped[str] = mapped_column(String(24), default="active")

class Creative(Base):
    __tablename__ = "ad_creatives"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160)); media_asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_assets.id"))
    media_type: Mapped[str] = mapped_column(String(24), default="image"); review_status: Mapped[str] = mapped_column(String(24), default="reviewing")
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Campaign(Base):
    __tablename__ = "ad_campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    placement_id: Mapped[int] = mapped_column(ForeignKey("ad_placements.id"))
    creative_id: Mapped[int] = mapped_column(ForeignKey("ad_creatives.id"))
    name: Mapped[str] = mapped_column(String(160)); goal: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True); budget_total: Mapped[Decimal] = mapped_column(Numeric(14, 2)); budget_daily: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True)); end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    targeting: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict); copy_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
