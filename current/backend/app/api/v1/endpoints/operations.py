from datetime import datetime
from decimal import Decimal
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.audit import write_audit_log
from app.core.pagination import PageParams, get_page_params
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.operations import AdPlacement, Campaign, Creative
from app.models.user import User
from app.services.platform import approved_verification

router=APIRouter()
class CreativeIn(BaseModel): title:str=Field(min_length=1,max_length=160); mediaAssetId:int; type:str="image"; metadata:Dict[str,Any]=Field(default_factory=dict)
class CampaignIn(BaseModel): name:str=Field(min_length=1,max_length=160); goal:str; placement_id:int; creative_id:int; budget:Dict[str,Any]; schedule:Dict[str,Any]; audience:Dict[str,Any]=Field(default_factory=dict); copy_data:Dict[str,Any]=Field(default_factory=dict, alias="copy"); compliance_confirmed:bool=False
class ActionIn(BaseModel): action:str
def fail(code,msg,num=400): raise HTTPException(num,detail={"code":code,"message":msg})
def tenant(db,user):
    if not (approved_verification(db,user.id,"enterprise") or approved_verification(db,user.id,"institution")): fail("AD_VERIFICATION_REQUIRED","需要企业或机构认证",403)
def creative_data(x): return {"id":str(x.id),"title":x.title,"type":x.media_type,"reviewStatus":x.review_status,"metadata":x.metadata_json}
def campaign_data(x): return {"id":str(x.id),"name":x.name,"goal":x.goal,"placementId":str(x.placement_id),"creativeId":str(x.creative_id),"status":x.status,"budget":{"total":float(x.budget_total),"daily":float(x.budget_daily),"currency":"CNY"},"schedule":{"startAt":x.start_at,"endAt":x.end_at},"audience":x.targeting,"copy":x.copy_data,"metrics":{"spent":0,"impressions":0,"clicks":0,"leads":0},"dataSource":"server"}
@router.get("/ad-placements")
def placements(db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    tenant(db,user); return {"items":[{"id":str(x.id),"name":x.name,"city":x.city,"description":x.description,"status":x.status} for x in db.scalars(select(AdPlacement).where(AdPlacement.status=="active"))]}
@router.get("/creatives")
def list_creatives(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user); return {"items":[creative_data(x) for x in db.scalars(select(Creative).where(Creative.owner_id==user.id).order_by(Creative.id.desc()))]}
@router.post("/creatives",status_code=201)
def create_creative(body:CreativeIn,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user); x=Creative(owner_id=user.id,title=body.title,media_asset_id=body.mediaAssetId,media_type=body.type,metadata_json=body.metadata,review_status="reviewing");db.add(x);db.commit();db.refresh(x);return creative_data(x)
@router.get("/campaigns")
def list_campaigns(status_filter:str=Query("",alias="status"),params:PageParams=Depends(get_page_params),user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user); stmt=select(Campaign).where(Campaign.owner_id==user.id).order_by(Campaign.updated_at.desc());
    if status_filter: stmt=stmt.where(Campaign.status==status_filter)
    total=db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0; rows=db.scalars(stmt.offset((params.page-1)*params.page_size).limit(params.page_size)); return {"items":[campaign_data(x) for x in rows],"page":params.page,"page_size":params.page_size,"total":total,"has_more":params.page*params.page_size<total}
@router.post("/campaigns",status_code=201)
def create_campaign(body:CampaignIn,request:Request,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user)
    if not body.compliance_confirmed: fail("COMPLIANCE_REQUIRED","必须确认素材合规声明",422)
    p=db.get(AdPlacement,body.placement_id); c=db.get(Creative,body.creative_id)
    if not p or not c or c.owner_id!=user.id: fail("CAMPAIGN_RESOURCE_FORBIDDEN","广告位或素材无权使用",403)
    if c.review_status!="approved": fail("CREATIVE_NOT_APPROVED","素材尚未审核通过",409)
    total=Decimal(str(body.budget.get("total",0))); daily=Decimal(str(body.budget.get("daily",0))); start=datetime.fromisoformat(str(body.schedule["start_at"]).replace("Z","+00:00")); end=datetime.fromisoformat(str(body.schedule["end_at"]).replace("Z","+00:00"))
    if total<=0 or daily<=0 or daily>total or end<=start: fail("INVALID_CAMPAIGN_BUDGET_OR_DATE","预算或日期无效",422)
    x=Campaign(owner_id=user.id,placement_id=p.id,creative_id=c.id,name=body.name,goal=body.goal,status="reviewing",budget_total=total,budget_daily=daily,start_at=start,end_at=end,targeting=body.audience,copy_data=body.copy_data);db.add(x);db.flush();write_audit_log(db,actor_id=user.id,action="operations.campaign.created",resource_type="campaign",resource_id=x.id,request_id=getattr(request.state,"request_id",None));db.commit();db.refresh(x);return campaign_data(x)
@router.get("/campaigns/{campaign_id}")
def get_campaign(campaign_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user);x=db.get(Campaign,campaign_id)
    if not x or x.owner_id!=user.id: fail("CAMPAIGN_NOT_FOUND","广告计划不存在",404)
    return campaign_data(x)
@router.post("/campaigns/{campaign_id}/actions")
def campaign_action(campaign_id:int,body:ActionIn,request:Request,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user);x=db.get(Campaign,campaign_id)
    if not x or x.owner_id!=user.id: fail("CAMPAIGN_NOT_FOUND","广告计划不存在",404)
    transitions={"pause":({"active"},"paused"),"resume":({"paused"},"active"),"delete":({"draft"},"deleted"),"copy":({"draft","reviewing","active","paused","ended"},"draft")}; rule=transitions.get(body.action)
    if not rule: fail("UNKNOWN_CAMPAIGN_ACTION","不支持的操作",422)
    allowed,next_status=rule
    if x.status not in allowed: fail("INVALID_CAMPAIGN_STATE","当前状态不允许该操作",409)
    if body.action=="copy": x=Campaign(owner_id=user.id,placement_id=x.placement_id,creative_id=x.creative_id,name=x.name+"（副本）",goal=x.goal,status="draft",budget_total=x.budget_total,budget_daily=x.budget_daily,start_at=x.start_at,end_at=x.end_at,targeting=x.targeting,copy_data=x.copy_data);db.add(x)
    else: x.status=next_status
    db.commit();db.refresh(x);return campaign_data(x)
@router.patch("/campaigns/{campaign_id}")
def update_campaign(campaign_id:int,body:Dict[str,Any],user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    tenant(db,user);x=db.get(Campaign,campaign_id)
    if not x or x.owner_id!=user.id: fail("CAMPAIGN_NOT_FOUND","广告计划不存在",404)
    if x.status not in {"draft","rejected"}: fail("CAMPAIGN_NOT_EDITABLE","当前状态不可编辑",409)
    if "name" in body: x.name=str(body["name"])[:160]
    db.commit();return campaign_data(x)
@router.get("/campaigns/{campaign_id}/analytics")
def analytics(campaign_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)): return {"summary":{"spent":0,"impressions":0,"clicks":0,"leads":0},"series":[],"dataSource":"no_delivery_provider","demo":False}
@router.get("/campaigns/{campaign_id}/billing")
def campaign_billing(campaign_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)): return {"currency":"CNY","available":0,"frozen":0,"spent":0,"invoiced":0,"settlementStatus":"pending","dataSource":"wallet_pending"}
@router.get("/billing")
def billing(user:User=Depends(get_current_user),db:Session=Depends(get_db)): tenant(db,user); return {"currency":"CNY","available":0,"frozen":0,"spent":0,"invoiced":0,"settlementStatus":"pending","dataSource":"wallet_pending"}
