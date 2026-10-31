<template>
  <app-page-shell :title="pageTitle" active="home" :theme="theme" :locale="locale" @annotate="showToast">
    <view class="campaign-screen">
      <view v-if="!authorized" class="guard-panel">
        <text class="guard-label">广告投放权限</text>
        <text class="guard-title">仅认证企业和培训机构可管理广告计划</text>
        <text class="guard-note">个人用户、游客和未认证主体无法查看计划数据、账单或执行状态操作。</text>
        <view class="guard-actions"><view class="secondary-button" @tap="goAdHome">查看广告说明</view><view class="primary-button" @tap="goVerify">完成主体认证</view></view>
      </view>
      <template v-else>
        <view class="mode-tabs"><text :class="{ active: mode === 'dashboard' }" @tap="switchMode('dashboard')">投放看板</text><text :class="{ active: mode === 'create' }" @tap="switchMode('create')">创建计划</text></view>
        <campaign-dashboard v-if="mode === 'dashboard'" :key="dashboardKey" :initial-id="campaignId" @create="switchMode('create')" @toast="showToast" />
        <campaign-create-form v-else ref="createForm" :placement-id="placementId" @created="handleCreated" @toast="showToast" @dirty-change="dirty = $event" />
      </template>
    </view>
    <view v-if="toast" class="toast">{{ toast }}</view>
    <view v-if="switchConfirm" class="confirm-mask" @tap.self="switchConfirm = false"><view class="confirm-dialog"><text class="confirm-title">离开未保存的计划？</text><text class="confirm-message">当前表单有未保存修改。你可以先保存本机草稿，或直接放弃修改。</text><view class="confirm-actions"><text @tap="switchConfirm = false">继续编辑</text><text @tap="discardAndSwitch">放弃修改</text><text class="confirm-primary" @tap="saveLocalAndSwitch">保存到本机</text></view></view></view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getAuthState } from '../../../utils/auth'
import { getRouteOptions } from '../../shared/utils/route-options'
import CampaignCreateForm from './CampaignCreateForm.vue'
import CampaignDashboard from './CampaignDashboard.vue'

export default {
  name: 'CampaignPage',
  components: { AppPageShell, CampaignCreateForm, CampaignDashboard },
  data() {
    const options = getRouteOptions()
    return {
      auth: getAuthState(), mode: options.mode === 'create' ? 'create' : 'dashboard', campaignId: options.id || '', placementId: options.placementId || '',
      theme: uni.getStorageSync('lowair-demo-theme') || 'ocean', locale: uni.getStorageSync('lowair-demo-locale') || 'zh', dirty: false, switchConfirm: false, pendingMode: '', dashboardKey: 0, toast: '', toastTimer: null
    }
  },
  computed: {
    authorized() { return Boolean(this.auth.enterprise || this.auth.institution) },
    pageTitle() { return this.mode === 'create' ? '创建广告计划' : '广告投放看板' }
  },
  beforeUnmount() { if (this.toastTimer) clearTimeout(this.toastTimer) },
  methods: {
    switchMode(mode) {
      if (mode === this.mode) return
      if (this.mode === 'create' && this.dirty) { this.pendingMode = mode; this.switchConfirm = true; return }
      this.applyMode(mode)
    },
    applyMode(mode) { this.mode = mode; this.campaignId = ''; if (mode === 'dashboard') this.dashboardKey += 1 },
    discardAndSwitch() { this.dirty = false; this.switchConfirm = false; this.applyMode(this.pendingMode || 'dashboard') },
    saveLocalAndSwitch() { this.$refs.createForm?.persistLocalDraft(); this.dirty = false; this.switchConfirm = false; this.showToast('已保存到本机草稿'); this.applyMode(this.pendingMode || 'dashboard') },
    handleCreated({ campaign, intent }) { this.dirty = false; this.campaignId = campaign.id; this.mode = 'dashboard'; this.dashboardKey += 1; this.showToast(intent === 'submit' ? '计划已提交审核' : '草稿已保存') },
    goVerify() { const returnUrl = encodeURIComponent('/pages/ad/campaign?mode=' + this.mode); const mode = this.auth.identity === 'institution' ? 'institution' : 'enterprise'; uni.navigateTo({ url: `/pages/profile/account?mode=${mode}&returnUrl=${returnUrl}` }) },
    goAdHome() { uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pages/ad/index' }) }) },
    showToast(message) { this.toast = typeof message === 'string' ? message : '广告计划操作'; if (this.toastTimer) clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style scoped>
.campaign-screen { min-height: 100%; padding: 22rpx 28rpx 42rpx; background: var(--app-bg); color: var(--text); }.mode-tabs { display: flex; gap: 8rpx; margin-bottom: 22rpx; padding: 6rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.mode-tabs text { min-height: 66rpx; display: inline-flex; flex: 1; align-items: center; justify-content: center; border-radius: 6px; color: var(--muted); font-size: 23rpx; font-weight: 650; }.mode-tabs text.active { background: var(--surface-strong); color: var(--accent); }.guard-panel { max-width: 720rpx; display: flex; flex-direction: column; align-items: flex-start; margin: 80rpx auto 0; padding: 38rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); }.guard-label { color: var(--accent); font-size: 21rpx; font-weight: 700; }.guard-title { margin-top: 14rpx; font-size: 34rpx; font-weight: 750; line-height: 1.35; }.guard-note { margin-top: 14rpx; color: var(--muted); font-size: 23rpx; line-height: 1.6; }.guard-actions { display: flex; gap: 14rpx; margin-top: 28rpx; }.primary-button, .secondary-button { min-height: 72rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 26rpx; border-radius: 7px; font-size: 22rpx; font-weight: 700; }.primary-button { background: var(--accent); color: var(--accent-ink); }.secondary-button { border: 1rpx solid var(--line); color: var(--text); }.toast { position: fixed; z-index: 110; left: 50%; bottom: calc(142rpx + env(safe-area-inset-bottom)); max-width: 620rpx; transform: translateX(-50%); padding: 18rpx 28rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); color: var(--text); font-size: 22rpx; box-shadow: 0 12rpx 34rpx rgba(0,0,0,.25); }.confirm-mask { position: fixed; z-index: 100; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(2,13,21,.76); }.confirm-dialog { width: 100%; max-width: 620rpx; padding: 30rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); }.confirm-title { display: block; font-size: 30rpx; font-weight: 750; }.confirm-message { display: block; margin-top: 14rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.confirm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 28rpx; margin-top: 28rpx; color: var(--muted); font-size: 22rpx; }.confirm-primary { color: var(--accent); font-weight: 700; }
@media (max-width: 480px) { .campaign-screen { padding-left: 20rpx; padding-right: 20rpx; }.guard-actions { width: 100%; flex-direction: column; }.primary-button, .secondary-button { width: 100%; } }
</style>
