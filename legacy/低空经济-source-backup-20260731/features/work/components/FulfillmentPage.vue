<template>
  <work-scaffold title="任务履约">
    <view class="segment three"><text v-for="item in tabs" :key="item.key" class="segment-item" :class="{ active: mode === item.key }" @tap="mode = item.key">{{ item.label }}</text></view>
    <view v-if="loading" class="request-state">正在加载履约状态...</view>
    <view v-else-if="error" class="state-panel error"><text class="state-title">无法查看履约订单</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="load">重试</view><view class="button primary" @tap="backToWork">返回任务列表</view></view></view>
    <template v-else-if="order">
      <view class="hero-strip"><view class="hero-content"><text class="eyebrow">订单 {{ order.id }} · {{ order.role === 'client' ? '发包方视角' : '飞手视角' }}</text><text class="hero-title">{{ order.taskTitle }}</text><text class="hero-note">当前状态：{{ order.statusLabel }}。所有资金、签章与保险状态均来自服务端响应。</text></view></view>
      <view class="safety-panel"><text class="state-title">双方认证摘要</text><text class="state-copy">发包方：{{ order.parties.client }}</text><text class="state-copy">飞手：{{ order.parties.pilot }}</text></view>

      <template v-if="mode === 'progress'">
        <view class="panel"><text class="panel-title">里程碑</text><view class="timeline"><view v-for="item in order.milestones" :key="item.key" class="milestone" :class="item.status"><text class="milestone-mark">{{ item.status === 'complete' ? '✓' : item.status === 'current' ? '●' : '' }}</text><text class="milestone-title">{{ item.title }} · {{ milestoneStatus(item.status) }}</text><text class="milestone-note">{{ item.note }}</text></view></view></view>
        <view class="panel"><text class="panel-title">资金托管状态</text><view class="summary-row"><text>首期款</text><text>{{ order.escrow.deposit }}</text></view><view class="summary-row"><text>中期款</text><text>{{ order.escrow.middle }}</text></view><view class="summary-row"><text>尾款</text><text>{{ order.escrow.final }}</text></view><text class="field-help">当前页面不能直接放款或更改托管成功状态。验收仅提交结论，由后端校验合同、争议与资金条件后推进。</text></view>
        <view class="panel"><text class="panel-title">电子合同与保险</text><div class="summary-row"><text>CA 签章</text><text>{{ order.contract.label }}</text></div><div class="summary-row"><text>保险</text><text>{{ order.insurance.label }}</text></div><text class="field-help">“演示服务端状态”不等同于真实签章或保险生效。</text></view>
        <view class="panel"><view class="section-head"><text class="panel-title">交付文件</text><text v-if="order.role === 'pilot'" class="link" @tap="selectDelivery">上传交付</text></view><text class="field-help">单个文件不超过 50 MB。上传结果须服务端回写，失败可重新选择。</text><view v-if="uploading" class="attachment"><text class="attachment-name">正在上传交付物...</text><text class="muted">处理中</text></view><view v-for="file in order.deliveries" :key="file.id" class="attachment"><text class="attachment-name">{{ file.name }}</text><text class="muted">{{ file.statusLabel }}</text></view><view v-if="!order.deliveries.length && !uploading" class="request-state">尚未提交交付物</view><view v-if="order.role === 'client' && order.deliveries.length" class="button-row"><view class="button primary" @tap="askAccept">提交验收通过</view><view class="button danger" @tap="askReject">拒绝验收</view></view></view>
        <view class="panel"><text class="panel-title">发票与税务</text><text class="state-copy">开票主体、税额与申请状态需由订单和发票服务返回，当前未创建虚假发票结果。</text><view class="button-row"><view class="button secondary" @tap="showInfo('发票申请需等待后端发票服务接入')">查看说明</view><view class="button secondary" @tap="protectedCall">隐私通话</view></view></view>
      </template>

      <template v-else-if="mode === 'calendar'">
        <view class="panel"><text class="panel-title">未来任务日历</text><view class="calendar-grid"><view v-for="item in order.calendar" :key="item.date" class="calendar-day" :class="{ conflict: item.conflict }"><text class="calendar-date">{{ item.date }}</text><text>{{ item.label }}</text></view></view><view class="button-row"><view class="button warning" @tap="askPause">一键请假</view></view><text class="field-help">请假仅暂停未来派单，不影响当前进行中的履约订单。</text></view>
      </template>

      <template v-else>
        <view v-if="order.dispute" class="state-panel warning"><text class="state-title">{{ order.dispute.statusLabel }}</text><text class="state-copy">类型：{{ order.dispute.type }}。平台仲裁状态由服务端更新，资深飞手意见仅作为技术参考。</text></view>
        <view v-else class="form-section"><text class="form-title">提交争议</text><view class="field-block"><text class="field-label">问题类型</text><input v-model="dispute.type" class="input" placeholder="例如：交付范围争议" /></view><view class="field-block"><text class="field-label">问题说明</text><textarea v-model="dispute.description" class="textarea" placeholder="说明事实、时间和希望的平台处理方式" /></view><view class="field-block"><text class="field-label">证据</text><view v-for="item in dispute.evidence" :key="item.name" class="attachment"><text class="attachment-name">{{ item.name }}</text><text class="muted">待提交</text></view><view class="button-row"><view class="button secondary" @tap="selectEvidence">添加证据</view></view></view><view class="button danger" @tap="askDispute">发起争议</view></view>
      </template>

      <text class="demo-disclaimer">演示模式仍通过工作域服务适配器回写业务状态。资金、CA 签章、保险成功及实际放款必须由对应后端服务返回。</text>
      <view class="sos-button" @tap="askSos">SOS</view>
    </template>
    <work-confirm :visible="Boolean(confirmAction)" :busy="actionBusy" :title="confirmAction && confirmAction.title" :message="confirmAction && confirmAction.message" :consequence="confirmAction && confirmAction.consequence" :confirm-text="confirmAction && confirmAction.confirmText" :require-reason="confirmAction && confirmAction.requireReason" :reason-label="confirmAction && confirmAction.reasonLabel" @cancel="confirmAction = null" @confirm="runConfirmed" />
  </work-scaffold>
