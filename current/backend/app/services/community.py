"""Moderated community-domain business rules."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.models.community import (
    CommunityComment, CommunityKnowledgeEntry, CommunityLiveComment,
    CommunityLiveRoom, CommunityNearbyPlace, CommunityPost, CommunityPostMedia,
    CommunityPresence, CommunityReaction, CommunityReport, CommunityTopic,
)
from app.models.platform import AuditLog, MediaAsset, UserRole
from app.models.user import User

PUBLIC_POST_STATUS = "approved"
MEDIA_MIMES = {"image/jpeg": "image", "image/png": "image", "image/webp": "image", "video/mp4": "video", "video/quicktime": "video"}
MANUAL_REVIEW_TERMS = ("绕过审批", "无证飞行", "禁飞区起飞", "攻击", "爆炸")


def fail(code: str, message: str, code_status: int = 400) -> None:
    raise HTTPException(status_code=code_status, detail={"code": code, "message": message})


def iso(value: Any) -> str:
    return value.isoformat() if value else ""


def media_url(asset_id: int) -> str:
    # The actual public delivery endpoint verifies that the asset is attached to
    # an approved community post before streaming it.
    return "/api/v1/community/media/{0}".format(asset_id)


def moderation_status_for(*values: str) -> str:
    """A conservative synchronous gate; media still has an explicit review state."""
    text = " ".join(values).lower()
    return "pending" if any(term in text for term in MANUAL_REVIEW_TERMS) else "approved"


def topic_for(db: Session, name: str) -> CommunityTopic:
    topic = db.scalar(select(CommunityTopic).where(CommunityTopic.name == name))
    if not topic:
        topic = CommunityTopic(name=name)
        db.add(topic); db.flush()
    if topic.status != "active":
        fail("TOPIC_UNAVAILABLE", "该话题暂不可发布", status.HTTP_409_CONFLICT)
    return topic


def visible_post(db: Session, post_id: int, user: Optional[User] = None) -> CommunityPost:
    post = db.get(CommunityPost, post_id)
    if not post or post.deleted_at:
        fail("POST_NOT_FOUND", "内容不存在或已删除", status.HTTP_404_NOT_FOUND)
    if post.moderation_status != PUBLIC_POST_STATUS and (not user or post.author_id != user.id):
        fail("POST_NOT_FOUND", "内容不存在或暂不可见", status.HTTP_404_NOT_FOUND)
    return post


def _author(db: Session, user_id: int) -> dict:
    user = db.get(User, user_id)
    name = user.nickname if user else "已注销用户"
    official = bool(db.scalar(select(UserRole.id).where(UserRole.user_id == user_id, UserRole.role == "admin")))
    return {"id": str(user_id), "name": name, "avatar": name[:1] or "用", "official": official}


def _comments(db: Session, post: CommunityPost, user: Optional[User]) -> List[dict]:
    stmt = select(CommunityComment).where(CommunityComment.post_id == post.id, CommunityComment.deleted_at.is_(None))
    if user and user.id == post.author_id:
        stmt = stmt.where(or_(CommunityComment.moderation_status == "approved", CommunityComment.author_id == user.id))
    else:
        stmt = stmt.where(CommunityComment.moderation_status == "approved")
    rows = list(db.scalars(stmt.order_by(CommunityComment.created_at.asc(), CommunityComment.id.asc())))
    return [{"id": str(row.id), "author": _author(db, row.author_id)["name"], "content": row.content,
             "createdAt": iso(row.created_at), "parentId": str(row.parent_id) if row.parent_id else ""} for row in rows]


def post_payload(db: Session, post: CommunityPost, user: Optional[User] = None, include_comments: bool = False) -> dict:
    all_media = list(db.scalars(select(CommunityPostMedia).where(CommunityPostMedia.post_id == post.id).order_by(CommunityPostMedia.sort_order)))
    media = [{"id": str(row.id), "assetId": str(row.media_asset_id), "type": row.media_type,
              "url": media_url(row.media_asset_id), "poster": media_url(row.media_asset_id) if row.media_type == "video" else ""}
             for row in all_media if row.moderation_status == "approved" or (user and user.id == post.author_id)]
    likes = db.scalar(select(func.count()).select_from(CommunityReaction).where(CommunityReaction.post_id == post.id, CommunityReaction.reaction_type == "like")) or 0
    comments_count = db.scalar(select(func.count()).select_from(CommunityComment).where(CommunityComment.post_id == post.id, CommunityComment.deleted_at.is_(None), CommunityComment.moderation_status == "approved")) or 0
    reaction_types = set()
    if user:
        reaction_types = set(db.scalars(select(CommunityReaction.reaction_type).where(CommunityReaction.post_id == post.id, CommunityReaction.user_id == user.id)))
    topic = db.get(CommunityTopic, post.topic_id) if post.topic_id else None
    shares = db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.resource_type == "community_post", AuditLog.resource_id == str(post.id), AuditLog.action == "community.post.shared")) or 0
    payload = {"id": str(post.id), "author": _author(db, post.author_id), "owner": bool(user and post.author_id == user.id),
               "createdAt": iso(post.created_at), "topic": topic.name if topic else "未分类", "visibility": post.visibility,
               "title": post.title, "content": post.content, "type": post.post_type, "media": media,
               "stats": {"likes": likes, "comments": comments_count, "shares": shares}, "liked": "like" in reaction_types,
               "saved": "save" in reaction_types, "moderationStatus": post.moderation_status,
               "city": post.city or "", "district": post.district or ""}
    if include_comments:
        payload["comments"] = _comments(db, post, user)
    return payload


def list_posts(db: Session, *, tab: str, city: str, page: int, page_size: int, user: Optional[User], cursor_id: Optional[int] = None) -> dict:
    stmt = select(CommunityPost).where(CommunityPost.deleted_at.is_(None), CommunityPost.moderation_status == PUBLIC_POST_STATUS)
    # "关注" has no relationship model yet, so it is intentionally an empty, truthful feed.
    if tab == "关注": stmt = stmt.where(False)
    elif tab == "同城" and city: stmt = stmt.where(CommunityPost.city == city)
    elif tab == "官方": stmt = stmt.where(CommunityPost.author_id.in_(select(UserRole.user_id).where(UserRole.role == "admin")))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    if cursor_id:
        stmt = stmt.where(CommunityPost.id < cursor_id)
        page = 1
    rows = list(db.scalars(stmt.order_by(CommunityPost.created_at.desc(), CommunityPost.id.desc()).offset((page - 1) * page_size).limit(page_size)))
    return {"items": [post_payload(db, item, user) for item in rows], "page": page, "page_size": page_size, "total": total,
            "has_more": page * page_size < total, "nextCursor": str(rows[-1].id) if rows and page * page_size < total else "", "hasMore": page * page_size < total}


def _rate_limit(db: Session, model, field, user_id: int, seconds: int, maximum: int, code: str) -> None:
    since = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    recent = db.scalar(select(func.count()).select_from(model).where(field == user_id, model.created_at >= since)) or 0
    if recent >= maximum:
        fail(code, "操作过于频繁，请稍后再试", status.HTTP_429_TOO_MANY_REQUESTS)


def _validate_media(db: Session, user: User, media_refs: list, post_type: str) -> list:
    if post_type == "视频" and len(media_refs) > 1:
        fail("VIDEO_MEDIA_LIMIT", "视频内容最多包含一个视频", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if post_type == "图文" and len(media_refs) > 9:
        fail("IMAGE_MEDIA_LIMIT", "图文最多包含九个媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
    assets = []
    for ref in media_refs:
        asset_id = ref.media_asset_id()
        if not asset_id:
            fail("MEDIA_REFERENCE_REQUIRED", "媒体必须先完成受保护上传", status.HTTP_422_UNPROCESSABLE_ENTITY)
        asset = db.get(MediaAsset, asset_id)
        if not asset or asset.owner_id != user.id or asset.status != "available":
            fail("MEDIA_FORBIDDEN", "媒体不存在、不可用或不属于当前用户", status.HTTP_403_FORBIDDEN)
        kind = MEDIA_MIMES.get(asset.mime_type)
        if not kind:
            fail("UNSUPPORTED_MEDIA_TYPE", "仅支持图片或视频媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
        if post_type == "视频" and kind != "video":
            fail("POST_MEDIA_MISMATCH", "视频动态只能使用视频媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
        if post_type == "图文" and kind != "image":
            fail("POST_MEDIA_MISMATCH", "图文动态只能使用图片媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
        assets.append((asset, kind, ref.durationSeconds))
    if len({item[0].id for item in assets}) != len(assets):
        fail("DUPLICATE_MEDIA", "不能重复引用同一媒体", status.HTTP_422_UNPROCESSABLE_ENTITY)
    return assets


def create_post(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    _rate_limit(db, CommunityPost, CommunityPost.author_id, user.id, 60, 5, "POST_RATE_LIMITED")
    location = payload.location or {}
    city = str(location.get("city") or "").strip()[:64] or None
    district = str(location.get("district") or "").strip()[:64] or None
    # Intentionally discard precise/location coordinates before persistence.
    topic = topic_for(db, payload.topic)
    media = _validate_media(db, user, payload.media, payload.type)
    moderation_status = moderation_status_for(payload.title, payload.content, payload.topic)
    post = CommunityPost(author_id=user.id, topic_id=topic.id, title=payload.title, content=payload.content,
                         post_type="video" if payload.type == "视频" else "image", visibility=payload.visibility,
                         city=city, district=district, moderation_status=moderation_status)
    db.add(post); db.flush()
    for index, (asset, kind, duration) in enumerate(media):
        db.add(CommunityPostMedia(post_id=post.id, media_asset_id=asset.id, media_type=kind, duration_seconds=duration, sort_order=index, moderation_status=moderation_status))
    write_audit_log(db, actor_id=user.id, action="community.post.created", resource_type="community_post", resource_id=post.id,
                    after={"topic": topic.name, "media_count": len(media), "moderation_status": moderation_status}, request_id=request_id)
    db.commit(); db.refresh(post)
    return post_payload(db, post, user, include_comments=True)


def update_reaction(db: Session, user: User, post_id: int, reaction_type: str, active: bool, request_id: Optional[str] = None) -> dict:
    post = visible_post(db, post_id, user)
    existing = db.scalar(select(CommunityReaction).where(CommunityReaction.user_id == user.id, CommunityReaction.post_id == post.id, CommunityReaction.reaction_type == reaction_type))
    if active and not existing:
        db.add(CommunityReaction(user_id=user.id, post_id=post.id, reaction_type=reaction_type))
    elif not active and existing:
        db.delete(existing)
    write_audit_log(db, actor_id=user.id, action="community.reaction.updated", resource_type="community_post", resource_id=post.id,
                    after={"type": reaction_type, "active": active}, request_id=request_id)
    db.commit()
    return post_payload(db, post, user)


def share_post(db: Session, user: User, post_id: int, request_id: Optional[str] = None) -> dict:
    post = visible_post(db, post_id, user)
    write_audit_log(db, actor_id=user.id, action="community.post.shared", resource_type="community_post", resource_id=post.id,
                    after={"channel": "copy_link"}, request_id=request_id)
    db.commit()
    return post_payload(db, post, user)


def add_comment(db: Session, user: User, post_id: int, content: str, parent_id: Optional[int], request_id: Optional[str] = None) -> dict:
    post = visible_post(db, post_id, user)
    _rate_limit(db, CommunityComment, CommunityComment.author_id, user.id, 60, 20, "COMMENT_RATE_LIMITED")
    if parent_id:
        parent = db.get(CommunityComment, parent_id)
        if not parent or parent.post_id != post.id or parent.deleted_at:
            fail("COMMENT_PARENT_NOT_FOUND", "回复目标不存在", status.HTTP_422_UNPROCESSABLE_ENTITY)
    moderation_status = moderation_status_for(content)
    comment = CommunityComment(post_id=post.id, author_id=user.id, parent_id=parent_id, content=content, moderation_status=moderation_status)
    db.add(comment); db.flush()
    write_audit_log(db, actor_id=user.id, action="community.comment.created", resource_type="community_comment", resource_id=comment.id,
                    after={"post_id": post.id, "moderation_status": moderation_status}, request_id=request_id)
    db.commit(); db.refresh(comment)
    return {"id": str(comment.id), "author": _author(db, user.id)["name"], "content": comment.content, "createdAt": iso(comment.created_at), "parentId": str(parent_id) if parent_id else "", "moderationStatus": comment.moderation_status}


def delete_post(db: Session, user: User, post_id: int, request_id: Optional[str] = None) -> None:
    post = db.get(CommunityPost, post_id)
    if not post or post.deleted_at:
        fail("POST_NOT_FOUND", "内容不存在或已删除", status.HTTP_404_NOT_FOUND)
    if post.author_id != user.id:
        fail("POST_DELETE_FORBIDDEN", "只能删除自己的动态", status.HTTP_403_FORBIDDEN)
    post.deleted_at = datetime.now(timezone.utc)
    write_audit_log(db, actor_id=user.id, action="community.post.deleted", resource_type="community_post", resource_id=post.id,
                    before={"moderation_status": post.moderation_status}, after={"deleted": True}, request_id=request_id)
    db.commit()


def _target_exists(db: Session, target_type: str, target_id: str) -> bool:
    lookup = {"post": CommunityPost, "comment": CommunityComment, "knowledge": CommunityKnowledgeEntry,
              "field": CommunityNearbyPlace, "live-comment": CommunityLiveComment}
    if target_type == "ai": return target_id.isdigit()
    model = lookup.get(target_type)
    return bool(model and target_id.isdigit() and db.get(model, int(target_id)))


def report_content(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    if not _target_exists(db, payload.targetType, payload.targetId):
        fail("REPORT_TARGET_NOT_FOUND", "举报对象不存在", status.HTTP_404_NOT_FOUND)
    existing = db.scalar(select(CommunityReport).where(CommunityReport.reporter_id == user.id, CommunityReport.target_type == payload.targetType,
        CommunityReport.target_id == payload.targetId, CommunityReport.reason == payload.reason))
    if existing:
        return {"id": str(existing.id), "status": existing.status, "duplicate": True}
    report = CommunityReport(reporter_id=user.id, target_type=payload.targetType, target_id=payload.targetId, reason=payload.reason, details=payload.details)
    db.add(report); db.flush()
    write_audit_log(db, actor_id=user.id, action="community.report.created", resource_type="community_report", resource_id=report.id,
                    after={"target_type": report.target_type, "target_id": report.target_id}, request_id=request_id)
    db.commit()
    return {"id": str(report.id), "status": report.status, "duplicate": False}


def authorized_media(db: Session, asset_id: int) -> MediaAsset:
    asset = db.get(MediaAsset, asset_id)
    linked = db.scalar(select(CommunityPostMedia.id).join(CommunityPost).where(
        CommunityPostMedia.media_asset_id == asset_id, CommunityPost.deleted_at.is_(None),
        CommunityPost.moderation_status == "approved", CommunityPostMedia.moderation_status == "approved",
    ))
    if not asset or not linked:
        fail("COMMUNITY_MEDIA_NOT_FOUND", "媒体不存在或暂不可公开", status.HTTP_404_NOT_FOUND)
    return asset


def register_media(db: Session, user: User, asset_id: Optional[int], claimed_type: str, duration: Optional[int], request_id: Optional[str] = None) -> dict:
    if not asset_id:
        fail("MEDIA_REFERENCE_REQUIRED", "请先通过上传接口取得媒体编号", status.HTTP_422_UNPROCESSABLE_ENTITY)
    asset = db.get(MediaAsset, asset_id)
    if not asset or asset.owner_id != user.id or asset.status != "available":
        fail("MEDIA_FORBIDDEN", "媒体不存在、不可用或不属于当前用户", status.HTTP_403_FORBIDDEN)
    kind = MEDIA_MIMES.get(asset.mime_type)
    if not kind:
        fail("UNSUPPORTED_MEDIA_TYPE", "仅支持图片或视频", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if claimed_type and claimed_type.lower() not in {kind, "image" if kind == "image" else "video"}:
        fail("MEDIA_TYPE_MISMATCH", "媒体类型与实际文件不一致", status.HTTP_422_UNPROCESSABLE_ENTITY)
    write_audit_log(db, actor_id=user.id, action="community.media.registered", resource_type="media_asset", resource_id=asset.id,
                    after={"type": kind, "duration_seconds": duration}, request_id=request_id)
    db.commit()
    return {"id": str(asset.id), "assetId": str(asset.id), "type": kind, "url": media_url(asset.id), "name": asset.name,
            "durationSeconds": duration, "status": "ready"}


def knowledge_list(db: Session, source_type: str, keyword: str, page: int, page_size: int) -> dict:
    stmt = select(CommunityKnowledgeEntry).where(CommunityKnowledgeEntry.status == "published")
    if source_type and source_type != "all": stmt = stmt.where(CommunityKnowledgeEntry.source_type == source_type)
    if keyword.strip():
        term = "%{0}%".format(keyword.strip())
        stmt = stmt.where(or_(CommunityKnowledgeEntry.title.ilike(term), CommunityKnowledgeEntry.summary.ilike(term), CommunityKnowledgeEntry.source_name.ilike(term)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(CommunityKnowledgeEntry.updated_at.desc(), CommunityKnowledgeEntry.id.desc()).offset((page - 1) * page_size).limit(page_size)))
    items = [{"id": str(row.id), "sourceType": row.source_type, "title": row.title, "summary": row.summary,
              "sourceName": row.source_name, "sourceUrl": row.source_url or "", "sourceStatus": row.source_status,
              "verified": row.source_type in ("regulation", "official") and row.source_status not in ("待核验", "失效"),
              "updatedAt": iso(row.updated_at), "version": row.version} for row in rows]
    return {"items": items, "page": page, "page_size": page_size, "total": total, "has_more": page * page_size < total}


def live_rooms(db: Session, state_filter: str, page: int, page_size: int) -> dict:
    stmt = select(CommunityLiveRoom)
    if state_filter and state_filter != "all": stmt = stmt.where(CommunityLiveRoom.state == state_filter)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rooms = list(db.scalars(stmt.order_by(CommunityLiveRoom.created_at.desc(), CommunityLiveRoom.id.desc()).offset((page - 1) * page_size).limit(page_size)))
    items = []
    for room in rooms:
        comments = list(db.scalars(select(CommunityLiveComment).where(CommunityLiveComment.room_id == room.id, CommunityLiveComment.moderation_status == "approved").order_by(CommunityLiveComment.created_at.asc()).limit(100)))
        host = _author(db, room.host_id)["name"] if room.host_id else "平台直播"
        items.append({"id": str(room.id), "state": room.state, "title": room.title, "host": host, "schedule": room.schedule_text,
                      "cover": media_url(room.cover_asset_id) if room.cover_asset_id else "", "streamUrl": room.stream_url if room.state in ("live", "replay") else "",
                      "viewers": room.viewer_count, "comments": [{"id": str(item.id), "author": _author(db, item.author_id)["name"], "content": item.content} for item in comments]})
    return {"items": items, "page": page, "page_size": page_size, "total": total, "has_more": page * page_size < total}


def add_live_comment(db: Session, user: User, room_id: int, content: str, request_id: Optional[str] = None) -> dict:
    room = db.get(CommunityLiveRoom, room_id)
    if not room: fail("LIVE_ROOM_NOT_FOUND", "直播间不存在", status.HTTP_404_NOT_FOUND)
    if room.state != "live": fail("LIVE_COMMENT_UNAVAILABLE", "当前直播间不接受实时评论", status.HTTP_409_CONFLICT)
    _rate_limit(db, CommunityLiveComment, CommunityLiveComment.author_id, user.id, 60, 20, "LIVE_COMMENT_RATE_LIMITED")
    moderation_status = moderation_status_for(content)
    comment = CommunityLiveComment(room_id=room.id, author_id=user.id, content=content.strip(), moderation_status=moderation_status)
    db.add(comment); db.flush()
    write_audit_log(db, actor_id=user.id, action="community.live_comment.created", resource_type="community_live_comment", resource_id=comment.id,
                    after={"room_id": room.id, "moderation_status": moderation_status}, request_id=request_id)
    db.commit(); db.refresh(comment)
    return {"id": str(comment.id), "author": _author(db, user.id)["name"], "content": comment.content, "moderationStatus": comment.moderation_status}


def nearby(db: Session, city: str, latitude: Optional[float], longitude: Optional[float]) -> dict:
    # lat/lon are used only inside this request. No response field or database write includes them.
    stmt = select(CommunityPresence).where(CommunityPresence.city == city, CommunityPresence.enabled.is_(True))
    friends = []
    for presence in db.scalars(stmt.order_by(CommunityPresence.updated_at.desc()).limit(50)):
        user = db.get(User, presence.user_id)
        friends.append({"id": str(presence.user_id), "name": user.nickname if user else "匿名飞友", "area": presence.district or "市辖区",
                        "specialty": presence.specialty, "distance": "同区活跃" if presence.district else "同城", "exact": False})
    places = list(db.scalars(select(CommunityNearbyPlace).where(CommunityNearbyPlace.city == city).order_by(CommunityNearbyPlace.updated_at.desc()).limit(100)))
    fields = [{"id": str(item.id), "name": item.name, "area": item.district or "市辖区", "risk": item.risk_status, "source": item.source_name, "note": item.note}
              for item in places if item.place_type == "field"]
    events = [{"id": str(item.id), "name": item.name, "area": item.district or "市辖区", "schedule": item.schedule_text, "status": item.status}
              for item in places if item.place_type == "event"]
    return {"city": city, "friends": friends, "fields": fields, "events": events,
            "source": "社区地点服务（区级脱敏）", "updatedAt": iso(datetime.now(timezone.utc)), "located": latitude is not None,
            "meta": {"locationPrecision": "district", "coordinatesStored": False, "dataSource": "community"}}


def nearby_places(db: Session, city: str, page: int, page_size: int) -> dict:
    stmt = select(CommunityNearbyPlace).where(CommunityNearbyPlace.place_type == "field")
    if city: stmt = stmt.where(CommunityNearbyPlace.city == city)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.order_by(CommunityNearbyPlace.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)))
    return {"items": [{"id": str(item.id), "name": item.name, "city": item.city, "area": item.district or "市辖区", "risk": item.risk_status,
                        "source": item.source_name, "note": item.note} for item in rows], "page": page, "page_size": page_size,
            "total": total, "has_more": page * page_size < total}
