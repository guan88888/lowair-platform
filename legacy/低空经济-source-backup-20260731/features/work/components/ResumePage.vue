<template>
  <work-scaffold title="求职中心">
    <view class="hero-strip"><view class="hero-content"><text class="eyebrow">仅显示个人身份数据</text><text class="hero-title">简历完整度 {{ resumeCompleteness }}%</text><text class="hero-note">公开状态：{{ form.visibility === 'public' ? '对认证招聘方可见' : '仅投递后可见' }}。证书提交状态和平台核验状态分开显示。</text></view></view>
    <view class="segment three"><text v-for="item in tabs" :key="item.key" class="segment-item" :class="{ active: tab === item.key }" @tap="setTab(item.key)">{{ item.label }}</text></view>

    <view v-if="loading" class="request-state">正在加载求职数据...</view>
    <view v-else-if="error" class="state-panel error"><text class="state-title">加载失败</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="load">重试</view></view></view>

    <template v-else-if="tab === 'resume'">
      <view class="form-section"><text class="form-title">求职意向与基本信息</text><view class="field-block"><text class="field-label">求职意向</text><input v-model="form.intention" class="input" placeholder="例如：无人机巡检飞手" @input="markDirty" /></view><view class="field-block"><text class="field-label">姓名</text><input v-model="form.name" class="input" placeholder="请输入姓名" @input="markDirty" /></view><view class="field-block"><text class="field-label">常驻城市</text><input v-model="form.city" class="input" placeholder="请输入城市" @input="markDirty" /></view><view class="switch-row"><text>允许认证企业在人才库搜索</text><switch color="#19cfa0" :checked="form.visibility === 'public'" @change="setVisibility" /></view></view>
      <view class="form-section"><text class="form-title">资质与机型能力</text><view class="field-block"><text class="field-label">CAAC 证书等级</text><input v-model="form.caacLevel" class="input" placeholder="视距内或超视距" @input="markDirty" /><text class="field-help">用户提交：{{ form.certificateNumber || '未提交' }}；平台核验：{{ form.certificateVerified ? '已核验' : '未核验' }}</text></view><view class="field-block"><text class="field-label">熟练机型</text><input v-model="form.aircraft" class="input" placeholder="使用顿号分隔机型" @input="markDirty" /></view><view class="button-row"><view class="button secondary" @tap="goCaac">查看 CAAC 核验</view></view></view>
      <view class="form-section"><text class="form-title">项目经历</text><view class="field-block"><text class="field-label">经历说明</text><textarea v-model="form.experience" class="textarea" placeholder="说明项目职责、作业类型与交付内容" @input="markDirty" /></view></view>
      <view class="form-section"><text class="form-title">教育经历</text><view class="field-block"><text class="field-label">学校、专业与学历</text><input v-model="form.education" class="input" placeholder="请输入教育经历" @input="markDirty" /></view></view>
      <view class="form-section"><view class="section-head"><text class="form-title">附件简历</text><text class="link" @tap="selectAttachment">上传附件</text></view><text class="field-help">支持 PDF、DOC、DOCX，单个文件不超过 10 MB。附件失败后可重新选择并重试。</text><view v-if="uploading" class="attachment"><text class="attachment-name">正在上传...</text><text class="muted">处理中</text></view><view v-for="file in form.attachments" :key="file.id" class="attachment"><text class="attachment-name">{{ file.name }}</text><text class="muted">{{ file.size }} · {{ file.status === 'uploaded' ? '已上传' : '失败可重试' }}</text></view></view>
      <view class="button-row"><view class="button secondary" @tap="previewResume">预览</view><view class="button primary" :class="{ disabled: saving || !dirty }" @tap="save">{{ saving ? '保存中...' : dirty ? '保存简历' : '已保存' }}</view></view>
    </template>

    <template v-else-if="tab === 'applications'">
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><text v-for="item in applicationFilters" :key="item.key" class="filter-chip" :class="{ active: applicationStatus === item.key }" @tap="applicationStatus = item.key">{{ item.label }}</text></view></scroll-view>
      <view v-if="filteredApplications.length" class="item-list"><view v-for="item in filteredApplications" :key="item.id" class="item-card" @tap="openJob(item.jobId)"><view class="card-head"><text class="card-title">{{ item.jobTitle }}</text><text class="tag" :class="item.status === 'interview' ? 'success' : ''">{{ item.statusLabel }}</text></view><text class="card-note">{{ item.companyName }} · 投递于 {{ item.appliedAt }}</text><view v-if="item.withdrawable" class="button-row"><view class="button danger" @tap.stop="askWithdraw(item)">撤回投递</view></view></view></view>
      <view v-else class="request-state"><text>暂无匹配的投递记录</text><view class="button-row"><view class="button primary" @tap="findJobs">去找职位</view></view></view>
    </template>

    <template v-else>
      <view v-if="interviews.length" class="item-list"><view v-for="item in interviews" :key="item.id" class="item-card"><view class="card-head"><text class="card-title">{{ item.jobTitle }}</text><text class="tag current">{{ item.statusLabel }}</text></view><text class="card-note">{{ item.companyName }} · {{ item.at }}</text><view class="meta-row"><text>{{ item.method }}</text><text>{{ item.contact }}</text></view><view v-if="item.status === 'pending'" class="button-row"><view class="button primary" @tap="respond(item, 'accept')">接受</view><view class="button secondary" @tap="respond(item, 'reschedule')">申请改期</view><view class="button danger" @tap="askDecline(item)">拒绝</view></view></view></view>
      <view v-else class="request-state">暂无面试邀请</view>
    </template>

    <view v-if="showPreview" class="sheet-mask" @tap.self="showPreview = false"><view class="sheet-panel"><text class="sheet-title">简历预览</text><view class="panel"><text class="state-title">{{ form.name || '未填写姓名' }} · {{ form.intention || '未填写求职意向' }}</text><text class="card-note">{{ form.city }} · {{ form.caacLevel }} · {{ form.aircraft }}</text></view><view class="panel"><text class="panel-title">项目经历</text><text class="state-copy">{{ form.experience || '未填写' }}</text></view><view class="button primary" @tap="showPreview = false">关闭预览</view></view></view>
    <work-confirm :visible="Boolean(confirmAction)" :busy="actionBusy" :title="confirmAction && confirmAction.title" :message="confirmAction && confirmAction.message" :consequence="confirmAction && confirmAction.consequence" :confirm-text="confirmAction && confirmAction.confirmText" require-reason @cancel="confirmAction = null" @confirm="runConfirmed" />
  </work-scaffold>
