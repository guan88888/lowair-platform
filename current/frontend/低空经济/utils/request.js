import { API_BASE_URL, API_LOG_LEVEL, API_TIMEOUT_MS } from '../config/api'
import { clearSession } from './auth'

const SENSITIVE_KEY = /authorization|cookie|token|password|secret|api[-_]?key|phone|mobile|id_?(?:card|number)|identity_?number|certificate|license|permit|bank|account|(?:^|[_-])(?:code|otp)(?:$|[_-])|verification_?code/i
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message || '请求失败，请稍后重试')
    this.name = 'ApiError'
    this.code = options.code || 'REQUEST_FAILED'
    this.status = Number(options.status || 0)
    this.requestId = options.requestId || ''
    this.details = options.details
    this.kind = options.kind || 'api'
    this.retryable = options.retryable ?? RETRYABLE_STATUS.has(this.status)
    this.canceled = this.code === 'REQUEST_CANCELED'
  }
}

export function createRequestId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  return 'lowair-' + random
}

export function redactForLog(value, key = '') {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]'
  if (Array.isArray(value)) return value.map((item) => redactForLog(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([itemKey, item]) => [itemKey, redactForLog(item, itemKey)]))
  }
  if (typeof value === 'string' && /^Bearer\s+/i.test(value)) return 'Bearer [REDACTED]'
  return value
}

function logRequest(level, event, payload) {
  if (API_LOG_LEVEL === 'silent') return
  if (API_LOG_LEVEL === 'error' && level !== 'error') return
  const logger = level === 'error' ? console.error : console.info
  logger('[api:' + event + ']', redactForLog(payload))
}

function queryPairs(query = {}) {
  return Object.entries(query).flatMap(([key, value]) => {
    if (value === undefined || value === null || value === '') return []
    const values = Array.isArray(value) ? value : [value]
    return values.map((item) => encodeURIComponent(key) + '=' + encodeURIComponent(String(item)))
  })
}

