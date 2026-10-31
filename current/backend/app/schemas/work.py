from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ResumePayload(_Strict):
    visibility: Literal["private", "company", "public"] = "private"
    intention: Optional[str] = Field(default=None, max_length=160)
    name: Optional[str] = Field(default=None, max_length=80)
    city: Optional[str] = Field(default=None, max_length=64)
    phone: Optional[str] = Field(default=None, max_length=32)
    caacLevel: Optional[str] = Field(default=None, max_length=64)
    certificateNumber: Optional[str] = Field(default=None, max_length=128)
    aircraft: Optional[str] = Field(default=None, max_length=2000)
    experience: Optional[str] = Field(default=None, max_length=8000)
    education: Optional[str] = Field(default=None, max_length=2000)
    attachments: List[Dict[str, Any]] = Field(default_factory=list, max_length=20)


class JobCreate(_Strict):
    title: str = Field(min_length=2, max_length=160)
    city: str = Field(min_length=1, max_length=64)
    district: Optional[str] = Field(default=None, max_length=64)
    salaryMin: int = Field(gt=0, le=10_000_000)
    salaryMax: int = Field(gt=0, le=10_000_000)
    employment: str = Field(min_length=1, max_length=32)
    experience: str = Field(min_length=1, max_length=120)
    education: Optional[str] = Field(default=None, max_length=120)
    caac: str = Field(min_length=1, max_length=64)
    aircraft: Union[List[str], str] = Field(default_factory=list)
    responsibilities: Union[List[str], str] = Field(default_factory=list)
    requirements: Union[List[str], str] = Field(default_factory=list)
    benefits: Union[List[str], str] = Field(default_factory=list)
    environment: Optional[str] = Field(default=None, max_length=8000)

    @model_validator(mode="after")
    def check_salary(self):
        if self.salaryMin >= self.salaryMax:
            raise ValueError("最高薪资必须高于最低薪资")
        return self


class TaskCreate(_Strict):
    title: str = Field(min_length=2, max_length=160)
    city: str = Field(min_length=1, max_length=64)
    location: str = Field(min_length=1, max_length=500)
    workAt: str = Field(min_length=4, max_length=64)
    deadline: str = Field(min_length=4, max_length=64)
    aircraft: str = Field(min_length=1, max_length=160)
    caac: str = Field(min_length=1, max_length=64)
    duration: str = Field(min_length=1, max_length=120)
    budget: float = Field(gt=0, le=10_000_000)
    delivery: str = Field(min_length=1, max_length=8000)
    acceptance: str = Field(min_length=1, max_length=8000)
    description: str = Field(min_length=1, max_length=16000)
    urgent: bool = False


class ApplicationCreate(_Strict):
    resumeId: Optional[int] = Field(default=None, gt=0)
    coverLetter: Optional[str] = Field(default=None, max_length=4000)


class BidCreate(_Strict):
    quote: float = Field(gt=0, le=10_000_000)
    commitment: str = Field(min_length=1, max_length=4000)
    availabilityConfirmed: bool


class ReasonPayload(_Strict):
    reason: Optional[str] = Field(default=None, max_length=4000)


class InterviewCreate(_Strict):
    at: str = Field(min_length=4, max_length=64)
    method: str = Field(min_length=1, max_length=160)
    jobTitle: Optional[str] = Field(default=None, max_length=160)


class InterviewResponse(_Strict):
    action: Literal["accept", "decline"]
    note: Optional[str] = Field(default=None, max_length=4000)


class JobAction(_Strict):
    action: Literal["pause", "resume", "close"]


class AttachmentPayload(_Strict):
    id: Optional[Union[str, int]] = None
    name: Optional[str] = Field(default=None, max_length=255)
    path: Optional[str] = Field(default=None, max_length=1024)
    url: Optional[str] = Field(default=None, max_length=2048)
    size: Optional[int] = Field(default=None, ge=0, le=50 * 1024 * 1024)
    mimeType: Optional[str] = Field(default=None, max_length=128)


class MilestoneUpdate(_Strict):
    status: Literal["pending", "current", "complete"]
    note: Optional[str] = Field(default=None, max_length=4000)


class AcceptancePayload(_Strict):
    action: Literal["accept", "reject"]
    reason: Optional[str] = Field(default=None, max_length=4000)


class DisputeCreate(_Strict):
    type: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=8000)
    evidence: List[Dict[str, Any]] = Field(default_factory=list, min_length=1, max_length=20)


class SosPayload(_Strict):
    locationConsent: bool = False
    location: Optional[Dict[str, Any]] = None
