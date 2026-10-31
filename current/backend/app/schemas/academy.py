from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class InstitutionQuery(BaseModel):
    keyword: str = Field(default="", max_length=80)
    city: str = Field(default="", max_length=64)
    level: str = Field(default="", max_length=64)
    schedule: str = Field(default="", max_length=64)
    priceMax: Optional[int] = Field(default=None, ge=1, le=1_000_000)
    startDate: Optional[date] = None
    verifiedOnly: bool = False
    sort: Literal["recommended", "distance", "rating", "price"] = "recommended"


class VisitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institutionId: int
    courseId: Optional[int] = None
    date: date
    slot: str = Field(min_length=3, max_length=32)
    partySize: int = Field(ge=1, le=6)
    name: str = Field(min_length=1, max_length=64)
    phone: str = Field(pattern=r"^1\d{10}$")
    consent: bool

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("联系人不能为空")
        return value


class VisitUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    slot: str = Field(min_length=3, max_length=32)
    partySize: int = Field(ge=1, le=6)
    name: Optional[str] = Field(default=None, min_length=1, max_length=64)
    phone: Optional[str] = Field(default=None, pattern=r"^1\d{10}$")
    consent: bool = True


class CancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(default="用户主动取消", max_length=500)


class LessonProgressUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    progress: int = Field(ge=0, le=100)
    position: int = Field(default=0, ge=0, le=86_400)


class LearningPlanUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dailyMinutes: int = Field(ge=5, le=240)
    targetDate: Optional[date] = None
    focus: str = Field(min_length=1, max_length=64)


class ExamCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["practice", "mock"]
    type: Literal["all", "single", "multiple", "judge", "wrong"] = "all"
    count: int = Field(default=5, ge=1, le=100)


class ExamDraftUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["practice", "mock"]
    answers: Dict[str, List[str]] = Field(default_factory=dict)
    currentIndex: int = Field(default=0, ge=0)
    remainingSeconds: int = Field(default=0, ge=0)


class AnswerSubmit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: List[str] = Field(min_length=1, max_length=10)


class ExamSubmit(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: Dict[str, List[str]] = Field(default_factory=dict)
    mode: Literal["practice", "mock"]


class OrgAction(BaseModel):
    model_config = ConfigDict(extra="allow")

    action: Literal["confirm_visit", "resolve_schedule", "attendance"]
    id: Optional[Union[int, str]] = None
    status: Optional[Literal["pending", "present", "absent"]] = None
    scheduleId: Optional[int] = None
    studentId: Optional[int] = None


class LegacySubmission(BaseModel):
    """Compatibility request for the original pre-session exam endpoint."""
    model_config = ConfigDict(extra="forbid")
    answers: Dict[str, List[str]] = Field(default_factory=dict)
