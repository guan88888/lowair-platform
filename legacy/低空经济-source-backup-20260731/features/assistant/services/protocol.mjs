export const ASSISTANT_MODES = ['飞前检查', '任务方案', '设备诊断', '学考答疑']

export class AssistantApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'AssistantApiError'
    this.kind = options.kind || 'server'
    this.status = Number(options.status || 0)
    this.retryable = Boolean(options.retryable)
    this.retryAfter = Number(options.retryAfter || 0)
    this.requestId = options.requestId || ''
  }
}

function valueOf(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data
  return payload
}

function messageText(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(messageText).filter(Boolean).join('')
  if (!value || typeof value !== 'object') return ''
  return value.text || value.content || value.answer || value.output_text || value.delta || ''
}

export function normalizeSource(source, index = 0) {
  if (typeof source === 'string') return { id: `source-${index + 1}`, title: source, excerpt: '', url: '', kind: '来源' }
  const item = source || {}
  return {
    id: String(item.id || item.source_id || `source-${index + 1}`),
    title: item.title || item.name || item.label || item.url || `来源 ${index + 1}`,
    excerpt: item.excerpt || item.quote || item.snippet || '',
    url: item.url || item.href || '',
    kind: item.kind || item.type || '来源',
    pending: Boolean(item.pending)
  }
}

export function normalizeMessage(input, fallback = {}) {
  const item = input || {}
  const rawRole = item.role || item.author || fallback.role || 'assistant'
  const role = rawRole === 'user' || rawRole === 'human' ? 'user' : 'assistant'
  return {
    id: String(item.id || item.message_id || fallback.id || `message-${Date.now()}`),
    role,
    content: messageText(item.content ?? item.text ?? item.answer ?? item.output) || fallback.content || '',
    status: item.status || fallback.status || 'completed',
    createdAt: item.created_at || item.createdAt || fallback.createdAt || new Date().toISOString(),
    sources: (item.sources || item.citations || fallback.sources || []).map(normalizeSource),
    error: item.error?.message || item.error || fallback.error || '',
    request: item.request || fallback.request || ''
  }
}

export function normalizeConversation(input) {
  const item = valueOf(input) || {}
  const messages = item.messages || item.items || item.history || []
  return {
    id: String(item.id || item.conversation_id || item.thread_id || ''),
    title: item.title || item.name || '新会话',
    mode: ASSISTANT_MODES.includes(item.mode) ? item.mode : ASSISTANT_MODES[0],
    updatedAt: item.updated_at || item.updatedAt || item.created_at || new Date().toISOString(),
    messages: Array.isArray(messages) ? messages.map((message) => normalizeMessage(message)) : []
  }
}

export function normalizeConversationList(payload) {
  const value = valueOf(payload)
  const items = Array.isArray(value) ? value : (value?.items || value?.conversations || value?.results || [])
  return items.map(normalizeConversation).filter((item) => item.id)
}

export function normalizeRun(payload) {
  const value = valueOf(payload) || {}
  const run = value.run || value.job || value.generation || value
  const rawStatus = run.status || (run.message || run.answer || run.output ? 'completed' : 'queued')
  const statusMap = { succeeded: 'completed', success: 'completed', done: 'completed', stopped: 'cancelled', canceled: 'cancelled', error: 'failed' }
  const status = statusMap[rawStatus] || rawStatus
  const messagePayload = run.message || run.assistant_message || run.response || (run.answer || run.output || run.content ? run : null)
  return {
    id: String(run.id || run.run_id || run.job_id || ''),
    status,
    retryAfter: Number(run.retry_after || run.retryAfter || 0),
    message: messagePayload ? normalizeMessage(messagePayload, { role: 'assistant' }) : null,
    error: run.error?.message || run.error || ''
  }
}

export function retryAfterSeconds(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds)
  const date = Date.parse(String(value))
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - now) / 1000)) : 0
}

export function errorFromResponse(status, data, headers = {}, requestId = '') {
  const detail = data?.detail || data?.message || data?.error?.message || data?.error
  const text = Array.isArray(detail) ? detail.map((item) => item.msg || item.message || String(item)).join('；') : detail
  const retryAfter = retryAfterSeconds(headers['retry-after'] || headers['Retry-After'] || data?.retry_after)
  if (status === 429) {
    return new AssistantApiError(text || '请求过于频繁，请稍后重试', { kind: 'rate-limit', status, retryable: true, retryAfter, requestId })
  }
  if (status === 401 || status === 403) {
    return new AssistantApiError(text || 'AI 代理拒绝了当前请求', { kind: 'authorization', status, retryable: false, requestId })
  }
  if (status === 408 || status === 425 || status >= 500) {
    return new AssistantApiError(text || 'AI 代理暂时不可用', { kind: 'server', status, retryable: true, retryAfter, requestId })
  }
  return new AssistantApiError(text || `AI 请求失败（${status}）`, { kind: 'request', status, retryable: false, requestId })
}

export function pollingDelay(attempt, serverSeconds = 0) {
  if (serverSeconds > 0) return Math.min(15000, Math.max(300, serverSeconds * 1000))
  return Math.min(5000, 650 * (1.55 ** Math.max(0, attempt)))
}
