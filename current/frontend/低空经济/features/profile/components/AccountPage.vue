<template>
  <app-page-shell title="账户与认证" active="profile" :show-assistant="false">
    <view class="account-scroll">
      <view class="account-page">
        <view class="account-heading">
          <view><text class="eyebrow">ACCOUNT & RBAC</text><text class="page-title">身份、资质与访问权限</text></view>
          <view class="refresh-button" :class="{ disabled: loading }" @tap="load">刷新</view>
        </view>

        <view v-if="loading" class="state-panel"><text class="state-spinner"></text><text>正在读取服务端账户状态</text></view>
        <view v-else-if="loadError" class="state-panel error"><text>{{ loadError }}</text><view class="inline-action" @tap="load">重试</view></view>
        <template v-else>
          <view class="summary-band">
            <view class="avatar">{{ avatarText }}</view>
            <view class="summary-copy"><text class="summary-name">{{ profile.nickname || '平台用户' }}</text><text class="summary-phone">{{ maskedPhone }}</text></view>
            <view class="role-list"><text v-for="role in displayRoles" :key="role" class="role-tag">{{ role }}</text></view>
          </view>

          <view class="section profile-section">
            <view class="section-head"><view><text class="section-title">账户资料</text><text class="section-note">资料修改由账户服务保存，不影响审核状态</text></view></view>
            <view class="field"><text class="field-label">昵称</text><input v-model.trim="profileForm.nickname" class="field-input" maxlength="30" placeholder="2 至 30 个字符" /></view>
            <view class="field"><text class="field-label">个人简介</text><textarea v-model.trim="profileForm.bio" class="field-textarea" maxlength="300" placeholder="介绍无人机经验或业务方向" /></view>
            <view class="field"><text class="field-label">资料可见范围</text><view class="segmented"><text :class="{ active: profileForm.visibility === 'private' }" @tap="profileForm.visibility = 'private'">仅自己</text><text :class="{ active: profileForm.visibility === 'public' }" @tap="profileForm.visibility = 'public'">公开资料</text></view></view>
            <view v-if="profileError" class="operation-error"><text>{{ profileError }}</text><text @tap="saveProfile">重试</text></view>
            <view class="primary-button compact" :class="{ disabled: profileSaving }" @tap="saveProfile">{{ profileSaving ? '保存中...' : '保存资料' }}</view>
          </view>

          <view class="section verification-section">
            <view class="section-head"><view><text class="section-title">认证与资质</text><text class="section-note">审核状态只读取服务端，前端不能自行通过认证</text></view></view>
            <scroll-view class="verification-tabs" scroll-x :show-scrollbar="false"><view class="tab-row"><text v-for="item in types" :key="item.key" class="verification-tab" :class="{ active: selectedType === item.key }" @tap="selectType(item.key)">{{ item.label }}<text class="tab-status" :class="statusTone(statusFor(item.key))">{{ statusLabel(statusFor(item.key)) }}</text></text></view></scroll-view>

            <view class="review-panel" :class="statusTone(currentStatus)">
              <view class="review-head"><text class="review-title">{{ currentLabel }}</text><text class="review-status">{{ statusLabel(currentStatus) }}</text></view>
              <text class="review-note">{{ statusDescription }}</text>
              <view v-if="currentRecord.submitted_at || currentRecord.submittedAt" class="review-meta"><text>提交时间</text><text>{{ formatTime(currentRecord.submitted_at || currentRecord.submittedAt) }}</text></view>
              <view v-if="currentRecord.reviewed_at || currentRecord.reviewedAt" class="review-meta"><text>审核时间</text><text>{{ formatTime(currentRecord.reviewed_at || currentRecord.reviewedAt) }}</text></view>
              <view v-if="currentStatus === 'rejected'" class="reject-reason"><text>失败原因</text><text>{{ currentRecord.rejection_reason || currentRecord.rejectionReason || '服务端未提供原因，请联系平台支持' }}</text></view>
              <view class="progress-row"><view v-for="step in progressSteps" :key="step.label" class="progress-step" :class="step.state"><text class="step-dot"></text><text>{{ step.label }}</text></view></view>
            </view>

            <view v-if="canSubmit" class="verification-form">
              <view v-for="field in currentFields" :key="field.key" class="field">
                <text class="field-label">{{ field.label }}<text v-if="field.required" class="required"> *</text></text>
                <view v-if="field.type === 'upload'" class="upload-control" :class="{ uploaded: form[field.key] }" @tap="chooseMaterial(field)">
                  <view><text class="upload-title">{{ form[field.key] ? '材料已上传' : '选择图片或 PDF' }}</text><text class="upload-note">{{ uploadLabels[field.key] || '文件将上传到私有材料接口' }}</text></view>
                  <text class="upload-action">{{ uploadingKey === field.key ? '上传中...' : (form[field.key] ? '替换' : '上传') }}</text>
                </view>
                <picker v-else-if="field.type === 'select'" :range="field.options" @change="form[field.key] = field.options[$event.detail.value]"><view class="field-input picker-value">{{ form[field.key] || '请选择' }}</view></picker>
                <picker v-else-if="field.type === 'date'" mode="date" @change="form[field.key] = $event.detail.value"><view class="field-input picker-value">{{ form[field.key] || '请选择日期' }}</view></picker>
                <input v-else v-model.trim="form[field.key]" class="field-input" :type="field.type === 'phone' ? 'number' : 'text'" :maxlength="field.key === 'idNumber' || field.key === 'unifiedSocialCreditCode' ? 18 : 80" :placeholder="field.placeholder || ('请输入' + field.label)" />
              </view>
              <view v-if="operationError" class="operation-error"><text>{{ operationError }}</text><text @tap="submitVerification">重试</text></view>
              <view class="primary-button" :class="{ disabled: submitting || uploadingKey }" @tap="submitVerification">{{ submitting ? '提交中...' : (currentStatus === 'rejected' || currentStatus === 'expired' ? '重新提交审核' : '提交审核') }}</view>
            </view>
            <view v-else-if="currentStatus === 'pending'" class="empty-action">材料正在审核，状态变化后点击右上角刷新查看。</view>
            <view v-else class="empty-action">认证已通过。如资质即将到期，请按平台通知更新材料。</view>

            <view v-if="returnUrl && currentStatus === 'approved'" class="return-panel"><text>当前资质已满足原操作要求</text><view class="primary-button compact" @tap="returnToTarget">返回原目标</view></view>
          </view>

          <view class="privacy-panel">
            <text class="privacy-title">隐私与材料使用说明</text>
            <text>证件、执照和主体资料仅用于身份与资质审核，通过私有上传接口保存。页面不在本地缓存证件号、验证码、密码或材料原文件；审核、有效期与拒绝原因均由服务端返回。</text>
          </view>
        </template>
      </view>
    </view>
    <view v-if="toast" class="toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getAuthState, normalizeVerificationStatus, resolveReturnUrl, safeInternalUrl } from '../../../utils/auth'
