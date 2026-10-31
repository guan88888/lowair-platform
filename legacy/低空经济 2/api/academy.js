import { request } from '../utils/request'

export const fetchInstitutions = (query) => request({ url: '/academy/institutions', query })
export const fetchInstitution = (id) => request({ url: `/academy/institutions/${encodeURIComponent(id)}` })

export const fetchVisits = (query) => request({ url: '/academy/visits', query, auth: true })
export const createVisit = (data) => request({ url: '/academy/visits', method: 'POST', data, auth: true })
export const updateVisit = (id, data) => request({ url: `/academy/visits/${encodeURIComponent(id)}`, method: 'PATCH', data, auth: true })
export const cancelVisit = (id, data) => request({ url: `/academy/visits/${encodeURIComponent(id)}/cancel`, method: 'POST', data, auth: true })

export const fetchCurriculum = (query) => request({ url: '/academy/learning/curriculum', query, auth: true })
export const fetchLearningState = () => request({ url: '/academy/learning/state', auth: true })
export const updateLessonProgress = (lessonId, data) => request({ url: `/academy/learning/lessons/${encodeURIComponent(lessonId)}/progress`, method: 'PUT', data, auth: true })
export const updateLearningPlan = (data) => request({ url: '/academy/learning/plan', method: 'PUT', data, auth: true })

export const fetchQuestionCatalog = () => request({ url: '/academy/question-bank/catalog', auth: true })
export const createExamSession = (data) => request({ url: '/academy/exams', method: 'POST', data, auth: true })
export const saveExamDraft = (sessionId, data) => request({ url: `/academy/exams/${encodeURIComponent(sessionId)}/draft`, method: 'PUT', data, auth: true })
export const submitPracticeAnswer = (sessionId, questionId, data) => request({ url: `/academy/exams/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/answer`, method: 'POST', data, auth: true })
export const submitExamSession = (sessionId, data) => request({ url: `/academy/exams/${encodeURIComponent(sessionId)}/submit`, method: 'POST', data, auth: true })
export const fetchExamHistory = () => request({ url: '/academy/exams/history', auth: true })

export const fetchLearningRecord = () => request({ url: '/academy/records/me', auth: true })
export const fetchSubsidyPolicies = (query) => request({ url: '/academy/policies/subsidies', query })

export const fetchOrgConsole = () => request({ url: '/academy/org/console', auth: true })
export const updateOrgVisit = (id, data) => request({ url: `/academy/org/visits/${encodeURIComponent(id)}`, method: 'PATCH', data, auth: true })
export const resolveOrgSchedule = (id, data) => request({ url: `/academy/org/schedules/${encodeURIComponent(id)}/resolve`, method: 'POST', data, auth: true })
export const updateOrgAttendance = (id, data) => request({ url: `/academy/org/attendance/${encodeURIComponent(id)}`, method: 'PUT', data, auth: true })
