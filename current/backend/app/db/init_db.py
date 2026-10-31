import re
from typing import Optional

import pymysql
from sqlalchemy import inspect, text

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import (  # noqa: F401
    AcademyAttendance, AcademyCourse, AcademyEnrollment, AcademyExamSession, AssistantConversation,
    AssistantMessage,
    AcademyInstitution, AcademyInstitutionMember, AcademyLearningPlan, AcademyLesson,
    AcademyLessonProgress, AcademyQualification, AcademyQuestion, AcademySchedule,
    AcademySubsidyPolicy, AcademyVisit, AcademyVisitSlot, AcademyWrongQuestion, AuditLog,
    CompanyProfile, CommunityComment, CommunityKnowledgeEntry, CommunityKnowledgeVersion,
    CommunityLiveComment, CommunityLiveRoom, CommunityLiveSubscription, CommunityNearbyPlace,
    CommunityPost, CommunityPostMedia, CommunityPresence, CommunityReaction, CommunityReport,
    CommunityTopic, DeviceHistoryEvent, FlightAdvisory, Fulfillment, FulfillmentEvent,
    HomeContent, InspectionReport, Interview, Job, JobApplication, LedgerEntry, MarketCartItem, MarketOrder,
    MarketOrderAction, MarketProduct, RepairBooking, RepairProvider, MediaAsset, Message, MessageConversation, MessageParticipant,
    MessageReadReceipt, ProviderWebhookEvent, RentalPlan, Resume, Task, TaskBid,
    User, AuthSession, UserProfile, UserRole, Wallet, Favorite, AdPlacement, Creative, Campaign,
    UserNotification, VerificationApplication,
)


def create_database_if_not_exists() -> None:
    if not re.fullmatch(r"[A-Za-z0-9_]+", settings.MYSQL_DATABASE):
        raise ValueError("MYSQL_DATABASE 只能包含字母、数字和下划线")

    connection = pymysql.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.MYSQL_DATABASE}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()


def init_db(*, seed: Optional[bool] = None) -> None:
    create_database_if_not_exists()
    Base.metadata.create_all(bind=engine)
    # The project currently has no migration runner. Keep databases created by
    # earlier development versions compatible with the current models.
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    institution_columns = {column["name"] for column in inspector.get_columns("academy_institutions")}
    course_columns = {column["name"] for column in inspector.get_columns("academy_courses")}
    with engine.begin() as connection:
        if "active_role" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN active_role VARCHAR(32) NOT NULL DEFAULT 'personal'"))
        if "district" not in institution_columns:
            connection.execute(text("ALTER TABLE academy_institutions ADD COLUMN district VARCHAR(64) NOT NULL DEFAULT ''"))
        if "next_start_date" not in course_columns:
            connection.execute(text("ALTER TABLE academy_courses ADD COLUMN next_start_date DATE NULL"))

    # create_all does not add indexes to an already-existing table.
    institution_indexes = {index["name"] for index in inspect(engine).get_indexes("academy_institutions")}
    if "ix_academy_institutions_district" not in institution_indexes:
        with engine.begin() as connection:
            connection.execute(text("CREATE INDEX ix_academy_institutions_district ON academy_institutions (district)"))
    # Keep startup idempotent: create_all only adds missing tables and the seed
    # registry only inserts records identified by stable business keys.
    should_seed = settings.SEED_DEMO_DATA if seed is None else seed
    if should_seed and settings.DEBUG:
        from app.db.session import engine as configured_engine
        if configured_engine.dialect.name != "sqlite":
            from scripts.seed import seed_demo_data
            from app.db.session import SessionLocal
            with SessionLocal() as db:
                seed_demo_data(db)