export function buildRequestUrl(path, query) {
  if (!/^\/[A-Za-z0-9/_{}.-]*(?:\?[^#]*)?$/.test(path || '') || /^\/\//.test(path)) {
    throw new ApiError('接口路径无效', { code: 'INVALID_REQUEST_PATH', kind: 'client', retryable: false })
  }
  const params = queryPairs(query).join('&')
  return API_BASE_URL + path + (params ? (path.includes('?') ? '&' : '?') + params : '')
}

function responseRequestId(response, fallback) {
  const headers = response?.header || response?.headers || {}
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'x-request-id')
  return entry?.[1] || fallback
}

function errorPayload(data) {
  const source = data?.error && typeof data.error === 'object' ? data.error : data
  let message = source?.message || source?.detail
  if (Array.isArray(message)) message = message.map((item) => item?.msg || item?.message).filter(Boolean).join('；')
  if (typeof message === 'string') message = message.replace(/^Value error, /, '')
  return {
    code: source?.code || data?.code,
    message,
    details: source?.details || source?.errors || (typeof source?.detail === 'object' ? source.detail : undefined)
  }
}

export function normalizeRequestError(input, context = {}) {
  if (input instanceof ApiError) return input
  const errMsg = input?.errMsg || input?.message || ''
  if (context.canceled || /abort/i.test(errMsg)) {
    return new ApiError('请求已取消', { code: 'REQUEST_CANCELED', kind: 'canceled', requestId: context.requestId, retryable: false })
  }
  if (/timeout/i.test(errMsg)) {
    return new ApiError('请求超时，请稍后重试', { code: 'REQUEST_TIMEOUT', kind: 'network', requestId: context.requestId, retryable: true })
  }
  return new ApiError('无法连接服务器，请检查网络', {
    code: 'NETWORK_ERROR', kind: 'network', requestId: context.requestId, details: errMsg || undefined, retryable: true
  })
}

function unwrapResponse(data) {
  if (!data || typeof data !== 'object') return data
  if (data.success === false) {
    const payload = errorPayload(data)
    throw new ApiError(payload.message, { code: payload.code || 'API_REJECTED', details: payload.details })
  }
  return Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data
}

export function requestCancelable({
  url, method = 'GET', data, query, auth = false, headers = {}, timeout = API_TIMEOUT_MS, signal
}) {
  const requestId = createRequestId()
  const token = typeof uni !== 'undefined' ? uni.getStorageSync('lowair-access-token') : ''
  const header = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Request-ID': requestId, ...headers }

  if (auth && !token) {
    const error = new ApiError('请先登录后再试', { code: 'AUTH_REQUIRED', status: 401, requestId, kind: 'auth', retryable: false })
    return { promise: Promise.reject(error), cancel() {}, requestId }
  }
  if (auth) header.Authorization = 'Bearer ' + token

  let task
  let settled = false
  let canceled = false
  let removeAbortListener = () => {}
  const cancel = () => {
    if (settled || canceled) return
    canceled = true
    if (task?.abort) task.abort()
  }

  const promise = new Promise((resolve, reject) => {
    let requestUrl
    try {
      requestUrl = buildRequestUrl(url, query)
    } catch (error) {
      settled = true
      reject(error)
      return
    }

    if (signal?.aborted) canceled = true
    if (canceled) {
      settled = true
      reject(normalizeRequestError({ errMsg: 'abort' }, { canceled: true, requestId }))
      return
    }
    if (signal?.addEventListener) {
      const onAbort = () => cancel()
      signal.addEventListener('abort', onAbort, { once: true })
      removeAbortListener = () => signal.removeEventListener('abort', onAbort)
    }

    logRequest('info', 'request', { requestId, method, url: requestUrl, query, data, headers: header })
    task = uni.request({
      url: requestUrl,
      method: String(method).toUpperCase(),
      data,
      header,
      timeout,
      success(response) {
        settled = true
        removeAbortListener()
        const resolvedRequestId = responseRequestId(response, requestId)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            const result = unwrapResponse(response.data)
            logRequest('info', 'response', { requestId: resolvedRequestId, status: response.statusCode, data: result })
            resolve(result)
          } catch (error) {
            error.requestId = error.requestId || resolvedRequestId
            error.status = error.status || response.statusCode
            reject(error)
          }
          return
        }

        const payload = errorPayload(response.data)
        if (response.statusCode === 401) {
          clearSession()
          if (typeof uni.$emit === 'function') uni.$emit('auth:unauthorized', { requestId: resolvedRequestId })
        }
        const error = new ApiError(payload.message || (response.statusCode === 401 ? '登录状态已失效，请重新登录' : '请求失败（' + response.statusCode + '）'), {
          code: payload.code || (response.statusCode === 401 ? 'UNAUTHORIZED' : 'HTTP_' + response.statusCode),
          status: response.statusCode,
          requestId: resolvedRequestId,
          details: payload.details,
          kind: response.statusCode === 401 ? 'auth' : 'api'
        })
        logRequest('error', 'error', error)
        reject(error)
      },
      fail(error) {
        settled = true
        removeAbortListener()
        const normalized = normalizeRequestError(error, { canceled, requestId })
        logRequest(normalized.canceled ? 'info' : 'error', 'error', normalized)
        reject(normalized)
      }
    })
  })

  return { promise, cancel, requestId }
}

export function request(options) {
  return requestCancelable(options).promise
}

export function toPageQuery({ page = 1, pageSize = 20, ...filters } = {}) {
  const normalizedPage = Math.max(1, Number(page) || 1)
  const normalizedPageSize = Math.min(100, Math.max(1, Number(pageSize) || 20))
  return { ...filters, page: normalizedPage, page_size: normalizedPageSize }
}

export function normalizePage(data = {}) {
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.results) ? data.results : [])
  const page = Math.max(1, Number(data.page || data.current_page) || 1)
  const pageSize = Math.max(1, Number(data.page_size || data.pageSize || data.per_page) || 20)
  const total = Math.max(0, Number(data.total || data.count) || 0)
  return { items, page, pageSize, total, hasMore: Boolean(data.has_more ?? data.hasMore ?? (page * pageSize < total)) }
}
