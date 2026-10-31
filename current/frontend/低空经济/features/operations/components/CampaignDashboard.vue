<template>
  <view class="dashboard">
    <view class="data-note" :class="{ demo: demoMode }">
      <text>{{ demoMode ? '广告域演示数据' : '服务端投放数据' }}</text>
      <text>曝光、点击和线索按后端归因口径统计，不由前端推算</text>
    </view>

    <view class="overview-row">
      <view class="overview-main">
        <text class="block-title">投放总览</text>
        <view v-if="loading && !campaigns.length" class="overview-skeleton"><view v-for="index in 4" :key="index"></view></view>
        <view v-else class="metric-grid">
          <view class="metric-cell"><text>{{ formatMoney(totals.spent) }}</text><text>消耗</text></view>
          <view class="metric-cell"><text>{{ formatCompact(totals.impressions) }}</text><text>曝光</text></view>
          <view class="metric-cell"><text>{{ formatCompact(totals.clicks) }}</text><text>点击</text></view>
          <view class="metric-cell"><text>{{ totals.leads }}</text><text>线索</text></view>
        </view>
      </view>
      <view class="billing-box">
        <text class="billing-label">服务端账单余额</text>
        <text v-if="billingLoading" class="billing-value">读取中</text>
        <text v-else-if="billingError" class="billing-error" @tap="loadBilling">读取失败，点此重试</text>
        <text v-else class="billing-value">{{ formatMoney(billing.available) }}</text>
        <text class="billing-meta">{{ billing.period || '当前周期' }} · {{ billing.demo ? '演示账单' : '账单中心' }}</text>
      </view>
    </view>

    <view class="filter-panel">
      <view class="status-scroll">
        <scroll-view scroll-x :show-scrollbar="false">
          <view class="status-tabs">
            <text v-for="status in statuses" :key="status.value" class="status-tab" :class="{ active: filters.status === status.value }" @tap="setStatus(status.value)">{{ status.label }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="filter-row">
        <view class="search-box"><text>⌕</text><input v-model="filters.keyword" confirm-type="search" placeholder="计划名称、广告位或受众标签" placeholder-class="input-placeholder" @confirm="applyFilters" /><text v-if="filters.keyword" @tap="clearKeyword">×</text></view>
        <picker mode="date" :value="filters.startDate" @change="filters.startDate = $event.detail.value"><view class="date-filter">{{ filters.startDate || '开始日期' }}</view></picker>
        <text class="date-separator">至</text>
        <picker mode="date" :value="filters.endDate" @change="filters.endDate = $event.detail.value"><view class="date-filter">{{ filters.endDate || '结束日期' }}</view></picker>
        <view class="filter-button" @tap="applyFilters">筛选</view>
        <view class="reset-button" @tap="resetFilters">重置</view>
      </view>
    </view>

    <view class="list-heading"><view><text class="block-title">广告计划</text><text class="block-note">共 {{ pagination.total }} 条</text></view><view class="create-button" @tap="$emit('create')">新建计划</view></view>
    <view v-if="loading" class="campaign-list">
      <view v-for="index in 3" :key="index" class="campaign-row row-skeleton"></view>
    </view>
    <view v-else-if="error" class="state-panel"><text class="state-title">计划加载失败</text><text>{{ error }}</text><view class="secondary-button" @tap="loadCampaigns">重试</view></view>
    <view v-else-if="!campaigns.length" class="state-panel"><text class="state-title">没有符合条件的计划</text><text>调整状态或日期筛选，也可以创建新的广告计划。</text><view class="secondary-button" @tap="resetFilters">清除筛选</view></view>
    <view v-else class="campaign-list">
      <view v-for="campaign in campaigns" :key="campaign.id" class="campaign-row" :class="{ selected: selectedId === campaign.id }" @tap="openCampaign(campaign.id)">
        <view class="campaign-primary">
          <view class="campaign-title-line"><text class="promotion-badge">{{ campaign.promotionLabel }}</text><text class="campaign-name">{{ campaign.name }}</text></view>
          <text class="campaign-meta">{{ campaign.placementName || '待选择广告位' }} · {{ dateRange(campaign) }}</text>
        </view>
        <view class="status-badge" :class="'tone-' + campaign.statusTone">{{ campaign.statusLabel }}</view>
        <view class="row-metric"><text>{{ formatMoney(campaign.metrics.spent) }}</text><text>消耗</text></view>
        <view class="row-metric"><text>{{ formatCompact(campaign.metrics.impressions) }}</text><text>曝光</text></view>
        <view class="row-metric"><text>{{ formatCompact(campaign.metrics.clicks) }}</text><text>点击</text></view>
        <view class="row-metric"><text>{{ campaign.metrics.leads }}</text><text>线索</text></view>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <view v-if="pagination.totalPages > 1" class="pagination">
      <text :class="{ disabled: pagination.page <= 1 }" @tap="changePage(-1)">上一页</text>
      <text class="page-number">{{ pagination.page }} / {{ pagination.totalPages }}</text>
      <text :class="{ disabled: pagination.page >= pagination.totalPages }" @tap="changePage(1)">下一页</text>
    </view>

    <view v-if="selectedId" class="detail-panel">
      <view v-if="detailLoading" class="detail-skeleton"><view></view><view></view><view></view></view>
      <view v-else-if="detailError" class="state-panel"><text class="state-title">计划详情加载失败</text><text>{{ detailError }}</text><view class="secondary-button" @tap="loadDetail(selectedId)">重试</view></view>
      <template v-else-if="detail">
        <view class="detail-head">
          <view><view class="campaign-title-line"><text class="promotion-badge">{{ detail.promotionLabel }}</text><text class="detail-title">{{ detail.name }}</text></view><text class="detail-id">计划 ID {{ detail.id }}</text></view>
          <view class="status-badge" :class="'tone-' + detail.statusTone">{{ detail.statusLabel }}</view>
        </view>

        <view class="review-box" :class="{ rejected: detail.status === 'rejected' }">
          <view><text class="review-label">审核意见</text><text class="review-time">{{ detail.review.updatedAt || '尚未更新' }}</text></view>
          <text class="review-comment">{{ detail.review.comment || '平台尚未返回审核意见。' }}</text>
        </view>

        <view class="detail-grid">
          <view class="trend-section">
            <view class="detail-section-head"><text class="block-title">数据趋势</text><view class="trend-tabs"><text v-for="item in trendMetrics" :key="item.value" :class="{ active: trendMetric === item.value }" @tap="trendMetric = item.value">{{ item.label }}</text></view></view>
            <view v-if="analyticsLoading" class="chart-skeleton"></view>
            <view v-else-if="analyticsError" class="inline-error"><text>{{ analyticsError }}</text><text @tap="loadAnalytics(selectedId)">重试</text></view>
            <view v-else-if="analytics.series.length" class="chart" :aria-label="activeTrendLabel + '趋势图'">
              <view v-for="point in analytics.series" :key="point.date" class="chart-column">
                <text class="chart-value">{{ formatTrendValue(point[trendMetric]) }}</text>
                <view class="bar-wrap"><view class="chart-bar" :style="{ height: trendHeight(point[trendMetric]) }"></view></view>
                <text class="chart-date">{{ point.date }}</text>
              </view>
            </view>
            <text v-else class="chart-empty">当前计划尚无投放趋势数据</text>
            <text class="attribution">{{ analytics.attributionWindow || '归因口径由广告服务端提供' }}<template v-if="analytics.updatedAt">，更新于 {{ analytics.updatedAt }}</template></text>
          </view>

          <view class="creative-section">
            <text class="block-title">投放素材</text>
            <image v-if="detail.creative.thumbnailUrl" class="creative-image" :src="detail.creative.thumbnailUrl" mode="aspectFill"></image>
            <view v-else class="creative-missing">暂无素材预览</view>
            <view class="creative-caption"><text class="promotion-badge">{{ detail.promotionLabel }}</text><text>{{ detail.copy.headline }}</text></view>
            <text class="creative-copy">{{ detail.copy.description }}</text>
          </view>
        </view>

        <view class="info-columns">
          <view class="info-group"><text class="info-title">投放设置</text><view class="info-line"><text>目标</text><text>{{ detail.goalLabel || detail.goal || '--' }}</text></view><view class="info-line"><text>广告位</text><text>{{ detail.placementName || '--' }}</text></view><view class="info-line"><text>周期</text><text>{{ dateRange(detail) }}</text></view><view class="info-line"><text>受众</text><text>{{ [...detail.audience.cities, ...detail.audience.tags].join('、') || '--' }}</text></view></view>
          <view class="info-group"><text class="info-title">预算与账单</text><view class="info-line"><text>总预算</text><text>{{ formatMoney(detail.budget.total) }}</text></view><view class="info-line"><text>日预算</text><text>{{ formatMoney(detail.budget.daily) }}</text></view><view class="info-line"><text>服务端消耗</text><text>{{ formatMoney(detail.metrics.spent) }}</text></view><view class="info-line"><text>账单周期</text><text>{{ detailBilling.period || '--' }}{{ detailBilling.demo ? '（演示）' : '' }}</text></view></view>
          <view class="info-group"><text class="info-title">落地页与联系人</text><view class="info-line"><text>落地页</text><text class="link-text" @tap="previewLanding">{{ detail.landingPage.label || detail.landingPage.url || '--' }}</text></view><view class="info-line"><text>联系人</text><text>{{ detail.contact.name || '--' }}</text></view><view class="info-line"><text>联系电话</text><text>{{ maskedPhone(detail.contact.phone) }}</text></view><view class="info-line"><text>更新时间</text><text>{{ detail.updatedAt || '--' }}</text></view></view>
        </view>

        <view class="detail-actions">
          <view v-for="action in availableActions" :key="action" class="action-button" :class="{ danger: action === 'delete', primary: action === 'resume' }" @tap="requestAction(action)">{{ actionLabel(action) }}</view>
        </view>
      </template>
    </view>

    <view v-if="confirm.visible" class="confirm-mask" @tap.self="closeConfirm">
      <view class="confirm-dialog">
        <text class="confirm-title">{{ confirm.title }}</text>
        <text class="confirm-message">{{ confirm.message }}</text>
        <view v-if="confirm.error" class="confirm-error"><text>{{ confirm.error }}</text><text>信息已保留，可直接重试。</text></view>
        <view class="confirm-actions"><text :class="{ disabled: confirm.loading }" @tap="closeConfirm">取消</text><text class="confirm-submit" :class="{ danger: confirm.action === 'delete', disabled: confirm.loading }" @tap="executeAction">{{ confirm.loading ? '处理中' : (confirm.error ? '重试' : '确认') }}</text></view>
      </view>
    </view>
  </view>
</template>

<script>
import { formatCurrency } from '../../shared/utils/formatters'
import {
  CAMPAIGN_ACTIONS,
  campaignActionsFor,
  getBillingSummary,
  getCampaign,
  getCampaignAnalytics,
  getCampaignBilling,
  listCampaigns,
  runCampaignAction,
  usesDemoAdvertisingData
} from '../services'

export default {
  name: 'CampaignDashboard',
  emits: ['create', 'toast'],
  props: { initialId: { type: String, default: '' } },
  data() {
    return {
      demoMode: usesDemoAdvertisingData(), campaigns: [], loading: true, error: '', selectedId: this.initialId || '', detail: null, detailLoading: false, detailError: '',
      billing: {}, billingLoading: true, billingError: '', detailBilling: {}, analytics: { summary: {}, series: [] }, analyticsLoading: false, analyticsError: '', trendMetric: 'impressions', requestSequence: 0,
      filters: { status: 'all', keyword: '', startDate: '', endDate: '', page: 1, pageSize: 3 }, pagination: { page: 1, pageSize: 3, total: 0, totalPages: 1 },
      statuses: [{ value: 'all', label: '全部' }, { value: 'draft', label: '草稿' }, { value: 'reviewing', label: '审核中' }, { value: 'active', label: '投放中' }, { value: 'paused', label: '已暂停' }, { value: 'rejected', label: '已驳回' }, { value: 'ended', label: '已结束' }],
      trendMetrics: [{ value: 'impressions', label: '曝光' }, { value: 'clicks', label: '点击' }, { value: 'leads', label: '线索' }, { value: 'spent', label: '消耗' }],
      confirm: { visible: false, action: '', title: '', message: '', loading: false, error: '' }
    }
  },
  computed: {
    totals() {
      return this.campaigns.reduce((total, campaign) => ({ spent: total.spent + campaign.metrics.spent, impressions: total.impressions + campaign.metrics.impressions, clicks: total.clicks + campaign.metrics.clicks, leads: total.leads + campaign.metrics.leads }), { spent: 0, impressions: 0, clicks: 0, leads: 0 })
    },
    availableActions() { return this.detail ? campaignActionsFor(this.detail.status) : [] },
    activeTrendLabel() { return this.trendMetrics.find((item) => item.value === this.trendMetric)?.label || '数据' },
    trendMax() { return Math.max(1, ...this.analytics.series.map((point) => Number(point[this.trendMetric]) || 0)) }
  },
  created() {
    this.loadCampaigns()
    this.loadBilling()
  },
  methods: {
    async loadCampaigns() {
      const sequence = ++this.requestSequence
      this.loading = true
      this.error = ''
      try {
        const result = await listCampaigns(this.filters)
        if (sequence !== this.requestSequence) return
        this.campaigns = result.items
        this.pagination = result
        if (this.selectedId && !this.detail) this.loadDetail(this.selectedId)
      } catch (error) { if (sequence === this.requestSequence) this.error = error.message || '计划加载失败' } finally { if (sequence === this.requestSequence) this.loading = false }
    },
    async loadBilling() {
      this.billingLoading = true
      this.billingError = ''
      try { this.billing = await getBillingSummary() } catch (error) { this.billingError = error.message || '账单读取失败' } finally { this.billingLoading = false }
    },
    async openCampaign(id) {
      this.selectedId = id
      await this.loadDetail(id)
    },
    async loadDetail(id) {
      this.detailLoading = true
      this.detailError = ''
      try {
        this.detail = await getCampaign(id)
        await Promise.all([this.loadAnalytics(id), this.loadDetailBilling(id)])
      } catch (error) { this.detailError = error.message || '详情加载失败' } finally { this.detailLoading = false }
    },
    async loadAnalytics(id) {
      this.analyticsLoading = true
      this.analyticsError = ''
      try { this.analytics = await getCampaignAnalytics(id, { start_date: this.filters.startDate, end_date: this.filters.endDate }) } catch (error) { this.analyticsError = error.message || '趋势加载失败' } finally { this.analyticsLoading = false }
    },
    async loadDetailBilling(id) {
      try { this.detailBilling = await getCampaignBilling(id) } catch (error) { this.detailBilling = {}; this.$emit('toast', error.message || '计划账单读取失败') }
    },
    setStatus(status) { this.filters.status = status; this.filters.page = 1; this.selectedId = ''; this.detail = null; this.loadCampaigns() },
    applyFilters() {
      if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) return this.$emit('toast', '结束日期不能早于开始日期')
      this.filters.page = 1
      this.selectedId = ''
      this.detail = null
      this.loadCampaigns()
    },
    clearKeyword() { this.filters.keyword = ''; this.applyFilters() },
    resetFilters() { this.filters = { status: 'all', keyword: '', startDate: '', endDate: '', page: 1, pageSize: 3 }; this.selectedId = ''; this.detail = null; this.loadCampaigns() },
    changePage(step) {
      const next = this.pagination.page + step
      if (next < 1 || next > this.pagination.totalPages) return
      this.filters.page = next
      this.selectedId = ''
      this.detail = null
      this.loadCampaigns()
    },
    requestAction(action) {
      const messages = {
        pause: `暂停后“${this.detail.name}”将停止继续投放，服务端可能仍会回传延迟数据。`,
        resume: `确认恢复“${this.detail.name}”？最终可投放状态仍由服务端校验。`,
        copy: `将复制“${this.detail.name}”的设置并生成新草稿，不会复制消费数据。`,
        delete: `删除草稿“${this.detail.name}”？该操作提交后不可恢复。`
      }
      this.confirm = { visible: true, action, title: CAMPAIGN_ACTIONS[action].label, message: messages[action], loading: false, error: '' }
    },
    closeConfirm() { if (!this.confirm.loading) this.confirm.visible = false },
    async executeAction() {
      if (this.confirm.loading) return
      this.confirm.loading = true
      this.confirm.error = ''
      const action = this.confirm.action
      try {
        const result = await runCampaignAction(this.selectedId, action)
        this.confirm.visible = false
        if (action === 'delete') { this.selectedId = ''; this.detail = null }
        else if (action === 'copy') { this.selectedId = result.id; this.detail = result; this.filters.status = 'all'; this.filters.page = 1 }
        else this.detail = result
        await this.loadCampaigns()
        if (this.selectedId) await this.loadDetail(this.selectedId)
        this.$emit('toast', action === 'copy' ? '已复制为新草稿' : `${CAMPAIGN_ACTIONS[action].label}成功`)
      } catch (error) { this.confirm.error = error.message || '操作失败，请重试' } finally { this.confirm.loading = false }
    },
    actionLabel(action) { return CAMPAIGN_ACTIONS[action]?.label || action },
    formatMoney(value) { return formatCurrency(Number(value) || 0).replace('¥ ', '¥') },
    formatCompact(value) { const number = Number(value) || 0; return number >= 10000 ? `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万` : String(number) },
    formatTrendValue(value) { return this.trendMetric === 'spent' ? this.formatMoney(value) : this.formatCompact(value) },
    trendHeight(value) { return `${Math.max(5, Math.round(((Number(value) || 0) / this.trendMax) * 100))}%` },
    dateRange(campaign) { return `${campaign.schedule.startAt || '待定'} 至 ${campaign.schedule.endAt || '待定'}` },
    maskedPhone(phone) { return /^1\d{10}$/.test(phone || '') ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : (phone || '--') },
    previewLanding() { if (this.detail?.landingPage.url) uni.navigateTo({ url: `${this.detail.landingPage.url}${this.detail.landingPage.url.includes('?') ? '&' : '?'}previewCampaignId=${encodeURIComponent(this.detail.id)}` }) }
  }
}
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 22rpx; }.data-note { display: flex; justify-content: space-between; gap: 18rpx; padding: 16rpx 20rpx; border-left: 5rpx solid var(--accent); background: var(--surface-strong); color: var(--muted); font-size: 20rpx; line-height: 1.4; }.data-note text:first-child { color: var(--text); font-weight: 700; white-space: nowrap; }.data-note.demo { border-left-color: #e3a546; }.overview-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(240rpx, .8fr); gap: 20rpx; }.overview-main, .billing-box, .filter-panel, .detail-panel { padding: 26rpx; border: 1rpx solid var(--line); border-radius: 9px; background: var(--surface); }.block-title { color: var(--text); font-size: 29rpx; font-weight: 700; }.block-note { display: block; margin-top: 6rpx; color: var(--muted); font-size: 20rpx; }.metric-grid, .overview-skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 22rpx; }.metric-cell { min-width: 0; padding: 0 18rpx; border-right: 1rpx solid var(--line); }.metric-cell:first-child { padding-left: 0; }.metric-cell:last-child { border-right: 0; }.metric-cell text { display: block; }.metric-cell text:first-child { overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 29rpx; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }.metric-cell text:last-child { margin-top: 8rpx; color: var(--muted); font-size: 20rpx; }.overview-skeleton { gap: 14rpx; }.overview-skeleton view, .row-skeleton, .detail-skeleton view, .chart-skeleton { background: var(--surface-strong); animation: pulse 1.2s ease-in-out infinite; }.overview-skeleton view { height: 68rpx; }.billing-box { display: flex; flex-direction: column; justify-content: center; }.billing-label { color: var(--muted); font-size: 21rpx; }.billing-value { margin-top: 12rpx; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 34rpx; font-weight: 750; }.billing-error { margin-top: 12rpx; color: #e6a16f; font-size: 22rpx; }.billing-meta { margin-top: 8rpx; color: var(--muted); font-size: 18rpx; }.filter-panel { padding-bottom: 22rpx; }.status-tabs { display: flex; min-width: max-content; gap: 10rpx; }.status-tab { padding: 12rpx 22rpx; border: 1rpx solid transparent; border-radius: 6px; color: var(--muted); font-size: 22rpx; white-space: nowrap; }.status-tab.active { border-color: var(--accent); background: var(--surface-strong); color: var(--accent); }.filter-row { display: flex; align-items: center; gap: 12rpx; margin-top: 18rpx; }.search-box { min-width: 260rpx; height: 70rpx; display: flex; flex: 1; align-items: center; gap: 12rpx; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--muted); }.search-box input { min-width: 0; flex: 1; color: var(--text); font-size: 22rpx; }.date-filter, .filter-button, .reset-button { height: 70rpx; display: flex; align-items: center; justify-content: center; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--muted); font-size: 21rpx; white-space: nowrap; }.filter-button { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); font-weight: 700; }.reset-button { color: var(--text); }.date-separator { color: var(--muted); font-size: 20rpx; }.list-heading { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 2rpx; }.create-button { padding: 15rpx 24rpx; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-size: 22rpx; font-weight: 700; }.campaign-list { display: flex; flex-direction: column; border: 1rpx solid var(--line); border-radius: 9px; background: var(--surface); }.campaign-row { display: grid; min-height: 116rpx; align-items: center; grid-template-columns: minmax(230rpx, 2.2fr) 112rpx repeat(4, minmax(80rpx, .65fr)) 30rpx; gap: 14rpx; padding: 20rpx 24rpx; border-bottom: 1rpx solid var(--line); transition: background .14s ease, transform .14s ease; }.campaign-row:last-child { border-bottom: 0; }.campaign-row:active, .campaign-row.selected { background: var(--surface-strong); }.campaign-row:active { transform: scale(.995); }.campaign-primary { min-width: 0; }.campaign-title-line { display: flex; min-width: 0; align-items: center; gap: 12rpx; }.promotion-badge { flex: none; padding: 4rpx 10rpx; border: 1rpx solid var(--accent); border-radius: 4px; color: var(--accent); font-size: 17rpx; font-weight: 750; }.campaign-name { overflow: hidden; font-size: 25rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.campaign-meta { display: block; overflow: hidden; margin-top: 9rpx; color: var(--muted); font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; }.status-badge { display: inline-flex; align-items: center; justify-content: center; padding: 8rpx 12rpx; border: 1rpx solid var(--line); border-radius: 5px; font-size: 19rpx; white-space: nowrap; }.tone-success { border-color: rgba(25,207,160,.45); color: var(--accent); }.tone-warning, .tone-pending { border-color: rgba(227,165,70,.5); color: #e3b25d; }.tone-danger { border-color: rgba(222,111,100,.48); color: #eb9b91; }.tone-neutral { color: var(--muted); }.row-metric { min-width: 0; }.row-metric text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.row-metric text:first-child { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22rpx; }.row-metric text:last-child { margin-top: 5rpx; color: var(--muted); font-size: 17rpx; }.row-arrow { color: var(--muted); font-size: 34rpx; }.row-skeleton { min-height: 112rpx; }.state-panel { display: flex; flex-direction: column; align-items: center; gap: 14rpx; padding: 64rpx 24rpx; border: 1rpx solid var(--line); border-radius: 9px; background: var(--surface); color: var(--muted); font-size: 22rpx; text-align: center; }.state-title { color: var(--text); font-size: 28rpx; font-weight: 700; }.secondary-button { min-height: 66rpx; display: inline-flex; align-items: center; justify-content: center; margin-top: 10rpx; padding: 0 28rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 22rpx; }.pagination { display: flex; align-items: center; justify-content: center; gap: 34rpx; color: var(--accent); font-size: 22rpx; }.pagination .disabled { color: var(--muted); opacity: .5; }.page-number { color: var(--text); }.detail-panel { margin-top: 8rpx; }.detail-skeleton { display: grid; gap: 16rpx; }.detail-skeleton view { height: 120rpx; }.detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 22rpx; }.detail-title { font-size: 33rpx; font-weight: 750; }.detail-id { display: block; margin-top: 10rpx; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 19rpx; }.review-box { margin-top: 24rpx; padding: 20rpx 22rpx; border-left: 5rpx solid var(--accent); background: var(--surface-strong); }.review-box.rejected { border-left-color: #de6f64; }.review-box > view { display: flex; justify-content: space-between; gap: 20rpx; }.review-label { color: var(--text); font-size: 22rpx; font-weight: 700; }.review-time { color: var(--muted); font-size: 18rpx; }.review-comment { display: block; margin-top: 12rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.detail-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(230rpx, .7fr); gap: 20rpx; margin-top: 24rpx; }.trend-section, .creative-section, .info-group { padding: 22rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface-strong); }.detail-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }.trend-tabs { display: flex; gap: 8rpx; }.trend-tabs text { padding: 8rpx 12rpx; color: var(--muted); font-size: 18rpx; }.trend-tabs text.active { color: var(--accent); }.chart { height: 300rpx; display: flex; align-items: stretch; gap: 12rpx; margin-top: 22rpx; }.chart-column { min-width: 0; display: flex; flex: 1; flex-direction: column; align-items: center; }.chart-value { width: 100%; overflow: hidden; color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15rpx; text-align: center; text-overflow: ellipsis; white-space: nowrap; }.bar-wrap { width: 100%; min-height: 0; display: flex; flex: 1; align-items: flex-end; justify-content: center; margin: 10rpx 0; border-bottom: 1rpx solid var(--line); }.chart-bar { width: 52%; min-height: 8rpx; border-radius: 3px 3px 0 0; background: var(--accent); }.chart-date { color: var(--muted); font-size: 16rpx; }.chart-skeleton { height: 240rpx; margin-top: 20rpx; }.chart-empty { display: block; padding: 80rpx 20rpx; color: var(--muted); text-align: center; }.attribution { display: block; margin-top: 14rpx; color: var(--muted); font-size: 18rpx; line-height: 1.45; }.inline-error { display: flex; justify-content: space-between; padding: 60rpx 10rpx; color: #e6a16f; font-size: 21rpx; }.inline-error text:last-child { color: var(--accent); }.creative-image, .creative-missing { width: 100%; height: 224rpx; margin-top: 18rpx; border-radius: 6px; }.creative-missing { display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--muted); font-size: 21rpx; }.creative-caption { display: flex; align-items: center; gap: 10rpx; margin-top: 15rpx; color: var(--text); font-size: 22rpx; font-weight: 700; }.creative-copy { display: block; margin-top: 9rpx; color: var(--muted); font-size: 20rpx; line-height: 1.45; }.info-columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18rpx; margin-top: 20rpx; }.info-title { display: block; margin-bottom: 14rpx; color: var(--text); font-size: 23rpx; font-weight: 700; }.info-line { display: grid; grid-template-columns: 110rpx minmax(0, 1fr); gap: 10rpx; padding: 10rpx 0; color: var(--muted); font-size: 19rpx; line-height: 1.45; }.info-line text:last-child { color: var(--text); text-align: right; word-break: break-all; }.info-line .link-text { color: var(--accent); }.detail-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12rpx; margin-top: 24rpx; }.action-button { min-height: 66rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 24rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 21rpx; }.action-button.primary { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }.action-button.danger { border-color: rgba(222,111,100,.55); color: #eb9b91; }.confirm-mask { position: fixed; z-index: 100; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(2,13,21,.72); }.confirm-dialog { width: 100%; max-width: 590rpx; padding: 30rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); box-shadow: 0 20rpx 60rpx rgba(0,0,0,.3); }.confirm-title { display: block; font-size: 30rpx; font-weight: 750; }.confirm-message { display: block; margin-top: 14rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.confirm-error { margin-top: 18rpx; padding: 16rpx; border-left: 4rpx solid #de6f64; background: var(--surface-strong); color: #eb9b91; font-size: 21rpx; }.confirm-error text { display: block; }.confirm-error text:last-child { margin-top: 5rpx; color: var(--muted); }.confirm-actions { display: flex; justify-content: flex-end; gap: 36rpx; margin-top: 28rpx; color: var(--muted); font-size: 23rpx; }.confirm-submit { color: var(--accent); font-weight: 700; }.confirm-submit.danger { color: #eb9b91; }.disabled { pointer-events: none; opacity: .45; }
@keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
@media (max-width: 760px) { .overview-row, .detail-grid, .info-columns { grid-template-columns: 1fr; }.filter-row { flex-wrap: wrap; }.search-box { flex-basis: 100%; }.date-filter { min-width: 180rpx; }.campaign-row { grid-template-columns: minmax(0, 1fr) 100rpx 26rpx; }.campaign-row .row-metric { display: none; }.metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 22rpx; }.metric-cell:nth-child(2) { border-right: 0; }.data-note { flex-direction: column; gap: 5rpx; }.detail-section-head { align-items: flex-start; flex-direction: column; }.trend-tabs { width: 100%; justify-content: space-between; } }
@media (prefers-reduced-motion: reduce) { .overview-skeleton view, .row-skeleton, .detail-skeleton view, .chart-skeleton { animation: none; }.campaign-row { transition: none; } }
</style>
