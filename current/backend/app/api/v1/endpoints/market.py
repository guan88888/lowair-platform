from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.pagination import PageParams, get_page_params
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.market import DeviceHistoryEvent, InspectionReport, MarketCartItem, MarketOrder, MarketOrderAction, MarketProduct, RentalPlan, RepairBooking, RepairProvider
from app.models.user import User
from app.schemas.market import CartItemUpdate, ListingCreate, OrderAction, OrderCreate, OrderQuote, RepairBookingCreate
from app.services.platform import approved_verification

router = APIRouter()

def fail(code: str, message: str, code_num: int = 400):
    raise HTTPException(code_num, detail={"code": code, "message": message})

def page(db: Session, stmt, params: PageParams):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = list(db.scalars(stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)))
    return rows, {"page": params.page, "page_size": params.page_size, "total": total, "has_more": params.page * params.page_size < total}

def product_data(product: MarketProduct, detail: bool = True):
    data = {"id": str(product.id), "title": product.title, "category": product.category, "brand": product.brand, "model": product.model, "city": product.city, "price": float(product.price), "summary": product.summary, "images": product.images or [], "delivery": product.delivery or [], "verification": product.verification_status, "status": product.listing_status, "stock": product.stock, "updatedAt": product.updated_at.isoformat() if product.updated_at else ""}
    if detail: data["sn"] = product.sn[-4:].rjust(len(product.sn), "*") if product.sn else ""
    return data

def cart_item_data(db: Session, item: MarketCartItem):
    product = db.get(MarketProduct, item.product_id)
    if not product: return None
    return {"id": str(item.id), "productId": str(product.id), "quantity": item.quantity, "available": product.listing_status == "published" and product.stock > 0, "product": product_data(product, False)}


def repair_provider_data(item: RepairProvider):
    return {
        "id": str(item.id), "name": item.name, "city": item.city, "district": item.district,
        "address": item.address, "brands": item.brands or [], "services": item.services or [],
        "contactMode": item.contact_mode, "verificationStatus": item.verification_status,
        "source": item.source, "updatedAt": item.updated_at,
    }


def repair_booking_data(db: Session, item: RepairBooking):
    provider = db.get(RepairProvider, item.provider_id)
    return {
        "id": str(item.id), "provider": repair_provider_data(provider) if provider else None,
        "brand": item.brand, "model": item.model, "issueType": item.issue_type,
        "description": item.description, "serviceMode": item.service_mode,
        "preferredDate": item.preferred_date, "status": item.status,
        "diagnosis": item.diagnosis, "estimateAmount": float(item.estimate_amount) if item.estimate_amount is not None else None,
        "createdAt": item.created_at, "updatedAt": item.updated_at,
    }

@router.get("/cart")
def get_cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = list(db.scalars(select(MarketCartItem).where(MarketCartItem.user_id == user.id).order_by(MarketCartItem.updated_at.desc())))
    items = [value for value in (cart_item_data(db, row) for row in rows) if value]
    return {"items": items, "total": len(items)}

