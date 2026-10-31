<template>
  <app-page-shell :title="publicMode ? displayName : '我的'" :active="publicMode ? '' : 'profile'" :root="!publicMode" :theme="theme" :locale="locale" @annotate="showToast">
    <view class="profile-page">
      <view v-if="loading" class="profile-skeleton" aria-label="正在加载个人资料">
        <view class="skeleton skeleton-head"></view>
        <view class="skeleton-grid"><view v-for="index in 4" :key="index" class="skeleton skeleton-cell"></view></view>
        <view class="skeleton skeleton-row"></view>
        <view class="skeleton skeleton-row"></view>
      </view>

      <error-state v-else-if="error" :message="error" @retry="loadProfile" />

      <template v-else-if="profile">
        <view class="source-banner" :class="'source-' + profile.dataMode">
          <view><text class="source-title">{{ sourceTitle }}</text><text class="source-note">{{ profile.source }} · 更新于 {{ formatDate(profile.updatedAt) }}</text></view>
          <text class="refresh-action" @tap="refresh">刷新</text>
        </view>

        <view class="identity-panel">
          <view class="avatar"><image v-if="profile.user.avatar" :src="profile.user.avatar" mode="aspectFill"></image><text v-else>{{ avatarText }}</text></view>
          <view class="identity-copy">
            <text class="identity-name">{{ displayName }}</text>
            <text class="identity-meta">{{ publicMode ? profile.user.bio : maskedPhone }}</text>
            <view class="role-row">
              <text v-for="role in profile.roles" :key="role.key" class="role-tag" :class="{ active: role.active }">{{ role.label }} · {{ statusText(role.status) }}</text>
            </view>
          </view>
          <text v-if="!publicMode" class="edit-link" @tap="go('/pages/profile/account?mode=identity')">资料</text>
        </view>

        <view v-if="!auth.loggedIn && !publicMode" class="login-panel">
          <text>当前为游客预览，登录后由服务端同步个人记录。</text>
          <view class="login-actions"><view class="primary-button" @tap="go('/pages/auth/index?mode=login')">登录</view><view class="secondary-button" @tap="go('/pages/auth/index?mode=register')">注册</view></view>
        </view>

        <view class="section-block">
          <view class="section-heading"><text>认证摘要</text><text class="heading-action" @tap="go('/pages/profile/account')">管理</text></view>
          <view class="verification-list">
            <view v-for="item in profile.verifications" :key="item.key" class="verification-row">
              <view><text class="row-title">{{ item.label }}</text><text class="row-source">来源：{{ item.source }}{{ item.updatedAt ? ' · ' + formatDate(item.updatedAt) : '' }}</text></view>
              <text class="status-tag" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
            </view>
          </view>
        </view>

        <view class="section-block">
          <view class="section-heading"><text>{{ publicMode ? '公开业务摘要' : '业务记录' }}</text><text class="heading-note">数字来自资料接口</text></view>
          <view class="aggregate-grid">
            <view v-for="(item, key) in profile.aggregates" :key="key" class="aggregate-item" @tap="go(aggregateRoutes[key])">
              <text class="aggregate-value">{{ item.value }}<text>{{ item.unit }}</text></text>
              <text class="aggregate-label">{{ item.label }}</text>
              <text class="aggregate-source">{{ item.source }} · {{ statusText(item.status) }}</text>
            </view>
          </view>
        </view>

        <view class="credit-panel" @tap="creditExpanded = !creditExpanded">
          <view class="section-heading"><text>{{ profile.credit.label }}</text><text class="status-tag" :class="'status-' + profile.credit.status">{{ statusText(profile.credit.status) }}</text></view>
          <text class="credit-summary">{{ profile.credit.summary }}</text>
          <text class="row-source">来源：{{ profile.credit.source }}</text>
          <view v-if="creditExpanded" class="credit-factors"><text v-for="factor in profile.credit.factors" :key="factor">{{ factor }}</text></view>
          <text class="expand-link">{{ creditExpanded ? '收起依据' : '查看构成依据' }}</text>
        </view>

        <template v-if="!publicMode">
          <view class="section-block">
            <view class="section-heading"><text>常用入口</text><text class="heading-note">学习、工作、交易与收藏</text></view>
            <view class="entry-grid">
              <view v-for="entry in mainEntries" :key="entry.label" class="entry-item" @tap="go(entry.to)">
                <text class="entry-mark">{{ entry.mark }}</text><text>{{ entry.label }}</text><text class="entry-note">{{ entry.note }}</text>
              </view>
            </view>
          </view>

          <view class="section-block compact-block">
            <view v-for="entry in secondaryEntries" :key="entry.label" class="nav-row" @tap="go(entry.to)">
              <view><text class="row-title">{{ entry.label }}</text><text class="row-source">{{ entry.note }}</text></view><text class="nav-arrow">›</text>
            </view>
          </view>
        </template>
      </template>

      <empty-state v-else title="暂无个人资料" note="服务端尚未返回可展示的资料，请刷新重试。" />
      <view v-if="toast" class="toast" aria-live="polite">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import EmptyState from '../../shared/components/EmptyState.vue'
