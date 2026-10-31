import { API_BASE_URL } from '../../../config/api'
import { applyCurrentUser, clearSession, getAccessToken } from '../../../utils/auth'
import { ApiError, createRequestId, request } from '../../../utils/request'

export const ACCOUNT_TYPES = Object.freeze(['personal', 'caac', 'enterprise', 'institution'])

export const getAccountProfile = () => request({ url: '/profile/overview', auth: true })
export const updateAccountProfile = (data) => request({ url: '/profile', method: 'PATCH', data, auth: true })
export const listVerifications = () => request({ url: '/profile/verifications', auth: true })

export async function loadAccount() {
  const [profileResponse, verificationResponse] = await Promise.all([getAccountProfile(), listVerifications()])
  const profile = profileResponse?.profile || profileResponse?.account || profileResponse || {}
  const rawVerifications = Array.isArray(verificationResponse)
    ? verificationResponse
    : (verificationResponse?.items || verificationResponse?.verifications || profileResponse?.verifications || [])
  const verifications = Array.isArray(rawVerifications)
    ? rawVerifications
    : Object.entries(rawVerifications || {}).map(([type, value]) => ({ type, ...(value && typeof value === 'object' ? value : { status: value }) }))
  applyCurrentUser(profile, verifications)
  return { profile, verifications }
}

export function submitAccountVerification(type, materials) {
  if (!ACCOUNT_TYPES.includes(type)) return Promise.reject(new ApiError('认证类型无效', { code: 'INVALID_VERIFICATION_TYPE', retryable: false }))
  return request({
    url: '/profile/verifications/' + encodeURIComponent(type),
    method: 'POST',
    data: { materials },
    auth: true
  })
}

function uploadError(response, requestId) {
  let payload = {}
  try { payload = JSON.parse(response.data || '{}') } catch (error) { payload = {} }
  const source = payload.error || payload
  return new ApiError(source.message || '材料上传失败，请重试', {
    code: source.code || 'UPLOAD_FAILED',
    status: response.statusCode,
    requestId,
    details: source.details,
    retryable: response.statusCode >= 500 || response.statusCode === 429
  })
}

export function uploadVerificationFile(filePath, name = 'verification-material') {
  const requestId = createRequestId()
  const token = getAccessToken()
  if (!token) return { promise: Promise.reject(new ApiError('请先登录后再上传材料', { code: 'AUTH_REQUIRED', status: 401, retryable: false })), cancel() {} }

  let task
  const promise = new Promise((resolve, reject) => {
    task = uni.uploadFile({
      url: API_BASE_URL + '/uploads',
      filePath,
      name: 'file',
      header: { Authorization: 'Bearer ' + token, 'X-Request-ID': requestId },
      formData: { purpose: name },
      success(response) {
        if (response.statusCode === 401) clearSession()
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(uploadError(response, requestId))
        try {
          const payload = JSON.parse(response.data)
          resolve(payload?.data || payload?.file || payload)
        } catch (error) { reject(new ApiError('上传响应格式无效', { code: 'INVALID_UPLOAD_RESPONSE', requestId })) }
      },
      fail(error) {
        reject(new ApiError(/abort/i.test(error.errMsg || '') ? '上传已取消' : '材料上传失败，请检查网络', {
          code: /abort/i.test(error.errMsg || '') ? 'REQUEST_CANCELED' : 'NETWORK_ERROR', requestId, kind: 'network', retryable: true
        }))
      }
    })
  })
  return { promise, cancel: () => task?.abort?.(), requestId }
}
