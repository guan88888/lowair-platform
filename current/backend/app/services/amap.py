from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings


AMAP_API_ROOT = "https://restapi.amap.com/v3"

# These are only a non-geographic directory fallback for city selection.  They
# are deliberately labelled as such by the API; weather, geocoding and address
# suggestions never fall back to fabricated live data.
MAJOR_CITIES = [
    ("北京", "北京市", "110000", 116.4074, 39.9042), ("上海", "上海市", "310000", 121.4737, 31.2304),
    ("广州", "广东省", "440100", 113.2644, 23.1291), ("深圳", "广东省", "440300", 114.0579, 22.5431),
    ("杭州", "浙江省", "330100", 120.1551, 30.2741), ("南京", "江苏省", "320100", 118.7969, 32.0603),
    ("苏州", "江苏省", "320500", 120.5853, 31.2989), ("宁波", "浙江省", "330200", 121.5503, 29.8746),
    ("成都", "四川省", "510100", 104.0665, 30.5728), ("重庆", "重庆市", "500000", 106.5516, 29.5630),
    ("武汉", "湖北省", "420100", 114.3054, 30.5931), ("长沙", "湖南省", "430100", 112.9388, 28.2282),
    ("西安", "陕西省", "610100", 108.9398, 34.3416), ("郑州", "河南省", "410100", 113.6254, 34.7466),
    ("济南", "山东省", "370100", 117.1201, 36.6512), ("青岛", "山东省", "370200", 120.3826, 36.0671),
    ("天津", "天津市", "120000", 117.2009, 39.0842), ("石家庄", "河北省", "130100", 114.5149, 38.0428),
    ("合肥", "安徽省", "340100", 117.2272, 31.8206), ("福州", "福建省", "350100", 119.2965, 26.0745),
    ("厦门", "福建省", "350200", 118.0894, 24.4798), ("昆明", "云南省", "530100", 102.8329, 24.8801),
    ("南宁", "广西壮族自治区", "450100", 108.3669, 22.8170), ("海口", "海南省", "460100", 110.1999, 20.0442),
    ("沈阳", "辽宁省", "210100", 123.4315, 41.8057), ("大连", "辽宁省", "210200", 121.6147, 38.9140),
    ("哈尔滨", "黑龙江省", "230100", 126.5349, 45.8038), ("长春", "吉林省", "220100", 125.3235, 43.8171),
    ("南昌", "江西省", "360100", 115.8579, 28.6820), ("贵阳", "贵州省", "520100", 106.6302, 26.6470),
    ("兰州", "甘肃省", "620100", 103.8343, 36.0611), ("乌鲁木齐", "新疆维吾尔自治区", "650100", 87.6168, 43.8256),
    ("呼和浩特", "内蒙古自治区", "150100", 111.7492, 40.8426), ("银川", "宁夏回族自治区", "640100", 106.2309, 38.4872),
    ("西宁", "青海省", "630100", 101.7782, 36.6171), ("拉萨", "西藏自治区", "540100", 91.1409, 29.6456),
]


class AmapUnavailable(RuntimeError):
    pass


