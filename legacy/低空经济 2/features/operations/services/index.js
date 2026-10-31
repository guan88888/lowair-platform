import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getOperationsPage as getDemoPage } from '../mock/page-data'
import {
  demoAnalytics,
  demoBilling,
  demoCampaignAction,
  demoCreateCampaign,
  demoCreativeLibrary,
  demoGetCampaign,
  demoListCampaigns,
  demoPlacements,
  demoUploadCreative
} from '../mock/ad-data'
import { buildCampaignQuery, normalizeAnalytics, normalizeBilling, normalizeCampaign, normalizeCampaignList } from './contracts'
export { CAMPAIGN_ACTIONS, campaignActionsFor, validateCampaignPayload } from './contracts'

const PAGE_META = { ad: { title: '广告服务', kind: 'ad', required: 'enterprise', auth: true }, campaign: { title: '广告计划', kind: 'campaign', required: 'enterprise', auth: true } }
export const toOperationsPageDto = (payload, pageKey) => toPageDto(payload, 'operations', pageKey)
export const mapOperationsPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'operations', demoGetter: getDemoPage, toDto: toOperationsPageDto, toUi: mapOperationsPageDto, pageMeta: PAGE_META })
export const getOperationsPageModel = pages.initial
export const loadOperationsPage = pages.load

export const listCampaigns = async (query) => normalizePage(await request({ url: '/operations/campaigns', query: toPageQuery(query), auth: true }))
export const createCampaign = (data) => request({ url: '/operations/campaigns', method: 'POST', data, auth: true })
export const getCampaign = (id) => request({ url: '/operations/campaigns/' + encodeURIComponent(id), auth: true })
export const updateCampaign = (id, data) => request({ url: '/operations/campaigns/' + encodeURIComponent(id), method: 'PATCH', data, auth: true })
export const getCampaignAnalytics = (id, query) => request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/analytics', query, auth: true })

export const usesDemoAdvertisingData = () => isMockDataEnabled()
export const listAdPlacements = () => isMockDataEnabled()
  ? Promise.resolve(demoPlacements)
  : request({ url: '/operations/ad-placements', auth: true })
export const listCreativeLibrary = () => isMockDataEnabled()
  ? Promise.resolve(demoCreativeLibrary)
  : request({ url: '/operations/creatives', auth: true })
export const uploadCreative = (file, metadata, onProgress) => isMockDataEnabled()
  ? demoUploadCreative(file?.path || file, metadata).then((result) => { onProgress?.(100); return result })
  : request({ url: '/operations/creatives', method: 'POST', data: { file, ...metadata }, auth: true })
export const getBillingSummary = async () => normalizeBilling(isMockDataEnabled()
  ? await demoBilling()
  : await request({ url: '/operations/billing', auth: true }))
export const getCampaignBilling = async (id) => normalizeBilling(isMockDataEnabled()
  ? await demoBilling(id)
  : await request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/billing', auth: true }))
export const runCampaignAction = async (id, action) => normalizeCampaign(isMockDataEnabled()
  ? await demoCampaignAction(id, action)
  : await request({ url: '/operations/campaigns/' + encodeURIComponent(id) + '/actions', method: 'POST', data: { action }, auth: true }))

export async function listCampaignsForDashboard(filters = {}) {
  const result = isMockDataEnabled()
    ? await demoListCampaigns(buildCampaignQuery(filters))
    : await request({ url: '/operations/campaigns', query: buildCampaignQuery(filters), auth: true })
  return normalizeCampaignList(result, filters)
}

export async function getCampaignForDashboard(id) {
  return normalizeCampaign(isMockDataEnabled() ? await demoGetCampaign(id) : await getCampaign(id))
}

export async function getCampaignAnalyticsForDashboard(id, query) {
  return normalizeAnalytics(isMockDataEnabled() ? await demoAnalytics(id) : await getCampaignAnalytics(id, query))
}
