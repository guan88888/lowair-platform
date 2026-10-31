<template>
  <app-page-shell title="广告投放" active="home" :theme="theme" :locale="locale" @annotate="showToast">
    <view class="ad-screen">
      <view class="ad-hero">
        <view class="hero-copy">
          <text class="hero-label">企业与培训机构推广</text>
          <text class="hero-title">让无人机业务触达合适人群</text>
          <text class="hero-note">推广内容与自然排序分开展示，所有计划提交后先进入平台审核。</text>
        </view>
        <view class="hero-mark"><text>AD</text><text>合规投放</text></view>
      </view>

      <view class="source-banner">
        <text>计划、消耗和账单均由广告服务端返回</text>
        <text v-if="lastUpdated">更新 {{ lastUpdated }}</text>
      </view>

      <view v-if="!authorized" class="guard-panel">
        <text class="section-title">完成主体认证后管理投放</text>
        <text class="section-note">仅认证企业和认证培训机构可以创建、提交与管理广告计划。你仍可查看广告位和合规规则。</text>
        <view class="primary-button" @tap="goVerify">去认证</view>
      </view>

      <view v-if="authorized" class="overview-panel">
        <view class="section-heading"><text class="section-title">投放概览</text><text class="link-button" @tap="goDashboard">查看全部</text></view>
        <view v-if="loadingCampaigns" class="metric-skeleton"><view v-for="index in 4" :key="index"></view></view>
        <view v-else-if="campaignError" class="inline-error"><text>{{ campaignError }}</text><text @tap="loadCampaignSummary">重试</text></view>
        <view v-else class="metric-grid">
          <view class="metric-item"><text>{{ summary.total }}</text><text>计划数</text></view>
          <view class="metric-item"><text>{{ formatMoney(summary.spent) }}</text><text>累计消耗</text></view>
          <view class="metric-item"><text>{{ formatCompact(summary.impressions) }}</text><text>曝光</text></view>
          <view class="metric-item"><text>{{ summary.leads }}</text><text>线索</text></view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-heading"><view><text class="section-title">广告资源</text><text class="section-note">选择与推广目标相符的位置</text></view></view>
        <view v-if="loadingPlacements" class="placement-list">
          <view v-for="index in 3" :key="index" class="placement-card skeleton-card"></view>
        </view>
        <view v-else-if="placementError" class="state-panel"><text>{{ placementError }}</text><view class="secondary-button" @tap="loadPlacements">重试</view></view>
        <view v-else class="placement-list">
          <view v-for="placement in placements" :key="placement.id" class="placement-card">
            <image class="placement-image" :src="placement.image" mode="aspectFill"></image>
            <view class="placement-body">
              <view class="placement-head"><text class="promotion-badge">{{ placement.promotionLabel || '推广' }}</text><text class="placement-group">{{ placement.group }}</text></view>
              <text class="placement-name">{{ placement.name }}</text>
              <text class="placement-objective">{{ placement.objective }}</text>
              <view class="placement-meta"><text>{{ placement.billingMode || '方案确认中' }}</text><text>{{ placement.spec }}</text></view>
              <view class="placement-actions"><text @tap="previewPlacement(placement)">位置预览</text><text class="placement-create" @tap="startCreate(placement.id)">{{ authorized ? '创建计划' : '认证后创建' }}</text></view>
            </view>
          </view>
        </view>
      </view>

      <view class="section-block rule-block">
        <text class="section-title">投放与审核规则</text>
        <view class="rule-row"><text class="rule-index">审核</text><text>素材、落地页、主体资质与推广描述由平台审核，前端不自行把计划改为投放中。</text></view>
        <view class="rule-row"><text class="rule-index">标识</text><text>所有商业内容必须显示“广告”或“推广”，不得混入自然排序结果。</text></view>
        <view class="rule-row"><text class="rule-index">素材</text><text>仅提交无人机行业相关图片或视频，不得使用无法核验的“官方”“指定”“唯一”等表述。</text></view>
        <view class="rule-row"><text class="rule-index">计费</text><text>预算、账单、结算与退款以广告服务端记录为准；方案未确认前不展示虚构价格。</text></view>
      </view>

      <view class="bottom-actions">
        <view class="secondary-button" @tap="goDashboard">投放看板</view>
        <view class="primary-button" @tap="startCreate('')">{{ authorized ? '创建广告计划' : '完成主体认证' }}</view>
      </view>
    </view>
    <view v-if="toast" class="toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getAuthState } from '../../../utils/auth'
import { getRouteOptions } from '../../shared/utils/route-options'
import { formatCurrency } from '../../shared/utils/formatters'
import { listAdPlacements, listCampaigns } from '../services'

