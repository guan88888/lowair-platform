"""Reusable notification and conversation services for every business domain."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.models.messages import Message, MessageConversation, MessageParticipant, MessageReadReceipt, UserNotification
from app.models.platform import MediaAsset
from app.models.user import User


def fail(code: str, message: str, code_status: int = 400) -> None:
    raise HTTPException(status_code=code_status, detail={"code": code, "message": message})


def iso(value: Any) -> str:
    return value.isoformat() if value else ""


def participant_ids(db: Session, conversation_id: int) -> set:
    return set(db.scalars(select(MessageParticipant.user_id).where(MessageParticipant.conversation_id == conversation_id, MessageParticipant.left_at.is_(None))))


def assert_participant(db: Session, conversation_id: int, user_id: int) -> MessageConversation:
    conversation = db.get(MessageConversation, conversation_id)
    if not conversation:
        fail("CONVERSATION_NOT_FOUND", "会话不存在", status.HTTP_404_NOT_FOUND)
    if user_id not in participant_ids(db, conversation_id):
        fail("CONVERSATION_FORBIDDEN", "无权访问该会话", status.HTTP_403_FORBIDDEN)
    return conversation


def create_business_conversation(
    db: Session, *, participant_user_ids: Sequence[int], business_type: str, business_id: str,
    request_id: Optional[str] = None, actor_id: Optional[int] = None,
) -> MessageConversation:
    """Get or create one idempotent, service-owned business conversation.

    Call this from academy/work/market rather than constructing participant SQL in
    those domains. The caller must already have derived participants from its own
    authorised business object.
    """
    ids = sorted(set(int(item) for item in participant_user_ids))
    if len(ids) < 2 or not business_type or not business_id:
        raise ValueError("业务会话必须有两个参与人和业务标识")
    if len(ids) != len(set(db.scalars(select(User.id).where(User.id.in_(ids))))):
        raise ValueError("业务会话包含不存在的用户")
    conversation = db.scalar(select(MessageConversation).where(MessageConversation.business_type == business_type, MessageConversation.business_id == str(business_id)))
    if conversation:
        existing = participant_ids(db, conversation.id)
        if existing != set(ids):
            raise ValueError("同一业务会话的参与人不一致")
        return conversation
    conversation = MessageConversation(business_type=business_type, business_id=str(business_id))
    db.add(conversation); db.flush()
    for user_id in ids: db.add(MessageParticipant(conversation_id=conversation.id, user_id=user_id))
    # Flush participant rows before a repeated service call in the same transaction.
    db.flush()
    write_audit_log(db, actor_id=actor_id, action="messages.business_conversation.created", resource_type="message_conversation", resource_id=conversation.id,
                    after={"business_type": business_type, "business_id": str(business_id), "participants": ids}, request_id=request_id)
    return conversation


def create_notification(
    db: Session, *, recipient_id: int, category: str, title: str, summary: str,
    business_type: Optional[str] = None, business_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None, actor_id: Optional[int] = None,
    request_id: Optional[str] = None,
) -> UserNotification:
    """Stage a notification in the caller's transaction; the caller owns commit."""
    if not db.get(User, recipient_id):
        raise ValueError("通知接收用户不存在")
    notification = UserNotification(recipient_id=recipient_id, category=category[:48] or "system", title=title[:255], summary=summary[:1000],
                                    business_type=(business_type or "")[:48] or None, business_id=str(business_id)[:64] if business_id is not None else None,
                                    payload=payload or {})
    db.add(notification); db.flush()
    write_audit_log(db, actor_id=actor_id, action="messages.notification.created", resource_type="user_notification", resource_id=notification.id,
                    after={"recipient_id": recipient_id, "category": notification.category}, request_id=request_id)
    return notification


def _media_payload(db: Session, ids: Iterable[int]) -> list:
    result = []
    for asset_id in ids or []:
        asset = db.get(MediaAsset, int(asset_id))
        if asset:
            result.append({"id": str(asset.id), "name": asset.name, "mimeType": asset.mime_type, "url": "/api/v1/messages/media/{0}".format(asset.id)})
    return result


def _message_payload(db: Session, message: Message, user_id: int) -> dict:
    sender = db.get(User, message.sender_id)
    return {"id": str(message.id), "conversationId": str(message.conversation_id), "senderId": str(message.sender_id),
            "sender": sender.nickname if sender else "已注销用户", "content": message.content, "media": _media_payload(db, message.media_asset_ids),
            "status": message.status, "own": message.sender_id == user_id, "createdAt": iso(message.created_at)}


