from datetime import datetime, timezone
from typing import Dict, Iterable, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.platform import UserRole, VerificationApplication
from app.models.user import User
from app.schemas.platform import VerificationResponse
from app.schemas.user import UserResponse

VERIFICATION_TYPES = ("personal", "caac", "enterprise", "institution")
ROLE_VALUES = ("personal", "pilot", "enterprise", "institution", "admin")


def list_roles(db: Session, user_id: int) -> List[str]:
    return list(db.scalars(select(UserRole.role).where(UserRole.user_id == user_id).order_by(UserRole.role)))


def ensure_role(db: Session, user_id: int, role: str) -> None:
    if role not in ROLE_VALUES:
        raise ValueError("不支持的角色")
    exists = db.scalar(select(UserRole.id).where(UserRole.user_id == user_id, UserRole.role == role))
    if not exists:
        db.add(UserRole(user_id=user_id, role=role))


def verification_records(db: Session, user_id: int) -> List[VerificationApplication]:
    return list(
        db.scalars(
            select(VerificationApplication)
            .where(VerificationApplication.user_id == user_id)
            .order_by(VerificationApplication.verification_type)
        )
    )


def verification_payload(records: Iterable[VerificationApplication]):
    by_type = {record.verification_type: record for record in records}
    statuses: Dict[str, str] = {verification_type: "not_submitted" for verification_type in VERIFICATION_TYPES}
    response_records: List[VerificationResponse] = []
    for verification_type in VERIFICATION_TYPES:
        record = by_type.get(verification_type)
        if record:
            statuses[verification_type] = record.status
            response_records.append(
                VerificationResponse(
                    id=record.id, type=record.verification_type, status=record.status,
                    materials=record.materials or {}, rejection_reason=record.rejection_reason,
                    submitted_at=record.submitted_at, reviewed_at=record.reviewed_at, expires_at=record.expires_at,
                )
            )
        else:
            response_records.append(VerificationResponse(type=verification_type, status="not_submitted"))
    return statuses, response_records


def build_user_response(db: Session, user: User) -> UserResponse:
    records = verification_records(db, user.id)
    verification, verifications = verification_payload(records)
    roles = list_roles(db, user.id)
    return UserResponse(
        id=user.id, phone=user.phone, nickname=user.nickname, is_active=user.is_active,
        created_at=user.created_at, roles=roles or ["personal"], active_role=user.active_role or "personal",
        verification=verification, verifications=verifications,
    )


def approved_verification(db: Session, user_id: int, verification_type: str) -> bool:
    return bool(
        db.scalar(
            select(VerificationApplication.id).where(
                VerificationApplication.user_id == user_id,
                VerificationApplication.verification_type == verification_type,
                VerificationApplication.status == "approved",
                (VerificationApplication.expires_at.is_(None) | (VerificationApplication.expires_at > datetime.now(timezone.utc))),
            )
        )
    )