import { loadAccount, submitAccountVerification, updateAccountProfile, uploadVerificationFile } from '../services/account'
import { ROLE_LABELS, STATUS_LABELS, VERIFICATION_FIELDS, VERIFICATION_LABELS, sanitizeMaterials, validateProfile, validateVerification } from '../utils/account-validation'

export default {
  name: 'AccountPage',
  components: { AppPageShell },
  data() {
    return {
      loading: true, loadError: '', profile: {}, profileForm: { nickname: '', bio: '', visibility: 'private' }, profileSaving: false, profileError: '',
      records: [], selectedType: 'personal', form: {}, uploadLabels: {}, uploadingKey: '', activeUpload: null, submitting: false, operationError: '', toast: '', returnUrl: ''
    }
  },
  computed: {
    types() { return Object.entries(VERIFICATION_LABELS).map(([key, label]) => ({ key, label })) },
    auth() { return getAuthState() },
    avatarText() { return String(this.profile.nickname || '用').slice(0, 1) },
    maskedPhone() { const phone = String(this.profile.phone || ''); return /^1\d{10}$/.test(phone) ? phone.slice(0, 3) + '****' + phone.slice(-4) : '手机号由账户服务保护' },
    displayRoles() { const roles = this.profile.roles || this.auth.roles || []; return roles.length ? [...new Set(roles.map((role) => ROLE_LABELS[role] || role))] : ['个人飞手'] },
    currentFields() { return VERIFICATION_FIELDS[this.selectedType] || [] },
    currentRecord() { return this.records.find((item) => (item.type || item.verification_type) === this.selectedType) || {} },
    currentStatus() { return this.statusFor(this.selectedType) },
    currentLabel() { return VERIFICATION_LABELS[this.selectedType] },
    canSubmit() { return ['not_submitted', 'rejected', 'expired'].includes(this.currentStatus) },
    statusDescription() {
      return {
        not_submitted: '尚未提交材料。补齐必填信息后将进入人工或服务端审核。',
        pending: '材料已由服务端接收，审核完成前相关受限操作仍不可用。',
        approved: '服务端返回审核通过，相关权限将按角色和业务规则开放。',
        rejected: '本次申请未通过。请查看失败原因，修正材料后重新提交。',
        expired: '资质已失效。请更新有效期和证明材料后重新提交。'
      }[this.currentStatus]
    },
    progressSteps() {
      const status = this.currentStatus
      return [
        { label: '填写材料', state: status === 'not_submitted' ? 'active' : 'done' },
        { label: '服务端审核', state: status === 'pending' ? 'active' : (['approved', 'rejected', 'expired'].includes(status) ? 'done' : '') },
        { label: status === 'rejected' ? '补充重提' : (status === 'expired' ? '更新资质' : '完成认证'), state: status === 'approved' ? 'done' : (['rejected', 'expired'].includes(status) ? 'active warning' : '') }
      ]
    }
  },
  mounted() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1]
    const options = current?.options || current?.$page?.options || {}
    if (VERIFICATION_LABELS[options.mode]) this.selectedType = options.mode
    this.returnUrl = resolveReturnUrl(options, '')
    if (!getAuthState().loggedIn) {
      const accountUrl = '/pages/profile/account?mode=' + encodeURIComponent(this.selectedType) + (this.returnUrl ? '&returnUrl=' + encodeURIComponent(this.returnUrl) : '')
      uni.redirectTo({ url: '/pages/auth/index?mode=login&redirect=' + encodeURIComponent(accountUrl) })
      return
    }
    this.load()
  },
  beforeUnmount() { this.activeUpload?.cancel?.() },
  methods: {
    async load() {
      if (!getAuthState().loggedIn) return
      this.loading = true; this.loadError = ''
      try {
        const result = await loadAccount()
        this.profile = result.profile || {}
        this.records = Array.isArray(result.verifications) ? result.verifications : []
        this.profileForm = { nickname: this.profile.nickname || '', bio: this.profile.bio || '', visibility: this.profile.visibility || 'private' }
      } catch (error) { this.loadError = error.message || '账户状态加载失败' } finally { this.loading = false }
    },
    selectType(type) { this.selectedType = type; this.form = {}; this.uploadLabels = {}; this.operationError = '' },
    statusFor(type) {
      const record = this.records.find((item) => (item.type || item.verification_type) === type)
      return normalizeVerificationStatus(record || this.profile.verification?.[type] || 'not_submitted')
    },
    statusLabel(status) { return STATUS_LABELS[status] || STATUS_LABELS.not_submitted },
    statusTone(status) { return ['approved', 'pending', 'rejected', 'expired'].includes(status) ? status : 'not-submitted' },
    formatTime(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false }) },
    async saveProfile() {
      if (this.profileSaving) return
      const validation = validateProfile(this.profileForm)
      if (validation) return this.showToast(validation)
      this.profileSaving = true; this.profileError = ''
      try { await updateAccountProfile(this.profileForm); await this.load(); this.showToast('账户资料已保存') } catch (error) { this.profileError = error.message || '资料保存失败' } finally { this.profileSaving = false }
    },
    chooseMaterial(field) {
      if (this.uploadingKey) return
      const success = (result) => {
        const file = result.tempFiles?.[0] || result.tempFilePaths?.[0]
        const filePath = typeof file === 'string' ? file : file?.path || file?.tempFilePath
        const fileName = typeof file === 'object' ? file.name : field.label
        if (filePath) this.uploadMaterial(field, filePath, fileName)
      }
      if (typeof uni.chooseFile === 'function') uni.chooseFile({ count: 1, extension: ['jpg', 'jpeg', 'png', 'webp', 'pdf'], success, fail: (error) => { if (!/cancel/i.test(error.errMsg || '')) this.operationError = '未能读取所选材料' } })
      else uni.chooseImage({ count: 1, sourceType: ['album', 'camera'], success, fail: (error) => { if (!/cancel/i.test(error.errMsg || '')) this.operationError = '未能读取所选图片' } })
    },
    async uploadMaterial(field, filePath, fileName) {
      this.uploadingKey = field.key; this.operationError = ''
      this.activeUpload = uploadVerificationFile(filePath, this.selectedType + ':' + field.key)
      try {
        const asset = await this.activeUpload.promise
        this.form[field.key] = String(asset.id)
        this.uploadLabels[field.key] = (fileName || asset.name || field.label) + ' · 私有文件 #' + asset.id
      } catch (error) { if (error.code !== 'REQUEST_CANCELED') this.operationError = error.message || '材料上传失败，请重试' } finally { this.uploadingKey = ''; this.activeUpload = null }
    },
    async submitVerification() {
      if (!this.canSubmit || this.submitting || this.uploadingKey) return
      const validation = validateVerification(this.selectedType, this.form)
      if (validation) return this.showToast(validation)
      this.submitting = true; this.operationError = ''
      try {
        const record = await submitAccountVerification(this.selectedType, sanitizeMaterials(this.selectedType, this.form))
        const index = this.records.findIndex((item) => (item.type || item.verification_type) === this.selectedType)
        const serverRecord = record?.verification || record?.data || record
        if (serverRecord && typeof serverRecord === 'object') {
          if (index >= 0) this.records.splice(index, 1, serverRecord); else this.records.push(serverRecord)
        }
        this.form = {}; this.uploadLabels = {}; this.showToast('材料已提交，等待服务端审核')
      } catch (error) { this.operationError = error.message || '认证提交失败，请重试' } finally { this.submitting = false }
    },
    returnToTarget() {
      const target = safeInternalUrl(this.returnUrl, '/pages/index/index')
      if (/^\/pages\/(index|academy|work|market|community|profile)\/index(?:\?|$)/.test(target)) uni.reLaunch({ url: target })
      else uni.redirectTo({ url: target })
    },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2400) }
  }
}
</script>