def unread_messages(db: Session, conversation_id: int, user_id: int) -> int:
    receipt_message_ids = select(MessageReadReceipt.message_id).where(MessageReadReceipt.user_id == user_id)
    return db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == conversation_id, Message.sender_id != user_id, Message.id.not_in(receipt_message_ids))) or 0


def conversation_payload(db: Session, conversation: MessageConversation, user: User, include_messages: bool = False) -> dict:
    participants = participant_ids(db, conversation.id)
    counterpart_id = next((item for item in participants if item != user.id), None)
    counterpart = db.get(User, counterpart_id) if counterpart_id else None
    last = db.scalar(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.desc(), Message.id.desc()))
    data = {"id": str(conversation.id), "businessType": conversation.business_type, "businessId": conversation.business_id,
            "status": conversation.status, "updatedAt": iso(conversation.last_message_at or conversation.created_at),
            "counterpart": {"id": str(counterpart.id), "nickname": counterpart.nickname, "phone": ""} if counterpart else None,
            "unread": unread_messages(db, conversation.id, user.id),
            "summary": last.content[:120] if last else "", "lastMessageAt": iso(last.created_at) if last else ""}
    if include_messages:
        messages = list(db.scalars(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc(), Message.id.asc())))
        data["messages"] = [_message_payload(db, item, user.id) for item in messages]
    return data


def list_items(db: Session, user: User, category: str, page: int, page_size: int) -> dict:
    conversation_ids = list(db.scalars(select(MessageParticipant.conversation_id).where(MessageParticipant.user_id == user.id, MessageParticipant.left_at.is_(None))))
    conversations = [db.get(MessageConversation, item) for item in conversation_ids]
    conversations = [item for item in conversations if item and item.status == "active"]
    notifications_stmt = select(UserNotification).where(UserNotification.recipient_id == user.id)
    if category and category != "all": notifications_stmt = notifications_stmt.where(UserNotification.category == category)
    notifications = list(db.scalars(notifications_stmt.order_by(UserNotification.created_at.desc(), UserNotification.id.desc())))
    conversation_items = []
    for conversation in conversations:
        if category and category not in ("all", conversation.business_type): continue
        item = conversation_payload(db, conversation, user)
        conversation_items.append({"id": item["id"], "itemType": "conversation", "category": conversation.business_type,
                                   "title": item["counterpart"]["nickname"] if item["counterpart"] else "业务会话", "summary": item["summary"],
                                   "unread": item["unread"], "time": item["updatedAt"], "to": "/pages/messages/conversation?id=" + item["id"], "conversation": item})
    notification_items = [{"id": str(item.id), "itemType": "notification", "category": item.category, "title": item.title, "summary": item.summary,
                           "unread": item.read_at is None, "time": iso(item.created_at), "to": item.payload.get("to", "") if isinstance(item.payload, dict) else "",
                           "businessType": item.business_type, "businessId": item.business_id} for item in notifications]
    items = sorted(conversation_items + notification_items, key=lambda item: item["time"], reverse=True)
    total = len(items); start = (page - 1) * page_size
    return {"items": items[start:start + page_size], "page": page, "page_size": page_size, "total": total, "has_more": start + page_size < total}