@router.put("/cart/items")
def put_cart_item(payload: CartItemUpdate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(MarketProduct, payload.productId)
    if not product or product.listing_status != "published": fail("PRODUCT_NOT_AVAILABLE", "商品不存在或已下架", 404)
    if product.category == "rental": fail("RENTAL_CART_UNSUPPORTED", "租赁商品请先选择租期", 422)
    if payload.quantity > product.stock: fail("INSUFFICIENT_STOCK", "库存不足", 409)
    item = db.scalar(select(MarketCartItem).where(MarketCartItem.user_id == user.id, MarketCartItem.product_id == product.id))
    if item: item.quantity = payload.quantity
    else: item = MarketCartItem(user_id=user.id, product_id=product.id, quantity=payload.quantity); db.add(item)
    db.flush(); write_audit_log(db, actor_id=user.id, action="market.cart.updated", resource_type="market_cart_item", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.commit(); db.refresh(item)
    return cart_item_data(db, item)

@router.delete("/cart/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cart_item(item_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(MarketCartItem, item_id)
    if not item or item.user_id != user.id: fail("CART_ITEM_NOT_FOUND", "购物车商品不存在", 404)
    write_audit_log(db, actor_id=user.id, action="market.cart.removed", resource_type="market_cart_item", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.delete(item); db.commit()


@router.get("/repair/providers")
def list_repair_providers(city: str = Query("", max_length=64), brand: str = Query("", max_length=80), keyword: str = Query("", max_length=100), params: PageParams = Depends(get_page_params), db: Session = Depends(get_db)):
    stmt = select(RepairProvider).where(RepairProvider.is_active.is_(True))
    if city: stmt = stmt.where(RepairProvider.city == city)
    if brand: stmt = stmt.where(RepairProvider.brands.contains([brand]))
    if keyword: stmt = stmt.where(or_(RepairProvider.name.ilike(f"%{keyword}%"), RepairProvider.address.ilike(f"%{keyword}%")))
    rows, meta = page(db, stmt.order_by(RepairProvider.verification_status.desc(), RepairProvider.updated_at.desc()), params)
    return {"items": [repair_provider_data(row) for row in rows], **meta, "meta": {"source": "平台维修服务商目录"}}


@router.get("/repair/providers/{provider_id}")
def get_repair_provider(provider_id: int, db: Session = Depends(get_db)):
    item = db.get(RepairProvider, provider_id)
    if not item or not item.is_active: fail("REPAIR_PROVIDER_NOT_FOUND", "维修服务商不存在", 404)
    return repair_provider_data(item)


@router.post("/repair/bookings", status_code=status.HTTP_201_CREATED)
def create_repair_booking(payload: RepairBookingCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    provider = db.get(RepairProvider, payload.providerId)
    if not provider or not provider.is_active: fail("REPAIR_PROVIDER_NOT_FOUND", "维修服务商不存在", 404)
    if payload.preferredDate <= datetime.now(payload.preferredDate.tzinfo or timezone.utc): fail("INVALID_REPAIR_DATE", "预约时间必须晚于当前时间", 422)
    item = RepairBooking(
        user_id=user.id, provider_id=provider.id, brand=payload.brand.strip(), model=payload.model.strip(),
        issue_type=payload.issueType.strip(), description=payload.description.strip(), service_mode=payload.serviceMode,
        preferred_date=payload.preferredDate, status="submitted",
    )
    db.add(item); db.flush(); write_audit_log(db, actor_id=user.id, action="market.repair.booking.created", resource_type="repair_booking", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.commit(); db.refresh(item)
    return repair_booking_data(db, item)


@router.get("/repair/bookings")
def list_repair_bookings(params: PageParams = Depends(get_page_params), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(RepairBooking).where(RepairBooking.user_id == user.id).order_by(RepairBooking.created_at.desc())
    rows, meta = page(db, stmt, params)
    return {"items": [repair_booking_data(db, row) for row in rows], **meta}

def order_data(db: Session, order: MarketOrder):
    product = db.get(MarketProduct, order.product_id)
    return {"id": str(order.id), "productId": str(order.product_id), "product": product_data(product) if product else None, "quantity": order.quantity, "totalAmount": float(order.total_amount), "status": order.status, "leaseStart": order.lease_start, "leaseEnd": order.lease_end, "payment": {"status": "pending", "capability": "wallet_not_connected"}, "createdAt": order.created_at}

def quote(db: Session, payload: OrderQuote):
    product = db.get(MarketProduct, payload.productId)
    if not product or product.listing_status != "published": fail("PRODUCT_NOT_AVAILABLE", "商品不存在或不可下单", 404)
    if payload.quantity > product.stock: fail("INSUFFICIENT_STOCK", "库存不足", 409)
    total = product.price * payload.quantity
    plan = None
    if payload.rentalPlanId:
        plan = db.get(RentalPlan, payload.rentalPlanId)
        if not plan or plan.product_id != product.id or not plan.is_active: fail("RENTAL_PLAN_NOT_FOUND", "租赁方案不可用", 422)
        if not payload.startDate or not payload.endDate or payload.endDate <= payload.startDate: fail("INVALID_RENTAL_RANGE", "租赁日期无效", 422)
        active = db.scalar(select(func.count(MarketOrder.id)).where(MarketOrder.rental_plan_id == plan.id, MarketOrder.status.not_in(("cancelled", "refunded")), MarketOrder.lease_start < payload.endDate, MarketOrder.lease_end > payload.startDate)) or 0
        if active >= plan.available_units: fail("RENTAL_CONFLICT", "该租期库存不足", 409)
        days = max(1, (payload.endDate.date() - payload.startDate.date()).days)
        total = plan.daily_price * days * payload.quantity + plan.deposit
    return product, plan, total

@router.get("/products")
def list_products(keyword: str = Query("", max_length=100), category: str = Query("", max_length=24), brand: str = Query("", max_length=80), model: str = Query("", max_length=80), city: str = Query("", max_length=64), delivery: str = Query("", max_length=32), verification: str = Query("", max_length=32), sort: str = Query("recommended"), params: PageParams = Depends(get_page_params), db: Session = Depends(get_db)):
    stmt = select(MarketProduct).where(MarketProduct.listing_status == "published")
    if keyword: stmt = stmt.where(or_(MarketProduct.title.ilike(f"%{keyword}%"), MarketProduct.brand.ilike(f"%{keyword}%"), MarketProduct.model.ilike(f"%{keyword}%"), MarketProduct.summary.ilike(f"%{keyword}%")))
    for col, value in ((MarketProduct.category, category), (MarketProduct.brand, brand), (MarketProduct.model, model), (MarketProduct.city, city), (MarketProduct.verification_status, verification)):
        if value: stmt = stmt.where(col == value)
    if delivery: stmt = stmt.where(MarketProduct.delivery.contains([delivery]))
    if sort == "price_asc": stmt = stmt.order_by(MarketProduct.price.asc(), MarketProduct.id.desc())
    elif sort == "price_desc": stmt = stmt.order_by(MarketProduct.price.desc(), MarketProduct.id.desc())
    else: stmt = stmt.order_by(MarketProduct.verification_status.desc(), MarketProduct.updated_at.desc())
    rows, meta = page(db, stmt, params); return {"items": [product_data(x, False) for x in rows], **meta}

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(MarketProduct, product_id)
    if not product or product.listing_status != "published": fail("PRODUCT_NOT_FOUND", "商品不存在", 404)
    return product_data(product)

@router.get("/products/{product_id}/rental-plans")
def plans(product_id: int, db: Session = Depends(get_db)):
    return {"items": [{"id": str(x.id), "name": x.name, "dailyPrice": float(x.daily_price), "deposit": float(x.deposit), "availableUnits": x.available_units} for x in db.scalars(select(RentalPlan).where(RentalPlan.product_id == product_id, RentalPlan.is_active.is_(True)))]}

@router.get("/device-history")
@router.get("/devices/{sn}/history")
def history(sn: Optional[str] = None, db: Session = Depends(get_db)):
    if not sn or not (3 <= len(sn) <= 80): fail("INVALID_SN", "设备序列号格式无效", 422)
    rows = db.scalars(select(DeviceHistoryEvent).where(DeviceHistoryEvent.sn == sn, DeviceHistoryEvent.is_public.is_(True)).order_by(DeviceHistoryEvent.occurred_at.desc())).all()
    return {"sn": sn[-4:].rjust(len(sn), "*"), "items": [{"id": str(x.id), "type": x.event_type, "note": x.note, "source": x.source, "verification": x.verification_status, "occurredAt": x.occurred_at} for x in rows]}

@router.get("/inspection-reports/{report_id}")
def report(report_id: int, db: Session = Depends(get_db)):
    item = db.get(InspectionReport, report_id)
    if not item: fail("REPORT_NOT_FOUND", "质检报告不存在", 404)
    return {"id": str(item.id), "productId": str(item.product_id), "source": item.source, "status": item.status, "report": item.report_data, "issuedAt": item.issued_at}

@router.get("/seller-eligibility")
def seller_eligibility(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    verified = approved_verification(db, user.id, "personal") or approved_verification(db, user.id, "enterprise")
    return {"eligible": verified, "reason": "认证已通过" if verified else "需完成个人或企业认证", "verificationRequired": True}

@router.post("/uploads/presign")
def presign(user: User = Depends(get_current_user)):
    return {"status": "use_uploads_endpoint", "message": "请先通过受保护的 /uploads 上传，再将 assetId 填入挂牌资料"}

@router.post("/listings", status_code=status.HTTP_201_CREATED)
def listing(payload: ListingCreate, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not (approved_verification(db, user.id, "personal") or approved_verification(db, user.id, "enterprise")): fail("SELLER_VERIFICATION_REQUIRED", "挂牌需要有效认证", 403)
    if payload.sn and db.scalar(select(MarketProduct.id).where(MarketProduct.sn == payload.sn, MarketProduct.listing_status.not_in(("rejected", "ended")))): fail("SN_ALREADY_LISTED", "该设备序列号已有有效挂牌", 409)
    item = MarketProduct(seller_id=user.id, **payload.model_dump(), verification_status="pending", listing_status="reviewing")
    db.add(item); db.flush(); write_audit_log(db, actor_id=user.id, action="market.listing.created", resource_type="market_product", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.commit(); db.refresh(item)
    return product_data(item)

@router.post("/products/{product_id}/lease-quote")
def lease_quote(product_id: int, payload: OrderQuote, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.productId != product_id: fail("PRODUCT_ID_MISMATCH", "商品不匹配", 422)
    product, plan, total = quote(db, payload); return {"productId": str(product.id), "rentalPlanId": str(plan.id) if plan else None, "totalAmount": float(total), "currency": "CNY", "status": "quoted"}

@router.post("/orders/quote")
def order_quote(payload: OrderQuote, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product, plan, total = quote(db, payload); return {"productId": str(product.id), "rentalPlanId": str(plan.id) if plan else None, "totalAmount": float(total), "currency": "CNY", "status": "quoted"}

@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, request: Request, idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if idempotency_key:
        existing = db.scalar(select(MarketOrder).where(MarketOrder.idempotency_key == idempotency_key))
        if existing:
            if existing.buyer_id != user.id: fail("IDEMPOTENCY_KEY_FORBIDDEN", "幂等键无权使用", 403)
            return order_data(db, existing)
    product, plan, total = quote(db, payload)
    if product.seller_id == user.id: fail("OWN_PRODUCT_FORBIDDEN", "不能购买自己的商品", 403)
    locked = db.scalar(select(MarketProduct).where(MarketProduct.id == product.id).with_for_update())
    if not locked or locked.stock < payload.quantity: fail("INSUFFICIENT_STOCK", "库存不足", 409)
    locked.stock -= payload.quantity
    item = MarketOrder(buyer_id=user.id, seller_id=product.seller_id, product_id=product.id, rental_plan_id=plan.id if plan else None, quantity=payload.quantity, total_amount=total, lease_start=payload.startDate, lease_end=payload.endDate, address=payload.address, idempotency_key=idempotency_key)
    db.add(item); db.flush(); write_audit_log(db, actor_id=user.id, action="market.order.created", resource_type="market_order", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.commit(); db.refresh(item); return order_data(db, item)

@router.get("/orders")
def list_orders(status_filter: str = Query("", alias="status"), params: PageParams = Depends(get_page_params), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(MarketOrder).where(or_(MarketOrder.buyer_id == user.id, MarketOrder.seller_id == user.id)).order_by(MarketOrder.created_at.desc())
    if status_filter: stmt = stmt.where(MarketOrder.status == status_filter)
    rows, meta = page(db, stmt, params); return {"items": [order_data(db, row) for row in rows], **meta}

@router.get("/orders/{order_id}")
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(MarketOrder, order_id)
    if not item: fail("ORDER_NOT_FOUND", "订单不存在", 404)
    if user.id not in {item.buyer_id, item.seller_id}: fail("ORDER_FORBIDDEN", "无权查看该订单", 403)
    return order_data(db, item)

@router.post("/orders/{order_id}/actions")
def order_action(order_id: int, payload: OrderAction, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(MarketOrder, order_id)
    if not item: fail("ORDER_NOT_FOUND", "订单不存在", 404)
    buyer, seller = user.id == item.buyer_id, user.id == item.seller_id
    rules = {"cancel": ({"pending_payment"}, buyer, "cancelled"), "pay_pending": ({"pending_payment"}, buyer, "payment_pending"), "lock_stock": ({"payment_pending"}, buyer, "stock_locked"), "ship": ({"stock_locked"}, seller, "shipped"), "confirm_receipt": ({"shipped"}, buyer, "received"), "request_after_sale": ({"shipped", "received"}, buyer, "after_sale_requested"), "approve_refund": ({"after_sale_requested"}, seller, "refunded"), "reject_refund": ({"after_sale_requested"}, seller, "received"), "complete": ({"received"}, buyer or seller, "completed")}
    rule = rules.get(payload.action)
    if not rule: fail("UNKNOWN_ORDER_ACTION", "不支持的订单操作", 422)
    allowed, authorized, next_status = rule
    if not authorized: fail("ORDER_ACTION_FORBIDDEN", "无权执行该订单操作", 403)
    if item.status not in allowed: fail("INVALID_ORDER_STATE", "订单状态不允许该操作", 409)
    if payload.action == "cancel":
        product = db.get(MarketProduct, item.product_id)
        if product: product.stock += item.quantity
    item.status = next_status
    if payload.action == "request_after_sale": item.after_sale_reason = payload.reason.strip() or None
    db.add(MarketOrderAction(order_id=item.id, actor_id=user.id, action=payload.action, note=payload.reason))
    write_audit_log(db, actor_id=user.id, action="market.order." + payload.action, resource_type="market_order", resource_id=item.id, request_id=getattr(request.state, "request_id", None)); db.commit(); db.refresh(item); return order_data(db, item)
