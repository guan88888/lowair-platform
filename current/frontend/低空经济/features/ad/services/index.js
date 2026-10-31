import { API_BASE_URL } from '../../../config/api'
import { getAccessToken, getAuthState } from '../../../utils/auth'
import { request } from '../../../utils/request'
import {
  buildCampaignQuery,
  normalizeAnalytics,
  normalizeBilling,
  normalizeCampaign,
  normalizeCreatedCampaign,
  normalizeCampaignList,
  normalizeCreative,
  createAdvertisingApi,
  canManageAdvertising
} from './contracts'
export { CAMPAIGN_ACTIONS, campaignActionsFor, validateCampaignPayload } from './contracts'

const ROOT = '/operations'

function responseData(payload) {
  return payload?.data && typeof payload.data === 'object' ? payload.data : payload
}

const liveApi = createAdvertisingApi(request)

function requireAdvertisingAccess() {
  const auth = getAuthState()
  if (canManageAdvertising(auth)) return auth
  if (!auth.loggedIn) throw new Error('请先登录后再管理广告计划')
  throw new Error('仅认证企业或培训机构可管理广告计划')
}

export async function listCampaigns(filters = {}) {
  requireAdvertisingAccess()
  return normalizeCampaignList(await liveApi.listCampaigns(filters), filters)
}

export async function getCampaign(id) {
  requireAdvertisingAccess()
  return normalizeCampaign(await liveApi.getCampaign(id))
}

export async function createCampaign(payload, intent = 'draft') {
  requireAdvertisingAccess()
  const result = await liveApi.createCampaign(payload, intent)
  return normalizeCreatedCampaign(responseData(result))
}

export async function getCampaignAnalytics(id, query = {}) {
  requireAdvertisingAccess()
  return normalizeAnalytics(responseData(await liveApi.getAnalytics(id, query)))
}

export async function getBillingSummary() {
  requireAdvertisingAccess()
  return normalizeBilling(await liveApi.getBilling())
}

export async function getCampaignBilling(id) {
  requireAdvertisingAccess()
  return normalizeBilling(await liveApi.getBilling(id))
}

export async function listAdPlacements() {
  const result = responseData(await liveApi.listPlacements())
  return Array.isArray(result) ? result : (result.items || result.placements || [])
}

export async function listCreativeLibrary() {
  requireAdvertisingAccess()
  const result = responseData(await liveApi.listCreatives())
  const items = Array.isArray(result) ? result : (result.items || result.creatives || [])
  return items.map(normalizeCreative)
}

export async function runCampaignAction(id, action) {
  requireAdvertisingAccess()
  return normalizeCampaign(responseData(await liveApi.runAction(id, action)))
}

export function uploadCreative(file, metadata = {}, onProgress) {
  requireAdvertisingAccess()
  const token = getAccessToken()
  if (!token) return Promise.reject(new Error('请先登录后再上传素材'))
  if (!file?.path) return Promise.reject(new Error('未找到待上传素材'))

  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: API_BASE_URL + `${ROOT}/creatives`,
      filePath: file.path,
      name: 'file',
      formData: { ...metadata, type: file.type, format: file.format },
      header: { Authorization: `Bearer ${token}`, 'X-Request-ID': `ad-${Date.now()}` },
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`素材上传失败（${response.statusCode}）`))
        try {
          const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          resolve(normalizeCreative(responseData(parsed)))
        } catch (error) { reject(new Error('素材上传响应无效')) }
      },
      fail(error) { reject(new Error(error?.errMsg || '素材上传失败')) }
    })
    task?.onProgressUpdate?.((event) => onProgress?.(Math.max(0, Math.min(100, Number(event.progress) || 0))))
  })
}