def _validate_media(db: Session, user_id: int, asset_ids: list) -> list:
    cleaned = [int(item) for item in asset_ids]
    if len(cleaned) != len(set(cleaned)):
        fail("DUPLICATE_MESSAGE_MEDIA", "媒体不能重复", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if len(cleaned) > 5: fail("MESSAGE_MEDIA_LIMIT", "最多发送五个媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
    for asset_id in cleaned:
        asset = db.get(MediaAsset, asset_id)
        if not asset or asset.owner_id != user_id or asset.status != "available":
            fail("MESSAGE_MEDIA_FORBIDDEN", "媒体不存在、不可用或不属于当前用户", status.HTTP_403_FORBIDDEN)
        if asset.mime_type not in {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "application/pdf"}:
            fail("MESSAGE_MEDIA_TYPE", "不支持的消息媒体类型", status.HTTP_422_UNPROCESSABLE_ENTITY)
    return cleaned


def send_message(db: Session, user: User, conversation_id: int, content: str, media_asset_ids: list, request_id: Optional[str] = None) -> dict:
    conversation = assert_participant(db, conversation_id, user.id)
    if conversation.status != "active": fail("CONVERSATION_CLOSED", "会话已关闭", status.HTTP_409_CONFLICT)
    content = content.strip()
    asset_ids = _validate_media(db, user.id, media_asset_ids)
    if not content and not asset_ids: fail("EMPTY_MESSAGE", "消息内容不能为空", status.HTTP_422_UNPROCESSABLE_ENTITY)
    since = datetime.now(timezone.utc) - timedelta(minutes=1)
    recent = db.scalar(select(func.count()).select_from(Message).where(Message.sender_id == user.id, Message.created_at >= since)) or 0
    if recent >= 30: fail("MESSAGE_RATE_LIMITED", "发送过于频繁，请稍后再试", status.HTTP_429_TOO_MANY_REQUESTS)
    message = Message(conversation_id=conversation.id, sender_id=user.id, content=content, media_asset_ids=asset_ids)
    db.add(message); db.flush()
    conversation.last_message_at = message.created_at or datetime.now(timezone.utc)
    write_audit_log(db, actor_id=user.id, action="messages.message.sent", resource_type="message", resource_id=message.id,
                    after={"conversation_id": conversation.id, "media_count": len(asset_ids)}, request_id=request_id)
    db.commit(); db.refresh(message)
    return _message_payload(db, message, user.id)


def mark_conversation_read(db: Session, user: User, conversation_id: int, request_id: Optional[str] = None) -> int:
    assert_participant(db, conversation_id, user.id)
    incoming = list(db.scalars(select(Message).where(Message.conversation_id == conversation_id, Message.sender_id != user.id)))
    existing = set(db.scalars(select(MessageReadReceipt.message_id).where(MessageReadReceipt.user_id == user.id, MessageReadReceipt.message_id.in_([item.id for item in incoming]))) if incoming else [])
    for message in incoming:
        if message.id not in existing: db.add(MessageReadReceipt(message_id=message.id, user_id=user.id))
    if incoming:
        write_audit_log(db, actor_id=user.id, action="messages.conversation.read", resource_type="message_conversation", resource_id=conversation_id,
                        after={"read_count": len(incoming) - len(existing)}, request_id=request_id)
        db.commit()
    return len(incoming) - len(existing)


def mark_notification_read(db: Session, user: User, notification_id: int, request_id: Optional[str] = None) -> dict:
    notification = db.get(UserNotification, notification_id)
    if not notification: fail("NOTIFICATION_NOT_FOUND", "通知不存在", status.HTTP_404_NOT_FOUND)
    if notification.recipient_id != user.id: fail("NOTIFICATION_FORBIDDEN", "无权操作该通知", status.HTTP_403_FORBIDDEN)
    if not notification.read_at:
        notification.read_at = datetime.now(timezone.utc)
        write_audit_log(db, actor_id=user.id, action="messages.notification.read", resource_type="user_notification", resource_id=notification.id,
                        after={"read": True}, request_id=request_id)
        db.commit()
    return {"id": str(notification.id), "read": True}


def unread_count(db: Session, user_id: int) -> dict:
    notification_count = db.scalar(select(func.count()).select_from(UserNotification).where(UserNotification.recipient_id == user_id, UserNotification.read_at.is_(None))) or 0
    conversation_ids = list(db.scalars(select(MessageParticipant.conversation_id).where(MessageParticipant.user_id == user_id, MessageParticipant.left_at.is_(None))))
    messages_count = sum(unread_messages(db, item, user_id) for item in conversation_ids)
    return {"total": notification_count + messages_count, "notifications": notification_count, "messages": messages_count}


def create_direct_conversation(db: Session, user: User, recipient_id: int, request_id: Optional[str] = None) -> MessageConversation:
    if recipient_id == user.id: fail("DIRECT_SELF_FORBIDDEN", "不能与自己创建会话", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if not db.get(User, recipient_id): fail("RECIPIENT_NOT_FOUND", "接收方不存在", status.HTTP_404_NOT_FOUND)
    user_ids = sorted([user.id, recipient_id])
    return create_business_conversation(db, participant_user_ids=user_ids, business_type="direct", business_id="direct:{0}:{1}".format(user_ids[0], user_ids[1]), request_id=request_id, actor_id=user.id)


def message_media_asset(db: Session, user: User, asset_id: int) -> MediaAsset:
    asset = db.get(MediaAsset, asset_id)
    if not asset: fail("MESSAGE_MEDIA_NOT_FOUND", "媒体不存在", status.HTTP_404_NOT_FOUND)
    if asset.owner_id == user.id: return asset
    messages = list(db.scalars(select(Message).join(MessageParticipant, MessageParticipant.conversation_id == Message.conversation_id).where(MessageParticipant.user_id == user.id)))
    if not any(asset_id in [int(value) for value in item.media_asset_ids or []] for item in messages):
        fail("MESSAGE_MEDIA_FORBIDDEN", "无权访问该消息媒体", status.HTTP_403_FORBIDDEN)
    return asset
