"""Persistent records for recruitment, task bidding, and task fulfilment.

The work domain intentionally keeps relationships explicit instead of relying on
eager ORM graphs.  It makes ownership checks in the service layer auditable and
keeps every public response independently serialisable.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompanyProfile(Base):
    __tablename__ = "work_companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(120))
    scale: Mapped[Optional[str]] = mapped_column(String(64))
    address: Mapped[Optional[str]] = mapped_column(String(500))
    intro: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Job(Base):
    __tablename__ = "work_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("work_companies.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(64))
    salary_min: Mapped[Optional[int]] = mapped_column(Integer)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer)
    employment: Mapped[Optional[str]] = mapped_column(String(32))
    experience: Mapped[Optional[str]] = mapped_column(String(120))
    education: Mapped[Optional[str]] = mapped_column(String(120))
    caac: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    aircraft: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    responsibilities: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    requirements: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    benefits: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    environment: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="reviewing", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Resume(Base):
    __tablename__ = "work_resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    visibility: Mapped[str] = mapped_column(String(24), default="private", nullable=False)
    intention: Mapped[Optional[str]] = mapped_column(String(160))
    name: Mapped[Optional[str]] = mapped_column(String(80))
    city: Mapped[Optional[str]] = mapped_column(String(64))
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    caac_level: Mapped[Optional[str]] = mapped_column(String(64))
    certificate_number: Mapped[Optional[str]] = mapped_column(String(128))
    certificate_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    aircraft: Mapped[Optional[str]] = mapped_column(Text)
    experience: Mapped[Optional[str]] = mapped_column(Text)
    education: Mapped[Optional[str]] = mapped_column(Text)
    attachments: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class JobApplication(Base):
    __tablename__ = "work_job_applications"
    __table_args__ = (UniqueConstraint("job_id", "applicant_id", name="uq_work_job_applicant"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("work_jobs.id", ondelete="CASCADE"), index=True)
    applicant_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resume_id: Mapped[Optional[int]] = mapped_column(ForeignKey("work_resumes.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(24), default="new", nullable=False, index=True)
    withdraw_reason: Mapped[Optional[str]] = mapped_column(Text)
    rejected_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Interview(Base):
    __tablename__ = "work_interviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("work_job_applications.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("work_companies.id", ondelete="CASCADE"), index=True)
    at: Mapped[str] = mapped_column(String(64), nullable=False)
    method: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Task(Base):
    __tablename__ = "work_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    publisher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    work_at: Mapped[str] = mapped_column(String(64), nullable=False)
    deadline: Mapped[str] = mapped_column(String(64), nullable=False)
    aircraft: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    caac: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    duration: Mapped[str] = mapped_column(String(120), nullable=False)
    budget: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    delivery: Mapped[str] = mapped_column(Text, nullable=False)
    acceptance: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="reviewing", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TaskBid(Base):
    __tablename__ = "work_task_bids"
    __table_args__ = (UniqueConstraint("task_id", "bidder_id", name="uq_work_task_bidder"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("work_tasks.id", ondelete="CASCADE"), index=True)
    bidder_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quote: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    commitment: Mapped[str] = mapped_column(Text, nullable=False)
    availability_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="submitted", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Fulfillment(Base):
    __tablename__ = "work_fulfillments"
    __table_args__ = (UniqueConstraint("task_id", name="uq_work_task_fulfillment"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("work_tasks.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    pilot_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="in_progress", nullable=False, index=True)
    milestones: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    deliveries: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    dispute: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    pause_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class FulfillmentEvent(Base):
    __tablename__ = "work_fulfillment_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    fulfillment_id: Mapped[int] = mapped_column(ForeignKey("work_fulfillments.id", ondelete="CASCADE"), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
