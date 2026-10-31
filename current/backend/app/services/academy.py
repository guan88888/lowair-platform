"""Academy domain services shared by the HTTP endpoints and future jobs."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.models.academy import (
    AcademyAttendance, AcademyCourse, AcademyEnrollment, AcademyExamSession,
    AcademyInstitution, AcademyInstitutionMember, AcademyLesson,
    AcademyLessonProgress, AcademyLearningPlan, AcademyQuestion,
    AcademyInstitutionOutcome, AcademyInstitutionReview, AcademySchedule,
    AcademySubsidyPolicy, AcademyVisit, AcademyVisitSlot,
    AcademyWrongQuestion,
)
from app.models.user import User
from app.services.platform import approved_verification

ACTIVE_VISIT_STATUSES = ("pending", "confirmed", "rescheduled")
DEFAULT_VISIT_CAPACITY = 6


def _error(code: str, message: str, status_code: int = 400) -> None:
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()


def _number(value: Any) -> Any:
    return float(value) if isinstance(value, Decimal) else value


def paginate(db: Session, stmt, *, page: int, page_size: int) -> dict:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = list(db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)))
    return {"rows": rows, "page": page, "page_size": page_size, "total": total, "has_more": page * page_size < total}


def course_payload(course: AcademyCourse) -> dict:
    return {
        "id": str(course.id), "name": course.name, "level": course.level,
        "schedule": course.schedule, "duration": course.duration,
        "price": _number(course.price), "trial": course.trial, "status": course.status,
        "nextStartDate": _iso(course.next_start_date) or "",
    }


def institution_payload(db: Session, institution: AcademyInstitution, *, detailed: bool = False) -> dict:
    courses = list(db.scalars(select(AcademyCourse).where(
        AcademyCourse.institution_id == institution.id, AcademyCourse.status == "published"
    ).order_by(AcademyCourse.id)))
    result = {
        "id": str(institution.id), "name": institution.name, "city": institution.city, "district": institution.district,
        "level": institution.level, "schedule": institution.schedule,
        "rating": _number(institution.rating), "verified": institution.verified,
        "address": institution.address, "tagline": institution.tagline,
        "image": institution.image or "", "courses": [course_payload(course) for course in courses],
        "levels": sorted({course.level for course in courses if course.level} | ({institution.level} if institution.level else set())),
        "schedules": sorted({course.schedule for course in courses if course.schedule} | ({institution.schedule} if institution.schedule else set())),
        "priceFrom": min((_number(course.price) for course in courses), default=None),
        "nextStartDate": min((_iso(course.next_start_date) for course in courses if course.next_start_date), default=""),
        "reviewCount": 0,
    }
    if detailed:
        coaches = list(db.scalars(select(AcademyInstitutionMember).where(
            AcademyInstitutionMember.institution_id == institution.id,
            AcademyInstitutionMember.role.in_(("instructor", "manager", "admin")),
        ).order_by(AcademyInstitutionMember.id)))
        coach_users = {user.id: user for user in db.scalars(select(User).where(User.id.in_([item.user_id for item in coaches])))} if coaches else {}
        outcomes = list(db.scalars(select(AcademyInstitutionOutcome).where(
            AcademyInstitutionOutcome.institution_id == institution.id
        ).order_by(AcademyInstitutionOutcome.published_at.desc(), AcademyInstitutionOutcome.id.desc())))
        reviews = list(db.scalars(select(AcademyInstitutionReview).where(
            AcademyInstitutionReview.institution_id == institution.id,
            AcademyInstitutionReview.status == "published",
        ).order_by(AcademyInstitutionReview.created_at.desc(), AcademyInstitutionReview.id.desc()).limit(20)))
        result.update({
            "qualification": institution.qualification,
            "passRate": _number(institution.pass_rate), "passRateSource": institution.pass_rate_source,
            "facilities": institution.facilities or [], "phonePolicy": institution.phone_policy,
            "coaches": [{"name": coach_users.get(member.user_id).nickname if coach_users.get(member.user_id) else "机构教练",
                         "title": member.role, "experience": "资料由机构维护"} for member in coaches],
            "outcomes": [{"id": str(item.id), "title": item.title, "description": item.description,
                          "sourceName": item.source_name, "sourceUrl": item.source_url,
                          "publishedAt": _iso(item.published_at) or ""} for item in outcomes],
            "reviews": [{"id": str(item.id), "authorName": item.author_name, "content": item.content,
                         "rating": item.rating, "createdAt": _iso(item.created_at)} for item in reviews],
            "reviewCount": len(reviews),
        })
    return result


def visit_payload(db: Session, visit: AcademyVisit, *, show_phone: bool = True) -> dict:
    institution = db.get(AcademyInstitution, visit.institution_id)
    return {
        "id": str(visit.id), "institutionId": str(visit.institution_id),
        "institutionName": institution.name if institution else "机构已下线",
        "courseId": str(visit.course_id) if visit.course_id else "",
        "date": _iso(visit.visit_date), "slot": visit.slot, "partySize": visit.party_size,
        "name": visit.contact_name, "phone": visit.contact_phone if show_phone else "***",
        "status": visit.status,
        "notification": {"pending": "预约待机构确认", "confirmed": "机构已确认到访", "rescheduled": "改期申请待确认", "cancelled": "预约已取消"}.get(visit.status, "状态更新中"),
        "createdAt": _iso(visit.created_at),
    }


def _slot_for_update(db: Session, institution_id: int, visit_date: date, slot: str) -> AcademyVisitSlot:
    record = db.scalar(select(AcademyVisitSlot).where(
        AcademyVisitSlot.institution_id == institution_id,
        AcademyVisitSlot.visit_date == visit_date,
        AcademyVisitSlot.slot == slot,
    ).with_for_update())
    # Institutions may define slots in advance. Development deployments get a bounded
    # default record, rather than an unlimited untracked appointment slot.
    if not record:
        record = AcademyVisitSlot(institution_id=institution_id, visit_date=visit_date, slot=slot, capacity=DEFAULT_VISIT_CAPACITY)
        db.add(record)
        db.flush()
    return record


def _reserve_slot(db: Session, institution_id: int, visit_date: date, slot: str, party_size: int) -> None:
    record = _slot_for_update(db, institution_id, visit_date, slot)
    if not record.is_open or record.reserved + party_size > record.capacity:
        _error("VISIT_SLOT_UNAVAILABLE", "该时段剩余名额不足", status.HTTP_409_CONFLICT)
    record.reserved += party_size


def _release_slot(db: Session, institution_id: int, visit_date: date, slot: str, party_size: int) -> None:
    record = _slot_for_update(db, institution_id, visit_date, slot)
    record.reserved = max(0, record.reserved - party_size)


def create_visit(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    if not payload.consent:
        _error("VISIT_CONSENT_REQUIRED", "请同意预约信息使用说明", status.HTTP_422_UNPROCESSABLE_ENTITY)
    if payload.date < date.today():
        _error("VISIT_DATE_PAST", "预约日期不能早于今天", status.HTTP_422_UNPROCESSABLE_ENTITY)
    institution = db.get(AcademyInstitution, payload.institutionId)
    if not institution:
        _error("INSTITUTION_NOT_FOUND", "培训机构不存在", status.HTTP_404_NOT_FOUND)
    if payload.courseId:
        course = db.get(AcademyCourse, payload.courseId)
        if not course or course.institution_id != institution.id or not course.trial:
            _error("INVALID_TRIAL_COURSE", "试听课程不属于该机构或不可预约", status.HTTP_422_UNPROCESSABLE_ENTITY)
    duplicate = db.scalar(select(AcademyVisit.id).where(
        AcademyVisit.user_id == user.id, AcademyVisit.institution_id == institution.id,
        AcademyVisit.visit_date == payload.date, AcademyVisit.slot == payload.slot,
        AcademyVisit.status.in_(ACTIVE_VISIT_STATUSES),
    ))
    if duplicate:
        _error("DUPLICATE_VISIT", "该机构同一时段已有有效预约", status.HTTP_409_CONFLICT)
    _reserve_slot(db, institution.id, payload.date, payload.slot, payload.partySize)
    visit = AcademyVisit(
        user_id=user.id, institution_id=institution.id, course_id=payload.courseId,
        visit_date=payload.date, slot=payload.slot, party_size=payload.partySize,
        contact_name=payload.name, contact_phone=payload.phone, status="pending",
    )
    db.add(visit)
    db.flush()
    write_audit_log(db, actor_id=user.id, action="academy.visit.created", resource_type="academy_visit", resource_id=visit.id,
                    after={"institution_id": institution.id, "date": _iso(payload.date), "slot": payload.slot}, request_id=request_id)
    db.commit()
    db.refresh(visit)
    return visit_payload(db, visit)


def update_visit(db: Session, user: User, visit_id: int, payload, request_id: Optional[str] = None) -> dict:
    visit = db.get(AcademyVisit, visit_id)
    if not visit:
        _error("VISIT_NOT_FOUND", "预约不存在", status.HTTP_404_NOT_FOUND)
    if visit.user_id != user.id:
        _error("VISIT_FORBIDDEN", "无权修改该预约", status.HTTP_403_FORBIDDEN)
    if visit.status not in ("pending", "confirmed", "rescheduled"):
        _error("INVALID_VISIT_STATE", "当前预约不能改期", status.HTTP_409_CONFLICT)
    if payload.date < date.today():
        _error("VISIT_DATE_PAST", "预约日期不能早于今天", status.HTTP_422_UNPROCESSABLE_ENTITY)
    duplicate = db.scalar(select(AcademyVisit.id).where(
        AcademyVisit.user_id == user.id, AcademyVisit.institution_id == visit.institution_id,
        AcademyVisit.visit_date == payload.date, AcademyVisit.slot == payload.slot,
        AcademyVisit.status.in_(ACTIVE_VISIT_STATUSES), AcademyVisit.id != visit.id,
    ))
    if duplicate:
        _error("DUPLICATE_VISIT", "该机构同一时段已有有效预约", status.HTTP_409_CONFLICT)
    before = {"date": _iso(visit.visit_date), "slot": visit.slot, "party_size": visit.party_size, "status": visit.status}
    _release_slot(db, visit.institution_id, visit.visit_date, visit.slot, visit.party_size)
    _reserve_slot(db, visit.institution_id, payload.date, payload.slot, payload.partySize)
    visit.visit_date, visit.slot, visit.party_size = payload.date, payload.slot, payload.partySize
    if payload.name: visit.contact_name = payload.name.strip()
    if payload.phone: visit.contact_phone = payload.phone
    visit.status = "rescheduled"
    db.flush()
    write_audit_log(db, actor_id=user.id, action="academy.visit.rescheduled", resource_type="academy_visit", resource_id=visit.id,
                    before=before, after={"date": _iso(visit.visit_date), "slot": visit.slot, "status": visit.status}, request_id=request_id)
    db.commit(); db.refresh(visit)
    return visit_payload(db, visit)


def cancel_visit(db: Session, user: User, visit_id: int, reason: str, request_id: Optional[str] = None) -> dict:
    visit = db.get(AcademyVisit, visit_id)
    if not visit:
        _error("VISIT_NOT_FOUND", "预约不存在", status.HTTP_404_NOT_FOUND)
    if visit.user_id != user.id:
        _error("VISIT_FORBIDDEN", "无权取消该预约", status.HTTP_403_FORBIDDEN)
    if visit.status == "cancelled":
        return visit_payload(db, visit)  # cancellation is idempotent
    if visit.status not in ACTIVE_VISIT_STATUSES:
        _error("INVALID_VISIT_STATE", "当前预约不能取消", status.HTTP_409_CONFLICT)
    before = {"status": visit.status}
    _release_slot(db, visit.institution_id, visit.visit_date, visit.slot, visit.party_size)
    visit.status, visit.cancel_reason = "cancelled", (reason or "用户主动取消").strip()[:500]
    write_audit_log(db, actor_id=user.id, action="academy.visit.cancelled", resource_type="academy_visit", resource_id=visit.id,
                    before=before, after={"status": "cancelled"}, request_id=request_id)
    db.commit(); db.refresh(visit)
    return visit_payload(db, visit)


def curriculum_payload(db: Session, user_id: int) -> list[dict]:
    courses = list(db.scalars(select(AcademyCourse).join(AcademyEnrollment).where(
        AcademyEnrollment.user_id == user_id, AcademyEnrollment.status == "active",
        AcademyEnrollment.course_id == AcademyCourse.id, AcademyCourse.status == "published",
    ).order_by(AcademyCourse.id)))
    by_chapter: dict[tuple[int, int, str], list[AcademyLesson]] = defaultdict(list)
    for course in courses:
        lessons = list(db.scalars(select(AcademyLesson).where(
            AcademyLesson.course_id == course.id, AcademyLesson.is_published.is_(True)
        ).order_by(AcademyLesson.chapter_order, AcademyLesson.sort_order, AcademyLesson.id)))
        for lesson in lessons:
            by_chapter[(course.id, lesson.chapter_order, lesson.chapter_title)].append(lesson)
    result = []
    for (course_id, chapter_order, chapter_title), lessons in by_chapter.items():
        course = next(item for item in courses if item.id == course_id)
        result.append({"id": f"{course_id}-{chapter_order}", "title": chapter_title, "note": course.name,
                       "lessons": [{"id": str(item.id), "title": item.title, "type": item.lesson_type,
                                    "duration": item.duration_minutes, "resourceUrl": item.resource_url} for item in lessons]})
    return result


def learning_state(db: Session, user_id: int) -> dict:
    plan = db.scalar(select(AcademyLearningPlan).where(AcademyLearningPlan.user_id == user_id))
    if not plan:
        plan = AcademyLearningPlan(user_id=user_id)
        db.add(plan); db.commit(); db.refresh(plan)
    rows = list(db.scalars(select(AcademyLessonProgress).where(AcademyLessonProgress.user_id == user_id)))
    return {"progress": {str(row.lesson_id): row.progress for row in rows},
            "videoPosition": {str(row.lesson_id): row.video_position for row in rows},
            "plan": {"dailyMinutes": plan.daily_minutes, "targetDate": _iso(plan.target_date) or "", "focus": plan.focus}}


def _assert_enrolled_lesson(db: Session, user_id: int, lesson_id: int) -> AcademyLesson:
    lesson = db.get(AcademyLesson, lesson_id)
    if not lesson or not lesson.is_published:
        _error("LESSON_NOT_FOUND", "课程章节不存在", status.HTTP_404_NOT_FOUND)
    enrolled = db.scalar(select(AcademyEnrollment.id).where(
        AcademyEnrollment.user_id == user_id, AcademyEnrollment.course_id == lesson.course_id,
        AcademyEnrollment.status == "active",
    ))
    if not enrolled:
        _error("COURSE_ACCESS_DENIED", "未获得该课程学习权限", status.HTTP_403_FORBIDDEN)
    return lesson


def update_progress(db: Session, user: User, lesson_id: int, progress: int, position: int, request_id: Optional[str] = None) -> dict:
    _assert_enrolled_lesson(db, user.id, lesson_id)
    row = db.scalar(select(AcademyLessonProgress).where(AcademyLessonProgress.user_id == user.id, AcademyLessonProgress.lesson_id == lesson_id))
    before = {"progress": row.progress, "position": row.video_position} if row else None
    if not row:
        row = AcademyLessonProgress(user_id=user.id, lesson_id=lesson_id)
        db.add(row)
    # Progress cannot go backwards due to an old player heartbeat, but an explicit
    # position can move back when a student revisits a segment.
    row.progress = max(row.progress or 0, progress)
    row.video_position = position
    write_audit_log(db, actor_id=user.id, action="academy.lesson.progress_updated", resource_type="academy_lesson_progress", resource_id=f"{user.id}:{lesson_id}",
                    before=before, after={"progress": row.progress, "position": row.video_position}, request_id=request_id)
    db.commit()
    return {"lessonId": str(lesson_id), "progress": row.progress, "position": row.video_position}


def update_plan(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    if payload.targetDate and payload.targetDate < date.today():
        _error("PLAN_DATE_PAST", "计划日期不能早于今天", status.HTTP_422_UNPROCESSABLE_ENTITY)
    plan = db.scalar(select(AcademyLearningPlan).where(AcademyLearningPlan.user_id == user.id))
    before = None
    if not plan:
        plan = AcademyLearningPlan(user_id=user.id); db.add(plan)
    else:
        before = {"dailyMinutes": plan.daily_minutes, "targetDate": _iso(plan.target_date), "focus": plan.focus}
    plan.daily_minutes, plan.target_date, plan.focus = payload.dailyMinutes, payload.targetDate, payload.focus.strip()
    write_audit_log(db, actor_id=user.id, action="academy.learning_plan.updated", resource_type="academy_learning_plan", resource_id=user.id,
                    before=before, after={"dailyMinutes": plan.daily_minutes, "targetDate": _iso(plan.target_date), "focus": plan.focus}, request_id=request_id)
    db.commit(); db.refresh(plan)
    return {"dailyMinutes": plan.daily_minutes, "targetDate": _iso(plan.target_date) or "", "focus": plan.focus}


def question_public(question: AcademyQuestion) -> dict:
    return {"id": str(question.id), "type": question.question_type, "stem": question.stem,
            "options": question.options or []}


def question_catalog(db: Session, user_id: int) -> list[dict]:
    counts = dict(db.execute(select(AcademyQuestion.question_type, func.count()).where(
        AcademyQuestion.is_active.is_(True)
    ).group_by(AcademyQuestion.question_type)).all())
    wrong_count = db.scalar(select(func.count()).select_from(AcademyWrongQuestion).where(AcademyWrongQuestion.user_id == user_id)) or 0
    labels = {"single": "单选题", "multiple": "多选题", "judge": "判断题"}
    return [{"type": kind, "label": labels.get(kind, kind), "count": int(count)} for kind, count in sorted(counts.items())] + ([{"type": "wrong", "label": "错题", "count": wrong_count}] if wrong_count else [])


def _session_questions(db: Session, session: AcademyExamSession) -> list[AcademyQuestion]:
    ids = [int(item) for item in (session.question_ids or [])]
    found = {question.id: question for question in db.scalars(select(AcademyQuestion).where(AcademyQuestion.id.in_(ids)))} if ids else {}
    return [found[question_id] for question_id in ids if question_id in found]


def create_exam(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    stmt = select(AcademyQuestion).where(AcademyQuestion.is_active.is_(True))
    if payload.type == "wrong":
        stmt = stmt.join(AcademyWrongQuestion).where(AcademyWrongQuestion.user_id == user.id)
    elif payload.type != "all":
        stmt = stmt.where(AcademyQuestion.question_type == payload.type)
    questions = list(db.scalars(stmt.order_by(AcademyQuestion.id).limit(payload.count)))
    if not questions:
        _error("QUESTION_BANK_EMPTY", "暂无符合条件的题目", status.HTTP_409_CONFLICT)
    duration = max(300, len(questions) * (90 if payload.mode == "mock" else 180))
    session = AcademyExamSession(user_id=user.id, mode=payload.mode, question_ids=[item.id for item in questions], duration_seconds=duration)
    db.add(session); db.flush()
    write_audit_log(db, actor_id=user.id, action="academy.exam.created", resource_type="academy_exam_session", resource_id=session.id,
                    after={"mode": session.mode, "question_count": len(questions)}, request_id=request_id)
    db.commit(); db.refresh(session)
    return {"id": str(session.id), "mode": session.mode, "questions": [question_public(item) for item in questions],
            "durationSeconds": session.duration_seconds, "status": session.status}


def _get_session(db: Session, user_id: int, session_id: int, *, active: bool = False) -> AcademyExamSession:
    session = db.get(AcademyExamSession, session_id)
    if not session:
        _error("EXAM_NOT_FOUND", "考试会话不存在", status.HTTP_404_NOT_FOUND)
    if session.user_id != user_id:
        _error("EXAM_FORBIDDEN", "无权访问该考试会话", status.HTTP_403_FORBIDDEN)
    if active and session.status != "active":
        _error("EXAM_ALREADY_SUBMITTED", "考试已交卷，不能继续修改", status.HTTP_409_CONFLICT)
    return session


def _validate_answers(questions: Iterable[AcademyQuestion], answers: Dict[str, list[str]]) -> Dict[str, list[str]]:
    allowed = {str(q.id): {str(item.get("id")) for item in q.options or []} for q in questions}
    clean: Dict[str, list[str]] = {}
    for question_id, choices in (answers or {}).items():
        key = str(question_id)
        if key not in allowed:
            _error("INVALID_EXAM_QUESTION", "答卷包含不属于本次考试的题目", status.HTTP_422_UNPROCESSABLE_ENTITY)
        if not isinstance(choices, list) or not choices or len(choices) > 10:
            _error("INVALID_EXAM_ANSWER", "答案格式不合法", status.HTTP_422_UNPROCESSABLE_ENTITY)
        selected = [str(item) for item in choices]
        if len(set(selected)) != len(selected) or not set(selected).issubset(allowed[key]):
            _error("INVALID_EXAM_ANSWER", "选项不属于该题", status.HTTP_422_UNPROCESSABLE_ENTITY)
        clean[key] = selected
    return clean


def save_draft(db: Session, user: User, session_id: int, payload, request_id: Optional[str] = None) -> dict:
    session = _get_session(db, user.id, session_id, active=True)
    if payload.mode != session.mode:
        _error("EXAM_MODE_MISMATCH", "考试模式不匹配", status.HTTP_422_UNPROCESSABLE_ENTITY)
    questions = _session_questions(db, session)
    answers = _validate_answers(questions, payload.answers)
    session.answers, session.current_index = answers, min(payload.currentIndex, max(0, len(questions) - 1))
    write_audit_log(db, actor_id=user.id, action="academy.exam.draft_saved", resource_type="academy_exam_session", resource_id=session.id,
                    after={"answer_count": len(answers), "current_index": session.current_index}, request_id=request_id)
    db.commit()
    elapsed = max(0, int((datetime.now(timezone.utc) - session.started_at.replace(tzinfo=timezone.utc) if session.started_at.tzinfo is None else datetime.now(timezone.utc) - session.started_at).total_seconds()))
    return {"id": str(session.id), "status": session.status, "remainingSeconds": max(0, session.duration_seconds - elapsed), "currentIndex": session.current_index}


def _grade(question: AcademyQuestion, answers: list[str]) -> bool:
    return set(str(item) for item in question.correct_answers or []) == set(str(item) for item in answers)


def _record_wrong(db: Session, user_id: int, question_id: int) -> None:
    wrong = db.scalar(select(AcademyWrongQuestion).where(AcademyWrongQuestion.user_id == user_id, AcademyWrongQuestion.question_id == question_id))
    if wrong:
        wrong.wrong_count += 1; wrong.last_wrong_at = datetime.now(timezone.utc)
    else:
        db.add(AcademyWrongQuestion(user_id=user_id, question_id=question_id))


def submit_practice_answer(db: Session, user: User, session_id: int, question_id: int, answers: list[str], request_id: Optional[str] = None) -> dict:
    session = _get_session(db, user.id, session_id, active=True)
    if session.mode != "practice":
        _error("PRACTICE_ONLY", "模拟考试不能逐题查看答案", status.HTTP_409_CONFLICT)
    questions = _session_questions(db, session)
    answer_map = _validate_answers(questions, {str(question_id): answers})
    question = next((item for item in questions if item.id == question_id), None)
    if not question:
        _error("QUESTION_NOT_IN_SESSION", "题目不属于本次考试", status.HTTP_404_NOT_FOUND)
    selected = answer_map[str(question_id)]
    correct = _grade(question, selected)
    session.answers = {**(session.answers or {}), str(question_id): selected}
    if not correct: _record_wrong(db, user.id, question.id)
    write_audit_log(db, actor_id=user.id, action="academy.exam.practice_answered", resource_type="academy_exam_session", resource_id=session.id,
                    after={"question_id": question.id, "correct": correct}, request_id=request_id)
    db.commit()
    return {"correct": correct, "answer": question.correct_answers or [], "explanation": question.explanation, "source": question.source}


def submit_exam(db: Session, user: User, session_id: int, payload, request_id: Optional[str] = None) -> dict:
    session = _get_session(db, user.id, session_id, active=True)
    if payload.mode != session.mode:
        _error("EXAM_MODE_MISMATCH", "考试模式不匹配", status.HTTP_422_UNPROCESSABLE_ENTITY)
    now = datetime.now(timezone.utc)
    started = session.started_at.replace(tzinfo=timezone.utc) if session.started_at.tzinfo is None else session.started_at
    if session.mode == "mock" and now > started + timedelta(seconds=session.duration_seconds):
        # The client may ask for automatic submission after expiry, but it cannot
        # continue writing a draft or claim a later remaining duration.
        pass
    questions = _session_questions(db, session)
    answers = _validate_answers(questions, payload.answers)
    details, correct_count = [], 0
    for question in questions:
        selected = answers.get(str(question.id), [])
        correct = _grade(question, selected)
        correct_count += int(correct)
        if not correct: _record_wrong(db, user.id, question.id)
        details.append({"questionId": str(question.id), "correct": correct, "answer": question.correct_answers or [],
                        "explanation": question.explanation, "source": question.source})
    total = len(questions)
    session.answers, session.status, session.submitted_at = answers, "submitted", now
    session.correct_count, session.score = correct_count, round(correct_count * 100 / total) if total else 0
    write_audit_log(db, actor_id=user.id, action="academy.exam.submitted", resource_type="academy_exam_session", resource_id=session.id,
                    after={"score": session.score, "correct_count": correct_count, "total": total}, request_id=request_id)
    db.commit()
    return {"id": str(session.id), "score": session.score, "correctCount": correct_count, "total": total, "details": details,
            "submittedAt": _iso(session.submitted_at)}


def _institution_context(db: Session, user: User, *, writable: bool = False) -> tuple[AcademyInstitution, AcademyInstitutionMember]:
    if not approved_verification(db, user.id, "institution"):
        _error("INSTITUTION_VERIFICATION_REQUIRED", "请先完成机构认证", status.HTTP_403_FORBIDDEN)
    member = db.scalar(select(AcademyInstitutionMember).where(AcademyInstitutionMember.user_id == user.id).order_by(AcademyInstitutionMember.id))
    if not member:
        _error("INSTITUTION_MEMBERSHIP_REQUIRED", "当前账号未关联培训机构", status.HTTP_403_FORBIDDEN)
    institution = db.get(AcademyInstitution, member.institution_id)
    if not institution:
        _error("INSTITUTION_NOT_FOUND", "关联机构不存在", status.HTTP_404_NOT_FOUND)
    if writable and member.role not in ("admin", "manager"):
        _error("INSTITUTION_WRITE_REQUIRED", "仅机构管理员或运营经理可执行写操作", status.HTTP_403_FORBIDDEN)
    return institution, member


def org_console(db: Session, user: User) -> dict:
    institution, member = _institution_context(db, user)
    visits = list(db.scalars(select(AcademyVisit).where(AcademyVisit.institution_id == institution.id).order_by(AcademyVisit.created_at.desc()).limit(50)))
    conflict = db.scalar(select(AcademySchedule).where(AcademySchedule.institution_id == institution.id, AcademySchedule.status == "conflict"))
    attendance_rows = list(db.scalars(select(AcademyAttendance).where(AcademyAttendance.institution_id == institution.id, AcademyAttendance.attendance_date == date.today())))
    return {"canWrite": member.role in ("admin", "manager"), "metrics": {
        "leads": sum(1 for item in visits if item.status in ("pending", "rescheduled")),
        "pendingVisits": sum(1 for item in visits if item.status in ("pending", "rescheduled")),
        "activeStudents": db.scalar(select(func.count()).select_from(AcademyEnrollment).join(AcademyCourse).where(AcademyCourse.institution_id == institution.id, AcademyEnrollment.status == "active")) or 0,
    }, "scheduleConflict": bool(conflict), "scheduleConflictId": str(conflict.id) if conflict else "",
        "visits": [visit_payload(db, item, show_phone=True) for item in visits],
        "attendance": {str(item.student_id): item.status for item in attendance_rows}}


def org_action(db: Session, user: User, payload, request_id: Optional[str] = None) -> dict:
    institution, _ = _institution_context(db, user, writable=True)
    if payload.action == "confirm_visit":
        try: visit_id = int(payload.id)
        except (TypeError, ValueError): _error("VISIT_ID_REQUIRED", "请提供预约编号", status.HTTP_422_UNPROCESSABLE_ENTITY)
        visit = db.get(AcademyVisit, visit_id)
        if not visit or visit.institution_id != institution.id:
            _error("VISIT_NOT_FOUND", "预约不存在", status.HTTP_404_NOT_FOUND)
        if visit.status not in ("pending", "rescheduled"):
            _error("INVALID_VISIT_STATE", "当前预约不能确认", status.HTTP_409_CONFLICT)
        before, visit.status = {"status": visit.status}, "confirmed"
        resource_id, after = visit.id, {"status": visit.status}
    elif payload.action == "resolve_schedule":
        schedule_id = payload.scheduleId or payload.id
        try: schedule_id = int(schedule_id)
        except (TypeError, ValueError): _error("SCHEDULE_ID_REQUIRED", "请提供排课编号", status.HTTP_422_UNPROCESSABLE_ENTITY)
        schedule = db.get(AcademySchedule, schedule_id)
        if not schedule or schedule.institution_id != institution.id:
            _error("SCHEDULE_NOT_FOUND", "排课记录不存在", status.HTTP_404_NOT_FOUND)
        if schedule.status != "conflict":
            _error("INVALID_SCHEDULE_STATE", "当前排课不存在待处理冲突", status.HTTP_409_CONFLICT)
        before, schedule.status, schedule.resolution_note = {"status": schedule.status}, "resolved", "由机构工作台确认处理"
        resource_id, after = schedule.id, {"status": schedule.status}
    else:
        student_id = payload.studentId or payload.id
        try: student_id = int(student_id)
        except (TypeError, ValueError): _error("STUDENT_ID_REQUIRED", "请提供学员编号", status.HTTP_422_UNPROCESSABLE_ENTITY)
        enrolled = db.scalar(select(AcademyEnrollment.id).join(AcademyCourse).where(
            AcademyEnrollment.user_id == student_id, AcademyEnrollment.status == "active", AcademyCourse.institution_id == institution.id,
        ))
        if not enrolled:
            _error("STUDENT_NOT_FOUND", "该学员不属于当前机构", status.HTTP_404_NOT_FOUND)
        item = db.scalar(select(AcademyAttendance).where(AcademyAttendance.institution_id == institution.id, AcademyAttendance.student_id == student_id, AcademyAttendance.attendance_date == date.today()))
        before = {"status": item.status} if item else None
        if not item:
            item = AcademyAttendance(institution_id=institution.id, student_id=student_id, attendance_date=date.today())
            db.add(item)
        item.status, item.updated_by = payload.status or "present", user.id
        resource_id, after = f"{institution.id}:{student_id}:{date.today().isoformat()}", {"status": item.status}
    write_audit_log(db, actor_id=user.id, action=f"academy.org.{payload.action}", resource_type="academy_org_action", resource_id=resource_id,
                    before=before, after=after, request_id=request_id)
    db.commit()
    return {"action": payload.action, "status": "ok", "resourceId": str(resource_id)}


def learning_record(db: Session, user_id: int) -> dict:
    exams = list(db.scalars(select(AcademyExamSession).where(AcademyExamSession.user_id == user_id, AcademyExamSession.status == "submitted").order_by(AcademyExamSession.submitted_at.desc())))
    visits = list(db.scalars(select(AcademyVisit).where(AcademyVisit.user_id == user_id).order_by(AcademyVisit.created_at.desc())))
    wrong_count = db.scalar(select(func.count()).select_from(AcademyWrongQuestion).where(AcademyWrongQuestion.user_id == user_id)) or 0
    completed = db.scalar(select(func.count()).select_from(AcademyLessonProgress).where(AcademyLessonProgress.user_id == user_id, AcademyLessonProgress.progress >= 100)) or 0
    stages = [
        {"key": "visit", "label": "选择培训机构", "note": "已预约试听" if visits else "尚未预约试听", "status": "completed" if visits else "todo"},
        {"key": "learning", "label": "课程学习", "note": f"已完成 {completed} 节课", "status": "completed" if completed else "in_progress" if visits else "todo"},
        {"key": "exam", "label": "模拟考试", "note": "已有成绩记录" if exams else "待完成模拟考试", "status": "completed" if exams else "todo"},
    ]
    return {"stages": stages, "wrongCount": wrong_count, "visits": [visit_payload(db, item, show_phone=False) for item in visits],
            "examHistory": [{"id": str(item.id), "mode": item.mode, "score": item.score, "correctCount": item.correct_count,
                             "total": len(item.question_ids or []), "submittedAt": _iso(item.submitted_at)} for item in exams]}


def subsidy_policies(db: Session, city: str) -> list[dict]:
    stmt = select(AcademySubsidyPolicy).order_by(AcademySubsidyPolicy.updated_at.desc(), AcademySubsidyPolicy.id.desc())
    if city:
        stmt = stmt.where(AcademySubsidyPolicy.city == city)
    return [{"id": str(item.id), "city": item.city, "title": item.title, "status": item.status,
             "effectiveDate": _iso(item.effective_date) or "", "updatedAt": _iso(item.updated_at) or "",
             "note": item.note, "materials": item.materials or [], "sourceName": item.source_name, "sourceUrl": item.source_url}
            for item in db.scalars(stmt)]
