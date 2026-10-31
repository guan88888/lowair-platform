from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


Visibility = Literal["公开", "关注可见", "同城可见", "机型圈可见"]


class MediaReference(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: Optional[int] = None
    assetId: Optional[int] = None
    type: str = Field(default="", max_length=32)
    durationSeconds: Optional[int] = Field(default=None, ge=0, le=600)

    def media_asset_id(self) -> Optional[int]:
        return self.assetId or self.id


class PostCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["图文", "视频"] = "图文"
    title: str = Field(min_length=1, max_length=60)
    content: str = Field(min_length=1, max_length=2000)
    topic: str = Field(min_length=1, max_length=20)
    visibility: Visibility = "公开"
    media: List[MediaReference] = Field(default_factory=list, max_length=9)
    location: Optional[Dict[str, Any]] = None

    @field_validator("title", "content", "topic")
    @classmethod
    def non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        return value


class ReactionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["like", "save"]
    active: bool


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=300)
    parentId: Optional[int] = None

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评论不能为空")
        return value


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    targetType: Literal["post", "comment", "knowledge", "field", "live-comment", "ai"]
    targetId: str = Field(min_length=1, max_length=64)
    reason: str = Field(min_length=1, max_length=300)
    details: Optional[str] = Field(default=None, max_length=1000)


class CommunityMediaCreate(BaseModel):
    """Only a pre-authorized generic upload may become community media."""
    model_config = ConfigDict(extra="allow")
    assetId: Optional[int] = None
    id: Optional[int] = None
    type: str = Field(default="", max_length=32)
    name: str = Field(default="", max_length=255)
    durationSeconds: Optional[int] = Field(default=None, ge=0, le=600)

    def media_asset_id(self) -> Optional[int]:
        return self.assetId or self.id


class LiveCommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=300)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评论不能为空")
        return value
