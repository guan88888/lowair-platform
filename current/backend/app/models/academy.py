"""Persistent models for the academy and training domain.

The academy module intentionally keeps its relations explicit instead of relying on
front-end supplied organisation ids.  This makes the tenancy checks in the API
service usable by the other business domains as well.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AcademyInstitution(Base):
    __tablename__ = "academy_institutions"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    schedule: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    address: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    tagline: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String(512))
    phone_policy: Mapped[str] = mapped_column(String(255), default="仅在预约确认后提供联系信息", nullable=False)
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    qualification: Mapped[str] = mapped_column(Text, default="资质待核验", nullable=False)
    pass_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    pass_rate_source: Mapped[str] = mapped_column(String(255), default="机构资料", nullable=False)
    facilities: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AcademyInstitutionMember(Base):
    __tablename__ = "academy_institution_members"
    __table_args__ = (UniqueConstraint("institution_id", "user_id", name="uq_academy_member"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(24), default="member", nullable=False)  # admin, manager, instructor, member
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademyQualification(Base):
    __tablename__ = "academy_qualifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    issuer: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    evidence_asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class AcademyCourse(Base):
    __tablename__ = "academy_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    level: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    schedule: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    duration: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    next_start_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True, index=True)
    trial: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="published", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademyInstitutionOutcome(Base):
    """Institution-published outcomes. Empty records intentionally mean no claim."""

    __tablename__ = "academy_institution_outcomes"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    source_url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(Date)


class AcademyInstitutionReview(Base):
    """Moderated, user-originated reviews. No review is fabricated by seed data."""

    __tablename__ = "academy_institution_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    author_name: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="published", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademyLesson(Base):
    __tablename__ = "academy_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("academy_courses.id", ondelete="CASCADE"), index=True)
    chapter_title: Mapped[str] = mapped_column(String(160), default="课程章节", nullable=False)
    chapter_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(24), default="video", nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resource_url: Mapped[Optional[str]] = mapped_column(String(512))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AcademyEnrollment(Base):
    __tablename__ = "academy_enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_academy_enrollment"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("academy_courses.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="active", nullable=False, index=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademyVisitSlot(Base):
    __tablename__ = "academy_visit_slots"
    __table_args__ = (UniqueConstraint("institution_id", "visit_date", "slot", name="uq_academy_visit_slot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    visit_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    slot: Mapped[str] = mapped_column(String(32), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AcademyVisit(Base):
    __tablename__ = "academy_visits"
    __table_args__ = (Index("ix_academy_visit_slot", "institution_id", "visit_date", "slot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[Optional[int]] = mapped_column(ForeignKey("academy_courses.id", ondelete="SET NULL"))
    visit_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    slot: Mapped[str] = mapped_column(String(32), nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    contact_name: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AcademyLearningPlan(Base):
    __tablename__ = "academy_learning_plans"
    __table_args__ = (UniqueConstraint("user_id", name="uq_academy_learning_plan_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    daily_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    target_date: Mapped[Optional[datetime]] = mapped_column(Date)
    focus: Mapped[str] = mapped_column(String(64), default="超视距", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AcademyLessonProgress(Base):
    __tablename__ = "academy_lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_academy_lesson_progress"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("academy_lessons.id", ondelete="CASCADE"), index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    video_position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AcademyQuestion(Base):
    __tablename__ = "academy_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    correct_answers: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source: Mapped[str] = mapped_column(String(255), default="题库来源待核验", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademyExamSession(Base):
    __tablename__ = "academy_exam_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mode: Mapped[str] = mapped_column(String(24), nullable=False)
    question_ids: Mapped[List[int]] = mapped_column(JSON, default=list, nullable=False)
    answers: Mapped[Dict[str, List[str]]] = mapped_column(JSON, default=dict, nullable=False)
    current_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), default="active", nullable=False, index=True)
    score: Mapped[Optional[int]] = mapped_column(Integer)
    correct_count: Mapped[Optional[int]] = mapped_column(Integer)


class AcademyWrongQuestion(Base):
    __tablename__ = "academy_wrong_questions"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_academy_wrong_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("academy_questions.id", ondelete="CASCADE"), index=True)
    wrong_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_wrong_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AcademySubsidyPolicy(Base):
    __tablename__ = "academy_subsidy_policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="待核验", nullable=False)
    effective_date: Mapped[Optional[datetime]] = mapped_column(Date)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    materials: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AcademySchedule(Base):
    __tablename__ = "academy_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), default="排课", nullable=False)
    schedule_date: Mapped[Optional[datetime]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default="normal", nullable=False, index=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(String(500))


class AcademyAttendance(Base):
    __tablename__ = "academy_attendance"
    __table_args__ = (UniqueConstraint("institution_id", "student_id", "attendance_date", name="uq_academy_attendance"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    institution_id: Mapped[int] = mapped_column(ForeignKey("academy_institutions.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    attendance_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
