import { normalizePage, request, toPageQuery } from '../../../utils/request'
import * as academyApi from '../../../api/academy'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getAcademyPage } from '../mock/page-data'
export { isDuplicateVisit, validateVisit } from './contracts.mjs'

const PAGE_META = {
  academy: { title: 'CAAC 学考', active: 'academy', root: true, kind: 'academy' }, assistant: { title: '智能选课', kind: 'assistant' }, institutions: { title: '培训机构', kind: 'institutions' }, institutionDetail: { title: '机构详情', kind: 'institutionDetail' }, visit: { title: '试听预约', kind: 'visit', auth: true }, learning: { title: '学习中心', kind: 'learning', auth: true }, exam: { title: '练习与考试', kind: 'exam', auth: true }, progress: { title: '学习档案', kind: 'progress', auth: true }, orgConsole: { title: '机构工作台', kind: 'orgConsole', required: 'institution', auth: true }
}
export const toAcademyPageDto = (payload, pageKey) => toPageDto(payload, 'academy', pageKey)
export const mapAcademyPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'academy', demoGetter: getAcademyPage, toDto: toAcademyPageDto, toUi: mapAcademyPageDto, pageMeta: PAGE_META })
export const getAcademyPageModel = pages.initial
export const loadAcademyPage = pages.load

function normalizeInstitutionPage(data = {}) {
  const page = normalizePage(data)
  return { ...page, pages: Math.max(1, Math.ceil(page.total / page.pageSize)) }
}

export const listInstitutions = async (query) => normalizeInstitutionPage(await academyApi.fetchInstitutions(toPageQuery(query)))
export const getInstitution = (id) => academyApi.fetchInstitution(id)
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
  getVisits: async () => { const data = await academyApi.fetchVisits(); return Array.isArray(data) ? data : data.items || [] },
  createVisit: academyApi.createVisit,
  rescheduleVisit: academyApi.updateVisit,
  cancelVisit: (id, reason) => academyApi.cancelVisit(id, { reason }),
  getCurriculum: async (query) => { const data = await academyApi.fetchCurriculum(query); return Array.isArray(data) ? data : data.items || [] },
  getLearningState: academyApi.fetchLearningState,
  updateLessonProgress: (lessonId, progress, position) => academyApi.updateLessonProgress(lessonId, { progress, position }),
  updateLearningPlan: academyApi.updateLearningPlan,
  getQuestionCatalog: async () => { const data = await academyApi.fetchQuestionCatalog(); return Array.isArray(data) ? data : data.items || [] },
  createExamSession: academyApi.createExamSession,
  saveExamDraft: academyApi.saveExamDraft,
  submitPracticeAnswer: (sessionId, questionId, answers) => academyApi.submitPracticeAnswer(sessionId, questionId, { answers }),
  submitExam: (sessionId, answers, mode) => academyApi.submitExamSession(sessionId, { answers, mode }),
  toggleQuestionFavorite: academyApi.toggleQuestionFavorite,
  getRecord: academyApi.fetchLearningRecord,
  getPolicies: async (city) => { const data = await academyApi.fetchSubsidyPolicies({ city }); return Array.isArray(data) ? data : data.items || [] },
  getOrgConsole: academyApi.fetchOrgConsole,
  orgWrite: academyApi.performOrgAction
}
