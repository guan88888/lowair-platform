<template>
  <work-scaffold :title="type === 'job' ? '发布职位' : '发布任务'">
    <view class="segment"><text class="segment-item" :class="{ active: type === 'task' }" @tap="changeType('task')">临时任务</text><text class="segment-item" :class="{ active: type === 'job' }" @tap="changeType('job')">全职职位</text></view>
    <view v-if="permissionBlocked" class="state-panel warning"><text class="state-title">{{ permissionTitle }}</text><text class="state-copy">{{ permissionCopy }}</text><view class="button-row"><view class="button primary" @tap="goVerification">去认证</view></view></view>
    <template v-else>
      <view class="form-section"><text class="form-title">需求草稿</text><view class="field-block"><text class="field-label">用自然语言描述需求</text><textarea v-model="prompt" class="textarea" :placeholder="type === 'job' ? '例如：北京招聘超视距巡检飞手，熟悉 M350 RTK...' : '例如：8 月 5 日在杭州执行园区航测，需要 Mavic 3E...'" @input="dirty = true" /><text class="field-help">AI 仅协助生成可编辑草稿，不代表字段真实或审核通过。当前为本地规则提取，不调用外部模型。</text></view><view class="button-row"><view class="button secondary" @tap="parsePrompt">生成可编辑草稿</view></view></view>

      <template v-if="type === 'job'">
        <view class="form-section"><text class="form-title">职位信息</text><work-field label="职位名称" field-key="title" :model-value="form.title" :error="errors.title" @update="updateField" /><work-field label="城市" field-key="city" :model-value="form.city" :error="errors.city" @update="updateField" /><work-field label="最低月薪（元）" field-key="salaryMin" type="number" :model-value="form.salaryMin" :error="errors.salaryMin" @update="updateField" /><work-field label="最高月薪（元）" field-key="salaryMax" type="number" :model-value="form.salaryMax" :error="errors.salaryMax" @update="updateField" /><work-field label="用工类型" field-key="employment" :model-value="form.employment" :error="errors.employment" @update="updateField" /><work-field label="经验要求" field-key="experience" :model-value="form.experience" :error="errors.experience" @update="updateField" /><work-field label="学历" field-key="education" :model-value="form.education" @update="updateField" /><work-field label="CAAC 等级" field-key="caac" :model-value="form.caac" :error="errors.caac" @update="updateField" /><work-field label="主要机型" field-key="aircraft" :model-value="form.aircraft" :error="errors.aircraft" @update="updateField" /><work-field label="岗位职责" field-key="responsibilities" multiline :model-value="form.responsibilities" :error="errors.responsibilities" @update="updateField" /><work-field label="任职条件" field-key="requirements" multiline :model-value="form.requirements" :error="errors.requirements" @update="updateField" /><work-field label="福利" field-key="benefits" :model-value="form.benefits" @update="updateField" /></view>
      </template>
      <template v-else>
        <view class="form-section"><text class="form-title">任务工单</text><work-field label="作业类型" field-key="title" :model-value="form.title" :error="errors.title" @update="updateField" /><work-field label="城市" field-key="city" :model-value="form.city" :error="errors.city" @update="updateField" /><work-field label="保护后地点范围" field-key="location" :model-value="form.location" :error="errors.location" @update="updateField" /><work-field label="作业时间" field-key="workAt" :model-value="form.workAt" :error="errors.workAt" @update="updateField" /><work-field label="报名截止时间" field-key="deadline" :model-value="form.deadline" :error="errors.deadline" @update="updateField" /><work-field label="所需机型" field-key="aircraft" :model-value="form.aircraft" :error="errors.aircraft" @update="updateField" /><work-field label="CAAC 等级" field-key="caac" :model-value="form.caac" :error="errors.caac" @update="updateField" /><work-field label="预计时长" field-key="duration" :model-value="form.duration" :error="errors.duration" @update="updateField" /><work-field label="预算（元）" field-key="budget" type="number" :model-value="form.budget" :error="errors.budget" @update="updateField" /><work-field label="交付格式" field-key="delivery" multiline :model-value="form.delivery" :error="errors.delivery" @update="updateField" /><work-field label="验收标准" field-key="acceptance" multiline :model-value="form.acceptance" :error="errors.acceptance" @update="updateField" /><work-field label="任务说明" field-key="description" multiline :model-value="form.description" :error="errors.description" @update="updateField" /></view>
        <view class="form-section"><text class="form-title">附加设置</text><view class="switch-row"><text>加急（预算增加 20%）</text><switch color="#19cfa0" :checked="form.urgent" @change="toggleUrgent" /></view><view class="summary-row"><text>基础预算</text><text>{{ money(form.budget) }}</text></view><view class="summary-row"><text>加急增加</text><text>{{ form.urgent ? money(Number(form.budget || 0) * 0.2) : '未启用' }}</text></view><view class="summary-row"><text>预计发布预算</text><text>{{ money(taskTotal) }}</text></view><view class="summary-row"><text>派单方式</text><text>公开抢单</text></view><view class="summary-row"><text>隐私号码</text><text>可用，以服务端状态为准</text></view></view>
      </template>

      <view class="safety-panel"><text class="state-title">接入状态与风险提示</text><text class="state-copy">发布将先进入审核，不会立即上线。托管需在任务选定飞手后由后端创建；CA 签章和保险当前不得视为成功；隐私号码按服务端能力启用。</text></view>
      <view class="button-row"><view class="button secondary" @tap="preview = true">预览确认</view><view class="button primary" :class="{ disabled: submitting }" @tap="prepareSubmit">{{ submitting ? '提交中...' : '提交审核' }}</view></view>
    </template>

    <view v-if="preview" class="sheet-mask" @tap.self="preview = false"><view class="sheet-panel"><text class="sheet-title">提交前确认</text><view class="panel"><view v-for="item in previewRows" :key="item[0]" class="summary-row"><text>{{ item[0] }}</text><text>{{ item[1] || '未填写' }}</text></view></view><text class="state-copy">确认内容准确后再提交；审核、资金、签章和保险状态由后端推进。</text><view class="button-row"><view class="button secondary" @tap="preview = false">继续编辑</view><view class="button primary" @tap="submit">确认提交</view></view></view></view>
  </work-scaffold>
