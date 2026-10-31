<template>
  <app-page-shell title="设备履历" active="market">
    <view class="market-screen market-stack">
      <view class="market-search"><input v-model.trim="sn" class="market-search__input" placeholder="输入设备 SN 查询" confirm-type="search" @confirm="load" /><text class="market-search__action" @tap="scanSn">扫码</text><text class="market-search__action" @tap="load">查询</text></view>
      <view v-if="state === 'loading'" class="market-skeleton"></view>
      <view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">履历加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="load">重试</view></view>
      <view v-else-if="history" class="market-stack">
        <view class="market-summary"><text class="market-summary__title">{{ history.model || '设备履历' }}</text><text class="market-summary__copy">SN：{{ history.masked_sn || history.maskedSn || '服务端未脱敏返回' }}</text><text class="market-helper">查询结果的来源、时间与核验状态均由服务端提供。</text></view>
        <view class="market-section"><view class="market-section__head"><text class="market-section__title">核验字段</text></view><view class="market-evidence-grid"><evidence-item title="SN" :evidence="history.sn || {}" /><evidence-item title="质检报告" :evidence="history.inspection || {}" /><evidence-item title="履历记录" :evidence="history.history || history.historyStatus || {}" /><evidence-item title="链上存证" :evidence="history.blockchain || {}" /></view></view>
        <view class="market-section"><view class="market-section__head"><text class="market-section__title">履历时间线</text></view><view v-if="timeline.length" class="market-list-group"><view v-for="(item, index) in timeline" :key="index" class="market-list-row"><text class="market-list-row__label">{{ item.time || item.recorded_at || '时间待返回' }}</text><text class="market-list-row__value">{{ item.title || item.event || item.description || '履历事件' }} · {{ item.status || '待核验' }}</text></view></view><text v-else class="market-helper">暂无服务端履历记录。</text></view>
      </view>
      <view v-else class="market-state"><text class="market-state__title">输入 SN 查询履历</text><text class="market-state__note">平台不会将查询结果标记为已质检或已上链，除非服务端明确返回核验状态。</text></view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import EvidenceItem from './EvidenceItem.vue'
import { getMarketRouteOptions } from '../utils/route-options'
import { getMarketService } from '../services'
export default {
  name: 'DeviceHistoryPage', components: { AppPageShell, EvidenceItem },
  data() { return { service: getMarketService(), sn: '', history: null, state: 'idle', error: '' } },
  computed: { timeline() { return this.history?.timeline || this.history?.records || [] } },
  mounted() { this.sn = getMarketRouteOptions().sn || ''; if (this.sn) this.load() },
  methods: { scanSn() { uni.scanCode({ scanType: ['barCode', 'qrCode'], success: (result) => { this.sn = String(result.result || '').trim(); this.load() }, fail: (error) => { if (!/cancel/i.test(error?.errMsg || '')) { this.error = '扫码失败，请手动输入 SN'; this.state = 'error' } } }) }, async load() { if (!this.sn) { this.error = '请输入设备 SN'; this.state = 'error'; return } this.state = 'loading'; this.error = ''; try { this.history = await this.service.getDeviceHistory(this.sn); this.state = 'ready' } catch (err) { this.error = err.message || '请稍后重试'; this.state = 'error' } } }
}
</script>

<style src="../styles/market.css"></style>