import ErrorState from '../../shared/components/ErrorState.vue'
import { formatDateTime } from '../../shared/utils/formatters'
import { getRouteOptions } from '../../shared/utils/route-options'
import { getAuthState } from '../../../utils/auth'
import { getProfileOverview } from '../services'

export default {
  name: 'ProfilePage',
  components: { AppPageShell, EmptyState, ErrorState },
  data() {
    return {
      auth: getAuthState(),
      profile: null,
      loading: true,
      error: '',
      toast: '',
      toastTimer: null,
      creditExpanded: false,
      theme: uni.getStorageSync('lowair-demo-theme') || 'ocean',
      locale: uni.getStorageSync('lowair-demo-locale') || 'zh',
      routeOptions: {},
      aggregateRoutes: {
        learning: '/pages/academy/progress?tab=record',
        work: '/pages/work/index',
        trade: '/pages/market/order?mode=list',
        favorites: '/pages/profile/index?section=favorites'
      },
      mainEntries: [
        { label: '我的学习', mark: '学', note: '课程与考试记录', to: '/pages/academy/progress?tab=record' },
        { label: '求职与任务', mark: '工', note: '简历、投递与接单', to: '/pages/work/resume' },
        { label: '我的交易', mark: '易', note: '购买、租赁与售后', to: '/pages/market/order?mode=list' },
        { label: '我的收藏', mark: '藏', note: '课程、岗位、商品和内容', to: '/pages/profile/index?section=favorites' }
      ],
      secondaryEntries: [
        { label: '我的钱包', note: '余额、冻结、托管与账单', to: '/pages/profile/wallet?tab=overview' },
        { label: '消息中心', note: '业务通知和平台内会话', to: '/pages/messages/index' },
        { label: '招聘中心', note: '企业认证权限由服务端校验', to: '/pages/work/talent' },
        { label: '机构工作台', note: '培训机构权限由服务端校验', to: '/pages/academy/org-console' },
        { label: '广告服务', note: '创建计划前校验主体权限', to: '/pages/ad/index' },
        { label: '隐私与设置', note: '资料可见范围和账号设置', to: '/pages/profile/account?mode=identity' },
        { label: '客服与安全', note: '仅通过平台内消息联系', to: '/pages/messages/index?category=system' }
      ]
    }
  },
  computed: {
    publicMode() { return String(this.routeOptions.public || '0') === '1' },
    displayName() { return this.profile?.user?.nickname || '用户资料' },
    avatarText() { return this.displayName.slice(0, 1) },
    maskedPhone() { return this.profile?.user?.phone || '手机号由服务端脱敏返回' },
    sourceTitle() { return this.profile?.dataMode === 'live' ? '服务端数据' : '演示环境，不代表真实账户状态' }
  },
  mounted() {
    this.routeOptions = getRouteOptions()
    this.loadProfile()
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },
  methods: {
    async loadProfile() {
      this.loading = true
      this.error = ''
      try {
        if (!this.auth.loggedIn && !this.routeOptions.userId && !this.publicMode) {
          // The server cannot expose a private profile without an account. Keep
          // the original guest preview so login/register and settings remain
          // usable instead of replacing the whole page with an auth error.
          this.profile = guestProfile()
        } else {
          const payload = await getProfileOverview({ userId: this.routeOptions.userId, public: this.publicMode ? 1 : 0 })
          this.profile = normalizeProfile(payload)
        }
      } catch (error) {
        this.error = error.message || '个人资料加载失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    async refresh() {
      await this.loadProfile()
      if (!this.error) this.showToast('个人资料已刷新')
    },
    go(url) { if (url) uni.navigateTo({ url }) },
    formatDate(value) { return formatDateTime(value) },
    statusText(status) {
      return { approved: '已确认', confirmed: '已确认', pending: '处理中', processing: '处理中', unverified: '待接入', unavailable: '待接入', demo: '演示' }[status] || '待接入'
    },
    showToast(text) {
      this.toast = text
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast = '' }, 1800)
    }
  }
}

