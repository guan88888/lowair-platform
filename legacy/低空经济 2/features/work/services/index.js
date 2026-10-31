import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getWorkPage as getDemoPage } from '../mock/page-data'

const PAGE_META = {
  work: { title: '招聘与任务', active: 'work', root: true, kind: 'work' }, jobDetail: { title: '职位详情', kind: 'jobDetail' }, resume: { title: '求职中心', kind: 'resume', auth: true }, talent: { title: '企业招聘中心', kind: 'talent', required: 'enterprise', auth: true }, publish: { title: '发布需求', kind: 'publish', auth: true }, taskDetail: { title: '任务详情', kind: 'taskDetail' }, fulfillment: { title: '任务履约', kind: 'fulfillment', auth: true }
}
export const toWorkPageDto = (payload, pageKey) => toPageDto(payload, 'work', pageKey)
export const mapWorkPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'work', demoGetter: getDemoPage, toDto: toWorkPageDto, toUi: mapWorkPageDto, pageMeta: PAGE_META })
export const getWorkPageModel = pages.initial
export const loadWorkPage = pages.load

export const listJobs = async (query) => normalizePage(await request({ url: '/work/jobs', query: toPageQuery(query) }))
export const getJob = (id) => request({ url: '/work/jobs/' + encodeURIComponent(id) })
export const listTasks = async (query) => normalizePage(await request({ url: '/work/tasks', query: toPageQuery(query) }))
export const getTask = (id) => request({ url: '/work/tasks/' + encodeURIComponent(id) })
export const saveResume = (data) => request({ url: '/work/resume', method: 'PUT', data, auth: true })
export const applyToJob = (id, data) => request({ url: '/work/jobs/' + encodeURIComponent(id) + '/applications', method: 'POST', data, auth: true })
export const bidForTask = (id, data) => request({ url: '/work/tasks/' + encodeURIComponent(id) + '/bids', method: 'POST', data, auth: true })
export const publishWork = (type, data) => request({ url: '/work/' + (type === 'job' ? 'jobs' : 'tasks'), method: 'POST', data, auth: true })
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
export const publishWorkOrder = (type, data) => publishWork(type, data)
export const uploadDelivery = (orderId, file) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/deliveries', method: 'POST', data: file, auth: true })
export const submitAcceptance = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/acceptance', method: 'POST', data, auth: true })
export const createDispute = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/disputes', method: 'POST', data, auth: true })
export const pauseDispatch = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/pause', method: 'POST', data, auth: true })
export const requestSos = (orderId, data) => request({ url: '/work/fulfillments/' + encodeURIComponent(orderId) + '/sos', method: 'POST', data, auth: true })
