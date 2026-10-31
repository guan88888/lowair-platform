from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MessageConversation(Base):
    __tablename__ = "message_conversations"
    __table_args__ = (UniqueConstraint("business_type", "business_id", name="uq_message_business_conversation"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_type: Mapped[str] = mapped_column(String(48), nullable=False, default="direct")
    business_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active")
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MessageParticipant(Base):
    __tablename__ = "message_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_message_participant"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("message_conversations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_message_conversation_created", "conversation_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("message_conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    media_asset_ids: Mapped[List[int]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MessageReadReceipt(Base):
    __tablename__ = "message_read_receipts"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_read_receipt"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserNotification(Base):
    __tablename__ = "user_notifications"
    __table_args__ = (Index("ix_notification_recipient_created", "recipient_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(48), nullable=False, default="system")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(String(1000), nullable=False)
    business_type: Mapped[Optional[str]] = mapped_column(String(48))
    business_id: Mapped[Optional[str]] = mapped_column(String(64))
    payload: Mapped[Any] = mapped_column(JSON, default=dict, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
