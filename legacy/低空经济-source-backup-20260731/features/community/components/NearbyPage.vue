<template>
  <app-page-shell title="同城低空圈" active="community" :city="city" :theme="theme" :locale="locale" @city="showCity = true">
    <view class="community-screen">
      <view class="community-panel location-panel">
        <view><text class="community-section-title">{{ locationTitle }}</text><text class="community-muted">{{ locationNote }}</text></view>
        <view class="location-actions"><view class="community-button" @tap="requestLocation">授权定位</view><view class="community-button secondary" @tap="showCity = true">选择城市</view></view>
      </view>
      <view class="community-notice">风险区、飞场收藏和社区适飞评价都不是飞行许可。起飞前必须单独核对空域、主管部门要求、场地方规则与现场条件。</view>
      <view class="community-tabs"><text v-for="tab in tabs" :key="tab.key" class="community-tab" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.label }}</text></view>

      <view v-if="loading" class="community-loading"><view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view><text>正在加载同城信息</text></view>
      <view v-else-if="error" class="community-error"><text class="community-state-title">同城信息加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="loadNearby">重新加载</view></view>
      <template v-else>
        <view v-if="activeTab === 'friends'" class="nearby-list">
          <view v-for="friend in data.friends" :key="friend.id" class="community-panel nearby-row"><view class="friend-avatar">{{ friend.name.slice(0, 1) }}</view><view class="nearby-copy"><text class="nearby-title">{{ friend.name }}</text><text class="community-muted">{{ friend.specialty }} · {{ friend.area }}</text></view><text class="community-status success">{{ friend.distance }}</text></view>
        </view>
        <view v-else-if="activeTab === 'fields'" class="nearby-list">
          <view v-for="field in data.fields" :key="field.id" class="community-panel field-card">
            <view class="field-head"><view><text class="nearby-title">{{ field.name }}</text><text class="community-muted">{{ field.area }} · {{ field.source }}</text></view><text :class="['community-status', field.risk === 'restricted' ? 'warning' : '']">{{ riskLabel(field.risk) }}</text></view>
            <text class="field-note">{{ field.note }}</text>
            <view v-if="field.risk === 'restricted'" class="risk-block">存在风险提示。不要把此地点名称、收藏状态或社区记录当作起飞许可。</view>
            <view class="field-actions"><text @tap="showFieldSource(field)">信息说明</text><text @tap="openReport(field)">纠错或举报</text></view>
          </view>
        </view>
        <view v-else class="nearby-list">
          <view v-for="event in data.events" :key="event.id" class="community-panel nearby-row"><view class="nearby-copy"><text class="nearby-title">{{ event.name }}</text><text class="community-muted">{{ event.area }} · {{ event.schedule }}</text></view><text class="community-status success">{{ event.status }}</text></view>
        </view>
        <view v-if="!activeItems.length" class="community-empty"><text class="community-state-title">{{ city }}暂无相关信息</text><text>可以切换城市或稍后重试。</text></view>
      </template>
    </view>
    <view v-if="showCity" class="community-sheet-mask" @tap="showCity = false"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择城市回退范围</text><text class="community-muted city-note">未授权定位时按所选城市展示，不推断精确位置。</text><text v-for="item in cities" :key="item" class="community-sheet-option" @tap="selectCity(item)">{{ item }}</text></view></view>
    <view v-if="fieldSource" class="community-sheet-mask" @tap="fieldSource = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">飞场信息说明</text><view class="source-copy"><text class="community-label">{{ fieldSource.name }}</text><text>数据状态：{{ fieldSource.source }}</text><text>风险状态：{{ riskLabel(fieldSource.risk) }}</text><text>{{ fieldSource.note }}</text><text>平台仍需接入场地运营状态、空域核验与主管部门数据，当前记录仅供查找线索。</text></view><view class="community-button" @tap="fieldSource = null">知道了</view></view></view>
    <view v-if="reportField" class="community-sheet-mask" @tap="reportField = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">纠错或举报飞场</text><text v-for="reason in reasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportField = null">取消</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { listNearby, reportCommunityTarget } from '../services'

