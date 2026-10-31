import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCampaignQuery,
  canManageAdvertising,
  campaignActionsFor,
  normalizeCampaign,
  normalizeCreatedCampaign,
  normalizeCampaignList,
  normalizeCreative,
  validateCampaignPayload
} from '../services/contracts.js'

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

test('does not promote an approved review into delivery without a server active state', () => {
  assert.equal(normalizeCampaign({ id: 'reviewed', status: 'approved' }).status, 'reviewing')
  assert.equal(normalizeCampaign({ id: 'running', status: 'active' }).status, 'active')
})

test('only authenticated approved enterprise or institution identities can manage advertising', () => {
  assert.equal(canManageAdvertising({ loggedIn: true, enterprise: true }), true)
  assert.equal(canManageAdvertising({ loggedIn: true, institution: true }), true)
  assert.equal(canManageAdvertising({ loggedIn: true, enterprise: false, institution: false }), false)
  assert.equal(canManageAdvertising({ loggedIn: false, enterprise: true }), false)
})

test('creation result cannot render as an active campaign before server review workflow completes', () => {
  assert.equal(normalizeCreatedCampaign({ id: 'draft', status: 'draft' }).status, 'draft')
  assert.equal(normalizeCreatedCampaign({ id: 'review', status: 'reviewing' }).status, 'reviewing')
  assert.throws(() => normalizeCreatedCampaign({ id: 'active', status: 'active' }), /草稿或审核中/)
})

test('normalizes creative fields without changing their review result', () => {
  const creative = normalizeCreative({ creative_id: 'img-1', preview_url: '/media/drone.jpg', review_status: 'pending' })
  assert.equal(creative.id, 'img-1')
  assert.equal(creative.thumbnailUrl, '/media/drone.jpg')
  assert.equal(creative.reviewStatus, 'reviewing')
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
