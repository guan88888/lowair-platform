from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session

from app.core.pagination import PageParams, get_page_params
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.academy import AcademyCourse, AcademyExamSession, AcademyInstitution, AcademyVisit
from app.models.user import User
from app.schemas.academy import (
    AnswerSubmit, CancelRequest, ExamCreate, ExamDraftUpdate, ExamSubmit,
    LearningPlanUpdate, LessonProgressUpdate, LegacySubmission, OrgAction,
    VisitCreate, VisitUpdate,
)
from app.services import academy as service

router = APIRouter()


def _request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


@router.get("/institutions")
def list_institutions(
    keyword: str = Query("", max_length=80), city: str = Query("", max_length=64),
    level: str = Query("", max_length=64), schedule: str = Query("", max_length=64),
    priceMax: Optional[int] = Query(None, ge=1, le=1_000_000), startDate: Optional[date] = Query(None),
    verifiedOnly: bool = False, sort: str = Query("recommended"),
    params: PageParams = Depends(get_page_params), db: Session = Depends(get_db),
):
    if sort not in {"recommended", "distance", "rating", "price"}:
        raise HTTPException(status_code=422, detail={"code": "INVALID_SORT", "message": "不支持的排序方式"})
    stmt = select(AcademyInstitution)
    published_courses = select(AcademyCourse.id).where(
        AcademyCourse.institution_id == AcademyInstitution.id,
        AcademyCourse.status == "published",
    )
    if keyword.strip():
        term = f"%{keyword.strip()}%"
        stmt = stmt.where(or_(AcademyInstitution.name.ilike(term), AcademyInstitution.tagline.ilike(term),
                              exists(published_courses.where(AcademyCourse.name.ilike(term)))))
    if city: stmt = stmt.where(AcademyInstitution.city == city)
    if level:
        term = f"%{level}%"
        stmt = stmt.where(or_(AcademyInstitution.level.ilike(term), exists(published_courses.where(AcademyCourse.level.ilike(term)))))
    if schedule:
        term = f"%{schedule}%"
        stmt = stmt.where(or_(AcademyInstitution.schedule.ilike(term), exists(published_courses.where(AcademyCourse.schedule.ilike(term)))))
    if priceMax is not None: stmt = stmt.where(exists(published_courses.where(AcademyCourse.price <= priceMax)))
    if startDate is not None: stmt = stmt.where(exists(published_courses.where(AcademyCourse.next_start_date >= startDate)))
    if verifiedOnly: stmt = stmt.where(AcademyInstitution.verified.is_(True))
    if sort == "rating": stmt = stmt.order_by(AcademyInstitution.rating.desc(), AcademyInstitution.id.desc())
    elif sort == "price": stmt = stmt.order_by(
        select(func.min(AcademyCourse.price)).where(AcademyCourse.institution_id == AcademyInstitution.id,
                                                     AcademyCourse.status == "published").scalar_subquery().asc(),
        AcademyInstitution.id.desc(),
    )
    else: stmt = stmt.order_by(AcademyInstitution.verified.desc(), AcademyInstitution.rating.desc(), AcademyInstitution.id.desc())
    page = service.paginate(db, stmt, page=params.page, page_size=params.page_size)
    return {"items": [service.institution_payload(db, item) for item in page["rows"]], **{key: page[key] for key in ("page", "page_size", "total", "has_more")}}


@router.get("/institutions/{institution_id}")
def get_institution(institution_id: int, db: Session = Depends(get_db)):
    institution = db.get(AcademyInstitution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail={"code": "INSTITUTION_NOT_FOUND", "message": "培训机构不存在"})
    return service.institution_payload(db, institution, detailed=True)


@router.get("/visits")
def list_visits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    visits = list(db.scalars(select(AcademyVisit).where(AcademyVisit.user_id == current_user.id).order_by(AcademyVisit.created_at.desc())))
    return [service.visit_payload(db, item) for item in visits]


