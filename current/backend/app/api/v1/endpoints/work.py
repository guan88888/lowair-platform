"""HTTP adapter for the recruitment and task fulfilment domain."""
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.pagination import PageParams, get_page_params, page_response
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.work import CompanyProfile, Interview, Job, JobApplication, Resume, Task
from app.schemas.work import (AcceptancePayload, ApplicationCreate, AttachmentPayload, BidCreate, DisputeCreate, InterviewCreate, InterviewResponse, JobAction, JobCreate, MilestoneUpdate, ReasonPayload, ResumePayload, SosPayload, TaskCreate)
from app.services import work as service

router = APIRouter()


@router.get("/jobs")
def list_jobs(
    keyword: str = "", city: str = "", caac: str = "", aircraft: str = "", salary: Optional[int] = None,
    status_value: str = Query("", alias="status"), page_params: PageParams = Depends(get_page_params), db: Session = Depends(get_db),
):
    stmt = select(Job).order_by(Job.updated_at.desc(), Job.id.desc())
    if keyword.strip():
        term = f"%{keyword.strip()}%"; stmt = stmt.where(Job.title.ilike(term))
    if city and city != "全部": stmt = stmt.where(Job.city == city)
    if caac and caac != "全部": stmt = stmt.where(Job.caac == caac)
    if aircraft and aircraft != "全部": stmt = stmt.where(Job.aircraft.contains([aircraft]))
    if salary: stmt = stmt.where(Job.salary_max >= salary)
    if status_value and status_value != "all": stmt = stmt.where(Job.status == status_value)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.offset(page_params.offset).limit(page_params.page_size)))
    return page_response([service.job_dict(db, item, detail=False) for item in rows], page=page_params.page, page_size=page_params.page_size, total=total)


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def publish_job(payload: JobCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.publish_job(db, current_user, payload, request)


@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    item = db.get(Job, job_id)
    if not item: service.fail(404, "JOB_NOT_FOUND", "职位不存在")
    return service.job_dict(db, item)


@router.post("/jobs/{job_id}/applications", status_code=status.HTTP_201_CREATED)
def apply_job(job_id: int, payload: ApplicationCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_application(db, current_user, job_id, payload, request)


@router.get("/tasks")
def list_tasks(
    keyword: str = "", city: str = "", caac: str = "", aircraft: str = "", urgent: Optional[bool] = None,
    status_value: str = Query("", alias="status"), page_params: PageParams = Depends(get_page_params), db: Session = Depends(get_db),
):
    stmt = select(Task).order_by(Task.updated_at.desc(), Task.id.desc())
    if keyword.strip(): stmt = stmt.where(Task.title.ilike(f"%{keyword.strip()}%"))
    if city and city != "全部": stmt = stmt.where(Task.city == city)
    if caac and caac != "全部": stmt = stmt.where(Task.caac == caac)
    if aircraft and aircraft != "全部": stmt = stmt.where(Task.aircraft == aircraft)
    if urgent is not None: stmt = stmt.where(Task.urgent == urgent)
    if status_value and status_value != "all": stmt = stmt.where(Task.status == status_value)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(db.scalars(stmt.offset(page_params.offset).limit(page_params.page_size)))
    return page_response([service.task_dict(db, item, detail=False) for item in rows], page=page_params.page, page_size=page_params.page_size, total=total)


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
def publish_task(payload: TaskCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.publish_task(db, current_user, payload, request)


@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    item = db.get(Task, task_id)
    if not item: service.fail(404, "TASK_NOT_FOUND", "任务不存在")
    return service.task_dict(db, item)


@router.post("/tasks/{task_id}/bids", status_code=status.HTTP_201_CREATED)
def bid_task(task_id: int, payload: BidCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_bid(db, current_user, task_id, payload, request)


@router.get("/resume")
def get_resume(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = service.get_or_create_resume(db, current_user)
    db.commit(); db.refresh(item)
    return service.resume_dict(item)


@router.put("/resume")
def update_resume(payload: ResumePayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.save_resume(db, current_user, payload, request)


@router.post("/resume/attachments", status_code=status.HTTP_201_CREATED)
def resume_attachment(payload: AttachmentPayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not (payload.name or payload.url or payload.path): service.fail(422, "ATTACHMENT_REQUIRED", "请先上传或选择附件")
    item = service.get_or_create_resume(db, current_user)
    attachment = {"id": str(payload.id) if payload.id is not None else str(len(item.attachments or []) + 1), "name": payload.name or "简历附件", "url": payload.url, "size": payload.size, "status": "uploaded", "statusLabel": "已上传"}
    item.attachments = [*(item.attachments or []), attachment]
    service.write_audit_log(db, actor_id=current_user.id, action="work.resume.attachment_added", resource_type="work_resume", resource_id=item.id, after={"attachment": attachment["id"]}, request_id=getattr(request.state, "request_id", None))
    db.commit(); return attachment


@router.get("/applications")
def list_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = list(db.scalars(select(JobApplication).where(JobApplication.applicant_id == current_user.id).order_by(JobApplication.updated_at.desc())))
    return [service.application_dict(db, item) for item in rows]


@router.post("/applications/{application_id}/withdraw")
def withdraw(application_id: int, payload: ReasonPayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.withdraw_application(db, current_user, application_id, payload.reason, request)


@router.get("/interviews")
def list_interviews(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Interview).join(JobApplication, Interview.application_id == JobApplication.id).where(JobApplication.applicant_id == current_user.id).order_by(Interview.created_at.desc())
    return [service.interview_dict(db, item) for item in db.scalars(stmt)]


@router.post("/interviews/{interview_id}/response")
def interview_response(interview_id: int, payload: InterviewResponse, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Interview, interview_id)
    application = db.get(JobApplication, item.application_id) if item else None
    if not item or not application: service.fail(404, "INTERVIEW_NOT_FOUND", "面试邀请不存在")
    if application.applicant_id != current_user.id: service.fail(403, "INTERVIEW_FORBIDDEN", "无权处理该面试邀请")
    if item.status != "pending": service.fail(409, "INVALID_INTERVIEW_STATE", "面试邀请已处理")
    item.status, item.note = ("accepted" if payload.action == "accept" else "declined"), payload.note
    service.write_audit_log(db, actor_id=current_user.id, action=f"work.interview.{payload.action}ed", resource_type="work_interview", resource_id=item.id, request_id=getattr(request.state, "request_id", None))
    db.commit(); db.refresh(item); return service.interview_dict(db, item)


@router.get("/companies/{company_id}")
def get_company(company_id: int, db: Session = Depends(get_db)):
    item = db.get(CompanyProfile, company_id)
    if not item: service.fail(404, "COMPANY_NOT_FOUND", "企业不存在")
    return service._company_dict(db, item)


@router.get("/company/jobs")
def company_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = service.require_enterprise(db, current_user)
    return [service.job_dict(db, item) for item in db.scalars(select(Job).where(Job.company_id == company.id).order_by(Job.updated_at.desc()))]


@router.patch("/company/jobs/{job_id}")
def change_job(job_id: int, payload: JobAction, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = service.require_enterprise(db, current_user); item = db.get(Job, job_id)
    if not item: service.fail(404, "JOB_NOT_FOUND", "职位不存在")
    if item.company_id != company.id: service.fail(403, "JOB_FORBIDDEN", "无权管理该职位")
    valid = {"pause": {"recruiting"}, "resume": {"paused"}, "close": {"recruiting", "paused", "reviewing"}}
    if item.status not in valid[payload.action]: service.fail(409, "INVALID_JOB_STATE", "职位当前不可执行此操作")
    item.status = {"pause": "paused", "resume": "recruiting", "close": "closed"}[payload.action]
    service.write_audit_log(db, actor_id=current_user.id, action=f"work.job.{payload.action}", resource_type="work_job", resource_id=item.id, after={"status": item.status}, request_id=getattr(request.state, "request_id", None))
    db.commit(); db.refresh(item); return service.job_dict(db, item)


@router.get("/company/candidates")
def candidates(status_value: str = Query("all", alias="status"), city: str = "", caac: str = "", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = service.require_enterprise(db, current_user)
    stmt = select(JobApplication).join(Job, JobApplication.job_id == Job.id).where(Job.company_id == company.id)
    if status_value and status_value != "all": stmt = stmt.where(JobApplication.status == status_value)
    records = list(db.scalars(stmt.order_by(JobApplication.updated_at.desc())))
    values = [service._candidate(db, item) for item in records]
    return [item for item in values if (not city or city == "全部" or item["city"] == city) and (not caac or caac == "全部" or item["caac"] == caac)]


@router.get("/company/interviews")
def company_interviews(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = service.require_enterprise(db, current_user)
    return [service.interview_dict(db, item, company_view=True) for item in db.scalars(select(Interview).where(Interview.company_id == company.id).order_by(Interview.created_at.desc()))]


@router.post("/candidates/{application_id}/interviews", status_code=status.HTTP_201_CREATED)
def invite(application_id: int, payload: InterviewCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.invite(db, current_user, application_id, payload, request)


@router.post("/candidates/{application_id}/reject")
def reject(application_id: int, payload: ReasonPayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.reject_candidate(db, current_user, application_id, payload.reason or "", request)


@router.get("/fulfillments/{fulfillment_id}")
def get_fulfillment(fulfillment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = service.owned_fulfillment(db, current_user, fulfillment_id); return service.fulfillment_dict(db, item, current_user)


@router.patch("/fulfillments/{fulfillment_id}/milestones/{milestone_key}")
def milestone(fulfillment_id: int, milestone_key: str, payload: MilestoneUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_milestone(db, current_user, fulfillment_id, milestone_key, payload, request)


@router.post("/fulfillments/{fulfillment_id}/deliveries")
def delivery(fulfillment_id: int, payload: AttachmentPayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.upload_delivery(db, current_user, fulfillment_id, payload, request)


@router.post("/fulfillments/{fulfillment_id}/acceptance")
def accept(fulfillment_id: int, payload: Any = Body(...), request: Request = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Existing H5 calls submitAcceptance(id, "accept"); accept that compact
    # form while retaining the richer object form for a rejection reason.
    payload = AcceptancePayload.model_validate({"action": payload} if isinstance(payload, str) else payload)
    return service.acceptance(db, current_user, fulfillment_id, payload, request)


@router.post("/fulfillments/{fulfillment_id}/disputes")
def create_dispute(fulfillment_id: int, payload: DisputeCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.dispute(db, current_user, fulfillment_id, payload, request)


@router.post("/fulfillments/{fulfillment_id}/pause")
def pause(fulfillment_id: int, payload: Any = Body(...), request: Request = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = ReasonPayload.model_validate({"reason": payload} if isinstance(payload, str) else payload)
    return service.pause(db, current_user, fulfillment_id, payload.reason or "", request)


@router.post("/fulfillments/{fulfillment_id}/sos")
def sos(fulfillment_id: int, payload: SosPayload, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.sos(db, current_user, fulfillment_id, payload, request)