</template>

<script>
import { getAuthState } from '../../../utils/auth'
import { getRouteOptions } from '../../shared/utils/route-options'
import WorkField from './WorkField.vue'
import WorkScaffold from './WorkScaffold.vue'
import { publishWorkOrder } from '../services'
import { money, validatePublish } from '../utils'

const emptyJob = () => ({ title: '', city: '', salaryMin: '', salaryMax: '', employment: '全职', experience: '', education: '', caac: '', aircraft: '', responsibilities: '', requirements: '', benefits: '', environment: '' })
const emptyTask = () => ({ title: '', city: '', location: '', workAt: '', deadline: '', aircraft: '', caac: '', duration: '', budget: '', delivery: '', acceptance: '', description: '', urgent: false })

export default {
  name: 'PublishPage', components: { WorkField, WorkScaffold },
  data() { return { type: 'task', prompt: '', form: emptyTask(), errors: {}, preview: false, dirty: false, submitting: false } },
  computed: {
    auth() { return getAuthState() }, permissionBlocked() { return this.type === 'job' ? !this.auth.enterprise : !this.auth.verified },
    permissionTitle() { return this.type === 'job' ? '发布职位需要企业认证' : '发布任务需要实名认证' }, permissionCopy() { return this.type === 'job' ? '企业认证通过后才可提交全职职位审核。' : '实名认证通过后才可提交临时任务审核。' },
    taskTotal() { return Number(this.form.budget || 0) * (this.form.urgent ? 1.2 : 1) },
    previewRows() { return this.type === 'job' ? [['职位', this.form.title], ['地点', this.form.city], ['薪资', money(this.form.salaryMin) + ' - ' + money(this.form.salaryMax)], ['资质与机型', this.form.caac + ' / ' + this.form.aircraft], ['状态', '提交后进入审核']] : [['任务', this.form.title], ['地点', this.form.city + ' ' + this.form.location], ['时间', this.form.workAt], ['预算', money(this.taskTotal)], ['交付', this.form.delivery], ['验收', this.form.acceptance], ['状态', '提交后进入审核']] }
  },
  mounted() { const options = getRouteOptions(); this.type = options.type === 'job' ? 'job' : 'task'; this.restoreDraft() },
  beforeUnmount() { this.saveDraft() },
  methods: {
    money,
    changeType(type) { if (this.type === type) return; this.saveDraft(); this.type = type; this.restoreDraft() },
    updateField({ key, value }) { this.form[key] = value; delete this.errors[key]; this.dirty = true; this.saveDraft() },
    toggleUrgent(event) { this.form.urgent = event.detail.value; this.dirty = true; this.saveDraft() },
    parsePrompt() { const value = this.prompt.trim(); if (!value) return uni.showToast({ title: '请先描述需求', icon: 'none' }); if (/北京/.test(value)) this.form.city = '北京'; if (/杭州/.test(value)) this.form.city = '杭州'; if (/成都/.test(value)) this.form.city = '成都'; if (/超视距/.test(value)) this.form.caac = '超视距'; else if (/视距内/.test(value)) this.form.caac = '视距内'; const aircraft = ['M350 RTK', 'Matrice 30T', 'Mavic 3E', 'Mavic 3 Pro', 'T60'].find((item) => value.includes(item)); if (aircraft) this.form.aircraft = aircraft; if (!this.form.title) this.form.title = this.type === 'job' ? '无人机作业岗位' : '无人机临时作业'; this.dirty = true; this.saveDraft(); uni.showToast({ title: '草稿已生成，请逐项确认', icon: 'none' }) },
    prepareSubmit() { this.errors = validatePublish(this.type, this.form); if (Object.keys(this.errors).length) return uni.showToast({ title: '请修正必填项和时间、金额冲突', icon: 'none' }); this.preview = true },
    async submit() { if (this.submitting) return; this.submitting = true; try { const result = await publishWorkOrder(this.type, this.form); uni.removeStorageSync('lowair-work-publish-' + this.type); this.dirty = false; this.preview = false; uni.showToast({ title: '已提交审核', icon: 'none' }); setTimeout(() => uni.redirectTo({ url: this.type === 'job' ? '/pages/work/job-detail?id=' + result.id + '&owner=1' : '/pages/work/task-detail?id=' + result.id + '&owner=1' }), 300) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.submitting = false } },
    saveDraft() { if (this.dirty) uni.setStorageSync('lowair-work-publish-' + this.type, { prompt: this.prompt, form: this.form }) },
    restoreDraft() { const saved = uni.getStorageSync('lowair-work-publish-' + this.type); this.form = saved?.form || (this.type === 'job' ? emptyJob() : emptyTask()); this.prompt = saved?.prompt || ''; this.errors = {}; this.dirty = Boolean(saved) },
    goVerification() { const mode = this.type === 'job' ? 'enterprise' : 'personal'; uni.navigateTo({ url: '/pages/profile/account?mode=' + mode + '&redirect=' + encodeURIComponent('/pages/work/publish?type=' + this.type) }) }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
