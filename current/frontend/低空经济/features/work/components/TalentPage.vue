<template>
  <work-scaffold :title="publicMode ? '企业主页' : '企业招聘中心'">
    <view v-if="loading" class="request-state">正在加载企业招聘数据...</view>
    <view v-else-if="error" class="state-panel error"><text class="state-title">加载失败</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="load">重试</view></view></view>
    <template v-else-if="publicMode">
      <work-media-hero :eyebrow="company.verifiedLabel" :title="company.name" :note="company.industry + ' · ' + company.scale + ' · ' + company.address" />
      <view class="panel"><text class="panel-title">企业简介</text><text class="state-copy">{{ company.intro }}</text></view>
      <view class="section"><view class="section-head"><text class="section-title">在招职位</text><text class="section-note">{{ company.jobs.length }} 个</text></view><view class="item-list"><view v-for="job in company.jobs" :key="job.id" class="item-card" @tap="openJob(job.id)"><view class="card-head"><text class="card-title">{{ job.title }}</text><text class="price">{{ salary(job.salaryMin, job.salaryMax) }}</text></view><text class="card-note">{{ job.city }} · {{ job.caac }} · {{ job.experience }}</text></view></view></view>
      <view class="button primary" @tap="messageCompany">平台内沟通</view>
      <text class="demo-disclaimer">公开企业页不展示候选人、面试、招聘统计或联系方式等经营数据。</text>
    </template>
    <template v-else>
      <view v-if="!allowed" class="state-panel warning"><text class="state-title">需要企业认证</text><text class="state-copy">候选人和经营数据仅对认证企业开放，认证前不会加载任何候选人资料。</text><view class="button-row"><view class="button primary" @tap="verifyEnterprise">去企业认证</view></view></view>
      <template v-else>
        <work-media-hero :eyebrow="company.verifiedLabel + ' · 演示经营数据'" :title="company.name" note="候选人资料默认脱敏；未建立沟通前不展示手机号。" />
        <view class="metric-grid"><view class="metric"><text class="metric-value">{{ company.hiringSummary.openJobs }}</text><text class="metric-label">在招职位</text></view><view class="metric"><text class="metric-value">{{ company.hiringSummary.newCandidates }}</text><text class="metric-label">新候选人</text></view><view class="metric"><text class="metric-value">{{ company.hiringSummary.interviews }}</text><text class="metric-label">待确认面试</text></view></view>
        <view class="segment four"><text v-for="item in tabs" :key="item.key" class="segment-item" :class="{ active: tab === item.key }" @tap="tab = item.key">{{ item.label }}</text></view>

        <template v-if="tab === 'jobs'">
          <view class="button-row"><view class="button primary" @tap="publishJob">发布职位</view><view class="button secondary" @tap="promote">招聘推广（广告）</view></view>
          <view class="item-list"><view v-for="job in jobs" :key="job.id" class="item-card"><view class="card-head"><text class="card-title">{{ job.title }}</text><text class="tag">{{ statusText(job.status) }}</text></view><text class="card-note">{{ job.city }} · {{ salary(job.salaryMin, job.salaryMax) }}</text><view class="button-row"><view class="button secondary" @tap="openJob(job.id)">预览</view><view class="button warning" @tap="askJobStatus(job)">{{ job.status === 'paused' ? '恢复招聘' : '暂停职位' }}</view></view></view></view>
        </template>

        <template v-else-if="tab === 'candidates' || tab === 'talent'">
          <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><text v-for="item in candidateStatuses" :key="item.key" class="filter-chip" :class="{ active: filters.status === item.key }" @tap="setCandidateFilter('status', item.key)">{{ item.label }}</text><text v-for="item in ['全部','北京','天津']" :key="item" class="filter-chip" :class="{ active: filters.city === item }" @tap="setCandidateFilter('city', item)">{{ item }}</text><text v-for="item in ['全部','视距内','超视距']" :key="item" class="filter-chip" :class="{ active: filters.caac === item }" @tap="setCandidateFilter('caac', item)">{{ item === '全部' ? '全部资质' : item }}</text></view></scroll-view>
          <view class="panel"><view v-for="candidate in candidates" :key="candidate.id" class="candidate-card"><view class="candidate-head"><text class="candidate-name">{{ candidate.maskedName }}</text><text class="tag" :class="candidate.status === 'interview' ? 'success' : ''">{{ candidate.statusLabel }}</text></view><view class="meta-row"><text>{{ candidate.city }}</text><text>{{ candidate.caac }}</text><text>{{ candidate.aircraft }}</text><text>{{ candidate.availability }}到岗</text></view><text class="card-note">{{ candidate.experience }} · {{ candidate.maskedPhone }}</text><text class="candidate-reasons">字段匹配依据：{{ candidate.matchReasons.join('、') }}</text><view class="button-row"><view class="button primary" @tap="openInvite(candidate)">安排面试</view><view class="button danger" @tap="askReject(candidate)">拒绝</view></view></view><view v-if="!candidates.length" class="request-state">暂无符合筛选的候选人</view></view>
        </template>

        <template v-else>
          <view v-if="companyInterviews.length" class="item-list"><view v-for="item in companyInterviews" :key="item.id" class="item-card"><view class="card-head"><text class="card-title">{{ item.candidateName }} · {{ item.jobTitle }}</text><text class="tag current">{{ item.statusLabel }}</text></view><text class="card-note">{{ item.at }} · {{ item.method }}</text></view></view><view v-else class="request-state">暂无面试安排</view>
        </template>
        <text class="demo-disclaimer">招聘经营数据为演示环境。候选人匹配原因由明确字段规则生成，不代表成熟 AI 评分。</text>
      </template>
    </template>

    <view v-if="inviteCandidateTarget" class="sheet-mask" @tap.self="inviteCandidateTarget = null"><view class="sheet-panel"><text class="sheet-title">安排面试：{{ inviteCandidateTarget.maskedName }}</text><view class="field-block"><text class="field-label">面试时间</text><input v-model="inviteForm.at" class="input" placeholder="例如：2026-08-03 14:00" /></view><view class="field-block"><text class="field-label">面试方式</text><input v-model="inviteForm.method" class="input" placeholder="平台视频或线下地址" /></view><view class="field-block"><text class="field-label">职位</text><input v-model="inviteForm.jobTitle" class="input" placeholder="职位名称" /></view><view class="button-row"><view class="button secondary" @tap="inviteCandidateTarget = null">取消</view><view class="button primary" @tap="submitInvite">发送邀请</view></view></view></view>
    <work-confirm :visible="Boolean(confirmAction)" :busy="actionBusy" :title="confirmAction && confirmAction.title" :message="confirmAction && confirmAction.message" :consequence="confirmAction && confirmAction.consequence" :confirm-text="confirmAction && confirmAction.confirmText" :require-reason="confirmAction && confirmAction.requireReason" @cancel="confirmAction = null" @confirm="runConfirmed" />
  </work-scaffold>
