const STATUS_ALIASES = {
  draft: 'draft',
  pending: 'reviewing',
  pending_review: 'reviewing',
  reviewing: 'reviewing',
  approved: 'active',
  running: 'active',
  active: 'active',
  paused: 'paused',
  rejected: 'rejected',
  ended: 'ended',
  completed: 'ended'
}

export const CAMPAIGN_STATUS = Object.freeze({
  draft: { label: '草稿', tone: 'neutral' },
  reviewing: { label: '审核中', tone: 'pending' },
  active: { label: '投放中', tone: 'success' },
  paused: { label: '已暂停', tone: 'warning' },
  rejected: { label: '已驳回', tone: 'danger' },
  ended: { label: '已结束', tone: 'neutral' }
})

export const CAMPAIGN_ACTIONS = Object.freeze({
  pause: { label: '暂停计划', endpoint: 'pause' },
  resume: { label: '恢复计划', endpoint: 'resume' },
  copy: { label: '复制为草稿', endpoint: 'copy' },
  delete: { label: '删除草稿', endpoint: 'delete' }
})

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null)
}

function finiteNumber(...values) {
  const value = firstDefined(...values)
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeStatus(value) {
  return STATUS_ALIASES[value] || (CAMPAIGN_STATUS[value] ? value : 'draft')
}

function normalizeCreative(creative = {}) {
  return {
    id: creative.id || creative.creative_id || '',
    type: creative.type || creative.media_type || 'image',
    title: creative.title || creative.name || '无人机行业推广素材',
    url: creative.url || creative.file_url || creative.preview_url || '',
    thumbnailUrl: creative.thumbnailUrl || creative.thumbnail_url || creative.url || creative.file_url || '',
    format: creative.format || creative.extension || '',
    width: finiteNumber(creative.width),
    height: finiteNumber(creative.height),
    size: finiteNumber(creative.size, creative.file_size),
    reviewStatus: normalizeStatus(creative.reviewStatus || creative.review_status || 'reviewing')
  }
}

export function normalizeCampaign(source = {}) {
  const metrics = source.metrics || source.delivery || source.analytics_summary || {}
  const budget = source.budget || {}
  const audience = source.audience || source.targeting || {}
  const schedule = source.schedule || {}
  const landing = source.landingPage || source.landing_page || {}
  const review = source.review || source.review_info || {}
  const status = normalizeStatus(source.status)

  return {
    id: String(source.id || source.campaign_id || ''),
    name: source.name || source.title || '未命名广告计划',
    goal: source.goal || source.objective || '',
    goalLabel: source.goalLabel || source.goal_label || source.objective_label || '',
    placementId: source.placementId || source.placement_id || source.placement?.id || '',
    placementName: source.placementName || source.placement_name || source.placement?.name || '',
    status,
    statusLabel: CAMPAIGN_STATUS[status].label,
    statusTone: CAMPAIGN_STATUS[status].tone,
    promotionLabel: source.promotionLabel || source.promotion_label || '推广',
    dataSource: source.dataSource || source.data_source || 'server',
    demo: Boolean(source.demo),
    metrics: {
      spent: finiteNumber(metrics.spent, metrics.cost, source.spent),
      impressions: finiteNumber(metrics.impressions, metrics.exposure, source.impressions),
      clicks: finiteNumber(metrics.clicks, source.clicks),
      leads: finiteNumber(metrics.leads, metrics.inquiries, source.leads)
    },
    budget: {
      total: finiteNumber(budget.total, source.total_budget, source.budget_total),
      daily: finiteNumber(budget.daily, source.daily_budget, source.budget_daily),
      currency: budget.currency || source.currency || 'CNY'
    },
    schedule: {
      startAt: schedule.startAt || schedule.start_at || source.start_at || source.start_date || '',
      endAt: schedule.endAt || schedule.end_at || source.end_at || source.end_date || ''
    },
    audience: {
      cities: audience.cities || audience.city_codes || [],
      tags: audience.tags || audience.industry_tags || []
    },
    landingPage: {
      type: landing.type || source.landing_page_type || '',
      label: landing.label || source.landing_page_label || '',
      url: landing.url || source.landing_page_url || ''
    },
    creative: normalizeCreative(source.creative || (source.creatives || [])[0] || {}),
    copy: {
      headline: source.copy?.headline || source.headline || source.name || '',
      description: source.copy?.description || source.description || '',
      cta: source.copy?.cta || source.cta || '查看详情'
    },
    contact: {
      name: source.contact?.name || source.contact_name || '',
      phone: source.contact?.phone || source.contact_phone || ''
    },
    review: {
      result: review.result || review.status || '',
      comment: review.comment || review.reason || source.review_comment || '',
      updatedAt: review.updatedAt || review.updated_at || source.reviewed_at || ''
    },
    createdAt: source.createdAt || source.created_at || '',
    updatedAt: source.updatedAt || source.updated_at || ''
  }
}

export function normalizeCampaignList(payload = {}, fallback = {}) {
  const items = Array.isArray(payload) ? payload : (payload.items || payload.results || payload.campaigns || [])
  const page = finiteNumber(payload.page, payload.current_page, fallback.page) || 1
  const pageSize = finiteNumber(payload.pageSize, payload.page_size, payload.limit, fallback.pageSize) || 10
  const total = finiteNumber(payload.total, payload.count, items.length)
  return {
    items: items.map(normalizeCampaign),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
}

export function normalizeBilling(source = {}) {
  return {
    currency: source.currency || 'CNY',
    available: finiteNumber(source.available, source.available_balance),
    frozen: finiteNumber(source.frozen, source.frozen_amount),
    spent: finiteNumber(source.spent, source.total_spent),
    invoiced: finiteNumber(source.invoiced, source.invoiced_amount),
    settlementStatus: source.settlementStatus || source.settlement_status || 'pending',
    period: source.period || source.billing_period || '',
    updatedAt: source.updatedAt || source.updated_at || '',
    dataSource: source.dataSource || source.data_source || 'server',
    demo: Boolean(source.demo)
  }
}

export function normalizeAnalytics(source = {}) {
  const summary = source.summary || source.metrics || source
  const series = source.series || source.trend || source.points || []
  return {
    summary: {
      spent: finiteNumber(summary.spent, summary.cost),
      impressions: finiteNumber(summary.impressions, summary.exposure),
      clicks: finiteNumber(summary.clicks),
      leads: finiteNumber(summary.leads, summary.inquiries)
    },
    series: series.map((point) => ({
      date: point.date || point.day || '',
      spent: finiteNumber(point.spent, point.cost),
      impressions: finiteNumber(point.impressions, point.exposure),
      clicks: finiteNumber(point.clicks),
      leads: finiteNumber(point.leads, point.inquiries)
    })),
    attributionWindow: source.attributionWindow || source.attribution_window || '',
    updatedAt: source.updatedAt || source.updated_at || '',
    dataSource: source.dataSource || source.data_source || 'server',
    demo: Boolean(source.demo)
  }
}

export function campaignActionsFor(status) {
  const actions = ['copy']
  if (status === 'active') actions.unshift('pause')
  if (status === 'paused') actions.unshift('resume')
  if (status === 'draft') actions.push('delete')
  return actions
}

export function buildCampaignQuery(filters = {}) {
  return {
    status: filters.status === 'all' ? '' : filters.status,
    keyword: (filters.keyword || '').trim(),
    start_date: filters.startDate || '',
    end_date: filters.endDate || '',
    page: Math.max(1, Number(filters.page) || 1),
    page_size: Math.min(50, Math.max(1, Number(filters.pageSize) || 10))
  }
}

export function validateCampaignPayload(payload = {}) {
  const errors = {}
  if (!(payload.name || '').trim()) errors.name = '请输入计划名称'
  if (!payload.goal) errors.goal = '请选择推广目标'
  if (!payload.placement_id) errors.placement = '请选择广告位'
  if (!payload.landing_page?.url) errors.landing = '请填写落地页'
  if (!payload.audience?.cities?.length) errors.audience = '至少选择一个受众城市'
  if (finiteNumber(payload.budget?.total) <= 0) errors.budget = '总预算必须大于 0'
  if (finiteNumber(payload.budget?.daily) <= 0) errors.dailyBudget = '日预算必须大于 0'
  if (finiteNumber(payload.budget?.daily) > finiteNumber(payload.budget?.total)) errors.dailyBudget = '日预算不能高于总预算'
  if (!payload.schedule?.start_at || !payload.schedule?.end_at) errors.schedule = '请选择投放起止日期'
  if (payload.schedule?.start_at && payload.schedule?.end_at && payload.schedule.start_at > payload.schedule.end_at) errors.schedule = '结束日期不能早于开始日期'
  if (!payload.creative_id) errors.creative = '请选择或上传无人机行业素材'
  if (!(payload.copy?.headline || '').trim()) errors.headline = '请输入推广标题'
  if (!(payload.contact?.name || '').trim()) errors.contact = '请输入联系人'
  if (!/^1\d{10}$/.test(payload.contact?.phone || '')) errors.phone = '请输入有效手机号'
  if (!payload.compliance_confirmed) errors.compliance = '请确认素材合规声明'
  return errors
}