function normalizeProfile(payload = {}) {
  const verification = payload.verification || {}
  const verificationLabels = { personal: '实名认证', caac: 'CAAC 资质', enterprise: '企业认证', institution: '机构认证' }
  const verifications = Object.keys(verificationLabels).map((key) => ({ key, label: verificationLabels[key], status: verification[key] || 'not_submitted', source: '服务端认证接口', updatedAt: payload.updatedAt }))
  const roles = (Array.isArray(payload.roles) ? payload.roles : ['personal']).map((role) => ({ key: role, label: { personal: '个人', pilot: '飞手', enterprise: '企业', institution: '机构', admin: '管理员' }[role] || role, status: verification[role] || 'not_submitted', active: role === 'personal' }))
  return {
    dataMode: 'live', source: 'profile-service', updatedAt: payload.updatedAt || new Date().toISOString(),
    user: { nickname: payload.nickname || '平台用户', bio: payload.bio || '服务端资料', phone: payload.phone || '', avatar: '' },
    roles, verifications,
    aggregates: {
      learning: { value: 0, unit: '项', label: '我的学习', source: 'academy-service', status: 'pending' },
      work: { value: 0, unit: '项', label: '求职与任务', source: 'work-service', status: 'pending' },
      trade: { value: 0, unit: '项', label: '我的交易', source: 'market-service', status: 'pending' },
      favorites: { value: payload.stats?.favorites || 0, unit: '项', label: '我的收藏', source: 'profile-service', status: 'confirmed' }
    },
    credit: { label: '行业信用', status: 'unavailable', summary: '信用服务待接入', source: payload.credit?.source || 'profile-service', factors: [] }
  }
}

function guestProfile() {
  return {
    dataMode: 'demo', source: '本地游客预览', updatedAt: new Date().toISOString(),
    user: { nickname: '登录后管理档案', bio: '手机号登录后同步你的业务记录', phone: '', avatar: '' },
    roles: [{ key: 'guest', label: '游客', status: 'unverified', active: true }],
    verifications: [
      { key: 'personal', label: '实名认证', status: 'unverified', source: '登录后查询' },
      { key: 'caac', label: 'CAAC 资质', status: 'unverified', source: '登录后查询' }
    ],
    aggregates: {
      learning: { value: 0, unit: '项', label: '我的学习', source: '登录后查询', status: 'unavailable' },
      work: { value: 0, unit: '项', label: '求职与任务', source: '登录后查询', status: 'unavailable' },
      trade: { value: 0, unit: '项', label: '我的交易', source: '登录后查询', status: 'unavailable' },
      favorites: { value: 0, unit: '项', label: '我的收藏', source: '登录后查询', status: 'unavailable' }
    },
    credit: { label: '行业信用', status: 'unavailable', summary: '登录后查看个人信用信息', source: '登录后查询', factors: [] }
  }
}
</script>

