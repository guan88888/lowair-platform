import { cloneDemo } from '../../shared/utils/route-options'

const STORAGE_KEY = 'lowair-demo-ad-campaigns-v2'

export const demoPlacements = [
  { id: 'home-local', group: '首页与本地推荐', name: '首页本地推荐', objective: '本地无人机服务获客', billingMode: '方案确认中', spec: '图片 16:9，标题不超过 18 字', image: '/static/images/lowair-flight-service.png', previewUrl: '/pages/index/index?adPreview=home-local', promotionLabel: '广告' },
  { id: 'academy-ranking', group: '学考', name: '培训榜单推广', objective: '合规课程与试听预约', billingMode: '方案确认中', spec: '图片 4:3，需提供机构资质', image: '/static/images/lowair-academy-training.png', previewUrl: '/pages/academy/index?adPreview=academy-ranking', promotionLabel: '推广' },
  { id: 'work-recruitment', group: '工作', name: '招聘精准曝光', objective: '认证企业职位与项目招聘', billingMode: '方案确认中', spec: '图片 16:9，不得承诺保录用', image: '/static/images/lowair-work-inspection.png', previewUrl: '/pages/work/index?adPreview=work-recruitment', promotionLabel: '推广' },
  { id: 'market-recommendation', group: '交易', name: '无人机交易推荐', objective: '设备、配件与租赁服务', billingMode: '方案确认中', spec: '图片 1:1，设备信息须可核验', image: '/static/images/lowair-market-drone.png', previewUrl: '/pages/market/index?adPreview=market-recommendation', promotionLabel: '广告' }
]

export const demoCreativeLibrary = [
  { id: 'creative-inspection', title: '电力巡检作业服务', type: 'image', url: '/static/images/lowair-work-inspection.png', format: 'png', width: 1600, height: 900, size: 0, reviewStatus: 'reviewing' },
  { id: 'creative-training', title: '无人机培训课程', type: 'image', url: '/static/images/lowair-academy-training.png', format: 'png', width: 1200, height: 900, size: 0, reviewStatus: 'reviewing' },
  { id: 'creative-equipment', title: '行业无人机设备', type: 'image', url: '/static/images/lowair-market-drone.png', format: 'png', width: 1200, height: 1200, size: 0, reviewStatus: 'reviewing' }
]