</template>

<script>
import WorkConfirm from './WorkConfirm.vue'
import WorkScaffold from './WorkScaffold.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { getResume, listApplications, listInterviews, respondInterview, saveResume, uploadResumeAttachment, withdrawApplication } from '../services'
import { chooseDocument, completeness } from '../utils'

export default {
  name: 'ResumePage', components: { WorkConfirm, WorkScaffold },
  data() { return { tab: 'resume', returnJobId: '', tabs: [{ key: 'resume', label: '我的简历' }, { key: 'applications', label: '投递进度' }, { key: 'interviews', label: '面试邀请' }], form: { attachments: [] }, applications: [], interviews: [], loading: true, error: '', dirty: false, saving: false, uploading: false, showPreview: false, applicationStatus: 'all', applicationFilters: [{ key: 'all', label: '全部' }, { key: 'submitted', label: '已投递' }, { key: 'viewed', label: '已查看' }, { key: 'interview', label: '邀面' }, { key: 'withdrawn', label: '已结束' }], confirmAction: null, actionBusy: false } },
  computed: { resumeCompleteness() { return completeness(this.form) }, filteredApplications() { return this.applicationStatus === 'all' ? this.applications : this.applications.filter((item) => item.status === this.applicationStatus) } },
  mounted() { const options = getRouteOptions(); this.tab = ['resume', 'applications', 'interviews'].includes(options.tab) ? options.tab : 'resume'; this.returnJobId = options.returnJobId || ''; this.load() },
  onBackPress() { if (!this.dirty) return false; uni.showModal({ title: '简历尚未保存', content: '离开后本次修改将丢失，仍要离开吗？', success: ({ confirm }) => { if (confirm) { this.dirty = false; uni.navigateBack() } } }); return true },
  methods: {
    async load() { this.loading = true; this.error = ''; try { const [resume, applications, interviews] = await Promise.all([getResume(), listApplications(), listInterviews()]); this.form = resume; this.applications = applications; this.interviews = interviews; this.dirty = false } catch (error) { this.error = error.message } finally { this.loading = false } },
    setTab(tab) { this.tab = tab }, markDirty() { this.dirty = true }, setVisibility(event) { this.form.visibility = event.detail.value ? 'public' : 'private'; this.markDirty() },
    async save() { if (!this.dirty || this.saving) return; this.saving = true; try { this.form = await saveResume(this.form); this.dirty = false; uni.showToast({ title: '简历已保存', icon: 'none' }); if (this.returnJobId) uni.redirectTo({ url: '/pages/work/job-detail?id=' + encodeURIComponent(this.returnJobId) }) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.saving = false } },
    async selectAttachment() { if (this.uploading) return; this.uploading = true; try { const file = await chooseDocument(); const attachment = await uploadResumeAttachment(file); this.form.attachments = [...(this.form.attachments || []), attachment]; this.dirty = true; uni.showToast({ title: '附件已上传', icon: 'none' }) } catch (error) { if (error && error.errMsg && /cancel/.test(error.errMsg)) return; uni.showToast({ title: error.message || '附件上传失败，可重试', icon: 'none' }) } finally { this.uploading = false } },
    previewResume() { this.showPreview = true }, goCaac() { uni.navigateTo({ url: '/pages/profile/account?mode=caac' }) }, openJob(id) { uni.navigateTo({ url: '/pages/work/job-detail?id=' + encodeURIComponent(id) }) }, findJobs() { uni.reLaunch({ url: '/pages/work/index' }) },
    askWithdraw(item) { this.confirmAction = { type: 'withdraw', item, title: '撤回投递', message: '确认撤回“' + item.jobTitle + '”的投递吗？', consequence: '企业将不能继续按此投递推进招聘，撤回后需要重新投递。', confirmText: '确认撤回' } },
    askDecline(item) { this.confirmAction = { type: 'decline', item, title: '拒绝面试', message: '确认拒绝此次面试邀请吗？', consequence: '企业将收到拒绝状态；如需改期，建议取消并选择“申请改期”。', confirmText: '确认拒绝' } },
    async runConfirmed(reason) { if (!this.confirmAction || this.actionBusy) return; this.actionBusy = true; try { if (this.confirmAction.type === 'withdraw') { const updated = await withdrawApplication(this.confirmAction.item.id, reason); this.applications = this.applications.map((item) => item.id === updated.id ? updated : item) } else { await this.respond(this.confirmAction.item, 'decline', reason) } this.confirmAction = null } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.actionBusy = false } },
    async respond(item, action, note = '') { try { const updated = await respondInterview(item.id, action, note); this.interviews = this.interviews.map((entry) => entry.id === updated.id ? updated : entry); uni.showToast({ title: updated.statusLabel, icon: 'none' }) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
