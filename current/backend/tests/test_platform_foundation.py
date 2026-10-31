from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.platform import UserRole, VerificationApplication
from app.models.user import User
from app.models.account import ProviderWebhookEvent


@pytest.fixture()
def client(tmp_path):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    original_upload_dir = settings.UPLOAD_DIR
    settings.UPLOAD_DIR = tmp_path / "uploads"

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            yield test_client, TestingSession
    finally:
        app.dependency_overrides.clear()
        settings.UPLOAD_DIR = original_upload_dir
        Base.metadata.drop_all(engine)


def register(client, phone):
    response = client.post("/api/v1/auth/register", json={"phone": phone, "nickname": "测试用户", "password": "REDACTED_SECRET"})
    assert response.status_code == 201, response.text
    return response.json()


def auth(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def test_auth_response_and_verification_cannot_be_forged(client):
    api, _ = client
    session = register(api, "19982442654")
    assert session["user"]["roles"] == ["personal"]
    assert session["user"]["verification"]["enterprise"] == "not_submitted"
    assert session["user"]["active_role"] == "personal"
    assert session["user"]["verifications"]

    forged = api.post(
        "/api/v1/profile/verifications/enterprise",
        headers={**auth(session), "X-Request-ID": "client-trace-1"},
        json={"materials": {"license": "asset-1"}, "status": "approved"},
    )
    assert forged.status_code == 422
    assert forged.headers["X-Request-ID"] == "client-trace-1"

    submitted = api.post(
        "/api/v1/profile/verifications/enterprise",
        headers=auth(session), json={"materials": {"license": "asset-1"}},
    )
    assert submitted.status_code == 201
    assert submitted.json()["status"] == "pending"
    assert submitted.json()["type"] == "enterprise"

    forbidden = api.post(
        "/api/v1/admin/verifications/1/review", headers=auth(session), json={"action": "approve"},
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "ROLE_REQUIRED"


def test_admin_review_grants_role_and_is_audited(client):
    api, TestingSession = client
    applicant = register(api, "19989012290")
    admin = register(api, "19964996120")
    submitted = api.post(
        "/api/v1/profile/verifications/enterprise", headers=auth(applicant), json={"materials": {"license": "asset-1"}},
    )
    application_id = submitted.json()["id"]
    with TestingSession() as db:
        admin_user = db.get(User, admin["user"]["id"])
        db.add(UserRole(user_id=admin_user.id, role="admin"))
        db.commit()

    reviewed = api.post(
        "/api/v1/admin/verifications/{}/review".format(application_id),
        headers=auth(admin), json={"action": "approve"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "approved"
    me = api.get("/api/v1/auth/me", headers=auth(applicant))
    assert "enterprise" in me.json()["roles"]
    with TestingSession() as db:
        assert db.get(VerificationApplication, application_id).status == "approved"


def test_private_upload_cannot_be_read_by_another_user(client):
    api, _ = client
    owner = register(api, "19907502196")
    other = register(api, "19950822562")
    upload = api.post(
        "/api/v1/uploads", headers=auth(owner), files={"file": ("proof.png", b"\x89PNG\r\n\x1a\nimage-bytes", "image/png")},
    )
    assert upload.status_code == 201, upload.text
    asset = upload.json()
    assert asset["name"] == "proof.png"
    forbidden = api.get("/api/v1/uploads/{}".format(asset["id"]), headers=auth(other))
    assert forbidden.status_code == 403
    permitted = api.get("/api/v1/uploads/{}".format(asset["id"]), headers=auth(owner))
    assert permitted.status_code == 200
    assert permitted.content == b"\x89PNG\r\n\x1a\nimage-bytes"


def test_upload_rejects_known_malware_test_signature(client):
    api, _ = client
    session = register(api, "19901153130")
    payload = b"\x89PNG\r\n\x1a\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    response = api.post("/api/v1/uploads", headers=auth(session), files={"file": ("unsafe.png", payload, "image/png")})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "MALWARE_DETECTED"


def test_public_profile_is_anonymous_and_wallet_is_pending_only(client):
    api, _ = client
    session = register(api, "19955970128")
    changed = api.patch("/api/v1/profile", headers=auth(session), json={"bio": "公开简介", "visibility": "public"})
    assert changed.status_code == 200
    public = api.get("/api/v1/profile/overview", params={"userId": session["user"]["id"], "public": "true"})
    assert public.status_code == 200
    assert public.json()["bio"] == "公开简介"
    assert "phone" not in public.json()
    action = api.post("/api/v1/profile/wallet/actions", headers=auth(session), json={"action": "recharge", "amount": "10.00"})
    assert action.status_code == 202
    assert action.json()["status"] == "pending"
    wallet = api.get("/api/v1/profile/wallet", headers=auth(session))
    assert wallet.json()["available"] == 0


def test_unconfigured_webhook_is_rejected(client):
    api, TestingSession = client
    response = api.post("/api/v1/profile/wallet/webhooks/example", json={"event_id": "event-1"}, headers={"X-Provider-Signature": "bad"})
    assert response.status_code == 503
    with TestingSession() as db:
        assert db.get(ProviderWebhookEvent, "event-1") is None
