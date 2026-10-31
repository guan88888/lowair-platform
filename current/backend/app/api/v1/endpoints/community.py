from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.v1.endpoints.uploads import _local_path
from app.core.pagination import PageParams, get_page_params
from app.db.session import get_db
from app.dependencies.auth import bearer_scheme, get_current_user, optional_current_user_from_credentials
from app.models.user import User
from app.schemas.community import (
    CommentCreate, CommunityMediaCreate, LiveCommentCreate, PostCreate,
    ReactionUpdate, ReportCreate,
)
from app.services import community as service

router = APIRouter()


def request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


def optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    return optional_current_user_from_credentials(credentials, db)


@router.get("/posts")
def get_posts(
    tab: str = Query("推荐", max_length=16), city: str = Query("", max_length=64),
    cursor: str = Query("", max_length=64), limit: Optional[int] = Query(None, ge=1, le=100),
    params: PageParams = Depends(get_page_params), user: Optional[User] = Depends(optional_current_user), db: Session = Depends(get_db),
):
    cursor_id = int(cursor) if cursor.isdigit() else None
    return service.list_posts(db, tab=tab, city=city, page=params.page, page_size=limit or params.page_size, user=user, cursor_id=cursor_id)


@router.get("/posts/{post_id}")
def get_post(post_id: int, user: Optional[User] = Depends(optional_current_user), db: Session = Depends(get_db)):
    post = service.visible_post(db, post_id, user)
    return service.post_payload(db, post, user, include_comments=True)


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def post_post(payload: PostCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_post(db, user, payload, request_id(request))


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_post(post_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service.delete_post(db, user, post_id, request_id(request))


@router.put("/posts/{post_id}/reactions")
def put_reaction(post_id: int, payload: ReactionUpdate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_reaction(db, user, post_id, payload.type, payload.active, request_id(request))


@router.post("/posts/{post_id}/shares")
def post_share(post_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.share_post(db, user, post_id, request_id(request))


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def post_comment(post_id: int, payload: CommentCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.add_comment(db, user, post_id, payload.content, payload.parentId, request_id(request))


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def post_report(payload: ReportCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.report_content(db, user, payload, request_id(request))


@router.post("/media", status_code=status.HTTP_201_CREATED)
def post_media(payload: CommunityMediaCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.register_media(db, user, payload.media_asset_id(), payload.type, payload.durationSeconds, request_id(request))


@router.get("/media/{asset_id}", name="get_community_media")
def get_community_media(asset_id: int, db: Session = Depends(get_db)) -> FileResponse:
    asset = service.authorized_media(db, asset_id)
    path = _local_path(asset.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail={"code": "COMMUNITY_MEDIA_NOT_FOUND", "message": "媒体文件不存在"})
    return FileResponse(path, media_type=asset.mime_type, filename=Path(asset.name).name)


@router.get("/knowledge")
def get_knowledge(
    type: str = Query("all", max_length=24), keyword: str = Query("", max_length=100),
    params: PageParams = Depends(get_page_params), db: Session = Depends(get_db),
):
    if type not in {"all", "regulation", "official", "user"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_KNOWLEDGE_TYPE", "message": "知识来源类型不合法"})
    return service.knowledge_list(db, type, keyword, params.page, params.page_size)


@router.get("/live-rooms")
def get_live_rooms(
    state: str = Query("all", max_length=24), params: PageParams = Depends(get_page_params), db: Session = Depends(get_db),
):
    if state not in {"all", "scheduled", "live", "replay"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_LIVE_STATE", "message": "直播状态不合法"})
    return service.live_rooms(db, state, params.page, params.page_size)


@router.post("/live-rooms/{room_id}/comments", status_code=status.HTTP_201_CREATED)
def post_live_comment(room_id: int, payload: LiveCommentCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.add_live_comment(db, user, room_id, payload.content, request_id(request))


@router.get("/nearby")
def get_nearby(
    city: str = Query(..., min_length=1, max_length=64), latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180), db: Session = Depends(get_db),
):
    if (latitude is None) != (longitude is None):
        raise HTTPException(status_code=422, detail={"code": "INCOMPLETE_LOCATION", "message": "经纬度必须同时提供"})
    return service.nearby(db, city, latitude, longitude)


@router.get("/nearby-places")
def get_nearby_places(city: str = Query("", max_length=64), params: PageParams = Depends(get_page_params), db: Session = Depends(get_db)):
    return service.nearby_places(db, city, params.page, params.page_size)


@router.post("/posts/{post_id}/ai-suggestion")
def post_ai_suggestion(post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service.visible_post(db, post_id, user)
    # Model execution belongs to the assistant domain. Never synthesize a safety,
    # airspace, weather, or permit answer in this endpoint while unavailable.
    raise HTTPException(status_code=503, detail={"code": "AI_SUGGESTION_UNAVAILABLE", "message": "社区 AI 建议服务暂不可用"})
