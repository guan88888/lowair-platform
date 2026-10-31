from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.user import UserResponse


class PhoneMixin(BaseModel):
    phone: str = Field(pattern=r"^1\d{10}$", description="中国大陆手机号")


class RegisterRequest(PhoneMixin):
    nickname: str = Field(min_length=2, max_length=30)
    password: str = Field(min_length=8, max_length=64)

    @field_validator("nickname")
    @classmethod
    def nickname_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("昵称不能为空")
        return value


class LoginRequest(PhoneMixin):
    password: str = Field(min_length=8, max_length=64)
    account_type: Literal["personal", "enterprise"] = "personal"


class ForgotPasswordRequest(PhoneMixin):
    pass


class PasswordResetRequest(PhoneMixin):
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=64)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class ForgotPasswordResponse(BaseModel):
    message: str
    dev_code: Optional[str] = None
