from datetime import datetime, timezone
import hashlib
import hmac
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.db.session import get_db
from app.dependencies.auth import bearer_scheme, get_current_user, optional_current_user_from_credentials, require_role
from app.core.config import settings
from app.models.platform import VerificationApplication
from app.models.account import Favorite, LedgerEntry, ProviderWebhookEvent, UserProfile, Wallet
from app.models.platform import MediaAsset
from app.models.user import User
from app.schemas.platform import (
    ProfileResponse,
    VerificationResponse,
    VerificationReview,
    VerificationSubmission,
    VerificationType,
)
from app.schemas.account import ProfileUpdate, WalletAction
from app.services.platform import (
    VERIFICATION_TYPES,
    build_user_response,
    ensure_role,
    list_roles,
    verification_payload,
    verification_records,
)

router = APIRouter()
admin_router = APIRouter()


def _request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


def _optional_user(credentials: Optional[HTTPAuthorizationCredentials], db: Session) -> Optional[User]:
    return optional_current_user_from_credentials(credentials, db)


@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileResponse:
    user = build_user_response(db, current_user)
    return ProfileResponse(**user.model_dump())


def _profile_record(db: Session, user_id: int) -> UserProfile:
    record = db.get(UserProfile, user_id)
    if not record:
        record = UserProfile(user_id=user_id)
        db.add(record)
        db.flush()
    return record


@router.get("/overview")
def get_profile_overview(userId: Optional[int] = Query(None), public: bool = False, credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme), db: Session = Depends(get_db)) -> dict:
    current_user = _optional_user(credentials, db)
    if not current_user and not public:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "登录后可查看本人资料"})
    target = db.get(User, userId or (current_user.id if current_user else None))
    if not target:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "用户不存在"})
    is_owner = bool(current_user and target.id == current_user.id)
    if not is_owner and not public:
        raise HTTPException(status_code=403, detail={"code": "PROFILE_FORBIDDEN", "message": "无权访问该资料"})
    profile = _profile_record(db, target.id)
    if not is_owner and profile.visibility != "public":
        raise HTTPException(status_code=403, detail={"code": "PROFILE_PRIVATE", "message": "该资料未公开"})
    roles = list_roles(db, target.id)
    verifications = verification_records(db, target.id)
    result = {"id": str(target.id), "nickname": target.nickname, "bio": profile.bio, "visibility": profile.visibility,
              "avatarAssetId": str(profile.avatar_asset_id) if profile.avatar_asset_id else None,
              "roles": roles, "verification": {x.verification_type: x.status for x in verifications},
              "stats": {"favorites": db.scalar(select(func.count(Favorite.id)).where(Favorite.user_id == target.id)) or 0},
              "credit": {"source": "server", "status": "not_calculated"}}
    if is_owner:
        result["phone"] = target.phone
    return result


@router.patch("")
def update_profile(payload: ProfileUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    profile = _profile_record(db, current_user.id)
    if payload.nickname is not None:
        current_user.nickname = payload.nickname.strip()
    if payload.bio is not None: profile.bio = payload.bio.strip()
    if payload.visibility is not None: profile.visibility = payload.visibility
    if payload.avatarAssetId is not None:
        asset = db.get(MediaAsset, payload.avatarAssetId)
        if not asset or asset.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail={"code": "AVATAR_FORBIDDEN", "message": "头像文件不属于当前用户"})
        profile.avatar_asset_id = asset.id
    write_audit_log(db, actor_id=current_user.id, action="profile.updated", resource_type="user_profile", resource_id=current_user.id, request_id=_request_id(request))
    db.commit()
    return get_profile_overview(current_user.id, True, None, db)


