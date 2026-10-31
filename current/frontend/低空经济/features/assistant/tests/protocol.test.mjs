import assert from 'node:assert/strict'
import test from 'node:test'

import { createDemoReply } from '../services/demo-engine.mjs'
import {
  buildMessagePayload,
  errorFromResponse,
  isPendingRun,
  normalizeConversationList,
  normalizeSource,
  normalizeRun,
  normalizeStreamEvent,
  pollingDelay,
  retryAfterSeconds,
  toAssistantApiError
} from '../services/protocol.mjs'

test('conversation payloads are normalized across common proxy envelopes', () => {
  const conversations = normalizeConversationList({
    data: {
      items: [{
        conversation_id: 'conversation-1',
        name: '电力巡检',
        mode: '任务方案',
        updated_at: '2026-07-31T08:00:00.000Z',
        messages: [{ message_id: 'message-1', role: 'assistant', answer: '已收到', citations: ['当次任务信息'] }]
      }]
    }
  })

  assert.equal(conversations.length, 1)
  assert.equal(conversations[0].id, 'conversation-1')
  assert.equal(conversations[0].messages[0].content, '已收到')
  assert.equal(conversations[0].messages[0].sources[0].title, '当次任务信息')
})

test('completed run returns an assistant message and sources', () => {
  const run = normalizeRun({
    run_id: 'run-1',
    status: 'succeeded',
    response: {
      id: 'assistant-1',
      role: 'assistant',
      content: '建议停飞检查',
      sources: [{ title: '设备手册', pending: true }]
    }
  })

  assert.equal(run.status, 'completed')
  assert.equal(run.message.content, '建议停飞检查')
  assert.equal(run.message.sources[0].pending, true)
})

test('SSE events normalize deltas and terminal messages without provider details', () => {
  assert.deepEqual(normalizeStreamEvent('delta', '{"delta":"先停飞"}'), { type: 'delta', delta: '先停飞' })
  const completed = normalizeStreamEvent('message', '{"message":{"id":"m-1","content":"请对照手册"}}')
  assert.equal(completed.type, 'message')
  assert.equal(completed.message.content, '请对照手册')
  assert.equal(normalizeStreamEvent('', '[DONE]').done, true)
})

test('citations only retain safe web URLs for platform navigation', () => {
  assert.equal(normalizeSource({ title: '官方入口', url: 'https://uom.caac.gov.cn/' }).url, 'https://uom.caac.gov.cn/')
  assert.equal(normalizeSource({ title: 'unsafe', url: 'javascript:alert(1)' }).url, '')
  assert.equal(normalizeSource({ title: 'local', href: 'file:///private/data' }).url, '')
})

test('message payload only includes user-provided assistant context', () => {
  const payload = buildMessagePayload({
    content: '  帮我规划巡检  ',
    mode: '任务方案',
    clientMessageId: 'client-1',
    context: { aircraftModel: ' M350 RTK ', city: '杭州市', task: '', exactLocation: '30.1,120.2', certificate: 'secret' }
  })

  assert.deepEqual(payload, {
    content: '帮我规划巡检',
    mode: '任务方案',
    client_message_id: 'client-1',
    context: { aircraft_model: 'M350 RTK', city: '杭州市' }
  })
})

test('queued runs and generic rate limits are normalized for recovery UI', () => {
  const run = normalizeRun({ run_id: 'run-2', status: 'queued', retry_after: 2 })
  assert.equal(isPendingRun(run), true)
  assert.equal(run.retryAfter, 2)

  const error = toAssistantApiError({ status: 429, message: '稍后再试', retryable: true })
  assert.equal(error.kind, 'rate-limit')
  assert.equal(error.retryAfter, 10)
})

test('rate-limit responses preserve retry timing', () => {
  const error = errorFromResponse(429, { detail: '请求太频繁' }, { 'Retry-After': '7' }, 'request-1')
  assert.equal(error.kind, 'rate-limit')
  assert.equal(error.retryable, true)
  assert.equal(error.retryAfter, 7)
  assert.equal(error.requestId, 'request-1')
  assert.equal(pollingDelay(0, error.retryAfter), 7000)
})

test('Retry-After HTTP dates and polling backoff are bounded', () => {
  const now = Date.parse('2026-07-31T08:00:00.000Z')
  assert.equal(retryAfterSeconds('Fri, 31 Jul 2026 08:00:05 GMT', now), 5)
  assert.equal(pollingDelay(0), 650)
  assert.equal(pollingDelay(100), 5000)
})

test('local demo response quotes the question and lists missing context', () => {
  const question = '明天大风，能不能飞？'
  const reply = createDemoReply({ prompt: question, mode: '飞前检查' })

  assert.match(reply.content, new RegExp(`你问的是：“${question}”`))
  assert.match(reply.content, /缺失信息：/)
  assert.match(reply.content, /AI 不提供实时气象观测/)
  assert.ok(reply.missing.length > 0)
  assert.ok(reply.sources.some((source) => source.title === '中国气象局'))
})

test('local demo uses only context explicitly supplied by the user', () => {
  const reply = createDemoReply({
    prompt: '帮我列检查项',
    mode: '飞前检查',
    context: { aircraftModel: 'M350 RTK', city: '杭州市余杭区', task: '明天 80 米巡检，电池循环 20 次' }
  })

  assert.match(reply.content, /你主动提供的上下文：机型\/载荷：M350 RTK/)
  assert.doesNotMatch(reply.missing.join(','), /具体机型|所在城市|计划日期|电池健康/)
})

test('emergency demo response directs users to emergency services', () => {
  const reply = createDemoReply({ prompt: '无人机撞击后起火，有人受伤', mode: '设备诊断' })
  assert.equal(reply.scenario, 'emergency')
  assert.match(reply.content, /120、119、110/)
  assert.match(reply.content, /不要仅依赖 AI/)
})

test('airspace demo response refuses to grant permission', () => {
  const reply = createDemoReply({ prompt: '我在机场附近有报备，是不是可以直接飞？', mode: '任务方案' })
  assert.equal(reply.scenario, 'airspace')
  assert.match(reply.content, /AI 不能确认某次飞行已获批/)
  assert.ok(reply.sources.some((source) => source.url?.includes('uom.caac.gov.cn')))
})