<style scoped>
.profile-page { min-height: 100%; padding: 24rpx 24rpx 48rpx; color: var(--text); }.source-banner { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 20rpx; padding: 18rpx 20rpx; border: 1rpx solid rgba(242,180,86,.45); border-radius: 8px; background: var(--surface-strong); }.source-banner.source-live { border-color: var(--line); }.source-title, .source-note { display: block; }.source-title { color: var(--text); font-size: 24rpx; font-weight: 650; }.source-note { margin-top: 4rpx; color: var(--muted); font-size: 20rpx; line-height: 1.45; }.refresh-action, .heading-action { flex: none; color: var(--accent); font-size: 23rpx; }.identity-panel { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 4rpx 30rpx; border-bottom: 1rpx solid var(--line); }.avatar { display: flex; width: 94rpx; height: 94rpx; flex: none; align-items: center; justify-content: center; overflow: hidden; border: 1rpx solid var(--accent); border-radius: 50%; background: var(--surface); color: var(--accent); font-size: 34rpx; font-weight: 750; }.avatar image { width: 100%; height: 100%; }.identity-copy { min-width: 0; flex: 1; }.identity-name, .identity-meta { display: block; }.identity-name { font-size: 34rpx; font-weight: 700; }.identity-meta { margin-top: 6rpx; overflow: hidden; color: var(--muted); font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }.role-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }.role-tag { padding: 6rpx 10rpx; border: 1rpx solid var(--line); border-radius: 4px; color: var(--muted); font-size: 19rpx; }.role-tag.active { border-color: var(--accent); color: var(--accent); }.edit-link { flex: none; color: var(--accent); font-size: 23rpx; }.login-panel { margin-top: 20rpx; padding: 22rpx; border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 23rpx; line-height: 1.5; }.login-actions { display: flex; gap: 14rpx; margin-top: 18rpx; }.primary-button, .secondary-button { display: flex; min-width: 150rpx; height: 66rpx; align-items: center; justify-content: center; border-radius: 6px; font-size: 24rpx; font-weight: 650; }.primary-button { background: var(--accent); color: var(--accent-ink); }.secondary-button { border: 1rpx solid var(--line); color: var(--text); }.section-block, .credit-panel { margin-top: 22rpx; padding: 24rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; color: var(--text); font-size: 27rpx; font-weight: 700; }.heading-note { color: var(--muted); font-size: 19rpx; font-weight: 400; }.verification-list { margin-top: 14rpx; }.verification-row, .nav-row { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 18rpx 0; border-bottom: 1rpx solid var(--line); }.verification-row:last-child, .nav-row:last-child { border-bottom: 0; }.row-title, .row-source { display: block; }.row-title { font-size: 24rpx; }.row-source { margin-top: 6rpx; color: var(--muted); font-size: 19rpx; line-height: 1.45; }.status-tag { flex: none; padding: 6rpx 10rpx; border: 1rpx solid var(--line); border-radius: 4px; color: var(--muted); font-size: 19rpx; }.status-approved, .status-confirmed { border-color: rgba(25,207,160,.45); color: var(--accent); }.status-pending, .status-processing { border-color: rgba(242,180,86,.45); color: #f2b456; }.status-demo { color: #8fb8ce; }.aggregate-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rpx; margin-top: 20rpx; overflow: hidden; border: 1rpx solid var(--line); border-radius: 6px; background: var(--line); }.aggregate-item { min-width: 0; padding: 22rpx 18rpx; background: var(--surface-strong); }.aggregate-value, .aggregate-label, .aggregate-source { display: block; }.aggregate-value { color: var(--text); font-size: 34rpx; font-weight: 750; }.aggregate-value text { margin-left: 4rpx; color: var(--muted); font-size: 19rpx; font-weight: 400; }.aggregate-label { margin-top: 4rpx; font-size: 22rpx; }.aggregate-source { margin-top: 8rpx; color: var(--muted); font-size: 18rpx; line-height: 1.4; }.credit-summary { display: block; margin-top: 18rpx; font-size: 25rpx; }.credit-factors { display: flex; flex-direction: column; gap: 10rpx; margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; }.expand-link { display: block; margin-top: 16rpx; color: var(--accent); font-size: 21rpx; }.entry-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 20rpx; }.entry-item { min-width: 0; padding: 20rpx; border-radius: 6px; background: var(--surface-strong); font-size: 23rpx; }.entry-mark { display: flex; width: 46rpx; height: 46rpx; align-items: center; justify-content: center; margin-bottom: 14rpx; border: 1rpx solid var(--accent); border-radius: 6px; color: var(--accent); font-size: 19rpx; font-weight: 700; }.entry-note { display: block; margin-top: 6rpx; color: var(--muted); font-size: 19rpx; line-height: 1.4; }.compact-block { padding-top: 4rpx; padding-bottom: 4rpx; }.nav-arrow { color: var(--muted); font-size: 38rpx; }.profile-skeleton { display: flex; flex-direction: column; gap: 18rpx; }.skeleton { border-radius: 6px; background: var(--surface-strong); opacity: .72; }.skeleton-head { height: 164rpx; }.skeleton-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }.skeleton-cell { height: 126rpx; }.skeleton-row { height: 90rpx; }.toast { position: fixed; z-index: 80; left: 50%; bottom: calc(140rpx + env(safe-area-inset-bottom)); max-width: 620rpx; transform: translateX(-50%); padding: 16rpx 24rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--header-bg); color: var(--text); font-size: 23rpx; text-align: center; }
@media (max-width: 380px) { .profile-page { padding-right: 18rpx; padding-left: 18rpx; }.identity-panel { align-items: flex-start; }.role-row { flex-direction: column; align-items: flex-start; } }
@media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
</style>