export default {
  name: 'CommunityNearbyPage',
  components: { AppPageShell },
  data() { return { tabs: [{ key: 'friends', label: '附近飞友' }, { key: 'fields', label: '常用飞场' }, { key: 'events', label: '活动赛事' }], activeTab: 'friends', city: '北京', cities: ['北京', '天津', '石家庄', '成都'], located: false, coordinates: null, data: { friends: [], fields: [], events: [] }, loading: true, error: '', showCity: false, fieldSource: null, reportField: null, reasons: ['位置或名称错误', '场地已停止开放', '风险提示缺失', '存在危险或误导信息'], theme: 'ocean', locale: 'zh', toast: '' } },
  computed: {
    locationTitle() { return this.located ? '已按授权位置展示同城内容' : `当前按${this.city}城市范围展示` },
    locationNote() { return this.located ? '精确坐标仅用于本次附近查询，页面只展示区级范围。' : '定位默认不启用。授权失败或拒绝时继续使用城市回退。' },
    activeItems() { return this.data[this.activeTab] || [] }
  },
  created() { this.restorePreferences(); this.loadNearby() },
  methods: {
    restorePreferences() { const theme = uni.getStorageSync('lowair-demo-theme'); const locale = uni.getStorageSync('lowair-demo-locale'); const city = uni.getStorageSync('lowair-community-city'); if (theme) this.theme = theme; if (locale) this.locale = locale; if (city) this.city = city },
    async loadNearby() { this.loading = true; this.error = ''; try { this.data = await listNearby({ city: this.city, ...(this.coordinates || {}) }); this.located = this.data.located } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    requestLocation() { uni.getLocation({ type: 'gcj02', success: async (result) => { this.coordinates = { latitude: result.latitude, longitude: result.longitude }; this.located = true; await this.loadNearby(); this.showToast('定位授权成功，仅展示区级范围') }, fail: () => { this.coordinates = null; this.located = false; this.showToast(`定位未授权，继续按${this.city}展示`) } }) },
    async selectCity(city) { this.city = city; this.coordinates = null; this.located = false; uni.setStorageSync('lowair-community-city', city); this.showCity = false; await this.loadNearby() },
    riskLabel(risk) { return { review: '待运营核验', unknown: '状态未知', restricted: '风险提示' }[risk] || '待核验' },
    showFieldSource(field) { this.fieldSource = field },
    openReport(field) { this.reportField = field },
    async submitReport(reason) { try { await reportCommunityTarget({ targetType: 'field', targetId: this.reportField.id, reason }); this.reportField = null; this.showToast('已提交，平台将复核飞场与风险信息') } catch (error) { this.showToast(error.message) } },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2000) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.location-panel { display: flex; flex-direction: column; gap: 18rpx; background: var(--surface-strong); }.location-panel .community-section-title { margin-bottom: 8rpx; }.location-actions { display: flex; gap: 12rpx; }.location-actions .community-button { min-width: 0; flex: 1; }.nearby-row { display: flex; align-items: center; gap: 15rpx; }.friend-avatar { display: flex; width: 58rpx; height: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface-strong); color: var(--accent); font-size: 22rpx; font-weight: 700; }.nearby-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 6rpx; }.nearby-title { color: var(--text); font-size: 26rpx; font-weight: 700; }.field-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 15rpx; }.field-head > view { min-width: 0; display: flex; flex-direction: column; gap: 7rpx; }.field-note { display: block; margin-top: 15rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.risk-block { margin-top: 14rpx; padding: 13rpx; border-left: 4rpx solid #f2b456; background: rgba(242, 180, 86, .08); color: #f2b456; font-size: 21rpx; line-height: 1.5; }.field-actions { display: flex; gap: 22rpx; margin-top: 16rpx; padding-top: 14rpx; border-top: 1rpx solid var(--line); color: var(--accent); font-size: 21rpx; }.city-note { display: block; margin-bottom: 18rpx; }.source-copy { display: flex; flex-direction: column; gap: 13rpx; margin-bottom: 24rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }
</style>