const initialCampaigns = [
  {
    id: 'ad-demo-1001', name: '京津冀电力巡检服务推广', goal: 'lead', goal_label: '收集服务线索', placement_id: 'home-local', placement_name: '首页本地推荐', status: 'active', promotion_label: '广告', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 1286.4, impressions: 28640, clicks: 913, leads: 47 }, budget: { total: 6000, daily: 420, currency: 'CNY' }, schedule: { start_at: '2026-07-20', end_at: '2026-08-20' },
    audience: { cities: ['北京', '天津'], tags: ['电力巡检', '企业采购'] }, landing_page: { type: 'enterprise', label: '企业服务主页', url: '/pages/profile/index?userId=demo-enterprise&public=1' },
    creative: demoCreativeLibrary[0], copy: { headline: '无人机电力巡检服务', description: '面向园区与线路的合规作业方案', cta: '咨询服务' }, contact: { name: '周宁', phone: '19994729367' },
    review: { result: 'approved', comment: '演示审核意见：推广标识与服务范围说明完整。', updated_at: '2026-07-19 16:20' }, created_at: '2026-07-17 10:12', updated_at: '2026-07-30 09:10'
  },
  {
    id: 'ad-demo-1002', name: '超视距课程八月招生', goal: 'enrollment', goal_label: '试听预约', placement_id: 'academy-ranking', placement_name: '培训榜单推广', status: 'reviewing', promotion_label: '推广', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 0, impressions: 0, clicks: 0, leads: 0 }, budget: { total: 3800, daily: 260, currency: 'CNY' }, schedule: { start_at: '2026-08-01', end_at: '2026-08-31' },
    audience: { cities: ['北京', '石家庄'], tags: ['超视距', '技能培训'] }, landing_page: { type: 'institution', label: '培训机构详情', url: '/pages/academy/institution-detail?id=demo-01' },
    creative: demoCreativeLibrary[1], copy: { headline: '超视距课程开放试听', description: '课程安排和报考要求以机构页面为准', cta: '预约试听' }, contact: { name: '许飞', phone: '19957469996' },
    review: { result: 'pending', comment: '演示审核意见：平台正在核对课程信息与机构主体。', updated_at: '2026-07-30 14:30' }, created_at: '2026-07-29 11:08', updated_at: '2026-07-30 14:30'
  },
  {
    id: 'ad-demo-1003', name: '测绘飞手招聘推广', goal: 'recruitment', goal_label: '职位投递', placement_id: 'work-recruitment', placement_name: '招聘精准曝光', status: 'paused', promotion_label: '推广', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 864.75, impressions: 19780, clicks: 642, leads: 31 }, budget: { total: 4200, daily: 300, currency: 'CNY' }, schedule: { start_at: '2026-07-10', end_at: '2026-08-10' },
    audience: { cities: ['成都'], tags: ['测绘飞手', 'CAAC'] }, landing_page: { type: 'job', label: '职位详情', url: '/pages/work/job-detail?id=job-demo-01' },
    creative: demoCreativeLibrary[0], copy: { headline: '招聘无人机测绘飞手', description: '岗位要求与工作地点见职位详情', cta: '查看职位' }, contact: { name: '林川', phone: '19901035051' },
    review: { result: 'approved', comment: '演示审核意见：职位主体与要求已核对。', updated_at: '2026-07-09 10:45' }, created_at: '2026-07-08 15:22', updated_at: '2026-07-28 18:05'
  },
  {
    id: 'ad-demo-1004', name: '二手行业机检测服务', goal: 'product', goal_label: '商品访问', placement_id: 'market-recommendation', placement_name: '无人机交易推荐', status: 'rejected', promotion_label: '广告', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 0, impressions: 0, clicks: 0, leads: 0 }, budget: { total: 2400, daily: 180, currency: 'CNY' }, schedule: { start_at: '2026-08-05', end_at: '2026-08-25' },
    audience: { cities: ['北京', '成都'], tags: ['二手无人机', '设备检测'] }, landing_page: { type: 'product', label: '商品详情', url: '/pages/market/product-detail?id=product-demo-01' },
    creative: demoCreativeLibrary[2], copy: { headline: '行业无人机检测服务', description: '检测项目与报告范围见商品详情', cta: '查看服务' }, contact: { name: '韩拓', phone: '19940516750' },
    review: { result: 'rejected', comment: '演示驳回原因：素材中“官方指定检测”表述无法核验，请删除后重新提交。', updated_at: '2026-07-30 17:05' }, created_at: '2026-07-30 09:28', updated_at: '2026-07-30 17:05'
  },
  {
    id: 'ad-demo-1005', name: '园区航拍服务草稿', goal: 'lead', goal_label: '收集服务线索', placement_id: 'home-local', placement_name: '首页本地推荐', status: 'draft', promotion_label: '广告', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 0, impressions: 0, clicks: 0, leads: 0 }, budget: { total: 1600, daily: 120, currency: 'CNY' }, schedule: { start_at: '2026-08-10', end_at: '2026-08-20' },
    audience: { cities: ['天津'], tags: ['园区航拍'] }, landing_page: { type: 'enterprise', label: '企业服务主页', url: '/pages/profile/index?userId=demo-enterprise&public=1' },
    creative: demoCreativeLibrary[0], copy: { headline: '园区无人机航拍服务', description: '作业计划与交付范围可在线咨询', cta: '咨询服务' }, contact: { name: '周宁', phone: '19994729367' },
    review: { result: '', comment: '草稿尚未提交审核。', updated_at: '' }, created_at: '2026-07-31 08:40', updated_at: '2026-07-31 08:40'
  },
  {
    id: 'ad-demo-1006', name: '植保设备租赁推广', goal: 'product', goal_label: '商品访问', placement_id: 'market-recommendation', placement_name: '无人机交易推荐', status: 'ended', promotion_label: '广告', demo: true, data_source: 'demo-adapter',
    metrics: { spent: 1947.2, impressions: 33810, clicks: 1058, leads: 56 }, budget: { total: 2000, daily: 200, currency: 'CNY' }, schedule: { start_at: '2026-06-10', end_at: '2026-06-30' },
    audience: { cities: ['石家庄'], tags: ['植保无人机', '设备租赁'] }, landing_page: { type: 'product', label: '租赁详情', url: '/pages/market/product-detail?id=lease-demo-01' },
    creative: demoCreativeLibrary[2], copy: { headline: '植保无人机短期租赁', description: '设备配置与租赁条件见详情页面', cta: '查看租赁' }, contact: { name: '宋禾', phone: '19949967411' },
    review: { result: 'approved', comment: '演示审核意见：设备信息与租赁条件已核对。', updated_at: '2026-06-09 13:10' }, created_at: '2026-06-08 12:00', updated_at: '2026-06-30 23:59'
  }
]

function getStoredCampaigns() {
  const stored = uni.getStorageSync(STORAGE_KEY)
  return Array.isArray(stored) && stored.length ? stored : cloneDemo(initialCampaigns)
}

function saveCampaigns(campaigns) {
  uni.setStorageSync(STORAGE_KEY, campaigns)
}

function campaignIndex(campaigns, id) {
  const index = campaigns.findIndex((item) => String(item.id) === String(id))
  if (index < 0) throw new Error('未找到该广告计划')
  return index
}

