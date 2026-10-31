from datetime import date, timedelta
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.academy import AcademyInstitution
from app.models.market import MarketProduct
from app.models.platform import UserRole, VerificationApplication
from app.models.user import User


@pytest.fixture()
def api_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    def override_db():
        db = Session()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client: yield client, Session
    finally:
        app.dependency_overrides.clear(); Base.metadata.drop_all(engine)


def register(api, phone, nickname):
    response = api.post("/api/v1/auth/register", json={"phone": phone, "nickname": nickname, "password": "REDACTED_SECRET"})
    assert response.status_code == 201, response.text
    return response.json()


def headers(session): return {"Authorization": "Bearer " + session["access_token"]}


def test_cross_domain_core_flow(api_client):
    api, Session = api_client
    buyer = register(api, "19993310247", "买方")
    seller = register(api, "19976614419", "卖方")
    with Session() as db:
        buyer_id, seller_id = buyer["user"]["id"], seller["user"]["id"]
        db.add_all([
            VerificationApplication(user_id=buyer_id, verification_type="personal", status="approved"),
            VerificationApplication(user_id=seller_id, verification_type="personal", status="approved"),
            VerificationApplication(user_id=seller_id, verification_type="enterprise", status="approved"),
            UserRole(user_id=seller_id, role="enterprise"),
            AcademyInstitution(owner_id=seller_id, name="集成测试飞校", city="北京", verified=True),
        ])
        db.commit()
        institution_id = db.query(AcademyInstitution).one().id

    visit = api.post("/api/v1/academy/visits", headers=headers(buyer), json={"institutionId": institution_id, "date": (date.today() + timedelta(days=2)).isoformat(), "slot": "09:30-10:30", "partySize": 1, "name": "买方", "phone": "19993310247", "consent": True})
    assert visit.status_code == 201, visit.text

    listing = api.post("/api/v1/market/listings", headers=headers(seller), json={"title": "测试无人机", "category": "drone", "city": "北京", "price": "1000.00", "delivery": ["shipping"], "stock": 1})
    assert listing.status_code == 201, listing.text
    with Session() as db:
        product = db.get(MarketProduct, int(listing.json()["id"])); product.listing_status = "published"; db.commit()
    order = api.post("/api/v1/market/orders", headers=headers(buyer), json={"productId": int(listing.json()["id"]), "quantity": 1, "address": {"city": "北京"}})
    assert order.status_code == 201, order.text
    assert order.json()["status"] == "pending_payment"

    conversation = api.post("/api/v1/messages/conversations", headers=headers(buyer), json={"participantId": seller_id, "businessType": "direct", "businessId": ""})
    assert conversation.status_code == 201, conversation.text
    sent = api.post("/api/v1/messages/conversations/{0}/messages".format(conversation.json()["id"]), headers=headers(buyer), json={"content": "订单已创建", "mediaAssetIds": []})
    assert sent.status_code == 201
    pending = api.post("/api/v1/profile/wallet/actions", headers=headers(buyer), json={"action": "recharge", "amount": "100.00", "bizType": "market", "bizId": order.json()["id"]})
    assert pending.status_code == 202 and pending.json()["status"] == "pending"
    assert api.get("/api/v1/profile/wallet", headers=headers(buyer)).json()["available"] == 0


def test_market_cart_enforces_owner_inventory_and_product_type(api_client):
    api, Session = api_client
    buyer = register(api, "19999370046", "购物车买方")
    other = register(api, "19922733592", "其他用户")
    seller = register(api, "19959814233", "购物车卖方")
    with Session() as db:
        drone = MarketProduct(seller_id=seller["user"]["id"], title="全新测试整机", category="new_drone", brand="Test", model="X1", city="北京", price="1200.00", summary="", images=[], delivery=["邮寄"], verification_status="pending", listing_status="published", stock=2)
        rental = MarketProduct(seller_id=seller["user"]["id"], title="测试租赁设备", category="rental", brand="Test", model="R1", city="北京", price="200.00", summary="", images=[], delivery=["自提"], verification_status="pending", listing_status="published", stock=1)
        db.add_all([drone, rental]); db.commit(); db.refresh(drone); db.refresh(rental)
        drone_id, rental_id = drone.id, rental.id

    added = api.put("/api/v1/market/cart/items", headers=headers(buyer), json={"productId": drone_id, "quantity": 2})
    assert added.status_code == 200
    item_id = added.json()["id"]
    assert added.json()["quantity"] == 2
    assert api.get("/api/v1/market/cart", headers=headers(buyer)).json()["total"] == 1

    assert api.delete(f"/api/v1/market/cart/items/{item_id}", headers=headers(other)).status_code == 404
    assert api.put("/api/v1/market/cart/items", headers=headers(buyer), json={"productId": drone_id, "quantity": 3}).status_code == 409
    rental_result = api.put("/api/v1/market/cart/items", headers=headers(buyer), json={"productId": rental_id, "quantity": 1})
    assert rental_result.status_code == 422
    assert rental_result.json()["error"]["code"] == "RENTAL_CART_UNSUPPORTED"
