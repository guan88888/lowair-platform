<template>
  <work-scaffold title="任务详情">
    <view v-if="loading" class="request-state">正在加载任务...</view>
    <view v-else-if="error" class="state-panel error"><text class="state-title">无法查看任务</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="load">重试</view><view class="button primary" @tap="backToWork">返回任务列表</view></view></view>
    <template v-else-if="task">
      <view class="hero-strip has-image"><image class="hero-image" src="/static/images/lowair-work-inspection.png" mode="aspectFill" /><view class="hero-scrim"></view><view class="hero-content"><text class="eyebrow">{{ task.urgent ? '加急任务' : '公开抢单' }} · {{ taskStatus(task.status) }}</text><text class="hero-title">{{ task.title }}</text><text class="hero-note">{{ money(task.budget) }} · {{ task.location }} · {{ task.workAt }}</text></view></view>
      <view class="metric-grid"><view class="metric"><text class="metric-value">{{ task.applicants }}</text><text class="metric-label">报名飞手</text></view><view class="metric"><text class="metric-value">{{ task.caac }}</text><text class="metric-label">CAAC 要求</text></view><view class="metric"><text class="metric-value">{{ countdown }}</text><text class="metric-label">报名倒计时</text></view></view>
      <view v-if="bid" class="state-panel"><text class="state-title">{{ bid.statusLabel }}</text><text class="state-copy">报价 {{ money(bid.quote) }}。报名只表示进入候选，不代表中标或创建资金托管。</text></view>
      <view v-if="task.status !== 'open'" class="state-panel warning"><text class="state-title">任务当前{{ taskStatus(task.status) }}</text><text class="state-copy">任务已不可报名；资金、合同和保险状态仍以服务端详情为准。</text></view>
      <view v-if="owner" class="state-panel"><text class="state-title">发布方视角</text><text class="state-copy">审核通过后可查看服务端返回的报名者并选定飞手；选择后才进入合同和托管流程。</text><view class="button-row"><view class="button primary" @tap="showApplicants = true">查看报名者</view></view></view>
      <view class="panel"><text class="panel-title">任务工单</text><view class="key-grid"><view class="key-cell"><text class="key-label">所需机型</text><text class="key-value">{{ task.aircraft }}</text></view><view class="key-cell"><text class="key-label">CAAC</text><text class="key-value">{{ task.caac }}</text></view><view class="key-cell"><text class="key-label">预计时长</text><text class="key-value">{{ task.duration }}</text></view><view class="key-cell"><text class="key-label">任务状态</text><text class="key-value">{{ taskStatus(task.status) }}</text></view></view><view class="section"><text class="minor-label">交付物</text><text class="state-copy">{{ task.delivery }}</text></view><view class="section"><text class="minor-label">验收标准</text><text class="state-copy">{{ task.acceptance }}</text></view><view class="section"><text class="minor-label">任务说明</text><text class="state-copy">{{ task.description }}</text></view></view>
      <view class="panel"><text class="panel-title">位置保护</text><text class="state-copy">地图仅显示 {{ task.location }}，精确坐标须在建立业务关系后按权限由服务端下发。</text><view class="button-row"><view class="button secondary" @tap="openFlight">查看飞行服务</view></view></view>
      <view class="panel"><text class="panel-title">安全与服务状态</text><view class="summary-row"><text>发布方</text><text>{{ task.publisher.verified }}</text></view><view class="summary-row"><text>资金托管</text><text>{{ task.escrow.label }}</text></view><view class="summary-row"><text>保险</text><text>{{ task.insurance.label }}</text></view><view class="summary-row"><text>隐私号码</text><text>{{ task.privacyPhone.label }}</text></view><text class="field-help">这些状态来自任务详情 API。前端不会自行将托管、保险或签章标记为成功。</text></view>
      <view class="panel"><text class="panel-title">发布方信用摘要</text><text class="state-title">{{ task.publisher.name }}</text><text class="state-copy">{{ task.publisher.credit }}</text></view>
      <view v-if="!owner" class="bottom-actions"><view class="button secondary" @tap="favorite">{{ favorited ? '已收藏' : '收藏' }}</view><view class="button secondary" @tap="message">咨询</view><view class="button primary" :class="{ disabled: Boolean(bid) || task.status !== 'open' }" @tap="startBid">{{ bid ? '已报名' : '报名抢单' }}</view></view>
    </template>

    <view v-if="showBid" class="sheet-mask" @tap.self="showBid = false"><view class="sheet-panel"><text class="sheet-title">报名抢单</text><view class="field-block"><text class="field-label">报价（元）</text><input v-model="bidForm.quote" type="number" class="input" placeholder="请输入报价" /></view><view class="field-block"><text class="field-label">交付承诺</text><textarea v-model="bidForm.commitment" class="textarea" placeholder="说明档期、机型和交付承诺" /></view><view class="switch-row"><text>确认档期无冲突</text><switch color="#19cfa0" :checked="bidForm.availabilityConfirmed" @change="bidForm.availabilityConfirmed = $event.detail.value" /></view><text class="field-help">报名不会生成中标、合同、托管或保险成功状态。</text><view class="button-row"><view class="button secondary" @tap="showBid = false">取消</view><view class="button primary" :class="{ disabled: bidding }" @tap="submitBid">{{ bidding ? '提交中...' : '确认报名' }}</view></view></view></view>
    <view v-if="showApplicants" class="sheet-mask" @tap.self="showApplicants = false"><view class="sheet-panel"><text class="sheet-title">报名者（演示脱敏）</text><view v-for="item in demoApplicants" :key="item.name" class="candidate-card"><view class="candidate-head"><text class="candidate-name">{{ item.name }}</text><text class="tag">{{ item.caac }}</text></view><text class="card-note">{{ item.aircraft }} · {{ item.record }}</text><text class="candidate-reasons">信用依据：{{ item.basis }}</text></view><text class="field-help">真实选择飞手必须调用后端并返回履约订单 id。当前演示不在前端伪造选定或托管成功。</text><view class="button primary" @tap="showApplicants = false">关闭</view></view></view>
  </work-scaffold>
