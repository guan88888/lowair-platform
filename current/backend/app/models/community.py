"""Database models for moderated community content and local discovery."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CommunityTopic(Base):
    __tablename__ = "community_topics"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(48), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), default="active", nullable=False)


class CommunityPost(Base):
    __tablename__ = "community_posts"
    __table_args__ = (Index("ix_community_post_feed", "moderation_status", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic_id: Mapped[Optional[int]] = mapped_column(ForeignKey("community_topics.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(60), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    post_type: Mapped[str] = mapped_column(String(16), default="image", nullable=False)
    visibility: Mapped[str] = mapped_column(String(24), default="public", nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    district: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    # Never store a publishable coordinate in the post. It is intentionally absent.
    moderation_status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    moderation_reason: Mapped[Optional[str]] = mapped_column(String(500))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CommunityPostMedia(Base):
    __tablename__ = "community_post_media"
    __table_args__ = (UniqueConstraint("post_id", "media_asset_id", name="uq_community_post_media"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    media_asset_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id", ondelete="RESTRICT"), index=True)
    media_type: Mapped[str] = mapped_column(String(16), nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    moderation_status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)


class CommunityReaction(Base):
    __tablename__ = "community_reactions"
    __table_args__ = (UniqueConstraint("user_id", "post_id", "reaction_type", name="uq_community_reaction"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    reaction_type: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityComment(Base):
    __tablename__ = "community_comments"
    __table_args__ = (Index("ix_community_comment_post", "post_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("community_comments.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(String(300), nullable=False)
    moderation_status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityReport(Base):
    __tablename__ = "community_reports"
    __table_args__ = (UniqueConstraint("reporter_id", "target_type", "target_id", "reason", name="uq_community_report"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(300), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityKnowledgeEntry(Base):
    __tablename__ = "community_knowledge_entries"
    __table_args__ = (Index("ix_community_knowledge_lookup", "source_type", "status", "updated_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    source_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024))
    source_status: Mapped[str] = mapped_column(String(64), default="待核验", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="published", nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CommunityKnowledgeVersion(Base):
    __tablename__ = "community_knowledge_versions"
    __table_args__ = (UniqueConstraint("entry_id", "version", name="uq_community_knowledge_version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("community_knowledge_entries.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityLiveRoom(Base):
    __tablename__ = "community_live_rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(24), default="scheduled", nullable=False, index=True)
    cover_asset_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"))
    stream_url: Mapped[Optional[str]] = mapped_column(String(1024))
    schedule_text: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    viewer_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityLiveComment(Base):
    __tablename__ = "community_live_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("community_live_rooms.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(String(300), nullable=False)
    moderation_status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityLiveSubscription(Base):
    __tablename__ = "community_live_subscriptions"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_community_live_subscription"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("community_live_rooms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CommunityPresence(Base):
    """Opt-in, coarse city/district presence; exact coordinate is never persisted."""
    __tablename__ = "community_presences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_community_presence_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    specialty: Mapped[str] = mapped_column(String(120), default="低空飞行交流", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CommunityNearbyPlace(Base):
    __tablename__ = "community_nearby_places"

    id: Mapped[int] = mapped_column(primary_key=True)
    place_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    city: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    schedule_text: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="待核验", nullable=False)
    risk_status: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # Centroid values only support server-side approximate ranking. Never return them.
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
