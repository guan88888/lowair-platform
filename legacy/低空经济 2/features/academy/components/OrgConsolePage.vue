<template>
  <academy-layout ref="layout" title="机构工作台">
    <view v-if="loading" class="academy-skeleton" />
    <view v-else-if="error" class="academy-state"><text class="academy-state__title">无法进入机构工作台</text><text class="academy-state__note">{{ error }}</text><view class="academy-actions access-actions"><view class="academy-button academy-button--secondary" @tap="load">重新校验</view><view class="academy-button" @tap="goVerify">机构认证</view></view></view>
    <template v-else>
      <view v-if="!consoleData.canWrite" class="read-only-banner"><text>当前角色为只读访问</text><text>写操作仅机构管理员或运营经理可用</text></view>
      <view class="academy-metrics"><view class="academy-metric"><text class="academy-metric__value">{{ consoleData.metrics.leads }}</text><text class="academy-metric__label">新增线索</text></view><view class="academy-metric"><text class="academy-metric__value">{{ consoleData.metrics.pendingVisits }}</text><text class="academy-metric__label">待确认试听</text></view><view class="academy-metric"><text class="academy-metric__value">{{ consoleData.metrics.activeStudents }}</text><text class="academy-metric__label">在训学员</text></view></view>
      <view class="academy-section"><view class="academy-section__head"><view><text class="academy-section__title">运营待办</text><text class="academy-section__note">所有写操作均需二次确认</text></view></view><view class="academy-list"><view class="academy-row"><view class="academy-row__main"><text class="academy-row__title">排课冲突</text><text class="academy-row__note">{{ consoleData.scheduleConflict ? '教练和场地时段重叠，需要确认调整' : '当前没有排课冲突' }}</text></view><view v-if="consoleData.scheduleConflict" class="academy-button academy-button--secondary academy-button--small" :class="{ 'academy-button--disabled': !consoleData.canWrite }" @tap="prepareWrite('resolve_schedule', {}, '确认解决排课冲突', '将采用系统推荐的备选教练与场地时段。')">处理</view><text v-else class="academy-tag academy-tag--accent">已处理</text></view></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">试听预约</text></view><view v-if="!consoleData.visits.length" class="academy-state"><text class="academy-state__title">暂无预约记录</text><text class="academy-state__note">学员提交预约后会显示在这里</text></view><view v-else class="academy-list"><view v-for="visit in consoleData.visits" :key="visit.id" class="academy-row"><view class="academy-row__main"><text class="academy-row__title">{{ visit.name }} · {{ visit.date }}</text><text class="academy-row__note">{{ visit.slot }} · {{ visit.partySize }} 人 · {{ visit.phone }}</text><text class="academy-tag" :class="visit.status === 'confirmed' ? 'academy-tag--accent' : visit.status === 'cancelled' ? 'academy-tag--danger' : 'academy-tag--warn'">{{ statusLabel(visit.status) }}</text></view><view v-if="['pending', 'rescheduled'].includes(visit.status)" class="academy-button academy-button--small" :class="{ 'academy-button--disabled': !consoleData.canWrite }" @tap="prepareWrite('confirm_visit', { id: visit.id }, '确认试听预约', `确认 ${visit.name} 在 ${visit.date} ${visit.slot} 到访。`)">确认预约</view></view></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">签到管理</text></view><view class="academy-row"><view class="academy-row__main"><text class="academy-row__title">示例学员签到</text><text class="academy-row__note">当前状态：{{ attendanceLabel }}</text></view><view class="academy-button academy-button--secondary academy-button--small" :class="{ 'academy-button--disabled': !consoleData.canWrite }" @tap="prepareWrite('attendance', { id: 'student-01', status: 'present' }, '确认学员签到', '签到会写入机构运营记录和学员学习档案。')">确认到课</view></view></view>
      <view v-if="writeError" class="academy-state write-error"><text class="academy-state__title">上次操作未完成</text><text class="academy-state__note">{{ writeError }}</text><view class="academy-button academy-button--secondary" @tap="retryWrite">重试上次操作</view></view>
    </template>
    <confirm-dialog :visible="Boolean(pendingWrite)" :title="pendingWrite?.title || '确认操作'" :message="pendingWrite?.message || ''" @cancel="pendingWrite = null" @confirm="executeWrite" />
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import ConfirmDialog from '../../shared/components/ConfirmDialog.vue'
import { academyService } from '../services'
export default {
  name: 'OrgConsolePage', components: { AcademyLayout, ConfirmDialog },
  data() { return { loading: true, error: '', writeError: '', consoleData: null, pendingWrite: null, lastWrite: null } },
  computed: { attendanceLabel() { return { pending: '待签到', present: '已到课', absent: '缺席' }[this.consoleData?.attendance?.['student-01']] || '待签到' } },
  mounted() { this.load() },
  methods: {
    async load() { this.loading = true; this.error = ''; try { this.consoleData = await academyService.getOrgConsole() } catch (error) { this.error = error.message } finally { this.loading = false } },
    prepareWrite(action, payload, title, message) { if (!this.consoleData.canWrite) return this.$refs.layout.showToast('当前角色只有查看权限'); this.pendingWrite = { action, payload, title, message } },
    async executeWrite() { const operation = this.pendingWrite; this.pendingWrite = null; if (!operation) return; this.lastWrite = operation; this.writeError = ''; try { await academyService.orgWrite(operation.action, operation.payload); this.$refs.layout.showToast('操作已确认并保存'); this.consoleData = await academyService.getOrgConsole() } catch (error) { this.writeError = error.message; this.$refs.layout.showToast('操作失败，原页面状态已保留') } },
    retryWrite() { if (!this.lastWrite) return; this.pendingWrite = { ...this.lastWrite, title: '重试上次操作', message: '系统会重新校验当前记录，成功后再更新页面。' } },
    statusLabel(status) { return { pending: '待确认', confirmed: '已确认', rescheduled: '改期待确认', cancelled: '已取消' }[status] || status },
    goVerify() { uni.navigateTo({ url: '/pages/profile/account?mode=institution' }) }
  }
}
</script>

<style scoped>
.access-actions { justify-content: center; }.read-only-banner { display: flex; flex-direction: column; gap: 4rpx; margin-bottom: 20rpx; padding: 16rpx 20rpx; border: 1rpx solid var(--academy-warn); border-radius: 12rpx; color: var(--academy-warn); font-size: 21rpx; }.read-only-banner text:first-child { font-weight: 700; }.write-error { border-color: var(--academy-danger); }
</style>