</template>

<script>
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'
import { getRouteOptions } from '../../shared/utils/route-options'
import WorkScaffold from './WorkScaffold.vue'
import { getTask, placeTaskBid } from '../services'
import { money } from '../utils'

export default {
  name: 'TaskDetailPage', components: { WorkScaffold },
  data() { return { id: '', owner: false, task: null, loading: true, error: '', now: Date.now(), timer: null, bid: null, showBid: false, bidding: false, bidForm: { quote: '', commitment: '', availabilityConfirmed: false }, favorited: false, showApplicants: false, demoApplicants: [{ name: '林**', caac: '超视距', aircraft: 'M350 RTK', record: '3 年巡检', basis: '资质与机型字段符合，历史履约记录由服务端提供' }, { name: '周**', caac: '超视距', aircraft: 'Matrice 30T', record: '4 年行业经验', basis: '档期已确认，暂无待处理争议' }] } },
  computed: { countdown() { if (!this.task) return '--:--:--'; const deadline = new Date(this.task.deadline).getTime(); if (!Number.isFinite(deadline)) return this.task.deadline || '待确认'; const seconds = Math.max(0, Math.floor((deadline - this.now) / 1000)); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':') } },
  mounted() { const options = getRouteOptions(); this.id = options.id || ''; this.owner = options.owner === '1'; this.load(); this.timer = setInterval(() => { this.now = Date.now() }, 1000) },
  beforeUnmount() { if (this.timer) clearInterval(this.timer) },
  methods: {
    money, taskStatus(value) { return ({ open: '可报名', assigned: '已指派', closed: '已关闭', reviewing: '审核中' })[value] || value },
    async load() { this.loading = true; this.error = ''; try { if (!this.id) throw new Error('缺少任务 id'); this.task = await getTask(this.id) } catch (error) { this.error = error.message } finally { this.loading = false } },
    startBid() { const auth = getAuthState(); const returnUrl = '/pages/work/task-detail?id=' + encodeURIComponent(this.id); if (!auth.loggedIn) return uni.navigateTo({ url: guardedUrl('login', returnUrl) }); if (!auth.caac) return uni.navigateTo({ url: guardedUrl('caac', returnUrl) }); this.bidForm = { quote: this.task.budget, commitment: '', availabilityConfirmed: false }; this.showBid = true },
    async submitBid() { if (!Number(this.bidForm.quote) || !this.bidForm.commitment.trim() || !this.bidForm.availabilityConfirmed) return uni.showToast({ title: '请填写报价、承诺并确认档期', icon: 'none' }); this.bidding = true; try { this.bid = await placeTaskBid(this.id, this.bidForm); this.task.applicants += 1; this.showBid = false; uni.showToast({ title: '报名已提交', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.bidding = false } },
    favorite() { this.favorited = !this.favorited; uni.showToast({ title: this.favorited ? '已收藏' : '已取消收藏', icon: 'none' }) }, message() { uni.navigateTo({ url: '/pages/messages/index?conversationId=task-' + encodeURIComponent(this.id) }) }, openFlight() { uni.navigateTo({ url: '/pages/flight/index' }) }, backToWork() { uni.reLaunch({ url: '/pages/work/index' }) }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
