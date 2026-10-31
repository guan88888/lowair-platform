<template>
  <academy-layout ref="layout" title="学习档案">
    <view class="academy-chip-row tab-row"><text class="academy-chip" :class="{ 'academy-chip--active': tab === 'record' }" @tap="tab = 'record'">学习档案</text><text class="academy-chip" :class="{ 'academy-chip--active': tab === 'policy' }" @tap="tab = 'policy'">补贴政策</text></view>
    <view v-if="loading" class="academy-skeleton" />
    <view v-else-if="error" class="academy-state"><text class="academy-state__title">档案加载失败</text><text class="academy-state__note">{{ error }}</text><view class="academy-button academy-button--secondary" @tap="load">重新加载</view></view>
    <template v-else-if="tab === 'record'">
      <view class="academy-metrics"><view class="academy-metric"><text class="academy-metric__value">{{ record.examHistory.length }}</text><text class="academy-metric__label">成绩记录</text></view><view class="academy-metric"><text class="academy-metric__value">{{ record.wrongCount }}</text><text class="academy-metric__label">当前错题</text></view><view class="academy-metric"><text class="academy-metric__value">{{ activeVisitCount }}</text><text class="academy-metric__label">有效预约</text></view></view>
      <view class="academy-section"><view class="academy-section__head"><view><text class="academy-section__title">取证路径</text><text class="academy-section__note">从学习意向到取证的业务记录</text></view></view><view class="timeline"><view v-for="stage in record.stages" :key="stage.key" class="timeline-item"><view class="timeline-marker" :class="stage.status" /><view class="timeline-copy"><text>{{ stage.label }}</text><text>{{ stage.note }}</text></view><text class="academy-tag" :class="stage.status === 'completed' ? 'academy-tag--accent' : stage.status === 'in_progress' ? 'academy-tag--warn' : ''">{{ stageLabel(stage.status) }}</text></view></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">成绩记录</text><text class="academy-link" @tap="go('/pages/academy/exam?mode=mock')">模拟考试 ›</text></view><view v-if="!record.examHistory.length" class="academy-state"><text class="academy-state__title">暂无成绩</text><text class="academy-state__note">完成练习或模拟考试后会写入这里</text></view><view v-else class="academy-list"><view v-for="exam in record.examHistory" :key="exam.id" class="academy-row"><view class="academy-row__main"><text class="academy-row__title">{{ exam.mode === 'mock' ? '模拟考试' : '题库练习' }}</text><text class="academy-row__note">{{ formatDate(exam.submittedAt) }} · 答对 {{ exam.correctCount }}/{{ exam.total }}</text></view><text class="score">{{ exam.score }} 分</text></view></view></view>
      <view class="academy-section"><view class="academy-row" @tap="go('/pages/academy/exam?mode=practice&type=wrong')"><view class="academy-row__main"><text class="academy-row__title">错题本</text><text class="academy-row__note">集中练习当前 {{ record.wrongCount }} 道错题</text></view><text class="academy-link">开始 ›</text></view></view>
    </template>
    <template v-else>
      <view class="academy-section"><view class="academy-section__head"><view><text class="academy-section__title">属地政策查询</text><text class="academy-section__note">补贴资格和目录以官方办理窗口最终核验为准</text></view></view><picker :range="cities" @change="changeCity"><view class="academy-select policy-city">{{ city }}</view></picker></view>
      <view v-if="!policies.length" class="academy-state"><text class="academy-state__title">暂无政策记录</text><text class="academy-state__note">请以当地人社部门公开信息为准</text></view><view v-else class="academy-list"><view v-for="policy in policies" :key="policy.id" class="academy-panel policy-card"><view class="policy-card__head"><text class="academy-row__title">{{ policy.title }}</text><text class="academy-tag academy-tag--warn">{{ policy.sourceUrl ? policy.status : '待接入' }}</text></view><text class="academy-row__note">生效日期 {{ policy.effectiveDate || '待接入' }}，更新时间 {{ policy.updatedAt || '待接入' }}</text><text class="policy-note">{{ policy.note }}</text><text v-if="policy.conditions" class="policy-note">申请条件：{{ policy.conditions }}</text><view class="academy-divider" /><text class="academy-label">材料清单</text><view class="materials"><text v-for="item in policy.materials || []" :key="item">{{ item }}</text><text v-if="!(policy.materials || []).length">材料清单待官方来源接入</text></view><view class="academy-source"><text>官方来源：{{ policy.sourceName || '待接入' }}</text><text v-if="policy.sourceUrl" class="academy-link" @tap="copySource(policy.sourceUrl)">复制官网地址</text></view></view></view>
    </template>
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import { academyService } from '../services'
import { getAcademyRouteOptions } from '../utils/route-options'
export default {
  name: 'ProgressPage', components: { AcademyLayout },
  data() { const options = getAcademyRouteOptions('progress'); return { loading: true, error: '', tab: options.tab === 'subsidy' ? 'policy' : 'record', city: '北京', cities: ['北京', '天津', '石家庄', '成都'], record: { stages: [], examHistory: [], wrongCount: 0, visits: [] }, policies: [] } },
  computed: { activeVisitCount() { return this.record.visits.filter((visit) => visit.status !== 'cancelled').length } },
  mounted() { this.load() },
  methods: {
    async load() { this.loading = true; this.error = ''; try { const [record, policies] = await Promise.all([academyService.getRecord(), academyService.getPolicies(this.city)]); this.record = record; this.policies = policies } catch (error) { this.error = error.message } finally { this.loading = false } },
    async changeCity(event) { this.city = this.cities[Number(event.detail.value)]; try { this.policies = await academyService.getPolicies(this.city) } catch (error) { this.$refs.layout.showToast(error.message) } },
    stageLabel(status) { return { completed: '完成', in_progress: '进行中', todo: '待开始' }[status] || status },
    formatDate(value) { if (!value) return '时间待同步'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
    copySource(url) { uni.setClipboardData({ data: url, success: () => this.$refs.layout.showToast('官方来源地址已复制') }) }, go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style scoped>
.tab-row { margin-bottom: 26rpx; }.timeline { position: relative; display: flex; flex-direction: column; gap: 0; }.timeline-item { position: relative; display: flex; align-items: center; gap: 16rpx; min-height: 100rpx; padding: 12rpx 0; }.timeline-item:not(:last-child)::after { content: ''; position: absolute; left: 17rpx; top: 68rpx; bottom: -30rpx; width: 1rpx; background: var(--line); }.timeline-marker { flex: 0 0 auto; width: 34rpx; height: 34rpx; border: 2rpx solid var(--line); border-radius: 50%; background: var(--app-bg); }.timeline-marker.completed { border-color: var(--accent); background: var(--accent); }.timeline-marker.in_progress { border-color: var(--academy-warn); }.timeline-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4rpx; }.timeline-copy text:first-child { color: var(--text); font-size: 25rpx; font-weight: 700; }.timeline-copy text:last-child { color: var(--muted); font-size: 21rpx; }.score { color: var(--accent); font-size: 29rpx; font-weight: 760; }.policy-city { max-width: 280rpx; }.policy-card { display: flex; flex-direction: column; gap: 10rpx; }.policy-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }.policy-note { color: var(--text); font-size: 23rpx; line-height: 1.65; }.materials { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9rpx; margin-top: 10rpx; }.materials text { padding: 12rpx; border-radius: 8rpx; background: var(--surface-strong); color: var(--muted); font-size: 20rpx; }.academy-source { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; }
</style>
