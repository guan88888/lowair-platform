from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.home import FlightAdvisory, HomeContent
from app.models.academy import AcademyInstitution
from app.models.community import CommunityPost
from app.models.market import MarketProduct
from app.models.work import Job, Task
from app.schemas.home import AddressTipsResponse, CitySearchResponse, FlightConditionsResponse, HomeItem, HomeModuleResponse, SearchAssistRequest, SearchResponse
from app.services.amap import AmapUnavailable, address_tips, geocode, live_weather, reverse_geocode, search_cities
from app.services.assistant import generate_search_assist

router = APIRouter()
SEARCH_CATEGORIES = {"全部", "机构", "岗位", "任务", "商品", "内容"}
MODULES = {"carousel", "summary", "entries", "tasks", "institutions", "devices", "rumors"}


def _content_item(item: HomeContent) -> HomeItem:
    return HomeItem(id=str(item.id), title=item.title, note=item.note, to=item.target_url, category=item.category, payload=item.payload or {})


@router.get("/home/modules/{key}", response_model=HomeModuleResponse)
def get_home_module(key: str, city: str = Query("", max_length=64), db: Session = Depends(get_db)) -> HomeModuleResponse:
    if key not in MODULES:
        raise HTTPException(status_code=404, detail={"code": "HOME_MODULE_NOT_FOUND", "message": "首页模块不存在"})
    statement = select(HomeContent).where(HomeContent.module_key == key, HomeContent.is_active.is_(True))
    if city:
        statement = statement.where(or_(HomeContent.city == city, HomeContent.city.is_(None)))
    rows = db.scalars(statement.order_by(HomeContent.rank.desc(), HomeContent.updated_at.desc())).all()
    return HomeModuleResponse(items=[_content_item(row) for row in rows], meta={"source": "content-service", "updatedAt": max((row.updated_at for row in rows), default=None)})


@router.get("/home/dashboard")
def get_dashboard(city: str = Query("", max_length=64), db: Session = Depends(get_db)) -> dict:
    modules = {key: get_home_module(key, city, db).items for key in MODULES}
    return {"city": city, "modules": {key: [item.model_dump() for item in items] for key, items in modules.items()}, "updatedAt": datetime.now(timezone.utc)}


@router.get("/search", response_model=SearchResponse)
def search_all(
    keyword: str = Query("", min_length=1, max_length=100),
    category: Literal["全部", "机构", "岗位", "任务", "商品", "内容"] = "全部",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> SearchResponse:
    if category not in SEARCH_CATEGORIES:
        raise HTTPException(status_code=422, detail={"code": "INVALID_CATEGORY", "message": "不支持的搜索分类"})
    terms = f"%{keyword.strip()}%"
    statement = select(HomeContent).where(HomeContent.is_active.is_(True), or_(HomeContent.title.like(terms), HomeContent.note.like(terms)))
    if category != "全部":
        statement = statement.where(HomeContent.category == category)
    rows = db.scalars(statement.order_by(HomeContent.rank.desc(), HomeContent.updated_at.desc())).all()
    items = [_content_item(row) for row in rows]
    if category in ("全部", "机构"):
        items.extend(HomeItem(id=str(x.id), category="机构", title=x.name, note=x.tagline or "", to="/pages/academy/institution-detail?id=" + str(x.id)) for x in db.scalars(select(AcademyInstitution).where(or_(AcademyInstitution.name.like(terms), AcademyInstitution.tagline.like(terms)))))
    if category in ("全部", "岗位"):
        items.extend(HomeItem(id=str(x.id), category="岗位", title=x.title, note=x.city, to="/pages/work/job-detail?id=" + str(x.id)) for x in db.scalars(select(Job).where(or_(Job.title.like(terms), Job.city.like(terms)))))
    if category in ("全部", "任务"):
        items.extend(HomeItem(id=str(x.id), category="任务", title=x.title, note=x.city, to="/pages/work/task-detail?id=" + str(x.id)) for x in db.scalars(select(Task).where(or_(Task.title.like(terms), Task.city.like(terms)))))
    if category in ("全部", "商品"):
        items.extend(HomeItem(id=str(x.id), category="商品", title=x.title, note=x.summary, to="/pages/market/product-detail?id=" + str(x.id)) for x in db.scalars(select(MarketProduct).where(or_(MarketProduct.title.like(terms), MarketProduct.summary.like(terms)))))
    if category in ("全部", "内容"):
        items.extend(HomeItem(id=str(x.id), category="内容", title=x.title, note=x.content[:120], to="/pages/community/post-detail?id=" + str(x.id)) for x in db.scalars(select(CommunityPost).where(CommunityPost.moderation_status == "approved", CommunityPost.deleted_at.is_(None), or_(CommunityPost.title.like(terms), CommunityPost.content.like(terms)))))
    items.sort(key=lambda item: (item.title.lower().find(keyword.strip().lower()), item.title))
    offset = (page - 1) * page_size
    page_rows = items[offset: offset + page_size]
    return SearchResponse(items=page_rows, page=page, page_size=page_size, total=len(items), has_more=offset + page_size < len(items), meta={"source": "cross-domain"})


@router.post("/search/ai-assist")
def search_ai_assist(payload: SearchAssistRequest, db: Session = Depends(get_db)) -> dict:
    if payload.category not in SEARCH_CATEGORIES:
        raise HTTPException(status_code=422, detail={"code": "INVALID_CATEGORY", "message": "不支持的搜索分类"})
    terms = f"%{payload.keyword.strip()}%"
    titles = list(db.scalars(select(HomeContent.title).where(HomeContent.is_active.is_(True), or_(HomeContent.title.like(terms), HomeContent.note.like(terms))).limit(8)))
    return generate_search_assist(payload.keyword.strip(), payload.category, titles)


@router.get("/location/geocode")
def lookup_address(address: str = Query(..., min_length=2, max_length=160), city: str = Query("", max_length=64)) -> dict:
    try:
        return geocode(address.strip(), city.strip())
    except AmapUnavailable as error:
        raise HTTPException(status_code=503, detail={"code": "AMAP_UNAVAILABLE", "message": str(error)})


@router.get("/location/cities", response_model=CitySearchResponse)
def lookup_cities(keyword: str = Query("", max_length=64), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50)) -> dict:
    # This endpoint remains useful without a Key as a clearly-labelled city
    # directory; it never pretends that fallback results came from AMap.
    return search_cities(keyword, page, page_size)


