from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints.auth import _attempts
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.platform import AuditLog
from app.models.platform import UserRole
from app.models.user import AuthSession


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    _attempts.clear()
    try:
        with TestClient(app) as test_client:
            yield test_client, Session
    finally:
        app.dependency_overrides.clear()
        _attempts.clear()
        Base.metadata.drop_all(engine)


def register(api, phone="19942592605"):
    response = api.post("/api/v1/auth/register", json={"phone": phone, "nickname": "会话测试", "password": "REDACTED_SECRET"})
    assert response.status_code == 201, response.text
    return response.json()


def auth(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def test_refresh_rotates_token_and_logout_revokes_session(client):
    api, Session = client
    original = register(api)
    refreshed = api.post("/api/v1/auth/refresh", json={"refresh_token": original["refresh_token"]})
    assert refreshed.status_code == 200
    renewed = refreshed.json()
    assert renewed["refresh_token"] != original["refresh_token"]
    assert api.post("/api/v1/auth/refresh", json={"refresh_token": original["refresh_token"]}).status_code == 401
    assert api.post("/api/v1/auth/logout", headers=auth(renewed)).status_code == 204
    assert api.get("/api/v1/auth/me", headers=auth(renewed)).status_code == 401
    with Session() as db:
        assert db.scalar(select(AuthSession).where(AuthSession.revoked_at.is_not(None)))
        assert db.scalar(select(AuditLog).where(AuditLog.action == "auth.logout"))


def test_password_reset_revokes_existing_sessions_and_is_audited(client):
    api, Session = client
    session = register(api, "19953889029")
    reset = api.post("/api/v1/auth/forgot-password/request", json={"phone": "19953889029"})
    assert reset.status_code == 200
    changed = api.post("/api/v1/auth/forgot-password/reset", json={"phone": "19953889029", "code": reset.json()["dev_code"], "new_password": "newREDACTED_SECRET"})
    assert changed.status_code == 200
    assert api.get("/api/v1/auth/me", headers=auth(session)).status_code == 401
    login = api.post("/api/v1/auth/login", json={"phone": "19953889029", "password": "newREDACTED_SECRET"})
    assert login.status_code == 200
    with Session() as db:
        assert db.scalar(select(AuditLog).where(AuditLog.action == "auth.password_reset"))


def test_failed_login_is_rate_limited(client, monkeypatch):
    api, _ = client
    from app.api.v1.endpoints import auth as auth_endpoint

    monkeypatch.setattr(auth_endpoint.settings, "AUTH_RATE_LIMIT_MAX_ATTEMPTS", 2)
    for _ in range(2):
        assert api.post("/api/v1/auth/login", json={"phone": "19922786893", "password": "wrongpass"}).status_code == 401
    response = api.post("/api/v1/auth/login", json={"phone": "19922786893", "password": "wrongpass"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "AUTH_RATE_LIMITED"


def test_enterprise_login_rejects_personal_account_and_accepts_server_role(client):
    api, Session = client
    session = register(api, "19971092527")
    denied = api.post("/api/v1/auth/login", json={"phone": "19971092527", "password": "REDACTED_SECRET", "account_type": "enterprise"})
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "ENTERPRISE_ACCOUNT_REQUIRED"

    with Session() as db:
        db.add(UserRole(user_id=session["user"]["id"], role="enterprise"))
        db.commit()

    accepted = api.post("/api/v1/auth/login", json={"phone": "19971092527", "password": "REDACTED_SECRET", "account_type": "enterprise"})
    assert accepted.status_code == 200
    assert "enterprise" in accepted.json()["user"]["roles"]
