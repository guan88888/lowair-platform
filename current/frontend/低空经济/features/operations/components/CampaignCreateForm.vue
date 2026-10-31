<template>
  <view class="create-layout">
    <view class="form-column">
      <view class="draft-banner">
        <view><text>提交后进入审核中</text><text>{{ demoMode ? '当前使用广告域演示适配器，审核结果仅作流程示意' : '只有后端审核和投放服务可以更新计划状态' }}</text></view>
        <text class="draft-state">{{ dirty ? '未保存' : '已保存' }}</text>
      </view>

      <view class="form-section">
        <text class="section-title">计划与目标</text>
        <view class="field-group"><text class="field-label">计划名称</text><input v-model="form.name" class="form-input" maxlength="32" placeholder="例如：北京电力巡检服务推广" placeholder-class="input-placeholder" @input="touch" /><text v-if="errors.name" class="field-error">{{ errors.name }}</text></view>
        <view class="field-group"><text class="field-label">推广目标</text><view class="option-grid"><text v-for="item in goals" :key="item.value" :class="{ selected: form.goal === item.value }" @tap="selectGoal(item)">{{ item.label }}</text></view><text v-if="errors.goal" class="field-error">{{ errors.goal }}</text></view>
      </view>

      <view class="form-section">
        <text class="section-title">广告位与落地页</text>
        <view v-if="placementLoading" class="option-skeleton"><view v-for="index in 4" :key="index"></view></view>
        <view v-else-if="placementError" class="inline-error"><text>{{ placementError }}</text><text @tap="loadPlacements">重试</text></view>
        <view v-else class="placement-options">
          <view v-for="placement in placements" :key="placement.id" class="placement-option" :class="{ selected: form.placement_id === placement.id }" @tap="selectPlacement(placement)">
            <image :src="placement.image" mode="aspectFill"></image><view><text>{{ placement.name }}</text><text>{{ placement.spec }}</text></view>
          </view>
        </view>
        <text v-if="errors.placement" class="field-error">{{ errors.placement }}</text>
        <view class="field-group"><text class="field-label">落地页类型</text><view class="option-grid compact"><text v-for="item in landingTypes" :key="item.value" :class="{ selected: form.landing_page.type === item.value }" @tap="form.landing_page.type = item.value; form.landing_page.label = item.label; touch()">{{ item.label }}</text></view></view>
        <view class="field-group"><text class="field-label">落地页路径</text><input v-model="form.landing_page.url" class="form-input" placeholder="请输入平台内页面路径" placeholder-class="input-placeholder" @input="touch" /><text class="field-helper">仅允许平台内机构、职位、商品或企业页面，后端还需校验访问权限。</text><text v-if="errors.landing" class="field-error">{{ errors.landing }}</text></view>
      </view>

      <view class="form-section">
        <text class="section-title">受众定向</text>
        <view class="field-group"><text class="field-label">城市</text><view class="chip-grid"><text v-for="city in cities" :key="city" :class="{ selected: form.audience.cities.includes(city) }" @tap="toggleList(form.audience.cities, city)">{{ city }}</text></view><text v-if="errors.audience" class="field-error">{{ errors.audience }}</text></view>
        <view class="field-group"><text class="field-label">行业与人群标签</text><view class="chip-grid"><text v-for="tag in audienceTags" :key="tag" :class="{ selected: form.audience.tags.includes(tag) }" @tap="toggleList(form.audience.tags, tag)">{{ tag }}</text></view><text class="field-helper">请选择与无人机业务直接相关的标签，最多 5 个。</text></view>
      </view>

      <view class="form-section">
        <text class="section-title">预算与投放时间</text>
        <view class="field-row"><view class="field-group"><text class="field-label">总预算（元）</text><input v-model="form.budget.total" class="form-input" type="digit" placeholder="0" placeholder-class="input-placeholder" @input="touch" /><text v-if="errors.budget" class="field-error">{{ errors.budget }}</text></view><view class="field-group"><text class="field-label">日预算（元）</text><input v-model="form.budget.daily" class="form-input" type="digit" placeholder="0" placeholder-class="input-placeholder" @input="touch" /><text v-if="errors.dailyBudget" class="field-error">{{ errors.dailyBudget }}</text></view></view>
        <view class="field-row"><view class="field-group"><text class="field-label">开始日期</text><picker mode="date" :value="form.schedule.start_at" @change="setDate('start_at', $event.detail.value)"><view class="form-input picker-value">{{ form.schedule.start_at || '选择日期' }}</view></picker></view><view class="field-group"><text class="field-label">结束日期</text><picker mode="date" :value="form.schedule.end_at" @change="setDate('end_at', $event.detail.value)"><view class="form-input picker-value">{{ form.schedule.end_at || '选择日期' }}</view></picker></view></view>
        <text v-if="errors.schedule" class="field-error">{{ errors.schedule }}</text>
        <view class="server-billing"><text>服务端账单可用余额</text><text v-if="billingLoading">读取中</text><text v-else-if="billingError" class="retry-text" @tap="loadBilling">读取失败，重试</text><text v-else>{{ formatMoney(billing.available) }}{{ billing.demo ? '（演示）' : '' }}</text></view>
      </view>

      <view class="form-section">
        <view class="section-heading"><text class="section-title">无人机行业素材</text><text class="upload-trigger" @tap="chooseCreative">上传素材</text></view>
        <text class="section-note">图片支持 JPG、JPEG、PNG、WEBP，最大 10 MB；视频支持 MP4，最大 100 MB。尺寸和内容仍由后端复核。</text>
        <view v-if="uploading" class="upload-progress"><text>上传中 {{ uploadProgress }}%</text><view><view :style="{ width: uploadProgress + '%' }"></view></view></view>
        <view v-if="uploadError" class="inline-error"><text>{{ uploadError }}</text><text @tap="retryUpload">重试</text></view>
        <view class="creative-grid">
          <view v-for="creative in creatives" :key="creative.id" class="creative-option" :class="{ selected: form.creative_id === creative.id }" @tap="selectCreative(creative)"><image :src="creative.url || creative.preview_url" mode="aspectFill"></image><text>{{ creative.title }}</text></view>
        </view>
        <text v-if="errors.creative" class="field-error">{{ errors.creative }}</text>
      </view>

      <view class="form-section">
        <text class="section-title">推广文案与联系人</text>
        <view class="field-group"><text class="field-label">推广标题</text><input v-model="form.copy.headline" class="form-input" maxlength="24" placeholder="清楚说明无人机产品或服务" placeholder-class="input-placeholder" @input="touch" /><text class="field-helper">{{ form.copy.headline.length }}/24</text><text v-if="errors.headline" class="field-error">{{ errors.headline }}</text></view>
        <view class="field-group"><text class="field-label">推广说明</text><textarea v-model="form.copy.description" class="form-textarea" maxlength="60" placeholder="说明服务范围、适用对象或课程安排" placeholder-class="input-placeholder" @input="touch"></textarea><text class="field-helper">{{ form.copy.description.length }}/60</text></view>
        <view class="field-row"><view class="field-group"><text class="field-label">联系人</text><input v-model="form.contact.name" class="form-input" placeholder="姓名" placeholder-class="input-placeholder" @input="touch" /><text v-if="errors.contact" class="field-error">{{ errors.contact }}</text></view><view class="field-group"><text class="field-label">手机号</text><input v-model="form.contact.phone" class="form-input" type="number" maxlength="11" placeholder="用于审核沟通" placeholder-class="input-placeholder" @input="touch" /><text v-if="errors.phone" class="field-error">{{ errors.phone }}</text></view></view>
        <view class="compliance-check" :class="{ checked: form.compliance_confirmed }" @tap="form.compliance_confirmed = !form.compliance_confirmed; touch()"><text class="check-box">{{ form.compliance_confirmed ? '✓' : '' }}</text><text>我确认素材为无人机行业相关内容，不伪造官方认证、指定合作或无法核验的效果承诺。</text></view>
        <text v-if="errors.compliance" class="field-error">{{ errors.compliance }}</text>
      </view>

      <view class="submit-error" v-if="submitError"><text>{{ submitError }}</text><text>表单内容已保留，可直接重试。</text></view>
      <view class="form-actions"><view class="secondary-button" :class="{ disabled: submitting }" @tap="saveCampaign('draft')">保存草稿</view><view class="primary-button" :class="{ disabled: submitting }" @tap="openReview">{{ submitting ? '提交中' : '预览并提交审核' }}</view></view>
    </view>

    <view class="preview-column">
      <view class="preview-sticky">
        <view class="preview-heading"><text class="section-title">推广预览</text><text>{{ activePlacement?.name || '未选择广告位' }}</text></view>
        <view class="ad-preview">
          <image v-if="activeCreativeUrl" :src="activeCreativeUrl" mode="aspectFill"></image>
          <view v-else class="preview-placeholder">选择无人机行业素材</view>
          <view class="preview-body"><view class="preview-label-row"><text class="promotion-label">{{ activePlacement?.promotionLabel || '推广' }}</text><text>{{ activePlacement?.group || '广告位置' }}</text></view><text class="preview-title">{{ form.copy.headline || '推广标题将显示在这里' }}</text><text class="preview-description">{{ form.copy.description || '用简洁描述说明无人机产品、服务或课程信息。' }}</text><text class="preview-cta">{{ form.copy.cta }}</text></view>
        </view>
        <view class="cost-summary"><text class="summary-title">费用摘要</text><view><text>总预算</text><text>{{ formatMoney(form.budget.total) }}</text></view><view><text>日预算</text><text>{{ formatMoney(form.budget.daily) }}</text></view><view><text>计费方案</text><text>{{ activePlacement?.billingMode || '方案确认中' }}</text></view><text class="summary-note">实际消费、账单与结算完全读取服务端，本摘要不代表扣费。</text></view>
        <view class="status-flow"><text class="summary-title">状态流</text><view><text>草稿</text><text>审核中</text><text>投放中 / 驳回</text></view><text>前端提交后只显示后端返回的草稿或审核状态。</text></view>
      </view>
    </view>

    <view v-if="reviewVisible" class="review-mask" @tap.self="reviewVisible = false">
      <view class="review-dialog">
        <text class="review-title">提交审核前确认</text>
        <view class="review-summary"><view><text>计划</text><text>{{ form.name }}</text></view><view><text>目标</text><text>{{ goalLabel }}</text></view><view><text>广告位</text><text>{{ activePlacement?.name }}</text></view><view><text>周期</text><text>{{ form.schedule.start_at }} 至 {{ form.schedule.end_at }}</text></view><view><text>预算</text><text>{{ formatMoney(form.budget.total) }}</text></view></view>
        <view class="review-warning">提交后进入审核中，平台审核通过前不会投放。不得通过素材或文案暗示官方背书。</view>
        <view class="review-actions"><text @tap="reviewVisible = false">返回修改</text><text class="review-submit" @tap="saveCampaign('submit')">确认提交审核</text></view>
      </view>
    </view>
  </view>
