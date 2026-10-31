from pathlib import Path
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints import auth, work
from app.db.base import Base
from app.db.session import get_db
from app.models.platform import UserRole, VerificationApplication
from app.models.user import User
from app.models.work import CompanyProfile, Fulfillment, Job, Task


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    app = FastAPI()
    app.include_router(auth.router, prefix="/auth")
    app.include_router(work.router, prefix="/work")

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client, TestingSession
    Base.metadata.drop_all(engine)


def register(api, phone):
    response = api.post("/auth/register", json={"phone": phone, "nickname": "测试用户", "password": "REDACTED_SECRET"})
    assert response.status_code == 201, response.text
    return response.json()


def headers(session):
    return {"Authorization": "Bearer " + session["access_token"]}


def grant(db, session, *verification_types):
    user_id = session["user"]["id"]
    for value in verification_types:
        db.add(VerificationApplication(user_id=user_id, verification_type=value, status="approved", materials={}))
    if "enterprise" in verification_types:
        db.add(UserRole(user_id=user_id, role="enterprise"))
    db.commit()


def create_recruiting_job(api, db, enterprise):
    created = api.post("/work/jobs", headers=headers(enterprise), json={
        "title": "巡检飞手", "city": "北京", "salaryMin": 10000, "salaryMax": 16000,
        "employment": "全职", "experience": "3年", "education": "大专", "caac": "超视距",
        "aircraft": ["M350 RTK"], "responsibilities": ["飞行"], "requirements": ["持证"],
    })
    assert created.status_code == 201, created.text
    job = db.get(Job, int(created.json()["id"])); job.status = "recruiting"; db.commit()
    return created.json()["id"]


def test_job_application_is_idempotent_and_owned(client):
    api, Session = client
    enterprise, pilot, other = register(api, "19921557009"), register(api, "19996410790"), register(api, "19985658106")
    with Session() as db:
        grant(db, enterprise, "enterprise")
        job_id = create_recruiting_job(api, db, enterprise)
    first = api.post(f"/work/jobs/{job_id}/applications", headers=headers(pilot), json={})
    second = api.post(f"/work/jobs/{job_id}/applications", headers=headers(pilot), json={})
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    forbidden = api.post(f"/work/applications/{first.json()['id']}/withdraw", headers=headers(other), json={"reason": "x"})
    assert forbidden.status_code == 403
    withdrawn = api.post(f"/work/applications/{first.json()['id']}/withdraw", headers=headers(pilot), json={"reason": "改期"})
    assert withdrawn.status_code == 200 and withdrawn.json()["status"] == "withdrawn"


def test_enterprise_candidate_and_interview_state_machine(client):
    api, Session = client
    enterprise, applicant = register(api, "19964381163"), register(api, "19992861728")
    with Session() as db:
        grant(db, enterprise, "enterprise")
        job_id = create_recruiting_job(api, db, enterprise)
    application = api.post(f"/work/jobs/{job_id}/applications", headers=headers(applicant), json={}).json()
    candidates = api.get("/work/company/candidates", headers=headers(enterprise))
    assert candidates.status_code == 200 and candidates.json()[0]["id"] == application["id"]
    invited = api.post(f"/work/candidates/{application['id']}/interviews", headers=headers(enterprise), json={"at": "2026-08-01 10:00", "method": "平台视频"})
    assert invited.status_code == 201, invited.text
    accepted = api.post(f"/work/interviews/{invited.json()['id']}/response", headers=headers(applicant), json={"action": "accept"})
    assert accepted.status_code == 200 and accepted.json()["status"] == "accepted"
    repeated = api.post(f"/work/interviews/{invited.json()['id']}/response", headers=headers(applicant), json={"action": "accept"})
    assert repeated.status_code == 409


def test_bid_requires_caac_and_fulfillment_transitions_are_authorized(client):
    api, Session = client
    client_user, pilot, stranger = register(api, "19904952451"), register(api, "19942888653"), register(api, "19950855490")
    with Session() as db:
        grant(db, client_user, "personal")
        task_response = api.post("/work/tasks", headers=headers(client_user), json={
            "title": "线路巡检", "city": "北京", "location": "昌平", "workAt": "2026-08-02 09:00", "deadline": "2026-08-01 09:00", "aircraft": "M350", "caac": "超视距", "duration": "4小时", "budget": 2000, "delivery": "影像", "acceptance": "清晰", "description": "按工单执行"
        })
        assert task_response.status_code == 201, task_response.text
        task = db.get(Task, int(task_response.json()["id"])); task.status = "open"; db.commit()
    denied = api.post(f"/work/tasks/{task_response.json()['id']}/bids", headers=headers(pilot), json={"quote": 1800, "commitment": "可执行", "availabilityConfirmed": True})
    assert denied.status_code == 403
    with Session() as db:
        grant(db, pilot, "caac")
        bid = api.post(f"/work/tasks/{task_response.json()['id']}/bids", headers=headers(pilot), json={"quote": 1800, "commitment": "可执行", "availabilityConfirmed": True})
        assert bid.status_code == 201, bid.text
        fulfillment = Fulfillment(task_id=int(task_response.json()["id"]), client_id=client_user["user"]["id"], pilot_id=pilot["user"]["id"], status="in_progress", milestones=[{"key": "execution", "title": "执行", "status": "current", "note": ""}], deliveries=[])
        db.add(fulfillment); db.commit(); db.refresh(fulfillment); fulfillment_id = fulfillment.id
    forbidden = api.get(f"/work/fulfillments/{fulfillment_id}", headers=headers(stranger))
    assert forbidden.status_code == 403
    delivered = api.post(f"/work/fulfillments/{fulfillment_id}/deliveries", headers=headers(pilot), json={"name": "成果.pdf", "size": 42})
    assert delivered.status_code == 200 and delivered.json()["status"] == "review_pending"
    accepted = api.post(f"/work/fulfillments/{fulfillment_id}/acceptance", headers=headers(client_user), json={"action": "accept"})
    assert accepted.status_code == 200 and accepted.json()["status"] == "accepted"
