from datetime import date, timedelta
from pathlib import Path
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints.academy import router
from app.db.base import Base
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.academy import (
    AcademyCourse, AcademyEnrollment, AcademyExamSession, AcademyInstitution,
    AcademyInstitutionMember, AcademyLesson, AcademyQuestion,
)
from app.models.platform import VerificationApplication
from app.models.user import User


@pytest.fixture()
def academy_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    with Session() as db:
        first = User(phone="19921557009", nickname="甲", hashed_password="x")
        second = User(phone="19996410790", nickname="乙", hashed_password="x")
        institution_user = User(phone="19985658106", nickname="机构", hashed_password="x")
        db.add_all([first, second, institution_user]); db.flush()
        institution = AcademyInstitution(owner_id=institution_user.id, name="测试飞校", city="北京", verified=True)
        db.add(institution); db.flush()
        course = AcademyCourse(institution_id=institution.id, name="超视距课程", level="超视距", schedule="周末", duration="10 天", price=100)
        db.add(course); db.flush()
        lesson = AcademyLesson(course_id=course.id, title="法规", chapter_title="第一章", duration_minutes=30)
        question = AcademyQuestion(question_type="single", stem="安全飞行的前提是？", options=[{"id": "a", "text": "遵守规则"}, {"id": "b", "text": "忽略风险"}], correct_answers=["a"], explanation="遵守法规与现场风险控制。", source="测试题库")
        db.add_all([lesson, question, AcademyEnrollment(user_id=first.id, course_id=course.id), AcademyInstitutionMember(institution_id=institution.id, user_id=institution_user.id, role="admin"), VerificationApplication(user_id=institution_user.id, verification_type="institution", status="approved")])
        db.commit()
        ids = {"first": first.id, "second": second.id, "institution_user": institution_user.id, "institution": institution.id, "lesson": lesson.id, "question": question.id}

    app = FastAPI()
    app.include_router(router, prefix="/academy")
    current = {"id": ids["first"]}

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    def current_user_override():
        with Session() as db:
            return db.get(User, current["id"])

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = current_user_override
    with TestClient(app) as client:
        yield client, Session, ids, current
    Base.metadata.drop_all(engine)


def test_visit_duplicate_and_owner_isolation(academy_client):
    client, _, ids, current = academy_client
    payload = {"institutionId": ids["institution"], "date": (date.today() + timedelta(days=1)).isoformat(), "slot": "09:30-10:30", "partySize": 1, "name": "甲", "phone": "19921557009", "consent": True}
    created = client.post("/academy/visits", json=payload)
    assert created.status_code == 201, created.text
    assert client.post("/academy/visits", json=payload).status_code == 409
    current["id"] = ids["second"]
    assert client.patch(f"/academy/visits/{created.json()['id']}", json={"date": payload["date"], "slot": "14:00-15:00", "partySize": 1}).status_code == 403


def test_exam_never_exposes_answer_before_submission_and_enforces_isolation(academy_client):
    client, _, ids, current = academy_client
    created = client.post("/academy/exams", json={"mode": "practice", "type": "single", "count": 1})
    assert created.status_code == 201, created.text
    session = created.json()
    assert "correct_answers" not in str(session)
    assert "answer" not in session["questions"][0]
    current["id"] = ids["second"]
    assert client.put(f"/academy/exams/{session['id']}/draft", json={"mode": "practice", "answers": {}, "currentIndex": 0, "remainingSeconds": 10}).status_code == 403
    current["id"] = ids["first"]
    answer = client.post(f"/academy/exams/{session['id']}/questions/{ids['question']}/answer", json={"answers": ["a"]})
    assert answer.status_code == 200
    assert answer.json()["correct"] is True


def test_learning_requires_enrollment_and_org_write_requires_verified_admin(academy_client):
    client, _, ids, current = academy_client
    current["id"] = ids["second"]
    assert client.put(f"/academy/learning/lessons/{ids['lesson']}/progress", json={"progress": 10, "position": 20}).status_code == 403
    # A verified institution administrator may operate only its own console.
    current["id"] = ids["institution_user"]
    console = client.get("/academy/org/console")
    assert console.status_code == 200, console.text
    assert console.json()["canWrite"] is True