@router.get("/location/address-tips", response_model=AddressTipsResponse)
def lookup_address_tips(keyword: str = Query(..., min_length=1, max_length=100), city: str = Query("", max_length=64), longitude: Optional[float] = Query(None, ge=73, le=136), latitude: Optional[float] = Query(None, ge=3, le=54)) -> dict:
    location = f"{longitude},{latitude}" if longitude is not None and latitude is not None else ""
    try:
        return address_tips(keyword.strip(), city.strip(), location)
    except AmapUnavailable as error:
        raise HTTPException(status_code=503, detail={"code": "AMAP_UNAVAILABLE", "message": str(error)})


@router.get("/location/regeocode")
def lookup_current_city(longitude: float = Query(..., ge=73, le=136), latitude: float = Query(..., ge=3, le=54)) -> dict:
    try:
        return reverse_geocode(longitude, latitude)
    except AmapUnavailable as error:
        raise HTTPException(status_code=503, detail={"code": "AMAP_UNAVAILABLE", "message": str(error)})


@router.get("/flight/conditions", response_model=FlightConditionsResponse)
def get_flight_conditions(city: str = Query(..., min_length=1, max_length=64), adcode: str = Query("", max_length=16), db: Session = Depends(get_db)) -> FlightConditionsResponse:
    advisories = db.scalars(select(FlightAdvisory).where(FlightAdvisory.city == city, FlightAdvisory.is_active.is_(True)).order_by(FlightAdvisory.updated_at.desc())).all()
    risks = [{"id": str(item.id), "level": item.level, "title": item.title, "note": item.note, "source": item.source} for item in advisories]
    high_risk = any(item.level == "高" for item in advisories)
    weather = {"temperature": "--", "windSpeed": "--", "visibility": "--", "condition": "未接入实时气象", "riskCount": len(risks)}
    meta = {"source": "flight-advisory-service", "updatedAt": datetime.now(timezone.utc), "realtime": False}
    reasons = ["气象和空域数据必须以实时授权数据源为准", "本接口不构成飞行许可或适航结论"]
    try:
        live = live_weather(adcode or city)
        if live:
            weather = {
                "temperature": str(live["temperature"]) + "°C",
                "windSpeed": live["windPower"] + "级",
                "visibility": "高德基础天气未提供",
                "condition": live["condition"],
                "humidity": str(live["humidity"]) + "%",
                "windDirection": live["windDirection"],
                "riskCount": len(risks),
            }
            meta = {"source": "高德地图天气 + 平台空域提示", "updatedAt": live["reportedAt"] or datetime.now(timezone.utc), "realtime": True}
            reasons.insert(0, "高德天气为城市级参考，现场阵风、能见度和机型限制仍需复核")
    except AmapUnavailable:
        reasons.insert(0, "高德地图天气服务未配置或暂不可用")
    return FlightConditionsResponse(
        city=city,
        status="不建议起飞" if high_risk else "需现场复核",
        statusTone="danger" if high_risk else "caution",
        weather=weather,
        reasons=reasons,
        risks=risks,
        checklist=[{"id": "airspace", "title": "空域与临时管制", "note": "核对主管部门当次许可"}, {"id": "weather", "title": "气象与现场测风", "note": "核对机型限制和现场观测"}],
        disclaimer="本页仅提供风险信息整理，不构成空域许可、适航证明或现场放飞结论。",
        meta=meta,
    )


@router.get("/flight/airspace-notices")
def list_airspace_notices(city: str = Query("", max_length=64), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)) -> dict:
    statement = select(FlightAdvisory).where(FlightAdvisory.advisory_type == "airspace", FlightAdvisory.is_active.is_(True))
    if city:
        statement = statement.where(FlightAdvisory.city == city)
    rows = db.scalars(statement.order_by(FlightAdvisory.updated_at.desc())).all()
    offset = (page - 1) * page_size
    return {"items": [{"id": str(row.id), "city": row.city, "level": row.level, "title": row.title, "note": row.note, "source": row.source, "updated_at": row.updated_at} for row in rows[offset:offset + page_size]], "page": page, "page_size": page_size, "total": len(rows), "has_more": offset + page_size < len(rows)}


@router.get("/flight/fields")
def list_flight_fields(city: str = Query("", max_length=64), db: Session = Depends(get_db)) -> dict:
    return get_home_module("institutions", city, db).model_dump()


@router.get("/flight/maintenance-services")
def list_maintenance_services(city: str = Query("", max_length=64), db: Session = Depends(get_db)) -> dict:
    return get_home_module("devices", city, db).model_dump()
