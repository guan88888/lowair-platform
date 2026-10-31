import { isLiveAssistantEnabled } from '../../../config/api'
import { buildRequestUrl, createRequestId, request, requestCancelable } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { createDemoReply } from './demo-engine.mjs'
import {
  AssistantApiError,
  buildMessagePayload,
  isPendingRun,
  normalizeConversation,
  normalizeConversationList,
  normalizeMessage,
  normalizeRun,
  normalizeStreamEvent,
  pollingDelay,
  toAssistantApiError
} from './protocol.mjs'

const PAGE_META = { droneAgent: { title: '低空 AI 助手', kind: 'droneAgent' } }
export const toAssistantPageDto = (payload, pageKey) => toPageDto(payload, 'assistant', pageKey)
export const mapAssistantPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'assistant', toDto: toAssistantPageDto, toUi: mapAssistantPageDto, pageMeta: PAGE_META })
export const getAssistantPageModel = pages.initial
export const loadAssistantPage = pages.load

export const createConversation = (data) => request({ url: '/assistant/conversations', method: 'POST', data, auth: true })
export const getConversation = (conversationId) => request({ url: '/assistant/conversations/' + encodeURIComponent(conversationId), auth: true })
export const sendAssistantMessage = (conversationId, data) => request({ url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/messages', method: 'POST', data, auth: true })

const DEMO_STORE_KEY = 'lowair-assistant-demo-conversations'
const DEMO_ACTIVE_KEY = 'lowair-assistant-demo-active'
const PENDING_RUNS_KEY = 'lowair-assistant-pending-runs'
const POLL_ATTEMPT_LIMIT = 90

function clientMessageId() {
  return 'assistant-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function readPendingRuns() {
  const value = uni.getStorageSync(PENDING_RUNS_KEY)
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function savePendingRun(conversationId, run) {
  const pending = readPendingRuns()
  if (run?.id) pending[conversationId] = { id: run.id, status: run.status, savedAt: new Date().toISOString() }
  else delete pending[conversationId]
  uni.setStorageSync(PENDING_RUNS_KEY, pending)
}

function waitFor(milliseconds, state) {
  return new Promise((resolve, reject) => {
    if (state.cancelled) return reject(new AssistantApiError('请求已取消', { kind: 'cancelled' }))
    state.rejectWait = reject
    state.waitTimer = setTimeout(() => { state.waitTimer = null; state.rejectWait = null; resolve() }, milliseconds)
  })
}

function canUseSse() {
  return typeof window !== 'undefined' && typeof fetch === 'function' && typeof AbortController === 'function'
}

function parseSseBlock(block) {
  let event = ''
  const data = []
  String(block).split(/\r?\n/).forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  })
  return { event, data: data.join('\n') }
}

async function streamRunEvents({ conversationId, run, state, onUpdate, onDelta }) {
  if (!canUseSse() || !run?.id) return null
  const path = '/assistant/conversations/' + encodeURIComponent(conversationId) + '/runs/' + encodeURIComponent(run.id) + '/events'
  const token = uni.getStorageSync('lowair-access-token')
  const controller = new AbortController()
  state.streamController = controller
  state.streamTimedOut = false
  const firstEventTimer = setTimeout(() => {
    state.streamTimedOut = true
    controller.abort()
  }, 8000)
  try {
    const response = await fetch(buildRequestUrl(path), {
      method: 'GET',
      headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache', Authorization: 'Bearer ' + token, 'X-Request-ID': createRequestId() },
      signal: controller.signal
    })
    if (!response.ok || !response.body?.getReader) throw new AssistantApiError('流式通道不可用', { kind: 'stream-unavailable', retryable: true, status: response.status })
    clearTimeout(firstEventTimer)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalMessage = null
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() || ''
      for (const block of blocks) {
        const parsed = parseSseBlock(block)
        if (!parsed.data) continue
        const event = normalizeStreamEvent(parsed.event, parsed.data)
        if (event.type === 'delta' && event.delta) onDelta?.({ runId: run.id, delta: event.delta })
        if (event.type === 'status' && event.run) onUpdate?.(event.run)
        if (event.type === 'error') throw new AssistantApiError(event.error, { kind: 'server', retryable: true })
        if (event.message) finalMessage = event.message
      }
    }
    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer)
      if (parsed.data) {
        const event = normalizeStreamEvent(parsed.event, parsed.data)
        if (event.type === 'delta' && event.delta) onDelta?.({ runId: run.id, delta: event.delta })
        if (event.message) finalMessage = event.message
      }
    }
    if (!finalMessage) throw new AssistantApiError('流式通道未返回完整回答', { kind: 'stream-incomplete', retryable: true })
    return finalMessage
  } catch (error) {
    if (state.cancelled) throw new AssistantApiError('请求已取消', { kind: 'cancelled' })
    if (state.streamTimedOut) throw new AssistantApiError('流式通道响应超时', { kind: 'stream-unavailable', retryable: true })
    throw error
  } finally {
    clearTimeout(firstEventTimer)
    state.streamController = null
  }
}

