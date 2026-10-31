from pathlib import Path
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints.messages import router
from app.db.base import Base
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.messages import create_business_conversation, create_notification


@pytest.fixture()
def messages_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    with Session() as db:
        users = [User(phone="1370000010{0}".format(i), nickname=name, hashed_password="x") for i, name in enumerate(("甲", "乙", "丙"), 1)]
        db.add_all(users); db.commit()
        ids = {name: user.id for name, user in zip(("first", "second", "third"), users)}
    app = FastAPI(); app.include_router(router, prefix="/messages")
    current = {"id": ids["first"]}

    def override_db():
        db = Session()
        try: yield db
        finally: db.close()
    def override_user():
        with Session() as db: return db.get(User, current["id"])
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    with TestClient(app) as client: yield client, Session, ids, current
    Base.metadata.drop_all(engine)


def test_business_conversation_is_idempotent_and_isolated(messages_client):
    client, Session, ids, current = messages_client
    with Session() as db:
        first = create_business_conversation(db, participant_user_ids=[ids["first"], ids["second"]], business_type="academy_visit", business_id="42")
        second = create_business_conversation(db, participant_user_ids=[ids["second"], ids["first"]], business_type="academy_visit", business_id="42")
        assert first.id == second.id
        db.commit(); conversation_id = first.id
    sent = client.post("/messages/conversations/{0}/messages".format(conversation_id), json={"content": "预约已确认", "mediaAssetIds": []})
    assert sent.status_code == 201, sent.text
    current["id"] = ids["third"]
    assert client.get("/messages/conversations/{0}".format(conversation_id)).status_code == 403


def test_unread_notification_and_message_read_state(messages_client):
    client, Session, ids, current = messages_client
    with Session() as db:
        conversation = create_business_conversation(db, participant_user_ids=[ids["first"], ids["second"]], business_type="order", business_id="9")
        create_notification(db, recipient_id=ids["second"], category="market", title="订单更新", summary="等待确认", business_type="order", business_id="9")
        db.commit(); conversation_id = conversation.id
    assert client.post("/messages/conversations/{0}/messages".format(conversation_id), json={"content": "请确认订单"}).status_code == 201
    current["id"] = ids["second"]
    unread = client.get("/messages/unread-count")
    assert unread.status_code == 200 and unread.json()["total"] == 2
    conversation = client.get("/messages/conversations/{0}".format(conversation_id))
    assert conversation.status_code == 200
    assert client.get("/messages/unread-count").json()["messages"] == 0
    listing = client.get("/messages").json()
    notification = next(item for item in listing["items"] if item["itemType"] == "notification")
    assert client.post("/messages/{0}/read".format(notification["id"])).status_code == 200
    assert client.get("/messages/unread-count").json()["total"] == 0


def test_direct_conversation_does_not_leak_phone(messages_client):
    client, _, ids, _ = messages_client
    response = client.post("/messages/conversations", json={"participantId": ids["second"], "businessType": "direct", "businessId": ""})
    assert response.status_code == 201, response.text
    assert response.json()["counterpart"]["phone"] == ""
    assert client.post("/messages/conversations", json={"participantId": ids["second"], "businessType": "direct", "businessId": ""}).json()["id"] == response.json()["id"]