</template>

<script>
import { formatCurrency } from '../../shared/utils/formatters'
import { createCampaign, getBillingSummary, listAdPlacements, listCreativeLibrary, uploadCreative, usesDemoAdvertisingData, validateCampaignPayload } from '../services'

const DRAFT_KEY = 'lowair-ad-create-draft-v2'

function emptyForm() {
  return { name: '', goal: '', goal_label: '', placement_id: '', placement_name: '', landing_page: { type: 'enterprise', label: '企业主页', url: '' }, audience: { cities: [], tags: [] }, budget: { total: '', daily: '', currency: 'CNY' }, schedule: { start_at: '', end_at: '' }, creative_id: '', creative: null, copy: { headline: '', description: '', cta: '查看详情' }, contact: { name: '', phone: '' }, compliance_confirmed: false }
}

export default {
  name: 'CampaignCreateForm',
  emits: ['created', 'toast', 'dirty-change'],
  props: { placementId: { type: String, default: '' } },
  data() {
    return {
      demoMode: usesDemoAdvertisingData(), form: emptyForm(), errors: {}, placements: [], placementLoading: true, placementError: '', creatives: [], billing: {}, billingLoading: true, billingError: '',
      dirty: false, submitting: false, submitError: '', reviewVisible: false, uploading: false, uploadProgress: 0, uploadError: '', pendingFile: null,
      goals: [{ value: 'lead', label: '收集服务线索', cta: '咨询服务' }, { value: 'enrollment', label: '试听预约', cta: '预约试听' }, { value: 'recruitment', label: '职位投递', cta: '查看职位' }, { value: 'product', label: '商品访问', cta: '查看详情' }],
      landingTypes: [{ value: 'enterprise', label: '企业主页' }, { value: 'institution', label: '机构详情' }, { value: 'job', label: '职位详情' }, { value: 'product', label: '商品详情' }],
      cities: ['北京', '天津', '石家庄', '成都', '广州', '深圳'], audienceTags: ['电力巡检', '测绘飞手', '超视距培训', '植保无人机', '设备采购', '租赁服务', '企业客户', 'CAAC 持证人']
    }
  },
  computed: {
    activePlacement() { return this.placements.find((item) => item.id === this.form.placement_id) },
    activeCreativeUrl() { return this.form.creative?.url || this.form.creative?.preview_url || '' },
    goalLabel() { return this.goals.find((item) => item.value === this.form.goal)?.label || '' }
  },
  created() {
    this.restoreDraft()
    Promise.all([this.loadPlacements(), this.loadCreatives(), this.loadBilling()])
  },
  methods: {
    restoreDraft() {
      const saved = uni.getStorageSync(DRAFT_KEY)
      if (saved && typeof saved === 'object') this.form = { ...emptyForm(), ...saved, landing_page: { ...emptyForm().landing_page, ...(saved.landing_page || {}) }, audience: { ...emptyForm().audience, ...(saved.audience || {}) }, budget: { ...emptyForm().budget, ...(saved.budget || {}) }, schedule: { ...emptyForm().schedule, ...(saved.schedule || {}) }, copy: { ...emptyForm().copy, ...(saved.copy || {}) }, contact: { ...emptyForm().contact, ...(saved.contact || {}) } }
    },
    async loadPlacements() {
      this.placementLoading = true
      this.placementError = ''
      try {
        this.placements = await listAdPlacements()
        const initial = this.placementId || this.form.placement_id
        const placement = this.placements.find((item) => item.id === initial)
        if (placement) this.selectPlacement(placement, false)
      } catch (error) { this.placementError = error.message || '广告位加载失败' } finally { this.placementLoading = false }
    },
    async loadCreatives() {
      try { this.creatives = await listCreativeLibrary() } catch (error) { this.$emit('toast', error.message || '素材库加载失败') }
    },
    async loadBilling() {
      this.billingLoading = true
      this.billingError = ''
      try { this.billing = await getBillingSummary() } catch (error) { this.billingError = error.message || '账单读取失败' } finally { this.billingLoading = false }
    },
    selectGoal(item) { this.form.goal = item.value; this.form.goal_label = item.label; this.form.copy.cta = item.cta; this.touch() },
    selectPlacement(placement, markDirty = true) { this.form.placement_id = placement.id; this.form.placement_name = placement.name; if (markDirty) this.touch() },
    toggleList(list, value) { const index = list.indexOf(value); if (index >= 0) list.splice(index, 1); else if (list.length < 5) list.push(value); else return this.$emit('toast', '受众标签最多选择 5 个'); this.touch() },
    setDate(key, value) { this.form.schedule[key] = value; this.touch() },
    selectCreative(creative) { this.form.creative_id = creative.id; this.form.creative = creative; this.touch() },
    chooseCreative() {
      uni.chooseMedia({ count: 1, mediaType: ['image', 'video'], sourceType: ['album', 'camera'], success: ({ tempFiles }) => { const file = tempFiles?.[0]; if (file) this.prepareUpload(file) }, fail: (error) => { if (!/cancel/i.test(error.errMsg || '')) this.uploadError = '无法选择素材，请检查相册或相机权限' } })
    },
    prepareUpload(file) {
      const path = file.tempFilePath || file.path || ''
      const extension = path.split('.').pop().toLowerCase()
      const type = file.fileType || (/mp4$/.test(extension) ? 'video' : 'image')
      const allowed = type === 'video' ? ['mp4'] : ['jpg', 'jpeg', 'png', 'webp']
      const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      if (!allowed.includes(extension)) return this.uploadError = `不支持 .${extension || '未知'} 格式`
      if (Number(file.size) > maxSize) return this.uploadError = type === 'video' ? '视频不能超过 100 MB' : '图片不能超过 10 MB'
      this.pendingFile = { path, size: file.size || 0, type, format: extension, width: file.width || 0, height: file.height || 0 }
      this.performUpload()
    },
    async performUpload() {
      if (!this.pendingFile || this.uploading) return
      this.uploading = true
      this.uploadProgress = 0
      this.uploadError = ''
      try {
        const creative = await uploadCreative(this.pendingFile, { title: '无人机行业推广素材' }, (progress) => { this.uploadProgress = progress })
        this.creatives = [creative, ...this.creatives.filter((item) => item.id !== creative.id)]
        this.selectCreative(creative)
        this.$emit('toast', '素材已上传，仍需平台审核')
      } catch (error) { this.uploadError = error.message || '素材上传失败' } finally { this.uploading = false }
    },
    retryUpload() { this.performUpload() },
    touch() { this.dirty = true; this.$emit('dirty-change', true) },
    validate() { this.errors = validateCampaignPayload(this.form); return !Object.keys(this.errors).length },
    openReview() { this.submitError = ''; if (!this.validate()) return this.$emit('toast', '请先补全标红字段'); this.reviewVisible = true },
    async saveCampaign(intent) {
      if (this.submitting) return
      if (intent === 'submit' && !this.validate()) { this.reviewVisible = false; return this.$emit('toast', '请先补全标红字段') }
      if (intent === 'draft' && !this.form.name.trim()) { this.errors = { name: '保存草稿前请填写计划名称' }; return this.$emit('toast', '请填写计划名称') }
      this.submitting = true
      this.submitError = ''
      try {
        const campaign = await createCampaign(this.form, intent)
        uni.removeStorageSync(DRAFT_KEY)
        this.dirty = false
        this.$emit('dirty-change', false)
        this.reviewVisible = false
        this.$emit('created', { campaign, intent })
      } catch (error) { this.submitError = error.message || '保存失败，请重试'; this.reviewVisible = false } finally { this.submitting = false }
    },
    persistLocalDraft() { if (!this.dirty) return; uni.setStorageSync(DRAFT_KEY, this.form) },
    formatMoney(value) { return formatCurrency(Number(value) || 0).replace('¥ ', '¥') }
  }
}
</script>