function createRunTask({ conversationId, initialRequest, initialRun, onUpdate, onDelta }) {
  const state = { cancelled: false, currentRequest: initialRequest || null, waitTimer: null, rejectWait: null, runId: initialRun?.id || '', streamController: null, streamTimedOut: false }

  const poll = async (startingRun) => {
    let run = startingRun
    for (let attempt = 0; attempt < POLL_ATTEMPT_LIMIT; attempt += 1) {
      if (state.cancelled) throw new AssistantApiError('请求已取消', { kind: 'cancelled' })
      if (!isPendingRun(run)) {
        savePendingRun(conversationId, null)
        if (run.status === 'completed' && run.message) return run.message
        if (run.status === 'cancelled') throw new AssistantApiError('生成已停止', { kind: 'cancelled' })
        throw new AssistantApiError(run.error || 'AI 没有返回完整回答', { kind: 'server', retryable: true })
      }
      if (!run.id) throw new AssistantApiError('AI 代理未返回任务 ID', { kind: 'server', retryable: true })
      state.runId = run.id
      savePendingRun(conversationId, run)
      onUpdate?.(run)
      await waitFor(pollingDelay(attempt, run.retryAfter), state)
      state.currentRequest = requestCancelable({
        url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/runs/' + encodeURIComponent(run.id),
        auth: true
      })
      try {
        run = normalizeRun(await state.currentRequest.promise)
      } catch (error) {
        const normalized = toAssistantApiError(error)
        if (!normalized.retryable || attempt >= 2) throw normalized
        run = { ...run, retryAfter: normalized.retryAfter }
      }
    }
    throw new AssistantApiError('AI 生成等待超时，请稍后恢复会话', { kind: 'server', retryable: true })
  }

  const promise = (async () => {
    try {
      const run = initialRun || normalizeRun(await initialRequest.promise)
      if (isPendingRun(run)) {
        // Persist before opening SSE so a tab close during the stream can
        // resume the same provider run on the next page load.
        if (run.id) savePendingRun(conversationId, run)
        try {
          const streamed = await streamRunEvents({ conversationId, run, state, onUpdate, onDelta })
          if (streamed) {
            savePendingRun(conversationId, null)
            return streamed
          }
        } catch (error) {
          if (error.kind === 'cancelled' || state.cancelled) throw error
          // Older proxies may not expose SSE. Keep the same run and resume via
          // polling so a partial/network failure never loses the turn.
        }
      }
      return await poll(run)
    } catch (error) {
      if (state.cancelled) throw new AssistantApiError('请求已取消', { kind: 'cancelled' })
      const normalized = toAssistantApiError(error)
      if (!normalized.retryable) savePendingRun(conversationId, null)
      throw normalized
    }
  })()

  return {
    promise,
    async cancel() {
      state.cancelled = true
      if (state.waitTimer) clearTimeout(state.waitTimer)
      state.rejectWait?.(new AssistantApiError('请求已取消', { kind: 'cancelled' }))
      state.waitTimer = null
      state.rejectWait = null
      state.currentRequest?.cancel?.()
      state.streamController?.abort?.()
      savePendingRun(conversationId, null)
      if (state.runId) {
        request({
          url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/runs/' + encodeURIComponent(state.runId) + '/cancel',
          method: 'POST', auth: true
        }).catch(() => {})
      }
    }
  }
}

function readDemoConversations() {
  const value = uni.getStorageSync(DEMO_STORE_KEY)
  return Array.isArray(value) ? value.map(normalizeConversation).filter((item) => item.id) : []
}

function writeDemoConversations(conversations) {
  const normalized = conversations.map(normalizeConversation).slice(0, 30)
  uni.setStorageSync(DEMO_STORE_KEY, normalized)
  return normalized
}

function createDemoConversation(data = {}) {
  const now = new Date().toISOString()
  const conversation = normalizeConversation({
    id: 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    title: data.title || '新会话',
    mode: data.mode,
    updatedAt: now,
    messages: []
  })
  const conversations = writeDemoConversations([conversation, ...readDemoConversations()])
  uni.setStorageSync(DEMO_ACTIVE_KEY, conversation.id)
  return conversations.find((item) => item.id === conversation.id)
}

