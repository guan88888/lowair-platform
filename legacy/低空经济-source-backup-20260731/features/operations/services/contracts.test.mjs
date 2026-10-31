import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCampaignQuery,
  campaignActionsFor,
  normalizeCampaign,
  normalizeCampaignList,
  validateCampaignPayload
} from './contracts.js'

test('normalizes backend campaign fields and status aliases', () => {
  const campaign = normalizeCampaign({
    campaign_id: 42,
    title: '巡检推广',
    status: 'pending_review',
    delivery: { cost: '128.5', exposure: 900, inquiries: 4 },
    budget_total: 1000
  })
  assert.equal(campaign.id, '42')
  assert.equal(campaign.status, 'reviewing')
  assert.equal(campaign.metrics.spent, 128.5)
  assert.equal(campaign.metrics.impressions, 900)
  assert.equal(campaign.metrics.leads, 4)
  assert.equal(campaign.budget.total, 1000)
})

test('normalizes pagination variants', () => {
  const page = normalizeCampaignList({ results: [{ id: 'a' }, { id: 'b' }], current_page: 2, page_size: 2, count: 7 })
  assert.equal(page.page, 2)
  assert.equal(page.totalPages, 4)
  assert.deepEqual(page.items.map((item) => item.id), ['a', 'b'])
})

test('builds bounded list query', () => {
  assert.deepEqual(buildCampaignQuery({ status: 'all', keyword: '  飞手  ', page: 0, pageSize: 100 }), {
    status: '', keyword: '飞手', start_date: '', end_date: '', page: 1, page_size: 50
  })
})

test('exposes actions only for valid source states', () => {
  assert.deepEqual(campaignActionsFor('active'), ['pause', 'copy'])
  assert.deepEqual(campaignActionsFor('paused'), ['resume', 'copy'])
  assert.deepEqual(campaignActionsFor('draft'), ['copy', 'delete'])
})

test('validates required campaign fields and budget ordering', () => {
  const errors = validateCampaignPayload({ budget: { total: 100, daily: 200 }, schedule: { start_at: '2026-08-02', end_at: '2026-08-01' }, contact: {} })
  assert.equal(errors.dailyBudget, '日预算不能高于总预算')
  assert.equal(errors.schedule, '结束日期不能早于开始日期')
  assert.equal(errors.compliance, '请确认素材合规声明')
})
