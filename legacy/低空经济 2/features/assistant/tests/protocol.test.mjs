import assert from 'node:assert/strict'
import test from 'node:test'

import { createDemoReply } from '../services/demo-engine.mjs'
import {
  errorFromResponse,
  normalizeConversationList,
  normalizeRun,
  pollingDelay,
  retryAfterSeconds
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