<style scoped>
.account-scroll { height: 100%; background: var(--app-bg); }.account-page { min-height: 100%; padding: 28rpx 28rpx 170rpx; box-sizing: border-box; color: var(--text); }.account-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; margin-bottom: 24rpx; }.eyebrow { display: block; color: var(--accent); font-size: 19rpx; }.page-title { display: block; margin-top: 7rpx; font-size: 36rpx; font-weight: 700; }.refresh-button, .inline-action { min-width: 84rpx; padding: 13rpx 17rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--accent); font-size: 22rpx; text-align: center; }.disabled { opacity: .5; pointer-events: none; }
.state-panel { display: flex; min-height: 260rpx; align-items: center; justify-content: center; gap: 14rpx; border: 1rpx dashed var(--line); border-radius: 8px; color: var(--muted); font-size: 24rpx; }.state-panel.error { flex-direction: column; color: #f2b456; }.state-spinner { width: 26rpx; height: 26rpx; border: 3rpx solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }
.summary-band { display: flex; align-items: center; gap: 18rpx; margin-bottom: 24rpx; padding: 24rpx; border-top: 1rpx solid var(--line); border-bottom: 1rpx solid var(--line); background: var(--surface-strong); }.avatar { display: flex; width: 74rpx; height: 74rpx; flex: 0 0 74rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 50%; color: var(--accent); font-size: 29rpx; font-weight: 700; }.summary-copy { min-width: 0; flex: 1; }.summary-name, .summary-phone { display: block; }.summary-name { font-size: 28rpx; font-weight: 700; }.summary-phone { margin-top: 6rpx; color: var(--muted); font-size: 21rpx; }.role-list { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8rpx; }.role-tag { padding: 6rpx 10rpx; border: 1rpx solid rgba(25,207,160,.45); border-radius: 999px; color: var(--accent); font-size: 19rpx; }
.section { margin-bottom: 24rpx; padding: 24rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.section-head { display: flex; justify-content: space-between; margin-bottom: 24rpx; }.section-title, .section-note { display: block; }.section-title { font-size: 29rpx; font-weight: 700; }.section-note { margin-top: 7rpx; color: var(--muted); font-size: 21rpx; line-height: 1.5; }.field { margin-bottom: 20rpx; }.field-label { display: block; margin-bottom: 9rpx; font-size: 23rpx; }.required { color: #f2b456; }.field-input, .field-textarea { width: 100%; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 24rpx; }.field-input { height: 76rpx; padding: 0 16rpx; }.field-textarea { min-height: 130rpx; padding: 16rpx; }.picker-value { display: flex; align-items: center; color: var(--muted); }.segmented { display: inline-flex; overflow: hidden; border: 1rpx solid var(--line); border-radius: 6px; }.segmented text { padding: 13rpx 22rpx; color: var(--muted); font-size: 22rpx; }.segmented .active { background: rgba(25,207,160,.12); color: var(--accent); }
.verification-tabs { width: 100%; margin-bottom: 20rpx; }.tab-row { display: inline-flex; gap: 12rpx; padding-bottom: 4rpx; }.verification-tab { display: flex; min-width: 168rpx; flex-direction: column; gap: 8rpx; padding: 15rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--muted); font-size: 23rpx; }.verification-tab.active { border-color: var(--accent); color: var(--text); }.tab-status { font-size: 19rpx; }.tab-status.approved { color: var(--accent); }.tab-status.pending { color: #f2b456; }.tab-status.rejected, .tab-status.expired { color: #ee7d7d; }
.review-panel { margin-bottom: 24rpx; padding: 20rpx; border-left: 5rpx solid var(--line); background: var(--surface-strong); }.review-panel.approved { border-color: var(--accent); }.review-panel.pending { border-color: #f2b456; }.review-panel.rejected, .review-panel.expired { border-color: #ee7d7d; }.review-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }.review-title { font-size: 27rpx; font-weight: 700; }.review-status { color: var(--accent); font-size: 22rpx; }.review-panel.pending .review-status { color: #f2b456; }.review-panel.rejected .review-status, .review-panel.expired .review-status { color: #ee7d7d; }.review-note { display: block; margin: 12rpx 0; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.review-meta { display: flex; justify-content: space-between; gap: 20rpx; padding-top: 8rpx; color: var(--muted); font-size: 20rpx; }.reject-reason { margin-top: 14rpx; padding: 14rpx; border: 1rpx solid rgba(238,125,125,.38); border-radius: 5px; color: #eea0a0; font-size: 21rpx; line-height: 1.5; }.reject-reason text { display: block; }.reject-reason text:first-child { margin-bottom: 5rpx; font-weight: 700; }.progress-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8rpx; margin-top: 20rpx; }.progress-step { display: flex; align-items: center; gap: 7rpx; color: var(--muted); font-size: 18rpx; }.step-dot { width: 12rpx; height: 12rpx; flex: 0 0 12rpx; border: 2rpx solid var(--line); border-radius: 50%; }.progress-step.done, .progress-step.active { color: var(--accent); }.progress-step.done .step-dot { border-color: var(--accent); background: var(--accent); }.progress-step.active .step-dot { border-color: var(--accent); }.progress-step.warning { color: #f2b456; }.progress-step.warning .step-dot { border-color: #f2b456; }
.upload-control { display: flex; min-height: 86rpx; align-items: center; justify-content: space-between; gap: 18rpx; padding: 14rpx 16rpx; box-sizing: border-box; border: 1rpx dashed var(--line); border-radius: 6px; background: var(--surface-strong); }.upload-control.uploaded { border-style: solid; border-color: rgba(25,207,160,.45); }.upload-title, .upload-note { display: block; }.upload-title { font-size: 23rpx; }.upload-note { max-width: 430rpx; overflow: hidden; margin-top: 5rpx; color: var(--muted); font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; }.upload-action { flex: 0 0 auto; color: var(--accent); font-size: 21rpx; }.primary-button { display: flex; min-height: 76rpx; align-items: center; justify-content: center; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-size: 24rpx; font-weight: 700; }.primary-button.compact { min-height: 66rpx; padding: 0 24rpx; align-self: flex-start; }.operation-error { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin: 12rpx 0; padding: 14rpx; border: 1rpx solid rgba(242,180,86,.4); border-radius: 6px; color: #f2b456; font-size: 21rpx; }.operation-error text:last-child { color: var(--accent); }.empty-action { padding: 24rpx; border: 1rpx dashed var(--line); border-radius: 6px; color: var(--muted); font-size: 22rpx; text-align: center; }.return-panel { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-top: 20rpx; padding: 18rpx; border: 1rpx solid rgba(25,207,160,.4); border-radius: 6px; color: var(--text); font-size: 22rpx; }.return-panel .primary-button { flex: 0 0 auto; }.privacy-panel { padding: 22rpx; border-left: 4rpx solid var(--accent); background: var(--surface-strong); color: var(--muted); font-size: 21rpx; line-height: 1.6; }.privacy-title { display: block; margin-bottom: 8rpx; color: var(--text); font-size: 24rpx; font-weight: 700; }.toast { position: fixed; z-index: 100; left: 50%; bottom: calc(130rpx + env(safe-area-inset-bottom)); max-width: 580rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; text-align: center; }
@media (max-width: 480px) { .account-page { padding-left: 20rpx; padding-right: 20rpx; }.summary-band { align-items: flex-start; }.role-list { max-width: 180rpx; }.return-panel { align-items: stretch; flex-direction: column; }.return-panel .primary-button { align-self: stretch; }.progress-step { align-items: flex-start; flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { .state-spinner { animation: none; } }
</style>
