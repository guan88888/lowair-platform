from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.v1.endpoints.uploads import _local_path
from app.core.pagination import PageParams, get_page_params
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.messages import ConversationCreate, MarkRead, MessageCreate
from app.services import messages as service

router = APIRouter()


def request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


@router.get("")
def get_messages(category: str = Query("all", max_length=48), params: PageParams = Depends(get_page_params), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.list_items(db, user, category, params.page, params.page_size)


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def post_conversation(payload: ConversationCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Direct chat is the only user-created conversation. Business services call
    # create_business_conversation after deriving both participants server-side.
    if payload.businessType != "direct":
        service.fail("BUSINESS_CONVERSATION_SERVICE_ONLY", "业务会话必须由对应业务服务创建", status.HTTP_403_FORBIDDEN)
    if payload.businessId:
        service.fail("DIRECT_BUSINESS_ID_FORBIDDEN", "直接会话不能指定业务标识", status.HTTP_422_UNPROCESSABLE_ENTITY)
    conversation = service.create_direct_conversation(db, user, payload.participantId, request_id(request))
    db.commit(); db.refresh(conversation)
    return service.conversation_payload(db, conversation, user, include_messages=True)


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = service.assert_participant(db, conversation_id, user.id)
    service.mark_conversation_read(db, user, conversation.id, request_id(request))
    return service.conversation_payload(db, conversation, user, include_messages=True)


@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def post_message(conversation_id: int, payload: MessageCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.send_message(db, user, conversation_id, payload.content, payload.mediaAssetIds, request_id(request))


@router.post("/{notification_id}/read")
def post_notification_read(notification_id: int, request: Request, payload: Optional[MarkRead] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload and payload.itemType == "conversation":
        count = service.mark_conversation_read(db, user, notification_id, request_id(request))
        return {"id": str(notification_id), "read": True, "count": count}
    return service.mark_notification_read(db, user, notification_id, request_id(request))


@router.get("/unread-count")
def get_unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.unread_count(db, user.id)


@router.get("/media/{asset_id}")
def get_message_media(asset_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FileResponse:
    asset = service.message_media_asset(db, user, asset_id)
    path = _local_path(asset.storage_key)
    if not path.is_file(): service.fail("MESSAGE_MEDIA_NOT_FOUND", "媒体文件不存在", status.HTTP_404_NOT_FOUND)
    return FileResponse(path, media_type=asset.mime_type, filename=Path(asset.name).name)