def _get(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if not settings.AMAP_WEB_SERVICE_KEY:
        raise AmapUnavailable("高德地图 Web 服务尚未配置")
    try:
        response = httpx.get(
            AMAP_API_ROOT + path,
            params={**params, "key": settings.AMAP_WEB_SERVICE_KEY},
            timeout=settings.AMAP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise AmapUnavailable("高德地图服务暂时不可用") from error
    if payload.get("status") != "1":
        raise AmapUnavailable(payload.get("info") or "高德地图服务未返回有效数据")
    return payload


def geocode(address: str, city: str = "") -> Dict[str, Any]:
    payload = _get("/geocode/geo", {"address": address, "city": city})
    records = payload.get("geocodes") or []
    if not records:
        raise AmapUnavailable("未找到该地址")
    item = records[0]
    longitude, latitude = (item.get("location") or ",").split(",", 1)
    return {
        "address": item.get("formatted_address") or address,
        "province": item.get("province") or "",
        "city": item.get("city") if isinstance(item.get("city"), str) else city,
        "district": item.get("district") or "",
        "adcode": item.get("adcode") or "",
        "longitude": float(longitude),
        "latitude": float(latitude),
        "meta": {
            "source": "高德地图 Web 服务",
            "updatedAt": datetime.now(timezone.utc),
            "realtime": True,
        },
    }


def _point(value: str) -> tuple[Optional[float], Optional[float]]:
    try:
        longitude, latitude = value.split(",", 1)
        return float(longitude), float(latitude)
    except (AttributeError, TypeError, ValueError):
        return None, None


def _city_record(name: str, province: str = "", adcode: str = "", location: str = "", source: str = "高德地图 Web 服务") -> Dict[str, Any]:
    longitude, latitude = _point(location)
    city_name = name[:-1] if name.endswith("市") else name
    return {"id": adcode or name, "name": city_name, "label": name, "province": province, "adcode": adcode,
            "longitude": longitude, "latitude": latitude, "source": source}


def search_cities(keyword: str = "", page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    """Search administrative areas, prioritising AMap district results.

    AMap's district endpoint is intentionally queried on the server so its Web
    service key is never exposed to H5, mini-program, or native bundles.
    """
    needle = keyword.strip()
    amap_items: List[Dict[str, Any]] = []
    amap_error = ""
    if settings.AMAP_WEB_SERVICE_KEY:
        try:
            payload = _get("/config/district", {"keywords": needle or "中国", "subdistrict": 1, "extensions": "base", "page": page, "offset": page_size})
            for item in payload.get("districts") or []:
                level = item.get("level") or item.get("citycode")
                # City-level results are preferred. Municipalities can be
                # returned as province records and remain valid selections.
                if level not in {"city", "province", "district"}:
                    continue
                name = str(item.get("name") or "").strip()
                if not name:
                    continue
                amap_items.append(_city_record(name, str(item.get("province") or ""), str(item.get("adcode") or ""), str(item.get("center") or "")))
        except AmapUnavailable as error:
            amap_error = str(error)

    fallback = [_city_record(name, province, adcode, f"{longitude},{latitude}", "内置主要城市目录") for name, province, adcode, longitude, latitude in MAJOR_CITIES]
    if needle:
        fallback = [item for item in fallback if needle.lower() in (item["name"] + item["label"] + item["province"]).lower()]
    seen = set()
    merged = []
    for item in [*amap_items, *fallback]:
        identity = item["adcode"] or item["name"]
        if identity not in seen:
            seen.add(identity)
            merged.append(item)
    offset = (page - 1) * page_size
    items = merged[:page_size] if amap_items else merged[offset:offset + page_size]
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": len(merged),
        "has_more": len(amap_items) >= page_size if amap_items else offset + page_size < len(merged),
        "meta": {"source": "高德地图 Web 服务" if amap_items else "内置主要城市目录", "updatedAt": datetime.now(timezone.utc), "realtime": bool(amap_items), "degraded": not bool(amap_items), "message": amap_error or ("未配置高德 Web 服务 Key，已显示内置主要城市目录" if not settings.AMAP_WEB_SERVICE_KEY else "高德城市搜索暂不可用")},
    }


def address_tips(keyword: str, city: str = "", location: str = "") -> Dict[str, Any]:
    params: Dict[str, Any] = {"keywords": keyword, "city": city, "datatype": "all"}
    if location:
        params["location"] = location
    payload = _get("/assistant/inputtips", params)
    items = []
    for item in payload.get("tips") or []:
        longitude, latitude = _point(item.get("location") or "")
        if longitude is None or latitude is None:
            continue
        name = str(item.get("name") or "").strip()
        address = str(item.get("address") or "").strip()
        if name:
            items.append({"id": item.get("id") or f"{longitude},{latitude}", "name": name, "address": address, "city": item.get("city") or city, "district": item.get("district") or "", "adcode": item.get("adcode") or "", "longitude": longitude, "latitude": latitude})
    return {"items": items, "meta": {"source": "高德地图 Web 服务", "updatedAt": datetime.now(timezone.utc), "realtime": True}}


def reverse_geocode(longitude: float, latitude: float) -> Dict[str, Any]:
    payload = _get("/geocode/regeo", {"location": f"{longitude},{latitude}", "extensions": "base"})
    result = payload.get("regeocode") or {}
    component = result.get("addressComponent") or {}
    city = component.get("city") or component.get("province") or ""
    if isinstance(city, list):
        city = city[0] if city else ""
    return {"address": result.get("formatted_address") or "", "city": city, "province": component.get("province") or "", "district": component.get("district") or "", "adcode": component.get("adcode") or "", "longitude": longitude, "latitude": latitude, "meta": {"source": "高德地图 Web 服务", "updatedAt": datetime.now(timezone.utc), "realtime": True}}


def live_weather(city_or_adcode: str) -> Optional[Dict[str, Any]]:
    payload = _get("/weather/weatherInfo", {"city": city_or_adcode, "extensions": "base"})
    records = payload.get("lives") or []
    if not records:
        return None
    item = records[0]
    wind_power = str(item.get("windpower") or "").replace("≤", "")
    return {
        "province": item.get("province") or "",
        "city": item.get("city") or "",
        "adcode": item.get("adcode") or city_or_adcode,
        "temperature": item.get("temperature") or "--",
        "humidity": item.get("humidity") or "--",
        "windDirection": item.get("winddirection") or "--",
        "windPower": wind_power or "--",
        "condition": item.get("weather") or "--",
        "reportedAt": item.get("reporttime") or "",
    }