<style scoped>
.create-layout { display: grid; align-items: start; grid-template-columns: minmax(0, 1.55fr) minmax(280rpx, .75fr); gap: 22rpx; }.form-column { display: flex; min-width: 0; flex-direction: column; gap: 20rpx; }.draft-banner { display: flex; justify-content: space-between; gap: 20rpx; padding: 20rpx 22rpx; border-left: 5rpx solid var(--accent); background: var(--surface-strong); }.draft-banner > view text { display: block; }.draft-banner > view text:first-child { color: var(--text); font-size: 23rpx; font-weight: 700; }.draft-banner > view text:last-child { margin-top: 6rpx; color: var(--muted); font-size: 19rpx; line-height: 1.45; }.draft-state { color: #e3b25d; font-size: 20rpx; white-space: nowrap; }.form-section { padding: 28rpx; border: 1rpx solid var(--line); border-radius: 9px; background: var(--surface); }.section-title { color: var(--text); font-size: 29rpx; font-weight: 700; }.section-note { display: block; margin-top: 8rpx; color: var(--muted); font-size: 20rpx; line-height: 1.5; }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }.upload-trigger { color: var(--accent); font-size: 22rpx; }.field-group { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 9rpx; margin-top: 22rpx; }.field-label { color: var(--text); font-size: 22rpx; font-weight: 650; }.form-input, .form-textarea { width: 100%; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; }.form-input { height: 76rpx; padding: 0 18rpx; }.form-textarea { min-height: 150rpx; padding: 18rpx; line-height: 1.5; }.picker-value { display: flex; align-items: center; color: var(--muted); }.field-helper { color: var(--muted); font-size: 18rpx; line-height: 1.4; }.field-error { display: block; color: #eb9b91; font-size: 19rpx; }.field-row { display: flex; gap: 18rpx; }.option-grid, .chip-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }.option-grid text, .chip-grid text { padding: 14rpx 20rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--muted); font-size: 21rpx; }.option-grid text.selected, .chip-grid text.selected { border-color: var(--accent); background: var(--surface-strong); color: var(--accent); }.option-grid.compact text { padding: 12rpx 18rpx; }.placement-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 22rpx; }.placement-option { display: grid; min-width: 0; overflow: hidden; grid-template-columns: 108rpx minmax(0, 1fr); border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); }.placement-option.selected { border-color: var(--accent); }.placement-option image { width: 108rpx; height: 108rpx; }.placement-option view { min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: 12rpx; }.placement-option text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.placement-option text:first-child { color: var(--text); font-size: 21rpx; font-weight: 700; }.placement-option text:last-child { margin-top: 6rpx; color: var(--muted); font-size: 17rpx; }.option-skeleton { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 22rpx; }.option-skeleton view { height: 108rpx; background: var(--surface-strong); animation: pulse 1.2s ease-in-out infinite; }.inline-error { display: flex; justify-content: space-between; margin-top: 20rpx; padding: 18rpx; background: var(--surface-strong); color: #eb9b91; font-size: 21rpx; }.inline-error text:last-child, .retry-text { color: var(--accent); }.server-billing { display: flex; justify-content: space-between; gap: 18rpx; margin-top: 22rpx; padding: 18rpx; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; }.server-billing text:last-child { color: var(--text); }.creative-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12rpx; margin-top: 20rpx; }.creative-option { min-width: 0; overflow: hidden; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); }.creative-option.selected { border-color: var(--accent); }.creative-option image { width: 100%; height: 150rpx; }.creative-option text { display: block; overflow: hidden; padding: 12rpx; color: var(--muted); font-size: 18rpx; text-overflow: ellipsis; white-space: nowrap; }.upload-progress { margin-top: 18rpx; color: var(--muted); font-size: 20rpx; }.upload-progress > view { height: 6rpx; overflow: hidden; margin-top: 9rpx; background: var(--surface-strong); }.upload-progress > view > view { height: 100%; background: var(--accent); }.compliance-check { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 24rpx; color: var(--muted); font-size: 20rpx; line-height: 1.5; }.check-box { width: 34rpx; height: 34rpx; display: inline-flex; flex: none; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 4px; }.compliance-check.checked .check-box { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }.submit-error { padding: 18rpx 20rpx; border-left: 5rpx solid #de6f64; background: var(--surface-strong); color: #eb9b91; font-size: 21rpx; }.submit-error text { display: block; }.submit-error text:last-child { margin-top: 6rpx; color: var(--muted); }.form-actions { display: flex; gap: 16rpx; }.primary-button, .secondary-button { min-height: 76rpx; display: inline-flex; flex: 1; align-items: center; justify-content: center; border-radius: 7px; font-size: 23rpx; font-weight: 700; }.primary-button { background: var(--accent); color: var(--accent-ink); }.secondary-button { border: 1rpx solid var(--line); background: var(--surface); color: var(--text); }.disabled { pointer-events: none; opacity: .5; }.preview-column { min-width: 0; }.preview-sticky { position: sticky; top: 20rpx; display: flex; flex-direction: column; gap: 18rpx; }.preview-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12rpx; }.preview-heading > text:last-child { color: var(--muted); font-size: 18rpx; }.ad-preview, .cost-summary, .status-flow { overflow: hidden; border: 1rpx solid var(--line); border-radius: 9px; background: var(--surface); }.ad-preview > image, .preview-placeholder { width: 100%; height: 260rpx; }.preview-placeholder { display: flex; align-items: center; justify-content: center; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; }.preview-body { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; padding: 22rpx; }.preview-label-row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; color: var(--muted); font-size: 17rpx; }.promotion-label { padding: 4rpx 10rpx; border: 1rpx solid var(--accent); border-radius: 4px; color: var(--accent); font-weight: 700; }.preview-title { width: 100%; overflow: hidden; margin-top: 14rpx; color: var(--text); font-size: 27rpx; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }.preview-description { display: -webkit-box; overflow: hidden; margin-top: 9rpx; color: var(--muted); font-size: 20rpx; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.preview-cta { margin-top: 17rpx; padding: 11rpx 18rpx; border-radius: 5px; background: var(--accent); color: var(--accent-ink); font-size: 19rpx; font-weight: 700; }.cost-summary, .status-flow { padding: 22rpx; }.summary-title { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 23rpx; font-weight: 700; }.cost-summary > view { display: flex; justify-content: space-between; gap: 14rpx; padding: 9rpx 0; color: var(--muted); font-size: 20rpx; }.cost-summary > view text:last-child { color: var(--text); text-align: right; }.summary-note, .status-flow > text:last-child { display: block; margin-top: 12rpx; color: var(--muted); font-size: 18rpx; line-height: 1.45; }.status-flow > view { display: flex; justify-content: space-between; gap: 8rpx; color: var(--accent); font-size: 18rpx; }.status-flow > view text { position: relative; }.status-flow > view text:not(:last-child)::after { content: '>'; margin-left: 12rpx; color: var(--muted); }.review-mask { position: fixed; z-index: 100; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(2,13,21,.76); }.review-dialog { width: 100%; max-width: 640rpx; padding: 30rpx; border: 1rpx solid var(--line); border-radius: 10px; background: var(--surface); }.review-title { display: block; font-size: 31rpx; font-weight: 750; }.review-summary { margin-top: 20rpx; padding: 18rpx; background: var(--surface-strong); }.review-summary > view { display: grid; grid-template-columns: 110rpx minmax(0, 1fr); gap: 12rpx; padding: 8rpx 0; color: var(--muted); font-size: 21rpx; }.review-summary > view text:last-child { color: var(--text); text-align: right; }.review-warning { margin-top: 18rpx; padding: 16rpx; border-left: 4rpx solid #e3a546; color: var(--muted); font-size: 20rpx; line-height: 1.5; }.review-actions { display: flex; justify-content: flex-end; gap: 34rpx; margin-top: 26rpx; color: var(--muted); font-size: 22rpx; }.review-submit { color: var(--accent); font-weight: 700; }
@keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
@media (max-width: 760px) { .create-layout { grid-template-columns: 1fr; }.preview-column { order: -1; }.preview-sticky { position: static; }.cost-summary, .status-flow { display: none; }.placement-options { grid-template-columns: 1fr; }.creative-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 460px) { .field-row { flex-direction: column; gap: 0; }.creative-grid { grid-template-columns: 1fr; }.form-actions { position: sticky; z-index: 10; bottom: 0; padding: 14rpx 0; background: var(--app-bg); } }
@media (prefers-reduced-motion: reduce) { .option-skeleton view { animation: none; } }
</style>
