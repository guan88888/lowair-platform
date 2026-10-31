import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getAcademyPage as getDemoPage } from '../mock/page-data'
export { validateVisit } from './contracts.mjs'

const PAGE_META = {
  academy: { title: 'CAAC 学考', active: 'academy', root: true, kind: 'academy' }, assistant: { title: '智能选课', kind: 'assistant' }, institutions: { title: '培训机构', kind: 'institutions' }, institutionDetail: { title: '机构详情', kind: 'institutionDetail' }, visit: { title: '试听预约', kind: 'visit', auth: true }, learning: { title: '学习中心', kind: 'learning', auth: true }, exam: { title: '练习与考试', kind: 'exam', auth: true }, progress: { title: '学习档案', kind: 'progress', auth: true }, orgConsole: { title: '机构工作台', kind: 'orgConsole', required: 'institution', auth: true }
}
export const toAcademyPageDto = (payload, pageKey) => toPageDto(payload, 'academy', pageKey)
export const mapAcademyPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'academy', demoGetter: getDemoPage, toDto: toAcademyPageDto, toUi: mapAcademyPageDto, pageMeta: PAGE_META })
export const getAcademyPageModel = pages.initial
export const loadAcademyPage = pages.load

export const listInstitutions = async (query) => normalizePage(await request({ url: '/academy/institutions', query: toPageQuery(query) }))
export const getInstitution = (id) => request({ url: '/academy/institutions/' + encodeURIComponent(id) })
export const createVisit = (institutionId, data) => request({ url: '/academy/institutions/' + encodeURIComponent(institutionId) + '/visits', method: 'POST', data, auth: true })
export const listCourses = async (query) => normalizePage(await request({ url: '/academy/courses', query: toPageQuery(query), auth: true }))
export const getLearningProgress = () => request({ url: '/academy/learning-progress', auth: true })
export const listExamSets = async (query) => normalizePage(await request({ url: '/academy/exam-sets', query: toPageQuery(query), auth: true }))
export const submitExam = (examSetId, data) => request({ url: '/academy/exam-sets/' + encodeURIComponent(examSetId) + '/submissions', method: 'POST', data, auth: true })
export const getInstitutionConsole = () => request({ url: '/academy/institution-console', auth: true })

// Dedicated academy pages share this adapter while the backend migration is in progress.
export const academyService = {
  listInstitutions,
  getInstitution,
  getVisits: () => request({ url: '/academy/visits', auth: true }),
  createVisit: (data) => request({ url: '/academy/visits', method: 'POST', data, auth: true }),
  rescheduleVisit: (id, data) => request({ url: '/academy/visits/' + encodeURIComponent(id), method: 'PATCH', data, auth: true }),
  cancelVisit: (id, reason) => request({ url: '/academy/visits/' + encodeURIComponent(id) + '/cancel', method: 'POST', data: { reason }, auth: true }),
  getCurriculum: () => request({ url: '/academy/learning/curriculum', auth: true }),
  getLearningState: () => request({ url: '/academy/learning/state', auth: true }),
  updateLessonProgress: (lessonId, progress, position) => request({ url: '/academy/learning/lessons/' + encodeURIComponent(lessonId) + '/progress', method: 'PUT', data: { progress, position }, auth: true }),
  updateLearningPlan: (data) => request({ url: '/academy/learning/plan', method: 'PUT', data, auth: true }),
  getQuestionCatalog: () => request({ url: '/academy/question-bank/catalog', auth: true }),
  createExamSession: (data) => request({ url: '/academy/exams', method: 'POST', data, auth: true }),
  saveExamDraft: (sessionId, data) => request({ url: '/academy/exams/' + encodeURIComponent(sessionId) + '/draft', method: 'PUT', data, auth: true }),
  submitPracticeAnswer: (sessionId, questionId, answers) => request({ url: '/academy/exams/' + encodeURIComponent(sessionId) + '/questions/' + encodeURIComponent(questionId) + '/answer', method: 'POST', data: { answers }, auth: true }),
  submitExam: (sessionId, answers, mode) => request({ url: '/academy/exams/' + encodeURIComponent(sessionId) + '/submit', method: 'POST', data: { answers, mode }, auth: true }),
  getRecord: () => request({ url: '/academy/records/me', auth: true }),
  getPolicies: (city) => request({ url: '/academy/policies/subsidies', query: { city } }),
  getOrgConsole: () => request({ url: '/academy/org/console', auth: true }),
  orgWrite: (action, payload) => request({ url: '/academy/org/actions', method: 'POST', data: { action, ...payload }, auth: true })
}
