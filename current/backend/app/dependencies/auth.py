from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import AuthSession, User
from app.services.platform import approved_verification, list_roles

bearer_scheme = HTTPBearer(auto_error=False)


def optional_current_user_from_credentials(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub", ""))
        session_id = str(payload.get("sid", ""))
        if payload.get("typ") != "access" or not session_id:
            raise ValueError("not an access token")
    except (InvalidTokenError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "登录状态已失效，请重新登录"})
    user = db.get(User, user_id)
    auth_session = db.get(AuthSession, session_id)
    expires_at = auth_session.expires_at if auth_session else None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not user or not user.is_active or not auth_session or auth_session.user_id != user.id or auth_session.revoked_at is not None or (expires_at and expires_at <= datetime.now(timezone.utc)):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "登录状态已失效，请重新登录"})
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": "登录状态已失效，请重新登录"},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user = optional_current_user_from_credentials(credentials, db)
    except HTTPException:
        raise credentials_error
    if not user:
        raise credentials_error
    return user


def require_role(*roles: str):
    """Dependency factory for endpoints whose role is granted server-side only."""
    def dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        user_roles = set(list_roles(db, current_user.id))
        if not user_roles.intersection(roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "ROLE_REQUIRED", "message": "当前账号没有此操作权限"})
        return current_user
    return dependency


def require_verified(verification_type: str):
    if verification_type not in {"personal", "caac", "enterprise", "institution"}:
        raise ValueError("未知认证类型")

    def dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if not approved_verification(db, current_user.id, verification_type):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "VERIFICATION_REQUIRED", "message": "请先完成所需认证"})
        return current_user
    return dependency
