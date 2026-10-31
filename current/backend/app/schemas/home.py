from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class HomeItem(BaseModel):
    id: str
    title: str
    note: str = ""
    to: str = ""
    category: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)


class HomeModuleResponse(BaseModel):
    items: List[HomeItem]
    meta: Dict[str, Any]


class SearchResponse(BaseModel):
    items: List[HomeItem]
    page: int
    page_size: int
    total: int
    has_more: bool
    meta: Dict[str, Any]


class FlightConditionsResponse(BaseModel):
    city: str
    status: str
    statusTone: str
    weather: Dict[str, Any]
    reasons: List[str]
    risks: List[Dict[str, Any]]
    checklist: List[Dict[str, str]]
    disclaimer: str
    meta: Dict[str, Any]


class LocationMeta(BaseModel):
    source: str
    updatedAt: Any
    realtime: bool = False
    degraded: bool = False
    message: str = ""


class CityOption(BaseModel):
    id: str
    name: str
    label: str = ""
    province: str = ""
    adcode: str = ""
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    source: str = ""


class CitySearchResponse(BaseModel):
    items: List[CityOption]
    page: int
    page_size: int
    total: int
    has_more: bool
    meta: LocationMeta


class AddressTip(BaseModel):
    id: str
    name: str
    address: str = ""
    city: str = ""
    district: str = ""
    adcode: str = ""
    longitude: float
    latitude: float


class AddressTipsResponse(BaseModel):
    items: List[AddressTip]
    meta: LocationMeta


class SearchAssistRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=100)
    category: str = Field(default="全部", max_length=16)
