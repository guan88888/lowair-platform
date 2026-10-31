from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


VerificationType = Literal["personal", "caac", "enterprise", "institution"]
VerificationStatus = Literal["not_submitted", "pending", "approved", "rejected", "expired"]


class VerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    type: VerificationType
    status: VerificationStatus
    materials: Dict[str, Any] = Field(default_factory=dict)
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class VerificationSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Deliberately does not include status, reviewer, or expiry fields.
    materials: Dict[str, Any] = Field(default_factory=dict, max_length=50)


class VerificationReview(BaseModel):
    action: Literal["approve", "reject"]
    rejection_reason: Optional[str] = Field(default=None, max_length=2000)
    expires_at: Optional[datetime] = None


class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    name: str
    mime_type: str
    size: int
    status: str


class ProfileResponse(BaseModel):
    id: int
    phone: str
    nickname: str
    is_active: bool
    roles: List[str]
    active_role: str
    verification: Dict[str, VerificationStatus]
    verifications: List[VerificationResponse]
