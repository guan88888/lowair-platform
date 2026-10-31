from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Tuple

import jwt
from passlib.context import CryptContext

from app.core.config import settings

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_context.hash(password)


def create_access_token(subject: str, session_id: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": subject, "sid": session_id, "jti": secrets.token_urlsafe(16), "typ": "access", "exp": expires_at},
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def create_refresh_token() -> Tuple[str, str]:
    token = secrets.token_urlsafe(48)
    return token, hashlib.sha256(token.encode("utf-8")).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
