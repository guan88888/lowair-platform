from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HomeContent(Base):
    __tablename__ = "home_contents"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_key: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    target_url: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class FlightAdvisory(Base):
    __tablename__ = "flight_advisories"

    id: Mapped[int] = mapped_column(primary_key=True)
    city: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    advisory_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    level: Mapped[str] = mapped_column(String(16), default="中", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
