import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getWorkPage } from '../mock/page-data'
import { WORK_API } from './contracts'

const PAGE_META = {
  work: { title: '招聘与任务', active: 'work', root: true, kind: 'work' }, jobDetail: { title: '职位详情', kind: 'jobDetail' }, resume: { title: '求职中心', kind: 'resume', auth: true }, talent: { title: '企业招聘中心', kind: 'talent', required: 'enterprise', auth: true }, publish: { title: '发布需求', kind: 'publish', auth: true }, taskDetail: { title: '任务详情', kind: 'taskDetail' }, fulfillment: { title: '任务履约', kind: 'fulfillment', auth: true }
}
export const toWorkPageDto = (payload, pageKey) => toPageDto(payload, 'work', pageKey)
export const mapWorkPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'work', demoGetter: getWorkPage, toDto: toWorkPageDto, toUi: mapWorkPageDto, pageMeta: PAGE_META })
export const getWorkPageModel = pages.initial
export const loadWorkPage = pages.load

const mapJob = (item = {}) => ({ ...item, status: item.status === 'published' ? 'recruiting' : item.status, aircraft: Array.isArray(item.aircraft) ? item.aircraft : [], responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities : [], requirements: Array.isArray(item.requirements) ? item.requirements : [], benefits: Array.isArray(item.benefits) ? item.benefits : [] })
const mapTask = (item = {}) => ({ ...item, status: item.status === 'published' ? 'open' : item.status, publisher: item.publisher || { name: '发布方', verified: '待核验', credit: '服务端未返回' }, escrow: item.escrow || { status: 'not_created', label: '待创建' }, insurance: item.insurance || { status: 'not_connected', label: '待接入' }, privacyPhone: item.privacyPhone || { status: 'unavailable', label: '待建立业务关系' }, canManage: Boolean(item.canManage || item.viewer?.canManage) })

export { WORK_API }

function cleanListQuery(query = {}) {
  const normalized = { ...query }
  for (const key of ['city', 'caac', 'aircraft', 'identity', 'status', 'dateRange']) {
    if (normalized[key] === '全部' || normalized[key] === 'all') normalized[key] = ''
  }
  return toPageQuery(normalized)
}

export const listJobs = async (query) => { const result = normalizePage(await request({ url: WORK_API.jobs, query: cleanListQuery(query) })); return { ...result, items: result.items.map(mapJob) } }
export const getJob = async (id) => mapJob(await request({ url: WORK_API.jobs + '/' + encodeURIComponent(id) }))
export const listTasks = async (query) => { const result = normalizePage(await request({ url: WORK_API.tasks, query: cleanListQuery(query) })); return { ...result, items: result.items.map(mapTask) } }
export const getTask = async (id) => mapTask(await request({ url: WORK_API.tasks + '/' + encodeURIComponent(id) }))
export const saveResume = (data) => request({ url: '/work/resume', method: 'PUT', data, auth: true })
export const applyToJob = (id, data) => request({ url: '/work/jobs/' + encodeURIComponent(id) + '/applications', method: 'POST', data, auth: true })
export const bidForTask = (id, data) => request({ url: '/work/tasks/' + encodeURIComponent(id) + '/bids', method: 'POST', data, auth: true })
export const publishWork = (type, data) => request({ url: type === 'job' ? WORK_API.jobs : WORK_API.tasks, method: 'POST', data, auth: true })
export const getFulfillment = (orderId) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId), auth: true })
export const updateMilestone = (orderId, milestoneId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/milestones/' + encodeURIComponent(milestoneId), method: 'PATCH', data, auth: true })

export const getResume = () => request({ url: '/work/resume', auth: true })
export const listApplications = () => request({ url: '/work/applications', auth: true })
export const applyForJob = (id, resumeId) => request({ url: '/work/jobs/' + encodeURIComponent(id) + '/applications', method: 'POST', data: { resumeId }, auth: true })
export const uploadResumeAttachment = (file) => request({ url: '/work/resume/attachments', method: 'POST', data: file, auth: true })
export const withdrawApplication = (id, reason) => request({ url: '/work/applications/' + encodeURIComponent(id) + '/withdraw', method: 'POST', data: { reason }, auth: true })
export const listInterviews = () => request({ url: '/work/interviews', auth: true })
export const respondInterview = (id, action, note) => request({ url: '/work/interviews/' + encodeURIComponent(id) + '/response', method: 'POST', data: { action, note }, auth: true })
export const getCompany = (id) => request({ url: '/work/companies/' + encodeURIComponent(id) })
export const listCompanyJobs = () => request({ url: '/work/company/jobs', auth: true })
export const listCandidates = (query) => request({ url: '/work/company/candidates', query, auth: true })
export const listCompanyInterviews = () => request({ url: '/work/company/interviews', auth: true })
export const inviteCandidate = (id, data) => request({ url: '/work/candidates/' + encodeURIComponent(id) + '/interviews', method: 'POST', data, auth: true })
export const rejectCandidate = (id, reason) => request({ url: '/work/candidates/' + encodeURIComponent(id) + '/reject', method: 'POST', data: { reason }, auth: true })
export const updateCompanyJob = (id, action) => request({ url: '/work/company/jobs/' + encodeURIComponent(id), method: 'PATCH', data: { action }, auth: true })
export const placeTaskBid = (id, data) => request({ url: '/work/tasks/' + encodeURIComponent(id) + '/bids', method: 'POST', data, auth: true })
export const listTaskApplicants = (id, query) => request({ url: WORK_API.tasks + '/' + encodeURIComponent(id) + '/applicants', query: cleanListQuery(query), auth: true })
export const selectTaskApplicant = (id, applicantId) => request({ url: WORK_API.tasks + '/' + encodeURIComponent(id) + '/applicants/' + encodeURIComponent(applicantId) + '/select', method: 'POST', data: {}, auth: true })
export const publishWorkOrder = (type, data) => publishWork(type, data)
export const uploadTaskAttachment = (file) => request({ url: WORK_API.taskAttachments, method: 'POST', data: file, auth: true })
export const uploadDelivery = (orderId, file) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/deliveries', method: 'POST', data: file, auth: true })
export const submitAcceptance = (orderId, action, reason = '') => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/acceptance', method: 'POST', data: { action, reason }, auth: true })
export const createDispute = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/disputes', method: 'POST', data, auth: true })
export const pauseDispatch = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/pause', method: 'POST', data, auth: true })
export const requestSos = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/sos', method: 'POST', data, auth: true })
export const requestContractAction = (orderId, action) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/contract-actions', method: 'POST', data: { action }, auth: true })