</template>

<script>
import { getAuthState } from '../../../utils/auth'
import { getRouteOptions } from '../../shared/utils/route-options'
import WorkConfirm from './WorkConfirm.vue'
import WorkMediaHero from './WorkMediaHero.vue'
import WorkScaffold from './WorkScaffold.vue'
import { getCompany, inviteCandidate, listCandidates, listCompanyInterviews, listCompanyJobs, rejectCandidate, updateCompanyJob } from '../services'
import { salary, statusText } from '../utils'

export default {
  name: 'TalentPage', components: { WorkConfirm, WorkMediaHero, WorkScaffold },
  data() { return { mode: 'console', companyId: 'company-01', company: null, jobs: [], candidates: [], companyInterviews: [], loading: true, error: '', tab: 'jobs', tabs: [{ key: 'jobs', label: '在招职位' }, { key: 'candidates', label: '候选人' }, { key: 'interviews', label: '面试' }, { key: 'talent', label: '人才库' }], filters: { status: 'all', city: '全部', caac: '全部' }, candidateStatuses: [{ key: 'all', label: '全部状态' }, { key: 'new', label: '新投递' }, { key: 'contacted', label: '已沟通' }, { key: 'interview', label: '面试中' }], inviteCandidateTarget: null, inviteForm: { at: '', method: '平台视频', jobTitle: '无人机巡检飞手' }, confirmAction: null, actionBusy: false } },
  computed: { publicMode() { return this.mode === 'company' }, allowed() { return getAuthState().enterprise } },
  mounted() { const options = getRouteOptions(); this.mode = options.mode === 'company' ? 'company' : 'console'; this.companyId = options.id || 'company-01'; this.load() },
  methods: {
    salary, statusText,
    async load() { this.loading = true; this.error = ''; try { if (this.publicMode) { this.company = await getCompany(this.companyId); return } if (!this.allowed) { this.company = { name: '企业招聘中心', verifiedLabel: '待认证', hiringSummary: { openJobs: 0, newCandidates: 0, interviews: 0 } }; return } const [company, jobs, candidates, interviews] = await Promise.all([getCompany(this.companyId), listCompanyJobs(), listCandidates(this.filters), listCompanyInterviews()]); this.company = company; this.jobs = jobs; this.candidates = candidates; this.companyInterviews = interviews } catch (error) { this.error = error.message } finally { this.loading = false } },
    async setCandidateFilter(key, value) { this.filters[key] = value; try { this.candidates = await listCandidates(this.filters) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } },
    openJob(id) { uni.navigateTo({ url: '/pages/work/job-detail?id=' + encodeURIComponent(id) }) }, publishJob() { uni.navigateTo({ url: '/pages/work/publish?type=job' }) }, promote() { uni.navigateTo({ url: '/pages/ad/index?biz=recruitment' }) }, messageCompany() { uni.navigateTo({ url: '/pages/messages/index?conversationId=company-' + encodeURIComponent(this.companyId) }) }, verifyEnterprise() { uni.navigateTo({ url: '/pages/profile/account?mode=enterprise&redirect=' + encodeURIComponent('/pages/work/talent') }) },
    askJobStatus(job) { const resume = job.status === 'paused'; this.confirmAction = { type: 'jobStatus', item: job, action: resume ? 'resume' : 'pause', title: resume ? '恢复职位' : '暂停职位', message: '确认' + (resume ? '恢复' : '暂停') + '“' + job.title + '”吗？', consequence: resume ? '职位将重新出现在招聘列表，仍以服务端审核状态为准。' : '暂停后将停止接收新投递，已有候选人记录保留。', confirmText: resume ? '确认恢复' : '确认暂停' } },
    askReject(candidate) { this.confirmAction = { type: 'reject', item: candidate, title: '拒绝候选人', message: '确认拒绝候选人 ' + candidate.maskedName + ' 吗？', consequence: '候选人将收到招聘状态更新，企业仍需遵守招聘隐私与平等就业要求。', confirmText: '确认拒绝', requireReason: true } },
    openInvite(candidate) { this.inviteCandidateTarget = candidate; this.inviteForm = { at: '', method: '平台视频', jobTitle: '无人机巡检飞手' } },
    async submitInvite() { if (!this.inviteForm.at || !this.inviteForm.jobTitle) return uni.showToast({ title: '请填写面试时间和职位', icon: 'none' }); try { const item = await inviteCandidate(this.inviteCandidateTarget.id, this.inviteForm); this.companyInterviews.unshift(item); this.inviteCandidateTarget = null; await this.setCandidateFilter('status', this.filters.status); uni.showToast({ title: '面试邀请已发送', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } },
    async runConfirmed(reason) { if (!this.confirmAction || this.actionBusy) return; this.actionBusy = true; try { if (this.confirmAction.type === 'jobStatus') { const updated = await updateCompanyJob(this.confirmAction.item.id, this.confirmAction.action); this.jobs = this.jobs.map((item) => item.id === updated.id ? updated : item) } else { await rejectCandidate(this.confirmAction.item.id, reason); await this.setCandidateFilter('status', this.filters.status) } this.confirmAction = null } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.actionBusy = false } }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