export const demoSessionStore = {
  list() { return readDemoConversations() },
  activeId() { return uni.getStorageSync(DEMO_ACTIVE_KEY) || '' },
  setActive(id) { uni.setStorageSync(DEMO_ACTIVE_KEY, id) },
  get(id) { return readDemoConversations().find((item) => item.id === id) || null },
  create: createDemoConversation,
  save(conversation) {
    const normalized = normalizeConversation(conversation)
    const conversations = readDemoConversations().filter((item) => item.id !== normalized.id)
    const saved = writeDemoConversations([{ ...normalized, updatedAt: new Date().toISOString() }, ...conversations])
    uni.setStorageSync(DEMO_ACTIVE_KEY, normalized.id)
    return saved.find((item) => item.id === normalized.id)
  },
  remove(id) {
    writeDemoConversations(readDemoConversations().filter((item) => item.id !== id))
    if (this.activeId() === id) uni.removeStorageSync(DEMO_ACTIVE_KEY)
  },
  generate({ prompt, mode, context }) {
    return normalizeMessage({
      id: 'assistant-' + Date.now().toString(36),
      role: 'assistant',
      ...createDemoReply({ prompt, mode, context }),
      createdAt: new Date().toISOString(),
      status: 'completed'
    })
  }
}

export const assistantApi = {
  async listConversations() {
    return normalizeConversationList(await request({ url: '/assistant/conversations', auth: true }))
  },
  async createConversation(data) {
    return normalizeConversation(await request({ url: '/assistant/conversations', method: 'POST', data, auth: true }))
  },
  async getConversation(id) {
    return normalizeConversation(await request({ url: '/assistant/conversations/' + encodeURIComponent(id), auth: true }))
  },
  sendMessage({ conversationId, content, mode, context, onUpdate, onDelta, messageId = clientMessageId() }) {
    let data
    try {
      data = buildMessagePayload({ content, mode, context, clientMessageId: messageId })
    } catch (error) {
      return { cancel: async () => {}, promise: Promise.reject(error) }
    }
    const task = requestCancelable({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/messages',
      method: 'POST',
      data,
      auth: true
    })
    return createRunTask({ conversationId, initialRequest: task, onUpdate, onDelta })
  },
  pendingRun(conversationId) {
    return readPendingRuns()[conversationId] || null
  },
  resumeRun({ conversationId, onUpdate, onDelta }) {
    const pending = this.pendingRun(conversationId)
    if (!pending?.id) return null
    return createRunTask({ conversationId, initialRun: normalizeRun(pending), onUpdate, onDelta })
  },
  clearConversation(id) {
    savePendingRun(id, null)
    return request({ url: '/assistant/conversations/' + encodeURIComponent(id) + '/messages', method: 'DELETE', auth: true })
  },
  deleteConversation(id) {
    savePendingRun(id, null)
    return request({ url: '/assistant/conversations/' + encodeURIComponent(id), method: 'DELETE', auth: true })
  },
  // Reserved, consent-gated contracts. No UI calls these until an explicit
  // upload/review flow is added; in particular, this never sends a local file
  // or flight log implicitly.
  createAttachmentIntent(conversationId, { kind, filename, mimeType, size, consentId } = {}) {
    if (!['reference_image', 'flight_log'].includes(kind)) return Promise.reject(new AssistantApiError('附件类型未开放', { kind: 'validation', retryable: false }))
    if (!consentId || !filename || !mimeType || !Number.isFinite(Number(size)) || Number(size) <= 0) {
      return Promise.reject(new AssistantApiError('附件上传需要明确授权和文件信息', { kind: 'validation', retryable: false }))
    }
    return request({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/attachments',
      method: 'POST', auth: true,
      data: { kind, filename: String(filename).slice(0, 180), mime_type: mimeType, size: Number(size), consent_id: consentId }
    })
  },
  completeAttachment(conversationId, attachmentId) {
    return request({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/attachments/' + encodeURIComponent(attachmentId) + '/complete',
      method: 'POST', auth: true
    })
  },
  createVoiceTranscription(conversationId, { attachmentId, language, consentId } = {}) {
    if (!attachmentId || !consentId) return Promise.reject(new AssistantApiError('语音转写需要用户授权', { kind: 'validation', retryable: false }))
    return request({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/voice/transcriptions',
      method: 'POST', auth: true, data: { attachment_id: attachmentId, language: language || 'zh-CN', consent_id: consentId }
    })
  },
  createHandoff(conversationId, { reason, summary, includedMessageIds, consentId } = {}) {
    if (!consentId || !reason || !summary) return Promise.reject(new AssistantApiError('人工转接需要用户确认并说明原因', { kind: 'validation', retryable: false }))
    return request({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/handoffs',
      method: 'POST', auth: true,
      data: { reason: String(reason).slice(0, 240), summary: String(summary).slice(0, 2000), included_message_ids: Array.isArray(includedMessageIds) ? includedMessageIds.slice(0, 50) : [], consent_id: consentId }
    })
  }
}

export const liveAssistantEnabled = isLiveAssistantEnabled()