@router.get("/favorites")
def list_favorites(resource_type: str = Query("", max_length=32), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    stmt = select(Favorite).where(Favorite.user_id == current_user.id).order_by(Favorite.created_at.desc())
    if resource_type: stmt = stmt.where(Favorite.resource_type == resource_type)
    return {"items": [{"id": str(item.id), "resourceType": item.resource_type, "resourceId": item.resource_id, "createdAt": item.created_at} for item in db.scalars(stmt)]}


@router.put("/favorites/{resource_type}/{resource_id}")
def add_favorite(resource_type: str, resource_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    if resource_type not in {"job", "task", "product", "post"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_FAVORITE_TYPE", "message": "不支持的收藏类型"})
    record = db.scalar(select(Favorite).where(Favorite.user_id == current_user.id, Favorite.resource_type == resource_type, Favorite.resource_id == resource_id))
    if not record:
        record = Favorite(user_id=current_user.id, resource_type=resource_type, resource_id=resource_id); db.add(record); db.commit(); db.refresh(record)
    return {"id": str(record.id), "resourceType": record.resource_type, "resourceId": record.resource_id}


@router.delete("/favorites/{resource_type}/{resource_id}", status_code=204)
def delete_favorite(resource_type: str, resource_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.resource_type == resource_type, Favorite.resource_id == resource_id).delete()
    db.commit()


@router.get("/wallet")
def wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    item = db.get(Wallet, current_user.id)
    if not item:
        item = Wallet(user_id=current_user.id); db.add(item); db.commit(); db.refresh(item)
    return {"currency": "CNY", "available": float(item.available), "frozen": float(item.frozen), "escrow": float(item.escrow), "capabilities": {"provider": "unconfigured", "recharge": "pending", "withdraw": "pending"}, "updatedAt": item.updated_at}


@router.get("/wallet/transactions")
def wallet_transactions(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), type: str = Query("", alias="type"), bizType: str = Query("", alias="bizType"), status_filter: str = Query("", alias="status"), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    stmt = select(LedgerEntry).where(LedgerEntry.wallet_user_id == current_user.id).order_by(LedgerEntry.id.desc())
    if type: stmt = stmt.where(LedgerEntry.entry_type == type)
    if bizType: stmt = stmt.where(LedgerEntry.biz_type == bizType)
    if status_filter: stmt = stmt.where(LedgerEntry.status == status_filter)
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size))
    return {"items": [{"id": str(x.id), "direction": x.direction, "amount": float(x.amount), "type": x.entry_type, "bizType": x.biz_type, "bizId": x.biz_id, "status": x.status, "createdAt": x.created_at} for x in rows], "page": page, "page_size": page_size, "total": total, "has_more": page * page_size < total}


@router.post("/wallet/actions", status_code=status.HTTP_202_ACCEPTED)
def wallet_action(payload: WalletAction, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    _ = wallet(current_user, db)
    entry = LedgerEntry(wallet_user_id=current_user.id, direction="credit" if payload.action == "recharge" else "debit", amount=payload.amount or 0, entry_type=payload.action, biz_type=payload.bizType, biz_id=payload.bizId, status="pending", request_id=_request_id(request), metadata_json={"provider": "unconfigured"})
    db.add(entry); write_audit_log(db, actor_id=current_user.id, action="wallet." + payload.action + ".requested", resource_type="ledger_entry", resource_id=None, request_id=_request_id(request)); db.commit(); db.refresh(entry)
    return {"accepted": True, "id": str(entry.id), "action": payload.action, "status": "pending", "provider": "unconfigured"}


@router.post("/wallet/webhooks/{provider}")
async def wallet_webhook(provider: str, request: Request, signature: str = Header("", alias="X-Provider-Signature"), db: Session = Depends(get_db)) -> dict:
    if not settings.PAYMENT_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail={"code": "PAYMENT_PROVIDER_UNCONFIGURED", "message": "支付供应商未配置，拒绝处理回调"})
    raw = await request.body()
    expected = hmac.new(settings.PAYMENT_WEBHOOK_SECRET.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail={"code": "INVALID_WEBHOOK_SIGNATURE", "message": "回调签名无效"})
    try:
        payload = json.loads(raw.decode("utf-8"))
        event_id = str(payload["event_id"])
    except (UnicodeDecodeError, ValueError, KeyError):
        raise HTTPException(status_code=422, detail={"code": "INVALID_WEBHOOK_PAYLOAD", "message": "回调数据无效"})
    existing = db.get(ProviderWebhookEvent, event_id)
    if existing:
        return {"accepted": True, "duplicate": True, "status": existing.status}
    db.add(ProviderWebhookEvent(provider_event_id=event_id, provider=provider, payload=payload, status="received"))
    # Provider-specific reconciliation must validate the related PaymentIntent before funds move.
    db.commit()
    return {"accepted": True, "duplicate": False, "status": "received_pending_reconciliation"}


@router.get("/verifications", response_model=List[VerificationResponse])
def list_verifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[VerificationResponse]:
    _, records = verification_payload(verification_records(db, current_user.id))
    return records


@router.post("/verifications/{verification_type}", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
def submit_verification(
    verification_type: VerificationType,
    payload: VerificationSubmission,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VerificationResponse:
    existing = db.scalar(
        select(VerificationApplication).where(
            VerificationApplication.user_id == current_user.id,
            VerificationApplication.verification_type == verification_type,
        )
    )
    if existing and existing.status == "approved":
        raise HTTPException(status_code=409, detail={"code": "VERIFICATION_ALREADY_APPROVED", "message": "该认证已经通过"})
    if existing and existing.status == "pending":
        raise HTTPException(status_code=409, detail={"code": "VERIFICATION_PENDING", "message": "认证申请正在审核"})

    now = datetime.now(timezone.utc)
    before = {"status": existing.status, "materials": existing.materials} if existing else None
    if existing:
        existing.materials = payload.materials
        existing.status = "pending"
        existing.rejection_reason = None
        existing.submitted_at = now
        existing.reviewed_at = None
        existing.reviewer_id = None
        existing.expires_at = None
        record = existing
    else:
        record = VerificationApplication(
            user_id=current_user.id,
            verification_type=verification_type,
            status="pending",
            materials=payload.materials,
            submitted_at=now,
        )
        db.add(record)
    db.flush()
    write_audit_log(
        db,
        actor_id=current_user.id,
        action="verification.submitted",
        resource_type="verification_application",
        resource_id=record.id,
        before=before,
        after={"type": verification_type, "status": record.status},
        request_id=_request_id(request),
    )
    db.commit()
    db.refresh(record)
    return VerificationResponse(
        id=record.id, type=record.verification_type, status=record.status,
        materials=record.materials or {}, rejection_reason=record.rejection_reason,
        submitted_at=record.submitted_at, reviewed_at=record.reviewed_at, expires_at=record.expires_at,
    )


@admin_router.post("/verifications/{application_id}/review", response_model=VerificationResponse)
def review_verification(
    application_id: int,
    payload: VerificationReview,
    request: Request,
    reviewer: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> VerificationResponse:
    record = db.get(VerificationApplication, application_id)
    if not record:
        raise HTTPException(status_code=404, detail={"code": "VERIFICATION_NOT_FOUND", "message": "认证申请不存在"})
    if record.status != "pending":
        raise HTTPException(status_code=409, detail={"code": "INVALID_VERIFICATION_STATE", "message": "仅待审核申请可以审核"})
    if payload.action == "reject" and not (payload.rejection_reason or "").strip():
        raise HTTPException(status_code=422, detail={"code": "REJECTION_REASON_REQUIRED", "message": "请填写驳回原因"})
    before = {"status": record.status, "rejection_reason": record.rejection_reason}
    record.status = "approved" if payload.action == "approve" else "rejected"
    record.rejection_reason = None if payload.action == "approve" else payload.rejection_reason.strip()
    record.expires_at = payload.expires_at if payload.action == "approve" else None
    record.reviewed_at = datetime.now(timezone.utc)
    record.reviewer_id = reviewer.id
    if payload.action == "approve":
        role = {"personal": "pilot", "caac": "pilot", "enterprise": "enterprise", "institution": "institution"}[record.verification_type]
        ensure_role(db, record.user_id, role)
    write_audit_log(
        db, actor_id=reviewer.id, action=f"verification.{payload.action}",
        resource_type="verification_application", resource_id=record.id, before=before,
        after={"status": record.status, "rejection_reason": record.rejection_reason}, request_id=_request_id(request),
    )
    db.commit()
    db.refresh(record)
    return VerificationResponse(
        id=record.id, type=record.verification_type, status=record.status,
        materials=record.materials or {}, rejection_reason=record.rejection_reason,
        submitted_at=record.submitted_at, reviewed_at=record.reviewed_at, expires_at=record.expires_at,
    )


@admin_router.get("/verifications")
def admin_list_verifications(status_filter: str = Query("pending", alias="status"), reviewer: User = Depends(require_role("admin")), db: Session = Depends(get_db)) -> dict:
    stmt = select(VerificationApplication).order_by(VerificationApplication.submitted_at.asc())
    if status_filter:
        stmt = stmt.where(VerificationApplication.status == status_filter)
    records = db.scalars(stmt)
    return {"items": [{"id": str(item.id), "userId": str(item.user_id), "type": item.verification_type, "status": item.status, "submittedAt": item.submitted_at, "materials": item.materials or {}} for item in records]}


@admin_router.post("/verifications/{application_id}/approve", response_model=VerificationResponse)
def approve_verification(application_id: int, request: Request, reviewer: User = Depends(require_role("admin")), db: Session = Depends(get_db)) -> VerificationResponse:
    return review_verification(application_id, VerificationReview(action="approve"), request, reviewer, db)


@admin_router.post("/verifications/{application_id}/reject", response_model=VerificationResponse)
def reject_verification(application_id: int, payload: VerificationReview, request: Request, reviewer: User = Depends(require_role("admin")), db: Session = Depends(get_db)) -> VerificationResponse:
    return review_verification(application_id, VerificationReview(action="reject", rejection_reason=payload.rejection_reason), request, reviewer, db)
