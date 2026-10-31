from datetime import datetime

from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    nickname: str
    is_active: bool
    created_at: datetime
    roles: List[str] = Field(default_factory=list)
    active_role: str = "personal"
    verification: Dict[str, Any] = Field(default_factory=dict)
    verifications: List[Any] = Field(default_factory=list)