export default {
  name: 'AdPage',
  components: { AppPageShell },
  data() {
    return {
      auth: getAuthState(), theme: 'ocean', locale: 'zh', placements: [], loadingPlacements: true, placementError: '', loadingCampaigns: false, campaignError: '',
      summary: { total: 0, spent: 0, impressions: 0, leads: 0 }, lastUpdated: '', toast: '', toastTimer: null
    }
  },
  computed: {
    authorized() { return Boolean(this.auth.enterprise || this.auth.institution) }
  },
  created() {
    this.restorePreferences()
    this.loadPlacements()
    if (this.authorized) this.loadCampaignSummary()
  },
  beforeUnmount() { if (this.toastTimer) clearTimeout(this.toastTimer) },
  methods: {
    restorePreferences() {
      const theme = uni.getStorageSync('lowair-demo-theme')
      if (theme) this.theme = theme
      const locale = uni.getStorageSync('lowair-demo-locale')
      if (locale) this.locale = locale
    },
    async loadPlacements() {
      this.loadingPlacements = true
      this.placementError = ''
      try { this.placements = await listAdPlacements() } catch (error) { this.placementError = error.message || '广告位加载失败' } finally { this.loadingPlacements = false }
    },
    async loadCampaignSummary() {
      this.loadingCampaigns = true
      this.campaignError = ''
      try {
        const result = await listCampaigns({ page: 1, pageSize: 50 })
        this.summary = result.items.reduce((total, item) => ({
          total: total.total + 1,
          spent: total.spent + item.metrics.spent,
          impressions: total.impressions + item.metrics.impressions,
          leads: total.leads + item.metrics.leads
        }), { total: 0, spent: 0, impressions: 0, leads: 0 })
        this.lastUpdated = new Date().toLocaleString('zh-CN', { hour12: false })
      } catch (error) { this.campaignError = error.message || '投放概览加载失败' } finally { this.loadingCampaigns = false }
    },
    formatMoney(value) { return formatCurrency(value).replace('¥ ', '¥') },
    formatCompact(value) {
      if (value >= 10000) return (value / 10000).toFixed(value >= 100000 ? 0 : 1) + '万'
      return String(value || 0)
    },
    goVerify() {
      const returnUrl = encodeURIComponent('/pages/ad/index')
      const mode = this.auth.identity === 'institution' ? 'institution' : 'enterprise'
      uni.navigateTo({ url: `/pages/profile/account?mode=${mode}&returnUrl=${returnUrl}` })
    },
    startCreate(placementId) {
      if (!this.authorized) return this.goVerify()
      const query = placementId ? `&placementId=${encodeURIComponent(placementId)}` : ''
      uni.navigateTo({ url: `/pages/ad/campaign?mode=create${query}` })
    },
    goDashboard() {
      if (!this.authorized) return this.goVerify()
      uni.navigateTo({ url: '/pages/ad/campaign?mode=dashboard' })
    },
    previewPlacement(placement) {
      if (!placement.previewUrl) return this.showToast('该位置预览尚未接入')
      uni.navigateTo({ url: placement.previewUrl })
    },
    showToast(message) {
      this.toast = typeof message === 'string' ? message : '广告投放操作'
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast = '' }, 1800)
    }
  }
}
</script>

