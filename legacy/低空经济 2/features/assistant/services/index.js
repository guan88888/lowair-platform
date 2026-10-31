import { isLiveAssistantEnabled } from '../../../config/api'
import { request, requestCancelable } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getAssistantPage as getDemoPage } from '../mock/page-data'
import { createDemoReply } from './demo-engine.mjs'
import { normalizeConversation, normalizeConversationList, normalizeMessage } from './protocol.mjs'

const PAGE_META = { droneAgent: { title: '低空 AI 助手', kind: 'droneAgent' } }
export const toAssistantPageDto = (payload, pageKey) => toPageDto(payload, 'assistant', pageKey)
export const mapAssistantPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'assistant', demoGetter: getDemoPage, toDto: toAssistantPageDto, toUi: mapAssistantPageDto, pageMeta: PAGE_META })
export const getAssistantPageModel = pages.initial
export const loadAssistantPage = pages.load

export const createConversation = (data) => request({ url: '/assistant/conversations', method: 'POST', data, auth: true })
export const getConversation = (conversationId) => request({ url: '/assistant/conversations/' + encodeURIComponent(conversationId), auth: true })
export const sendAssistantMessage = (conversationId, data) => request({ url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/messages', method: 'POST', data, auth: true })

const DEMO_STORE_KEY = 'lowair-assistant-demo-conversations'
const DEMO_ACTIVE_KEY = 'lowair-assistant-demo-active'

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
  generate({ prompt, mode }) {
    return normalizeMessage({
      id: 'assistant-' + Date.now().toString(36),
      role: 'assistant',
      ...createDemoReply({ prompt, mode }),
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
  sendMessage({ conversationId, content, mode, onUpdate }) {
    const task = requestCancelable({
      url: '/assistant/conversations/' + encodeURIComponent(conversationId) + '/messages',
      method: 'POST',
      data: { content, mode },
      auth: true
    })
    return {
      cancel: async () => task.cancel(),
      promise: task.promise.then((payload) => {
        onUpdate?.({ status: 'completed' })
        return normalizeMessage(payload?.message || payload, { role: 'assistant' })
      })
    }
  },
  clearConversation(id) {
    return request({ url: '/assistant/conversations/' + encodeURIComponent(id) + '/messages', method: 'DELETE', auth: true })
  },
  deleteConversation(id) {
    return request({ url: '/assistant/conversations/' + encodeURIComponent(id), method: 'DELETE', auth: true })
  }
}

export const liveAssistantEnabled = isLiveAssistantEnabled()