@router.post("/visits", status_code=status.HTTP_201_CREATED)
def create_user_visit(payload: VisitCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_visit(db, current_user, payload, _request_id(request))


@router.post("/institutions/{institution_id}/visits", status_code=status.HTTP_201_CREATED)
def create_institution_visit(institution_id: int, payload: VisitCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.institutionId != institution_id:
        raise HTTPException(status_code=422, detail={"code": "INSTITUTION_ID_MISMATCH", "message": "路径和请求中的机构不一致"})
    return service.create_visit(db, current_user, payload, _request_id(request))


@router.patch("/visits/{visit_id}")
def reschedule_visit(visit_id: int, payload: VisitUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_visit(db, current_user, visit_id, payload, _request_id(request))


@router.post("/visits/{visit_id}/cancel")
def cancel_visit(visit_id: int, payload: CancelRequest, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.cancel_visit(db, current_user, visit_id, payload.reason, _request_id(request))


@router.get("/learning/curriculum")
def get_curriculum(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.curriculum_payload(db, current_user.id)


@router.get("/learning/state")
def get_learning_state(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.learning_state(db, current_user.id)


@router.put("/learning/lessons/{lesson_id}/progress")
def put_lesson_progress(lesson_id: int, payload: LessonProgressUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_progress(db, current_user, lesson_id, payload.progress, payload.position, _request_id(request))


@router.put("/learning/plan")
def put_learning_plan(payload: LearningPlanUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.update_plan(db, current_user, payload, _request_id(request))


@router.get("/question-bank/catalog")
def get_question_catalog(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.question_catalog(db, current_user.id)


@router.post("/exams", status_code=status.HTTP_201_CREATED)
def create_exam(payload: ExamCreate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.create_exam(db, current_user, payload, _request_id(request))


@router.put("/exams/{session_id}/draft")
def put_exam_draft(session_id: int, payload: ExamDraftUpdate, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.save_draft(db, current_user, session_id, payload, _request_id(request))


@router.post("/exams/{session_id}/questions/{question_id}/answer")
def post_practice_answer(session_id: int, question_id: int, payload: AnswerSubmit, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.submit_practice_answer(db, current_user, session_id, question_id, payload.answers, _request_id(request))


@router.post("/exams/{session_id}/submit")
def post_exam_submit(session_id: int, payload: ExamSubmit, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.submit_exam(db, current_user, session_id, payload, _request_id(request))


@router.get("/exams/history")
def get_exam_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.learning_record(db, current_user.id)["examHistory"]


@router.get("/records/me")
def get_learning_record(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.learning_record(db, current_user.id)


@router.get("/policies/subsidies")
def get_subsidy_policies(city: str = Query("", max_length=64), db: Session = Depends(get_db)):
    return service.subsidy_policies(db, city)


@router.get("/org/console")
def get_org_console(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.org_console(db, current_user)


@router.post("/org/actions")
def post_org_action(payload: OrgAction, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.org_action(db, current_user, payload, _request_id(request))


# Compatibility routes kept for the originally published academy service module.
@router.get("/courses")
def list_courses(params: PageParams = Depends(get_page_params), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(AcademyCourse).where(AcademyCourse.status == "published").order_by(AcademyCourse.id.desc())
    page = service.paginate(db, stmt, page=params.page, page_size=params.page_size)
    return {"items": [service.course_payload(item) for item in page["rows"]], **{key: page[key] for key in ("page", "page_size", "total", "has_more")}}


@router.get("/learning-progress")
def legacy_learning_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.learning_state(db, current_user.id)


@router.get("/exam-sets")
def legacy_exam_sets(params: PageParams = Depends(get_page_params), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Catalog entries only: correct answers are never exposed from this compatibility route.
    stmt = select(AcademyExamSession).where(AcademyExamSession.user_id == current_user.id).order_by(AcademyExamSession.started_at.desc())
    page = service.paginate(db, stmt, page=params.page, page_size=params.page_size)
    return {"items": [{"id": str(item.id), "mode": item.mode, "status": item.status, "durationSeconds": item.duration_seconds} for item in page["rows"]], **{key: page[key] for key in ("page", "page_size", "total", "has_more")}}


@router.post("/exam-sets/{exam_set_id}/submissions")
def legacy_exam_submission(exam_set_id: int, payload: LegacySubmission, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(AcademyExamSession, exam_set_id)
    if not session:
        raise HTTPException(status_code=404, detail={"code": "EXAM_NOT_FOUND", "message": "考试会话不存在"})
    return service.submit_exam(db, current_user, exam_set_id, type("Payload", (), {"answers": payload.answers, "mode": session.mode})(), _request_id(request))


@router.get("/institution-console")
def legacy_institution_console(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.org_console(db, current_user)
