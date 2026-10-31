from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConversationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    participantId: int = Field(gt=0)
    businessType: str = Field(default="direct", min_length=1, max_length=48)
    businessId: str = Field(default="", max_length=64)


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(default="", max_length=2000)
    mediaAssetIds: List[int] = Field(default_factory=list, max_length=5)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        return value.strip()


class MarkRead(BaseModel):
    model_config = ConfigDict(extra="forbid")
    itemType: Literal["notification", "conversation"] = "notification"