export async function demoListCampaigns(query = {}) {
  let campaigns = getStoredCampaigns()
  if (query.status) campaigns = campaigns.filter((item) => item.status === query.status)
  if (query.keyword) {
    const keyword = String(query.keyword).toLowerCase()
    campaigns = campaigns.filter((item) => `${item.name} ${item.placement_name} ${(item.audience?.tags || []).join(' ')}`.toLowerCase().includes(keyword))
  }
  if (query.start_date) campaigns = campaigns.filter((item) => (item.schedule?.end_at || '') >= query.start_date)
  if (query.end_date) campaigns = campaigns.filter((item) => (item.schedule?.start_at || '') <= query.end_date)
  campaigns.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.max(1, Number(query.page_size) || 10)
  const start = (page - 1) * pageSize
  return { items: cloneDemo(campaigns.slice(start, start + pageSize)), page, page_size: pageSize, total: campaigns.length }
}

export async function demoGetCampaign(id) {
  const campaigns = getStoredCampaigns()
  return cloneDemo(campaigns[campaignIndex(campaigns, id)])
}

export async function demoCreateCampaign(payload, intent = 'draft') {
  const campaigns = getStoredCampaigns()
  const placement = demoPlacements.find((item) => item.id === payload.placement_id) || {}
  const creative = demoCreativeLibrary.find((item) => item.id === payload.creative_id) || payload.creative || {}
  const timestamp = Date.now()
  const campaign = {
    id: `ad-demo-${timestamp}`, ...cloneDemo(payload), placement_name: placement.name || payload.placement_name, status: intent === 'submit' ? 'reviewing' : 'draft', promotion_label: placement.promotionLabel || '推广',
    creative, metrics: { spent: 0, impressions: 0, clicks: 0, leads: 0 }, review: { result: intent === 'submit' ? 'pending' : '', comment: intent === 'submit' ? '演示审核：计划已提交，等待平台审核。' : '草稿尚未提交审核。', updated_at: new Date(timestamp).toISOString() },
    demo: true, data_source: 'demo-adapter', created_at: new Date(timestamp).toISOString(), updated_at: new Date(timestamp).toISOString()
  }
  campaigns.unshift(campaign)
  saveCampaigns(campaigns)
  return cloneDemo(campaign)
}

export async function demoCampaignAction(id, action) {
  const campaigns = getStoredCampaigns()
  const index = campaignIndex(campaigns, id)
  const source = campaigns[index]
  if (action === 'pause' && source.status !== 'active') throw new Error('仅投放中的计划可以暂停')
  if (action === 'resume' && source.status !== 'paused') throw new Error('仅已暂停的计划可以恢复')
  if (action === 'delete' && source.status !== 'draft') throw new Error('仅草稿可以删除')
  if (action === 'copy') {
    const copy = { ...cloneDemo(source), id: `ad-demo-${Date.now()}`, name: `${source.name} 副本`, status: 'draft', metrics: { spent: 0, impressions: 0, clicks: 0, leads: 0 }, review: { result: '', comment: '复制生成的草稿尚未提交审核。', updated_at: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    campaigns.unshift(copy)
    saveCampaigns(campaigns)
    return copy
  }
  if (action === 'delete') {
    campaigns.splice(index, 1)
    saveCampaigns(campaigns)
    return { id, deleted: true }
  }
  campaigns[index] = { ...source, status: action === 'pause' ? 'paused' : 'active', updated_at: new Date().toISOString() }
  saveCampaigns(campaigns)
  return cloneDemo(campaigns[index])
}

export async function demoAnalytics(id) {
  const campaign = await demoGetCampaign(id)
  const base = campaign.metrics || {}
  const ratios = [0.09, 0.11, 0.13, 0.12, 0.17, 0.18, 0.2]
  const dates = ['07-25', '07-26', '07-27', '07-28', '07-29', '07-30', '07-31']
  return {
    summary: base,
    series: ratios.map((ratio, index) => ({ date: dates[index], spent: Number((base.spent * ratio).toFixed(2)), impressions: Math.round(base.impressions * ratio), clicks: Math.round(base.clicks * ratio), leads: Math.round(base.leads * ratio) })),
    attribution_window: '点击后 7 天（演示口径）', updated_at: '2026-07-31 09:00', demo: true, data_source: 'demo-adapter'
  }
}

export async function demoBilling(id) {
  const campaign = id ? await demoGetCampaign(id) : null
  return {
    currency: 'CNY', available_balance: 8420.6, frozen_amount: campaign?.status === 'reviewing' ? 3800 : 0, total_spent: campaign?.metrics?.spent || 4098.35, invoiced_amount: 2100,
    settlement_status: 'pending', billing_period: '2026-07', updated_at: '2026-07-31 09:05', demo: true, data_source: 'demo-adapter'
  }
}

export async function demoUploadCreative(filePath, metadata = {}) {
  return {
    id: `creative-local-${Date.now()}`, title: metadata.title || '本地待审核无人机行业素材', type: metadata.type || 'image', url: filePath, preview_url: filePath,
    format: metadata.format || '', size: metadata.size || 0, width: metadata.width || 0, height: metadata.height || 0, review_status: 'reviewing', demo: true, data_source: 'demo-adapter'
  }
}
