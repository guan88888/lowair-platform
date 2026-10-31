import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdvertisingApi } from '../services/contracts.js'

test('advertising API sends only a submission intent and never a client delivery state', async () => {
  const calls = []
  const api = createAdvertisingApi(async (options) => {
    calls.push(options)
    return { id: 'ad-01' }
  })

  await api.createCampaign({ name: '巡检服务', status: 'active' }, 'submit')
  await api.runAction('ad/01', 'pause')

  assert.deepEqual(calls, [
    {
      url: '/operations/campaigns',
      method: 'POST',
      data: { name: '巡检服务', submission_intent: 'review' },
      auth: true
    },
    { url: '/operations/campaigns/ad%2F01/actions', method: 'POST', data: { action: 'pause' }, auth: true }
  ])
})

test('advertising API keeps status, dates and paging in the server query contract', async () => {
  let call
  const api = createAdvertisingApi(async (options) => { call = options; return { items: [] } })
  await api.listCampaigns({ status: 'reviewing', startDate: '2026-08-01', endDate: '2026-08-31', page: 2, pageSize: 3 })
  assert.deepEqual(call, {
    url: '/operations/campaigns',
    query: { status: 'reviewing', keyword: '', start_date: '2026-08-01', end_date: '2026-08-31', page: 2, page_size: 3 },
    auth: true
  })
})

test('different campaign ids are addressed independently for detail and trend requests', async () => {
  const calls = []
  const api = createAdvertisingApi(async (options) => { calls.push(options); return {} })
  await api.getCampaign('campaign-a')
  await api.getCampaign('campaign-b')
  await api.getAnalytics('campaign-b', { start_date: '2026-08-01' })
  assert.deepEqual(calls.map((call) => call.url), [
    '/operations/campaigns/campaign-a',
    '/operations/campaigns/campaign-b',
    '/operations/campaigns/campaign-b/analytics'
  ])
})
