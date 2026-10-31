import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { buildCampaignQuery, normalizeAnalytics, normalizeBilling, normalizeCampaign, normalizeCampaignList } from './contracts'
export { CAMPAIGN_ACTIONS, campaignActionsFor, validateCampaignPayload } from './contracts'

const PAGE_META = { ad: { title: '广告服务', kind: 'ad', required: 'enterprise', auth: true }, campaign: { title: '广告计划', kind: 'campaign', required: 'enterprise', auth: true } }
export const toOperationsPageDto = (payload, pageKey) => toPageDto(payload, 'operations', pageKey)
export const mapOperationsPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'operations', toDto: toOperationsPageDto, toUi: mapOperationsPageDto, pageMeta: PAGE_META })
export const getOperationsPageModel = pages.initial
export const loadOperationsPage = pages.load

export const listCampaigns = async (query) => normalizePage(await request({ url: '/operations/campaigns', query: toPageQuery(query), auth: true }))
export const createCampaign = (data) => request({ url: '/operations/campaigns', method: 'POST', data, auth: true })
export const getCampaign = (id) => request({ url: '/operations/campaigns/' + encodeURIComponent(id), auth: true })
export const updateCampaign = (id, data) => request({ url: '/operations/campaigns/' + encodeURIComponent(id), method: 'PATCH', data, auth: true })
export const getCampaignAnalytics = (id, query) => request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/analytics', query, auth: true })

export const usesDemoAdvertisingData = () => false
export const listAdPlacements = () => request({ url: '/operations/ad-placements', auth: true })
export const listCreativeLibrary = () => request({ url: '/operations/creatives', auth: true })
export const uploadCreative = (file, metadata) => request({ url: '/operations/creatives', method: 'POST', data: { file, ...metadata }, auth: true })
export const getBillingSummary = async () => normalizeBilling(await request({ url: '/operations/billing', auth: true }))
export const getCampaignBilling = async (id) => normalizeBilling(await request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/billing', auth: true }))
export const runCampaignAction = async (id, action) => normalizeCampaign(await request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/actions', method: 'POST', data: { action }, auth: true }))

export async function listCampaignsForDashboard(filters = {}) {
  const result = await request({ url: '/operations/campaigns', query: buildCampaignQuery(filters), auth: true })
  return normalizeCampaignList(result, filters)
}

export async function getCampaignForDashboard(id) {
  return normalizeCampaign(await getCampaign(id))
}

export async function getCampaignAnalyticsForDashboard(id, query) {
  return normalizeAnalytics(await getCampaignAnalytics(id, query))
}
