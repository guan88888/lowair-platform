from pathlib import Path
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints.community import router
from app.db.base import Base
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.community import CommunityNearbyPlace, CommunityPost
from app.models.user import User


@pytest.fixture()
def community_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    with Session() as db:
        first = User(phone="19975155902", nickname="甲", hashed_password="x")
        second = User(phone="19972148105", nickname="乙", hashed_password="x")
        db.add_all([first, second]); db.flush()
        db.add(CommunityNearbyPlace(place_type="field", name="测试飞场", city="北京", district="朝阳区", risk_status="review", source_name="测试来源", note="仅作交流"))
        db.commit()
        ids = {"first": first.id, "second": second.id}

    app = FastAPI()
    app.include_router(router, prefix="/community")
    current = {"id": ids["first"]}

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    def user_override():
        with Session() as db:
            return db.get(User, current["id"])

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = user_override
    with TestClient(app) as client:
        yield client, Session, ids, current
    Base.metadata.drop_all(engine)


def make_post(client):
    response = client.post("/community/posts", json={"type": "图文", "title": "飞行复盘", "content": "遵守法规并核验风险信息。", "topic": "飞行日志", "visibility": "公开", "media": [], "location": {"city": "北京", "precise": True, "coordinates": {"latitude": 39.9, "longitude": 116.4}}})
    assert response.status_code == 201, response.text
    return response.json()


def test_post_owner_reaction_and_delete_permissions(community_client):
    client, _, ids, current = community_client
    post = make_post(client)
    assert post["moderationStatus"] == "approved"
    assert "coordinates" not in post
    liked = client.put("/community/posts/{0}/reactions".format(post["id"]), json={"type": "like", "active": True})
    assert liked.status_code == 200 and liked.json()["liked"] is True
    # Repeating the same desired reaction is idempotent.
    assert client.put("/community/posts/{0}/reactions".format(post["id"]), json={"type": "like", "active": True}).json()["stats"]["likes"] == 1
    shared = client.post("/community/posts/{0}/shares".format(post["id"]))
    assert shared.status_code == 200 and shared.json()["stats"]["shares"] == 1
    current["id"] = ids["second"]
    assert client.delete("/community/posts/{0}".format(post["id"])).status_code == 403
    current["id"] = ids["first"]
    assert client.delete("/community/posts/{0}".format(post["id"])).status_code == 204


def test_comment_report_dedup_and_nearby_never_echoes_coordinates(community_client):
    client, _, _, _ = community_client
    post = make_post(client)
    comment = client.post("/community/posts/{0}/comments".format(post["id"]), json={"content": "补充了来源。"})
    assert comment.status_code == 201
    report = {"targetType": "post", "targetId": post["id"], "reason": "不实或误导信息"}
    first = client.post("/community/reports", json=report)
    second = client.post("/community/reports", json=report)
    assert first.status_code == 201 and second.status_code == 201
    assert second.json()["duplicate"] is True
    nearby = client.get("/community/nearby?city=北京&latitude=39.9&longitude=116.4")
    assert nearby.status_code == 200, nearby.text
    serialized = nearby.text.lower()
    assert "latitude" not in serialized and "longitude" not in serialized and "39.9" not in serialized


def test_pending_high_risk_post_is_not_visible_to_another_user(community_client):
    client, _, ids, current = community_client
    post = client.post("/community/posts", json={"type": "图文", "title": "绕过审批", "content": "禁飞区起飞", "topic": "风险", "visibility": "公开", "media": []})
    assert post.status_code == 201 and post.json()["moderationStatus"] == "pending"
    current["id"] = ids["second"]
    # Explicit auth must be supplied for a personalised read; a public request also cannot see it.
    assert client.get("/community/posts/{0}".format(post.json()["id"])).status_code == 404