<style scoped>
.ad-screen { min-height: 100%; padding: 24rpx 28rpx 40rpx; background: var(--app-bg); color: var(--text); }.ad-hero { display: flex; min-height: 238rpx; align-items: center; justify-content: space-between; gap: 24rpx; padding: 32rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); }.hero-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }.hero-label { color: var(--accent); font-size: 21rpx; font-weight: 650; }.hero-title { margin-top: 12rpx; font-size: 38rpx; font-weight: 750; line-height: 1.25; }.hero-note { max-width: 480rpx; margin-top: 14rpx; color: var(--muted); font-size: 23rpx; line-height: 1.55; }.hero-mark { width: 142rpx; height: 142rpx; display: flex; flex: none; flex-direction: column; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 50%; color: var(--accent); }.hero-mark text:first-child { font-size: 34rpx; font-weight: 800; }.hero-mark text:last-child { margin-top: 4rpx; font-size: 18rpx; }.source-banner { display: flex; justify-content: space-between; gap: 20rpx; margin: 18rpx 0 24rpx; padding: 16rpx 20rpx; border-left: 5rpx solid var(--accent); background: var(--surface-strong); color: var(--muted); font-size: 20rpx; line-height: 1.45; }.source-banner.demo { border-left-color: #e3a546; }.guard-panel, .overview-panel, .section-block { margin-top: 24rpx; padding: 28rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); }.guard-panel { display: flex; flex-direction: column; align-items: flex-start; }.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }.section-title { display: block; color: var(--text); font-size: 30rpx; font-weight: 700; }.section-note { display: block; margin-top: 8rpx; color: var(--muted); font-size: 22rpx; line-height: 1.5; }.guard-panel .primary-button { margin-top: 22rpx; }.link-button { color: var(--accent); font-size: 23rpx; }.metric-grid, .metric-skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 24rpx; }.metric-item { min-width: 0; padding: 4rpx 18rpx; border-right: 1rpx solid var(--line); }.metric-item:first-child { padding-left: 0; }.metric-item:last-child { border-right: 0; }.metric-item text { display: block; }.metric-item text:first-child { overflow: hidden; color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 29rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.metric-item text:last-child { margin-top: 8rpx; color: var(--muted); font-size: 20rpx; }.metric-skeleton { gap: 14rpx; }.metric-skeleton view, .skeleton-card { min-height: 80rpx; background: var(--surface-strong); animation: pulse 1.2s ease-in-out infinite; }.inline-error { display: flex; justify-content: space-between; margin-top: 20rpx; color: #e6a16f; font-size: 23rpx; }.inline-error text:last-child { color: var(--accent); }.placement-list { display: flex; flex-direction: column; gap: 20rpx; margin-top: 24rpx; }.placement-card { display: grid; min-height: 248rpx; overflow: hidden; grid-template-columns: 230rpx minmax(0, 1fr); border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface-strong); }.placement-image { width: 230rpx; height: 100%; min-height: 248rpx; }.placement-body { display: flex; min-width: 0; flex-direction: column; padding: 22rpx; }.placement-head, .placement-actions, .placement-meta { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }.promotion-badge { padding: 5rpx 12rpx; border: 1rpx solid var(--accent); border-radius: 4px; color: var(--accent); font-size: 18rpx; font-weight: 700; }.placement-group { color: var(--muted); font-size: 19rpx; }.placement-name { margin-top: 13rpx; font-size: 28rpx; font-weight: 700; }.placement-objective { margin-top: 8rpx; color: var(--muted); font-size: 22rpx; }.placement-meta { align-items: flex-start; margin-top: 16rpx; color: var(--muted); font-size: 19rpx; line-height: 1.4; }.placement-meta text:first-child { color: #e3b25d; white-space: nowrap; }.placement-actions { margin-top: auto; padding-top: 18rpx; border-top: 1rpx solid var(--line); color: var(--muted); font-size: 22rpx; }.placement-create { color: var(--accent); font-weight: 650; }.rule-block { display: flex; flex-direction: column; }.rule-row { display: grid; grid-template-columns: 78rpx minmax(0, 1fr); gap: 18rpx; padding: 22rpx 0; border-bottom: 1rpx solid var(--line); color: var(--muted); font-size: 23rpx; line-height: 1.55; }.rule-row:last-child { border-bottom: 0; padding-bottom: 0; }.rule-index { color: var(--text); font-weight: 700; }.bottom-actions { display: flex; gap: 18rpx; margin: 28rpx 0 10rpx; }.primary-button, .secondary-button { min-height: 76rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 28rpx; border-radius: 7px; font-size: 25rpx; font-weight: 700; white-space: nowrap; transition: transform .14s ease; }.primary-button { background: var(--accent); color: var(--accent-ink); }.secondary-button { border: 1rpx solid var(--line); background: var(--surface); color: var(--text); }.bottom-actions .primary-button, .bottom-actions .secondary-button { flex: 1; }.primary-button:active, .secondary-button:active { transform: scale(.98); }.state-panel { display: flex; flex-direction: column; align-items: center; gap: 20rpx; padding: 50rpx 20rpx; color: var(--muted); }.toast { position: fixed; z-index: 80; left: 50%; bottom: calc(142rpx + env(safe-area-inset-bottom)); max-width: 620rpx; transform: translateX(-50%); padding: 18rpx 28rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; box-shadow: 0 12rpx 34rpx rgba(0,0,0,.24); }
@keyframes pulse { 0%,100% { opacity: .52; } 50% { opacity: 1; } }
@media (max-width: 520px) { .hero-mark { width: 112rpx; height: 112rpx; }.metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 24rpx; }.metric-item:nth-child(2) { border-right: 0; }.placement-card { grid-template-columns: 180rpx minmax(0, 1fr); }.placement-image { width: 180rpx; }.placement-meta { flex-direction: column; gap: 6rpx; } }
@media (prefers-reduced-motion: reduce) { .metric-skeleton view, .skeleton-card { animation: none; }.primary-button, .secondary-button { transition: none; } }
</style>
