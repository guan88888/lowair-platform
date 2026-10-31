"""Server-owned page read models.

These DTOs are deliberately small and composed from domain tables.  They keep
the thin uni-app route pages independent from the old front-end demo registry;
detail routes still use their dedicated domain endpoint for full records.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.academy import AcademyCourse, AcademyInstitution, AcademyQuestion
from app.models.community import CommunityKnowledgeEntry, CommunityLiveRoom, CommunityNearbyPlace, CommunityPost
from app.models.home import HomeContent
from app.models.market import MarketProduct
from app.models.operations import Campaign
from app.models.work import Job, Task

router = APIRouter()
PAGE_META = {
    "home": {"home": {"title": "首页", "active": "home", "root": True, "kind": "home"}},
    "academy": {
        "academy": {"title": "培训与学考", "active": "academy", "root": True, "kind": "academy"},
        "assistant": {"title": "智能选课", "kind": "assistant"}, "institutions": {"title": "培训机构", "kind": "institutions"},
        "institutionDetail": {"title": "机构详情", "kind": "institutionDetail"}, "visit": {"title": "试听预约", "kind": "visit", "auth": True},
        "learning": {"title": "学习中心", "kind": "learning", "auth": True}, "exam": {"title": "练习与考试", "kind": "exam", "auth": True},
        "progress": {"title": "学习档案", "kind": "progress", "auth": True}, "orgConsole": {"title": "机构工作台", "kind": "orgConsole", "required": "institution", "auth": True},
    },
    "work": {
        "work": {"title": "就业与任务", "active": "work", "root": True, "kind": "work"}, "jobDetail": {"title": "职位详情", "kind": "jobDetail"},
        "resume": {"title": "求职中心", "kind": "resume", "auth": True}, "talent": {"title": "企业招聘中心", "kind": "talent", "required": "enterprise", "auth": True},
        "publish": {"title": "发布需求", "kind": "publish", "auth": True}, "taskDetail": {"title": "任务详情", "kind": "taskDetail"},
        "fulfillment": {"title": "任务履约", "kind": "fulfillment", "auth": True},
    },
    "market": {
        "market": {"title": "设备交易", "active": "market", "root": True, "kind": "market"}, "product": {"title": "商品详情", "kind": "product"},
        "sell": {"title": "出售设备", "kind": "sell", "auth": True}, "lease": {"title": "租赁方案", "kind": "lease"},
        "history": {"title": "设备履历", "kind": "history"}, "order": {"title": "我的交易", "kind": "order", "auth": True},
    },
    "community": {
        "community": {"title": "低空社区", "active": "community", "root": True, "kind": "community"}, "postDetail": {"title": "动态详情", "kind": "postDetail"},
        "publish": {"title": "发布内容", "kind": "publish", "auth": True}, "knowledge": {"title": "知识库", "kind": "knowledge"},
        "live": {"title": "行业直播", "kind": "live"}, "nearby": {"title": "附近飞场", "kind": "nearby"},
    },
    "assistant": {"droneAgent": {"title": "低空 AI 助手", "kind": "droneAgent"}},
    "profile": {
        "profile": {"title": "我的", "active": "profile", "root": True, "kind": "profile"}, "messages": {"title": "消息中心", "kind": "messages", "auth": True},
        "account": {"title": "身份与认证", "kind": "account", "auth": True}, "wallet": {"title": "我的钱包", "kind": "wallet", "auth": True},
    },
    "operations": {"ad": {"title": "广告服务", "kind": "ad", "auth": True}, "campaign": {"title": "广告计划", "kind": "campaign", "auth": True}},
}


def _section(title, rows, *, action="", to=""):
    return {"title": title, "action": action, "to": to, "cards": rows}


def _row(title, note, status="", to=""):
    return [str(title), str(note or ""), str(status or ""), str(to or "")]


def _payload(domain: str, key: str, db: Session, resource_id: str = ""):
    meta = PAGE_META[domain][key]
    result = {"domain": domain, "key": key, **meta, "updated_at": datetime.now(timezone.utc), "sections": []}
    if domain == "academy":
        institutions = list(db.scalars(select(AcademyInstitution).order_by(AcademyInstitution.verified.desc(), AcademyInstitution.rating.desc()).limit(12)))
        courses = list(db.scalars(select(AcademyCourse).where(AcademyCourse.status == "published").order_by(AcademyCourse.id.desc()).limit(12)))
        result["tabs"] = ["找机构", "课程", "学考"]
        result["hero"] = {"eyebrow": "CAAC 学考", "title": "从训练到拿证，进度可追踪", "note": "机构资质、课程与题库数据均来自服务端", "action": "查看机构", "to": "/pages/academy/institutions"}
        if key == "institutionDetail" and resource_id:
            item = db.get(AcademyInstitution, int(resource_id)) if resource_id.isdigit() else None
            if not item:
                raise HTTPException(404, detail={"code": "INSTITUTION_NOT_FOUND", "message": "培训机构不存在"})
            result["hero"] = {"eyebrow": item.level, "title": item.name, "note": item.tagline, "action": "预约试听", "to": f"/pages/academy/visit?id={item.id}"}
            result["sections"] = [_section("机构信息", [_row("城市", item.city), _row("地址", item.address), _row("资质", item.qualification, "待核验" if not item.verified else "已核验")])]
        else:
            result["sections"] = [_section("认证培训机构", [_row(x.name, f"{x.city} · {x.level}", "已核验" if x.verified else "待核验", f"/pages/academy/institution-detail?id={x.id}") for x in institutions], action="全部机构", to="/pages/academy/institutions"),
                                   _section("热门课程", [_row(x.name, f"{x.schedule} · ¥{x.price}", x.level, "/pages/academy/learning") for x in courses], action="学习中心", to="/pages/academy/learning")]
        if key == "exam":
            result["questions"] = [{"title": q.stem, "answers": [option.get("text", "") for option in (q.options or [])]} for q in db.scalars(select(AcademyQuestion).where(AcademyQuestion.is_active.is_(True)).limit(30))]
    elif domain == "work":
        jobs = list(db.scalars(select(Job).where(Job.status == "published").order_by(Job.updated_at.desc()).limit(12)))
        tasks = list(db.scalars(select(Task).where(Task.status == "published").order_by(Task.urgent.desc(), Task.updated_at.desc()).limit(12)))
        result["tabs"] = ["职位", "任务", "求职"]
        result["hero"] = {"eyebrow": "就业与任务", "title": "让每次飞行都能形成可交付的工作", "note": "资质、预算和履约状态以服务端为准", "action": "浏览任务", "to": "/pages/work/index"}
        if key in {"jobDetail", "taskDetail"} and resource_id:
            if key == "jobDetail":
                item = db.get(Job, int(resource_id)) if resource_id.isdigit() else None
                if not item: raise HTTPException(404, detail={"code": "JOB_NOT_FOUND", "message": "职位不存在"})
                result["hero"] = {"eyebrow": item.caac, "title": item.title, "note": f"{item.city} · {item.employment or '岗位'}", "action": "查看投递要求", "to": "/pages/work/resume"}
                result["sections"] = [_section("职位要求", [_row("薪资", f"¥{item.salary_min or 0}-{item.salary_max or 0}/月"), _row("机型", ", ".join(item.aircraft or [])), _row("职责", "；".join(item.responsibilities or []))])]
            else:
                item = db.get(Task, int(resource_id)) if resource_id.isdigit() else None
                if not item: raise HTTPException(404, detail={"code": "TASK_NOT_FOUND", "message": "任务不存在"})
                result["hero"] = {"eyebrow": item.caac, "title": item.title, "note": f"{item.city} · 预算 ¥{item.budget}", "action": "查看履约要求", "to": "/pages/work/fulfillment?id=" + str(item.id)}
                result["sections"] = [_section("任务要求", [_row("地点", item.location), _row("交付", item.delivery), _row("验收", item.acceptance)])]
        else:
            result["sections"] = [_section("职位机会", [_row(x.title, f"{x.city} · ¥{x.salary_min or 0}-{x.salary_max or 0}/月", x.caac, f"/pages/work/job-detail?id={x.id}") for x in jobs]),
                                   _section("临时任务", [_row(x.title, f"{x.city} · 预算 ¥{x.budget}", "加急" if x.urgent else "进行中", f"/pages/work/task-detail?id={x.id}") for x in tasks])]
    elif domain == "market":
        products = list(db.scalars(select(MarketProduct).where(MarketProduct.listing_status == "published").order_by(MarketProduct.updated_at.desc()).limit(16)))
        result["tabs"] = ["推荐设备", "二手无人机", "配件", "租赁"]
        result["hero"] = {"eyebrow": "设备交易", "title": "二手无人机、配件与租赁", "note": "SN、履历和质检状态显示核验来源", "action": "查看设备", "to": "/pages/market/index"}
        result["products"] = [{"title": x.title, "note": f"{x.city} · 库存 {x.stock}", "price": f"¥{x.price}", "tag": x.verification_status, "to": f"/pages/market/product-detail?id={x.id}", "image": (x.images or [""])[0], "category": x.category} for x in products]
        if key == "product" and resource_id:
            item = db.get(MarketProduct, int(resource_id)) if resource_id.isdigit() else None
            if not item or item.listing_status != "published": raise HTTPException(404, detail={"code": "PRODUCT_NOT_FOUND", "message": "商品不存在"})
            result["hero"] = {"eyebrow": item.category, "title": item.title, "note": f"{item.city} · ¥{item.price}", "action": "查看交易明细", "to": "/pages/market/order"}
            result["products"] = [{"title": item.title, "note": item.summary, "price": f"¥{item.price}", "tag": item.verification_status, "to": "", "image": (item.images or [""])[0], "category": item.category}]
            result["sections"] = [_section("设备信息", [_row("品牌型号", f"{item.brand} {item.model}"), _row("库存", str(item.stock)), _row("SN", "末四位 " + (item.sn or "")[-4:], "待核验")])]
        else:
            result["sections"] = [_section("在售设备", [_row(x.title, f"{x.brand} {x.model} · ¥{x.price}", x.verification_status, f"/pages/market/product-detail?id={x.id}") for x in products])]
    elif domain == "community":
        posts = list(db.scalars(select(CommunityPost).where(CommunityPost.moderation_status == "approved", CommunityPost.deleted_at.is_(None)).order_by(CommunityPost.created_at.desc()).limit(12)))
        knowledge = list(db.scalars(select(CommunityKnowledgeEntry).where(CommunityKnowledgeEntry.status == "published").order_by(CommunityKnowledgeEntry.updated_at.desc()).limit(8)))
        lives = list(db.scalars(select(CommunityLiveRoom).order_by(CommunityLiveRoom.created_at.desc()).limit(8)))
        places = list(db.scalars(select(CommunityNearbyPlace).order_by(CommunityNearbyPlace.updated_at.desc()).limit(8)))
        result["tabs"] = ["推荐", "关注", "话题"]
        result["sections"] = [_section("行业动态", [_row(x.title, x.content[:80], "已审核", f"/pages/community/post-detail?id={x.id}") for x in posts]),
                               _section("知识库", [_row(x.title, x.summary, x.source_status, "/pages/community/knowledge") for x in knowledge]),
                               _section("直播与飞场", [_row(x.title, x.schedule_text, x.state, "/pages/community/live") for x in lives] + [_row(x.name, x.note, x.status, "/pages/community/nearby") for x in places])]
    elif domain == "profile":
        result["tabs"] = ["概览", "订单", "设置"]
        result["sections"] = [_section("账户入口", [_row("身份与认证", "查看认证审核进度", "", "/pages/profile/account"), _row("我的钱包", "余额、托管与账单", "以服务端为准", "/pages/profile/wallet"), _row("消息中心", "系统、交易和学习通知", "", "/pages/messages/index")])]
    elif domain == "operations":
        campaigns = list(db.scalars(select(Campaign).order_by(Campaign.updated_at.desc()).limit(12)))
        result["tabs"] = ["计划", "素材", "数据"]
        result["sections"] = [_section("推广计划", [_row(x.name, f"预算 ¥{x.budget_total}", x.status, f"/pages/ad/campaign?id={x.id}") for x in campaigns])]
    elif domain == "assistant":
        result["suggestions"] = ["飞前检查应该先做什么？", "电池鼓包还能继续飞吗？", "如何规划山区巡检任务？"]
    return result


@router.get("/{domain}/pages/{page_key}")
def get_page(domain: str, page_key: str, id: str = "", db: Session = Depends(get_db)):
    item = PAGE_META.get(domain, {}).get(page_key)
    if not item:
        raise HTTPException(404, detail={"code": "PAGE_NOT_FOUND", "message": "页面不存在"})
    return _payload(domain, page_key, db, id)
