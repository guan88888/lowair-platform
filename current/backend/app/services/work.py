"""Business rules for the work domain.

Routes are deliberately thin.  All state changes pass through this module so
ownership, idempotency, and audit events remain consistent for HTTP and future
background/admin workflows.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.models.user import User
from app.models.work import CompanyProfile, Fulfillment, FulfillmentEvent, Interview, Job, JobApplication, Resume, Task, TaskBid
from app.services.platform import approved_verification, list_roles


def fail(status: int, code: str, message: str):
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


def _request_id(request: Any) -> Optional[str]:
    return getattr(getattr(request, "state", None), "request_id", None)


def _strings(value: Any) -> List[str]:
    if isinstance(value, str):
        return [item.strip() for item in value.replace("\n", "\n").split("\n") if item.strip()] or ([value.strip()] if value.strip() else [])
    return [str(item).strip() for item in (value or []) if str(item).strip()]


def _label(status: str, mapping: Dict[str, str]) -> str:
    return mapping.get(status, status)


JOB_LABELS = {"reviewing": "审核中", "recruiting": "招聘中", "paused": "已暂停", "closed": "已关闭"}
APPLICATION_LABELS = {"new": "新投递", "viewed": "企业已查看", "interview": "已邀请面试", "rejected": "未通过", "withdrawn": "已撤回"}
TASK_LABELS = {"reviewing": "审核中", "open": "可报名", "assigned": "已指派", "closed": "已关闭"}
INTERVIEW_LABELS = {"pending": "待确认", "accepted": "已接受", "declined": "已拒绝", "cancelled": "已取消"}
FULFILLMENT_LABELS = {"in_progress": "作业执行中", "review_pending": "待发包方验收", "revision_required": "待整改", "accepted": "已验收", "disputed": "争议处理中", "paused": "已暂停"}


def _company(db: Session, owner_id: int, *, create: bool = False) -> Optional[CompanyProfile]:
    item = db.scalar(select(CompanyProfile).where(CompanyProfile.owner_id == owner_id))
    if not item and create:
        user = db.get(User, owner_id)
        item = CompanyProfile(owner_id=owner_id, name=(user.nickname if user else "认证企业"))
        db.add(item)
        db.flush()
    return item


def require_enterprise(db: Session, user: User) -> CompanyProfile:
    if "enterprise" not in set(list_roles(db, user.id)) or not approved_verification(db, user.id, "enterprise"):
        fail(403, "ENTERPRISE_VERIFICATION_REQUIRED", "需要已通过的企业认证")
    return _company(db, user.id, create=True)  # type: ignore[return-value]


def require_caac(db: Session, user: User) -> None:
    if not approved_verification(db, user.id, "caac"):
        fail(403, "CAAC_VERIFICATION_REQUIRED", "报名任务需要有效 CAAC 认证")


def _company_dict(db: Session, company: CompanyProfile) -> dict:
    jobs = db.scalar(select(func.count(Job.id)).where(Job.company_id == company.id, Job.status == "recruiting")) or 0
    user = db.get(User, company.owner_id)
    verified = approved_verification(db, company.owner_id, "enterprise")
    return {
        "id": str(company.id), "name": company.name, "verified": verified,
        "verifiedLabel": "企业认证已核验" if verified else "企业认证待核验",
        "industry": company.industry or "未填写", "scale": company.scale or "未填写",
        "address": company.address or "详细地址沟通后可见", "intro": company.intro or "",
        "hiringSummary": {"openJobs": jobs, "newCandidates": 0, "interviews": 0},
        "contactName": user.nickname if user else "",
    }


def job_dict(db: Session, job: Job, *, detail: bool = True) -> dict:
    company = db.get(CompanyProfile, job.company_id)
    company_data = _company_dict(db, company) if company else {"id": "", "name": "企业已注销"}
    value = {
        "id": str(job.id), "title": job.title, "companyId": str(job.company_id), "companyName": company_data["name"],
        "city": job.city, "district": job.district or "", "salaryMin": job.salary_min, "salaryMax": job.salary_max,
        "employment": job.employment or "", "experience": job.experience or "", "education": job.education or "",
        "caac": job.caac or "", "aircraft": job.aircraft or [], "status": job.status,
        "statusLabel": _label(job.status, JOB_LABELS), "verifiedCompany": company_data.get("verified", False),
        "updatedAt": job.updated_at.isoformat() if job.updated_at else "", "company": company_data,
    }
    if detail:
        value.update({"responsibilities": job.responsibilities or [], "requirements": job.requirements or [], "benefits": job.benefits or [], "environment": job.environment or ""})
    return value


def task_dict(db: Session, task: Task, *, detail: bool = True) -> dict:
    publisher = db.get(User, task.publisher_id)
    bid_count = db.scalar(select(func.count(TaskBid.id)).where(TaskBid.task_id == task.id, TaskBid.status != "withdrawn")) or 0
    data = {
        "id": str(task.id), "title": task.title, "city": task.city, "location": task.location,
        "workAt": task.work_at, "deadline": task.deadline, "aircraft": task.aircraft, "caac": task.caac,
        "duration": task.duration, "budget": float(task.budget), "urgent": task.urgent, "status": task.status,
        "statusLabel": _label(task.status, TASK_LABELS), "applicants": bid_count,
        "publisher": {"name": publisher.nickname if publisher else "发布方", "verified": "实名认证已核验" if publisher and approved_verification(db, publisher.id, "personal") else "认证状态待核验", "credit": "履约记录以平台服务端为准"},
        "escrow": {"status": "not_created", "label": "待选定飞手后创建托管"},
        "insurance": {"status": "not_connected", "label": "保险能力接入中"},
        "privacyPhone": {"status": "available", "label": "建立业务关系后可用"},
    }
    if detail:
        data.update({"delivery": task.delivery, "acceptance": task.acceptance, "description": task.description})
    return data


def resume_dict(resume: Resume) -> dict:
    return {"id": str(resume.id), "visibility": resume.visibility, "intention": resume.intention or "", "name": resume.name or "", "city": resume.city or "", "phone": resume.phone or "", "caacLevel": resume.caac_level or "", "certificateNumber": resume.certificate_number or "", "certificateVerified": resume.certificate_verified, "aircraft": resume.aircraft or "", "experience": resume.experience or "", "education": resume.education or "", "attachments": resume.attachments or [], "updatedAt": resume.updated_at.isoformat() if resume.updated_at else ""}


def application_dict(db: Session, application: JobApplication) -> dict:
    job = db.get(Job, application.job_id)
    company = db.get(CompanyProfile, job.company_id) if job else None
    return {"id": str(application.id), "jobId": str(application.job_id), "jobTitle": job.title if job else "职位已删除", "companyName": company.name if company else "企业已注销", "status": application.status, "statusLabel": _label(application.status, APPLICATION_LABELS), "appliedAt": application.created_at.isoformat() if application.created_at else "", "withdrawable": application.status in {"new", "viewed"}}


def interview_dict(db: Session, interview: Interview, *, company_view: bool = False) -> dict:
    application = db.get(JobApplication, interview.application_id)
    job = db.get(Job, application.job_id) if application else None
    company = db.get(CompanyProfile, interview.company_id)
    candidate = db.get(User, application.applicant_id) if application else None
    return {"id": str(interview.id), "applicationId": str(interview.application_id), "candidateName": _masked(candidate.nickname) if candidate else "候选人", "jobTitle": job.title if job else "职位已删除", "companyName": company.name if company else "企业", "at": interview.at, "method": interview.method, "contact": "联系人信息受平台保护", "status": interview.status, "statusLabel": _label(interview.status, INTERVIEW_LABELS), "note": interview.note or ""}


def _masked(text: str) -> str:
    return text[:1] + "**" if text else "候选人"


def get_or_create_resume(db: Session, user: User) -> Resume:
    item = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if not item:
        item = Resume(user_id=user.id, name=user.nickname, phone=user.phone)
        db.add(item)
        db.flush()
    return item


def save_resume(db: Session, user: User, payload: Any, request: Any) -> dict:
    item = get_or_create_resume(db, user)
    before = resume_dict(item)
    fields = {"visibility": payload.visibility, "intention": payload.intention, "name": payload.name, "city": payload.city, "phone": payload.phone, "caac_level": payload.caacLevel, "certificate_number": payload.certificateNumber, "aircraft": payload.aircraft, "experience": payload.experience, "education": payload.education, "attachments": payload.attachments}
    for name, value in fields.items():
        setattr(item, name, value)
    # Certificate verification is never writable through resume data.
    write_audit_log(db, actor_id=user.id, action="work.resume.saved", resource_type="work_resume", resource_id=item.id, before=before, after={"visibility": item.visibility}, request_id=_request_id(request))
    db.commit(); db.refresh(item)
    return resume_dict(item)


def publish_job(db: Session, user: User, payload: Any, request: Any) -> dict:
    company = require_enterprise(db, user)
    job = Job(company_id=company.id, title=payload.title.strip(), city=payload.city.strip(), district=payload.district, salary_min=payload.salaryMin, salary_max=payload.salaryMax, employment=payload.employment, experience=payload.experience, education=payload.education, caac=payload.caac, aircraft=_strings(payload.aircraft), responsibilities=_strings(payload.responsibilities), requirements=_strings(payload.requirements), benefits=_strings(payload.benefits), environment=payload.environment, status="reviewing")
    db.add(job); db.flush()
    write_audit_log(db, actor_id=user.id, action="work.job.published", resource_type="work_job", resource_id=job.id, after={"status": job.status}, request_id=_request_id(request))
    db.commit(); db.refresh(job)
    return job_dict(db, job)


def publish_task(db: Session, user: User, payload: Any, request: Any) -> dict:
    if not approved_verification(db, user.id, "personal"):
        fail(403, "PERSONAL_VERIFICATION_REQUIRED", "发布任务需要已通过的实名认证")
    task = Task(publisher_id=user.id, title=payload.title.strip(), city=payload.city.strip(), location=payload.location.strip(), work_at=payload.workAt, deadline=payload.deadline, aircraft=payload.aircraft, caac=payload.caac, duration=payload.duration, budget=payload.budget, delivery=payload.delivery, acceptance=payload.acceptance, description=payload.description, urgent=payload.urgent, status="reviewing")
    db.add(task); db.flush()
    write_audit_log(db, actor_id=user.id, action="work.task.published", resource_type="work_task", resource_id=task.id, after={"status": task.status}, request_id=_request_id(request))
    db.commit(); db.refresh(task)
    return task_dict(db, task)


def create_application(db: Session, user: User, job_id: int, payload: Any, request: Any) -> dict:
    job = db.get(Job, job_id)
    if not job: fail(404, "JOB_NOT_FOUND", "职位不存在")
    if job.status != "recruiting": fail(409, "JOB_NOT_OPEN", "职位当前不可投递")
    if db.get(CompanyProfile, job.company_id).owner_id == user.id: fail(403, "OWN_JOB_FORBIDDEN", "不能投递自己发布的职位")
    resume = get_or_create_resume(db, user)
    if payload.resumeId and str(payload.resumeId) != str(resume.id): fail(403, "RESUME_FORBIDDEN", "只能使用自己的简历")
    existing = db.scalar(select(JobApplication).where(JobApplication.job_id == job.id, JobApplication.applicant_id == user.id))
    if existing:
        if existing.status == "withdrawn":
            existing.status, existing.withdraw_reason = "new", None
            write_audit_log(db, actor_id=user.id, action="work.application.resubmitted", resource_type="work_application", resource_id=existing.id, request_id=_request_id(request))
            db.commit(); db.refresh(existing); return application_dict(db, existing)
        return application_dict(db, existing)  # idempotent retry
    item = JobApplication(job_id=job.id, applicant_id=user.id, resume_id=resume.id)
    db.add(item); db.flush()
    write_audit_log(db, actor_id=user.id, action="work.application.created", resource_type="work_application", resource_id=item.id, request_id=_request_id(request))
    try: db.commit()
    except IntegrityError:
        db.rollback(); item = db.scalar(select(JobApplication).where(JobApplication.job_id == job.id, JobApplication.applicant_id == user.id)); return application_dict(db, item)
    db.refresh(item); return application_dict(db, item)


def withdraw_application(db: Session, user: User, app_id: int, reason: Optional[str], request: Any) -> dict:
    item = db.get(JobApplication, app_id)
    if not item: fail(404, "APPLICATION_NOT_FOUND", "投递记录不存在")
    if item.applicant_id != user.id: fail(403, "APPLICATION_FORBIDDEN", "无权撤回该投递")
    if item.status not in {"new", "viewed"}: fail(409, "APPLICATION_NOT_WITHDRAWABLE", "当前投递状态不可撤回")
    item.status, item.withdraw_reason = "withdrawn", (reason or "").strip() or None
    write_audit_log(db, actor_id=user.id, action="work.application.withdrawn", resource_type="work_application", resource_id=item.id, after={"reason": item.withdraw_reason}, request_id=_request_id(request))
    db.commit(); db.refresh(item); return application_dict(db, item)


def create_bid(db: Session, user: User, task_id: int, payload: Any, request: Any) -> dict:
    require_caac(db, user)
    task = db.get(Task, task_id)
    if not task: fail(404, "TASK_NOT_FOUND", "任务不存在")
    if task.publisher_id == user.id: fail(403, "OWN_TASK_FORBIDDEN", "不能报名自己发布的任务")
    if task.status != "open": fail(409, "TASK_NOT_OPEN", "任务当前不可报名")
    if not payload.availabilityConfirmed: fail(422, "AVAILABILITY_CONFIRMATION_REQUIRED", "请确认档期无冲突")
    item = db.scalar(select(TaskBid).where(TaskBid.task_id == task.id, TaskBid.bidder_id == user.id))
    if item: return bid_dict(item)
    item = TaskBid(task_id=task.id, bidder_id=user.id, quote=payload.quote, commitment=payload.commitment, availability_confirmed=True)
    db.add(item); db.flush()
    write_audit_log(db, actor_id=user.id, action="work.bid.created", resource_type="work_task_bid", resource_id=item.id, request_id=_request_id(request))
    try: db.commit()
    except IntegrityError:
        db.rollback(); item = db.scalar(select(TaskBid).where(TaskBid.task_id == task.id, TaskBid.bidder_id == user.id)); return bid_dict(item)
    db.refresh(item); return bid_dict(item)


def bid_dict(item: TaskBid) -> dict:
    labels = {"submitted": "报名已提交", "selected": "已中标", "rejected": "未中标", "withdrawn": "已撤回"}
    return {"id": str(item.id), "taskId": str(item.task_id), "quote": float(item.quote), "commitment": item.commitment, "availabilityConfirmed": item.availability_confirmed, "status": item.status, "statusLabel": _label(item.status, labels), "createdAt": item.created_at.isoformat() if item.created_at else ""}


def _candidate(db: Session, application: JobApplication) -> dict:
    resume = db.get(Resume, application.resume_id) if application.resume_id else None
    user = db.get(User, application.applicant_id)
    candidate_status = {"viewed": "contacted"}.get(application.status, application.status)
    candidate_labels = {"contacted": "已沟通", "new": "新投递", "interview": "面试中", "rejected": "未通过", "withdrawn": "已撤回"}
    return {"id": str(application.id), "applicationId": str(application.id), "maskedName": _masked((resume.name if resume else None) or (user.nickname if user else "")), "maskedPhone": "已建立沟通" if application.status in {"viewed", "interview"} else "未建立沟通，手机号不可见", "city": resume.city if resume else "", "caac": resume.caac_level if resume else "", "aircraft": resume.aircraft if resume else "", "experience": resume.experience if resume else "", "availability": "待沟通", "status": candidate_status, "statusLabel": _label(candidate_status, candidate_labels), "matchReasons": ["资质与机型字段由简历提供"]}


def _owned_application(db: Session, user: User, app_id: int) -> Tuple[JobApplication, Job, CompanyProfile]:
    application = db.get(JobApplication, app_id)
    if not application: fail(404, "CANDIDATE_NOT_FOUND", "候选人不存在")
    job = db.get(Job, application.job_id); company = db.get(CompanyProfile, job.company_id) if job else None
    if not job or not company or company.owner_id != user.id: fail(403, "CANDIDATE_FORBIDDEN", "无权管理该候选人")
    return application, job, company


def invite(db: Session, user: User, app_id: int, payload: Any, request: Any) -> dict:
    require_enterprise(db, user); application, job, company = _owned_application(db, user, app_id)
    if application.status in {"withdrawn", "rejected"}: fail(409, "INVALID_CANDIDATE_STATE", "候选人当前不可邀请")
    item = Interview(application_id=application.id, company_id=company.id, at=payload.at, method=payload.method, status="pending")
    application.status = "interview"
    db.add(item); db.flush()
    write_audit_log(db, actor_id=user.id, action="work.interview.invited", resource_type="work_interview", resource_id=item.id, after={"job_id": job.id}, request_id=_request_id(request))
    db.commit(); db.refresh(item); return interview_dict(db, item, company_view=True)


def reject_candidate(db: Session, user: User, app_id: int, reason: str, request: Any) -> dict:
    require_enterprise(db, user); item, _, _ = _owned_application(db, user, app_id)
    if item.status in {"withdrawn", "rejected"}: fail(409, "INVALID_CANDIDATE_STATE", "候选人当前不可拒绝")
    if not reason.strip(): fail(422, "REJECTION_REASON_REQUIRED", "请填写拒绝原因")
    item.status, item.rejected_reason = "rejected", reason.strip()
    write_audit_log(db, actor_id=user.id, action="work.candidate.rejected", resource_type="work_application", resource_id=item.id, after={"reason": item.rejected_reason}, request_id=_request_id(request))
    db.commit(); return application_dict(db, item)


def fulfillment_dict(db: Session, item: Fulfillment, user: User) -> dict:
    task = db.get(Task, item.task_id); client = db.get(User, item.client_id); pilot = db.get(User, item.pilot_id)
    role = "client" if user.id == item.client_id else "pilot"
    return {"id": str(item.id), "taskId": str(item.task_id), "taskTitle": task.title if task else "任务已删除", "role": role, "status": item.status, "statusLabel": _label(item.status, FULFILLMENT_LABELS), "parties": {"client": client.nickname if client else "发包方", "pilot": _masked(pilot.nickname) if pilot else "飞手"}, "milestones": item.milestones or [], "deliveries": item.deliveries or [], "dispute": item.dispute, "calendar": [], "escrow": {"deposit": "资金状态由钱包服务返回", "middle": "待交付", "final": "待验收", "releasable": False}, "contract": {"status": "not_connected", "label": "签章服务待接入", "signed": False}, "insurance": {"status": "not_connected", "label": "保险能力接入中"}}


def owned_fulfillment(db: Session, user: User, fulfillment_id: int) -> Fulfillment:
    item = db.get(Fulfillment, fulfillment_id)
    if not item: fail(404, "FULFILLMENT_NOT_FOUND", "履约订单不存在")
    if user.id not in {item.client_id, item.pilot_id}: fail(403, "FULFILLMENT_FORBIDDEN", "无权查看该履约订单")
    return item


def event(db: Session, item: Fulfillment, user: User, kind: str, payload: dict, request: Any):
    db.add(FulfillmentEvent(fulfillment_id=item.id, actor_id=user.id, kind=kind, payload=payload))
    write_audit_log(db, actor_id=user.id, action=f"work.fulfillment.{kind}", resource_type="work_fulfillment", resource_id=item.id, after=payload, request_id=_request_id(request))


def update_milestone(db: Session, user: User, fulfillment_id: int, key: str, payload: Any, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    if user.id != item.pilot_id: fail(403, "MILESTONE_FORBIDDEN", "仅执行方可更新里程碑")
    milestones = list(item.milestones or []); target = next((entry for entry in milestones if str(entry.get("key")) == key), None)
    if not target: fail(404, "MILESTONE_NOT_FOUND", "里程碑不存在")
    if target.get("status") == "complete" and payload.status != "complete": fail(409, "MILESTONE_FINALIZED", "已完成里程碑不可回退")
    target["status"] = payload.status
    if payload.note is not None: target["note"] = payload.note
    item.milestones = milestones; event(db, item, user, "milestone_updated", {"key": key, "status": payload.status}, request); db.commit(); db.refresh(item)
    return fulfillment_dict(db, item, user)


def upload_delivery(db: Session, user: User, fulfillment_id: int, payload: Any, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    if user.id != item.pilot_id: fail(403, "DELIVERY_FORBIDDEN", "仅执行方可提交交付物")
    if item.status in {"accepted", "disputed"}: fail(409, "INVALID_FULFILLMENT_STATE", "当前状态不可提交交付物")
    if not (payload.name or payload.url or payload.path): fail(422, "ATTACHMENT_REQUIRED", "请提供交付文件")
    deliveries = list(item.deliveries or []); delivery = {"id": str(len(deliveries) + 1), "name": payload.name or "交付文件", "url": payload.url, "assetId": str(payload.id) if payload.id is not None else None, "size": payload.size, "status": "submitted", "statusLabel": "待验收", "submittedAt": datetime.now(timezone.utc).isoformat()}
    deliveries.append(delivery); item.deliveries = deliveries; item.status = "review_pending"
    event(db, item, user, "delivery_submitted", {"delivery_id": delivery["id"]}, request); db.commit(); db.refresh(item); return fulfillment_dict(db, item, user)


def acceptance(db: Session, user: User, fulfillment_id: int, payload: Any, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    if user.id != item.client_id: fail(403, "ACCEPTANCE_FORBIDDEN", "仅发包方可验收")
    if item.status != "review_pending": fail(409, "INVALID_FULFILLMENT_STATE", "当前订单不可验收")
    if payload.action == "reject" and not (payload.reason or "").strip(): fail(422, "REJECTION_REASON_REQUIRED", "请填写拒绝原因")
    item.status = "accepted" if payload.action == "accept" else "revision_required"
    event(db, item, user, f"acceptance_{payload.action}", {"reason": payload.reason}, request); db.commit(); db.refresh(item); return fulfillment_dict(db, item, user)


def dispute(db: Session, user: User, fulfillment_id: int, payload: Any, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    if item.status == "accepted": fail(409, "INVALID_FULFILLMENT_STATE", "已验收订单不可发起争议")
    if item.dispute: fail(409, "DISPUTE_EXISTS", "该订单已有处理中争议")
    item.dispute = {"type": payload.type, "description": payload.description, "evidence": payload.evidence, "status": "submitted", "statusLabel": "争议已提交"}; item.status = "disputed"
    event(db, item, user, "dispute_created", {"type": payload.type}, request); db.commit(); db.refresh(item); return fulfillment_dict(db, item, user)


def pause(db: Session, user: User, fulfillment_id: int, reason: str, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    if user.id != item.pilot_id: fail(403, "PAUSE_FORBIDDEN", "仅执行方可暂停未来派单")
    if not reason.strip(): fail(422, "PAUSE_REASON_REQUIRED", "请填写暂停原因")
    item.pause_reason = reason.strip()
    event(db, item, user, "availability_paused", {"reason": item.pause_reason}, request); db.commit(); db.refresh(item); return fulfillment_dict(db, item, user)


def sos(db: Session, user: User, fulfillment_id: int, payload: Any, request: Any) -> dict:
    item = owned_fulfillment(db, user, fulfillment_id)
    event(db, item, user, "sos_requested", {"location_consent": payload.locationConsent, "location": payload.location if payload.locationConsent else None}, request); db.commit()
    return {"id": str(item.id), "status": "submitted", "statusLabel": "SOS 已提交给平台客服"}
