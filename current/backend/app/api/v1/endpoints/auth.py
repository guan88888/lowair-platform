from datetime import datetime, timedelta, timezone
import secrets
from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, token_hash, verify_password
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import AuthSession, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    PasswordResetRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.platform import build_user_response, ensure_role, list_roles

router = APIRouter()
_attempts: Dict[Tuple[str, str], List[datetime]] = {}


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def _rate_limit(request: Request, action: str) -> None:
    """Small in-process backstop. Deployments should also rate-limit at the gateway."""
    now = datetime.now(timezone.utc)
    key = (action, _client_key(request))
    cutoff = now - timedelta(seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS)
    attempts = [item for item in _attempts.get(key, []) if item > cutoff]
    if len(attempts) >= settings.AUTH_RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail={"code": "AUTH_RATE_LIMITED", "message": "请求过于频繁，请稍后再试"})
    attempts.append(now)
    _attempts[key] = attempts


def _clear_rate_limit(request: Request, action: str) -> None:
    _attempts.pop((action, _client_key(request)), None)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _token_response(db: Session, user: User, request: Request) -> TokenResponse:
    refresh_token, refresh_hash = create_refresh_token()
    session_id = secrets.token_urlsafe(32)
    session = AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ip_hash=token_hash(_client_key(request)),
        user_agent=(request.headers.get("User-Agent") or "")[:255] or None,
    )
    db.add(session)
    db.flush()
    return TokenResponse(
        access_token=create_access_token(str(user.id), session_id),
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=build_user_response(db, user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    _rate_limit(request, "register")
    existing_user = db.query(User).filter(User.phone == payload.phone).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该手机号已注册")

    user = User(
        phone=payload.phone,
        nickname=payload.nickname,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.flush()
    ensure_role(db, user.id, "personal")
    write_audit_log(db, actor_id=user.id, action="auth.registered", resource_type="user", resource_id=user.id, request_id=getattr(request.state, "request_id", None))
    result = _token_response(db, user, request)
    db.commit()
    db.refresh(user)
    _clear_rate_limit(request, "register")
    return result


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    _rate_limit(request, "login")
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="手机号或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已停用")
    if payload.account_type == "enterprise" and "enterprise" not in set(list_roles(db, user.id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "ENTERPRISE_ACCOUNT_REQUIRED", "message": "该账号不是企业账号，请使用个人登录或完成企业认证"})
    _clear_rate_limit(request, "login")
    result = _token_response(db, user, request)
    write_audit_log(db, actor_id=user.id, action="auth.login", resource_type="auth_session", resource_id=None, request_id=getattr(request.state, "request_id", None))
    db.commit()
    return result


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    session = db.scalar(select(AuthSession).where(AuthSession.refresh_token_hash == token_hash(payload.refresh_token)))
    now = datetime.now(timezone.utc)
    if not session or session.revoked_at is not None or _as_utc(session.expires_at) <= now:
        raise HTTPException(status_code=401, detail={"code": "REFRESH_TOKEN_INVALID", "message": "登录状态已失效，请重新登录"})
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail={"code": "REFRESH_TOKEN_INVALID", "message": "登录状态已失效，请重新登录"})
    session.revoked_at = now
    result = _token_response(db, user, request)
    write_audit_log(db, actor_id=user.id, action="auth.refreshed", resource_type="auth_session", resource_id=session.id, request_id=getattr(request.state, "request_id", None))
    db.commit()
    return result


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    from jwt import decode

    credentials = request.headers.get("Authorization", "")
    credentials = credentials[7:].strip() if credentials.lower().startswith("bearer ") else credentials.strip()
    payload = decode(credentials, settings.SECRET_KEY, algorithms=["HS256"])
    session = db.get(AuthSession, payload["sid"])
    if session and session.user_id == current_user.id and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        write_audit_log(db, actor_id=current_user.id, action="auth.logout", resource_type="auth_session", resource_id=session.id, request_id=getattr(request.state, "request_id", None))
        db.commit()


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserResponse:
    return build_user_response(db, current_user)


@router.post("/forgot-password/request", response_model=ForgotPasswordResponse)
def request_password_reset(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    _rate_limit(request, "password_reset")
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该手机号尚未注册")

    code = f"{secrets.randbelow(1_000_000):06d}"
    user.reset_code = code
    user.reset_code_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_CODE_EXPIRE_MINUTES
    )
    write_audit_log(db, actor_id=user.id, action="auth.password_reset_requested", resource_type="user", resource_id=user.id, request_id=getattr(request.state, "request_id", None))
    db.commit()

    return ForgotPasswordResponse(
        message="验证码已生成",
        dev_code=code if settings.DEBUG else None,
    )


@router.post("/forgot-password/reset")
def reset_password(payload: PasswordResetRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    _rate_limit(request, "password_reset_confirm")
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user or not user.reset_code or user.reset_code != payload.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码错误")

    expires_at = user.reset_code_expires_at
    if not expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码已失效")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        user.reset_code = None
        user.reset_code_expires_at = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码已过期，请重新获取")

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    db.query(AuthSession).filter(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)).update({AuthSession.revoked_at: datetime.now(timezone.utc)})
    write_audit_log(db, actor_id=user.id, action="auth.password_reset", resource_type="user", resource_id=user.id, request_id=getattr(request.state, "request_id", None))
    db.commit()
    _clear_rate_limit(request, "password_reset_confirm")
    return {"message": "密码重置成功，请使用新密码登录"}