</template>

<script>
import WorkConfirm from './WorkConfirm.vue'
import WorkScaffold from './WorkScaffold.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { createDispute, getFulfillment, pauseDispatch, requestSos, submitAcceptance, uploadDelivery } from '../services'
import { chooseDocument } from '../utils'

export default {
  name: 'FulfillmentPage', components: { WorkConfirm, WorkScaffold },
  data() { return { orderId: '', mode: 'progress', tabs: [{ key: 'progress', label: '履约进度' }, { key: 'calendar', label: '任务日历' }, { key: 'dispute', label: '争议处理' }], order: null, loading: true, error: '', uploading: false, dispute: { type: '', description: '', evidence: [] }, confirmAction: null, actionBusy: false } },
  mounted() { const options = getRouteOptions(); this.orderId = options.orderId || ''; this.mode = ['progress', 'calendar', 'dispute'].includes(options.mode) ? options.mode : 'progress'; this.load() },
  methods: {
    milestoneStatus(value) { return ({ complete: '已完成', current: '当前', pending: '待开始' })[value] || value },
    async load() { this.loading = true; this.error = ''; try { if (!this.orderId) throw new Error('缺少履约订单 id'); this.order = await getFulfillment(this.orderId) } catch (error) { this.error = error.message } finally { this.loading = false } },
    async selectDelivery() { if (this.uploading) return; this.uploading = true; try { const file = await chooseDocument(); this.order = await uploadDelivery(this.orderId, file); uni.showToast({ title: '交付已提交，等待服务端处理', icon: 'none' }) } catch (error) { if (!(error?.errMsg && /cancel/.test(error.errMsg))) uni.showToast({ title: error.message || '上传失败，可重试', icon: 'none' }) } finally { this.uploading = false } },
    async selectEvidence() { try { const file = await chooseDocument(); if (Number(file.size || 0) > 20 * 1024 * 1024) throw new Error('单个证据不能超过 20 MB'); this.dispute.evidence.push({ name: file.name || '争议证据', path: file.path || file.tempFilePath, size: file.size }) } catch (error) { if (!(error?.errMsg && /cancel/.test(error.errMsg))) uni.showToast({ title: error.message || '选择证据失败', icon: 'none' }) } },
    askAccept() { this.confirmAction = { type: 'accept', title: '提交验收通过', message: '确认交付物符合任务验收标准吗？', consequence: '本操作仅向服务端提交验收结论。资金是否放款由服务端校验合同、争议和托管条件后决定。', confirmText: '确认提交' } },
    askReject() { this.confirmAction = { type: 'reject', title: '拒绝验收', message: '确认退回交付物并要求修改吗？', consequence: '飞手将收到拒绝原因，交付进入整改；前端不会直接冻结或退回资金。', confirmText: '确认拒绝', requireReason: true, reasonLabel: '拒绝原因' } },
    askPause() { this.confirmAction = { type: 'pause', title: '暂停未来派单', message: '确认暂停后续可接单档期吗？', consequence: '仅暂停未来派单，不取消或中止当前履约订单。', confirmText: '确认请假', requireReason: true, reasonLabel: '请假原因' } },
    askDispute() { if (!this.dispute.type || !this.dispute.description || !this.dispute.evidence.length) return uni.showToast({ title: '请填写类型、说明并添加证据', icon: 'none' }); this.confirmAction = { type: 'dispute', title: '发起争议', message: '确认将当前问题和证据提交平台仲裁吗？', consequence: '订单将进入争议流程，处理时效和资金状态以服务端回写为准。', confirmText: '确认发起' } },
    askSos() { this.confirmAction = { type: 'sos', title: '确认 SOS 信息', message: '订单：' + this.order.id + '；任务：' + this.order.taskTitle + '；位置将由设备权限和服务端获取。', consequence: '确认后仅提交客服连接请求，不承诺保险或救援已响应。请在现实危险中同时拨打当地紧急电话。', confirmText: '连接客服' } },
    async runConfirmed(reason) { if (!this.confirmAction || this.actionBusy) return; this.actionBusy = true; try { if (this.confirmAction.type === 'accept') this.order = await submitAcceptance(this.orderId, 'accept'); if (this.confirmAction.type === 'reject') this.order = await submitAcceptance(this.orderId, 'reject', reason); if (this.confirmAction.type === 'pause') this.order = await pauseDispatch(this.orderId, reason); if (this.confirmAction.type === 'dispute') { this.order = await createDispute(this.orderId, this.dispute); this.mode = 'dispute' } if (this.confirmAction.type === 'sos') { const result = await requestSos(this.orderId, { locationConsent: true }); uni.showToast({ title: result.statusLabel, icon: 'none' }); if (typeof uni.vibrateShort === 'function') uni.vibrateShort() } this.confirmAction = null } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.actionBusy = false } },
    protectedCall() { uni.navigateTo({ url: '/pages/messages/index?conversationId=' + encodeURIComponent(this.orderId) + '&mode=protected-call' }) }, showInfo(message) { uni.showToast({ title: message, icon: 'none' }) }, backToWork() { uni.reLaunch({ url: '/pages/work/index' }) }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
