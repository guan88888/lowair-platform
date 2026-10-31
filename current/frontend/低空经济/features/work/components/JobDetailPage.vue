<template>
  <work-scaffold title="职位详情">
    <view v-if="loading" class="request-state">正在加载职位...</view>
    <view v-else-if="error" class="state-panel error"><text class="state-title">无法查看职位</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="load">重试</view><view class="button primary" @tap="backToWork">返回职位列表</view></view></view>
    <template v-else-if="job">
      <work-media-hero :eyebrow="job.verifiedCompany ? '认证企业直招' : '企业认证状态待核验'" :title="job.title" :note="salary(job.salaryMin, job.salaryMax) + ' · ' + job.city + job.district + ' · ' + job.employment + ' · 更新于 ' + job.updatedAt" />
      <view v-if="application" class="state-panel"><text class="state-title">投递状态：{{ application.statusLabel }}</text><text class="state-copy">“企业已查看”仅表示简历被打开，不代表录用。面试安排以正式邀请为准。</text><view class="button-row"><view class="button secondary" @tap="goApplications">查看投递</view></view></view>
      <view v-if="job.status !== 'recruiting'" class="state-panel warning"><text class="state-title">职位当前{{ statusText(job.status) }}</text><text class="state-copy">当前状态不可新投递，请返回列表查看其他职位。</text></view>
      <view class="panel"><text class="panel-title">关键要求</text><view class="key-grid"><view class="key-cell"><text class="key-label">CAAC</text><text class="key-value">{{ job.caac || '企业未填写' }}</text></view><view class="key-cell"><text class="key-label">熟练机型</text><text class="key-value">{{ job.aircraft.length ? job.aircraft.join('、') : '企业未填写' }}</text></view><view class="key-cell"><text class="key-label">经验</text><text class="key-value">{{ job.experience || '企业未填写' }}</text></view><view class="key-cell"><text class="key-label">学历</text><text class="key-value">{{ job.education || '企业未填写' }}</text></view></view></view>
      <view class="panel"><text class="panel-title">岗位职责</text><view v-if="job.responsibilities.length" class="plain-list"><text v-for="item in job.responsibilities" :key="item" class="plain-row">{{ item }}</text></view><text v-else class="muted">企业未填写</text></view>
      <view class="panel"><text class="panel-title">任职条件</text><view v-if="job.requirements.length" class="plain-list"><text v-for="item in job.requirements" :key="item" class="plain-row">{{ item }}</text></view><text v-else class="muted">企业未填写</text></view>
      <view class="panel"><text class="panel-title">福利与作业环境</text><view class="plain-list"><text v-for="item in job.benefits" :key="item" class="plain-row">{{ item }}</text></view><text class="card-note">{{ job.environment || '企业未填写' }}</text></view>
      <view class="panel" @tap="openCompany"><view class="section-head"><text class="panel-title">企业摘要</text><text class="link">企业主页 ›</text></view><text class="state-title">{{ job.companyName }}</text><view class="meta-row"><text>{{ job.company.verifiedLabel }}</text><text>{{ job.company.industry }}</text><text>{{ job.company.scale }}</text><text>在招 {{ job.company.openJobs }} 个</text></view><text class="card-note">{{ job.company.address }}</text></view>
      <view class="bottom-actions"><view class="button secondary" @tap="favorite">{{ favorited ? '已收藏' : '收藏' }}</view><view class="button secondary" @tap="message">平台内沟通</view><view class="button primary" :class="{ disabled: submitting || job.status !== 'recruiting' || Boolean(application) }" @tap="startApply">{{ submitting ? '提交中...' : application ? '已投递' : '立即投递' }}</view></view>
    </template>
    <work-confirm :visible="confirmApply" :busy="submitting" title="确认投递" message="将使用当前个人简历投递此职位。" consequence="投递后企业可在授权范围内查看你的简历；你可在允许状态内撤回。" confirm-text="确认投递" @cancel="confirmApply = false" @confirm="submitApply" />
  </work-scaffold>
</template>

<script>
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'
import { getRouteOptions } from '../../shared/utils/route-options'
import WorkConfirm from './WorkConfirm.vue'
import WorkMediaHero from './WorkMediaHero.vue'
import WorkScaffold from './WorkScaffold.vue'
import { applyForJob, getJob, getResume, listApplications } from '../services'
import { completeness, salary, statusText } from '../utils'

export default {
  name: 'JobDetailPage', components: { WorkConfirm, WorkMediaHero, WorkScaffold },
  data() { return { id: '', job: null, resume: null, application: null, loading: true, error: '', submitting: false, confirmApply: false, favorited: false } },
  mounted() { const options = getRouteOptions(); this.id = options.id || ''; this.load() },
  methods: {
    salary, statusText,
    async load() { this.loading = true; this.error = ''; try { if (!this.id) throw new Error('缺少职位 id'); const auth = getAuthState(); this.job = await getJob(this.id); if (auth.loggedIn) { const [resume, applications] = await Promise.all([getResume(), listApplications()]); this.resume = resume; this.application = applications.find((item) => item.jobId === this.id && item.status !== 'withdrawn') || null } else { this.resume = null; this.application = null } } catch (error) { this.error = error.message } finally { this.loading = false } },
    startApply() { const auth = getAuthState(); const returnUrl = '/pages/work/job-detail?id=' + encodeURIComponent(this.id); if (!auth.loggedIn) return uni.navigateTo({ url: guardedUrl('login', returnUrl) }); if (completeness(this.resume) < 75) return uni.navigateTo({ url: '/pages/work/resume?returnJobId=' + encodeURIComponent(this.id) }); this.confirmApply = true },
    async submitApply() { if (this.submitting) return; this.submitting = true; try { this.application = await applyForJob(this.id, this.resume.id); this.confirmApply = false; uni.showToast({ title: '投递已提交', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.submitting = false } },
    favorite() { this.favorited = !this.favorited; uni.showToast({ title: this.favorited ? '已收藏' : '已取消收藏', icon: 'none' }) },
    message() { uni.navigateTo({ url: '/pages/messages/index?conversationId=job-' + encodeURIComponent(this.id) }) },
    openCompany() { uni.navigateTo({ url: '/pages/work/talent?mode=company&id=' + encodeURIComponent(this.job.companyId) }) },
    goApplications() { uni.navigateTo({ url: '/pages/work/resume?tab=applications' }) },
    backToWork() { uni.reLaunch({ url: '/pages/work/index' }) }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
