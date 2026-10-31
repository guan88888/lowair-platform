<template>
  <app-page-shell title="同城低空圈" active="community" :city="city" :theme="theme" :locale="locale" @city="showCity = true">
    <view class="community-screen">
      <view class="community-panel location-panel">
        <view><text class="community-section-title">{{ locationTitle }}</text><text class="community-muted">{{ locationNote }}</text></view>
        <view class="location-actions"><view class="community-button" @tap="requestLocation">授权定位</view><view class="community-button secondary" @tap="showCity = true">选择城市</view></view>
      </view>
      <view class="community-notice">风险区、飞场收藏和社区适飞评价都不是飞行许可。起飞前必须单独核对空域、主管部门要求、场地方规则与现场条件。</view>
      <view class="map-search-bar"><text class="map-search-mark">⌕</text><text>{{ city }} · 搜索飞场、维修点和活动</text><text @tap="showCity = true">切换</text></view>
      <view v-if="mapCenter" class="community-panel nearby-map">
        <!-- #ifdef H5 -->
        <h5-amap-map :center="mapCenter" :markers="mapMarkers" />
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <map :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :scale="mapCenter.scale || 11" :markers="mapMarkers" :show-location="located"></map>
        <!-- #endif -->
        <view class="map-type-row"><text v-for="item in mapTypes" :key="item" :class="{ active: mapType === item }" @tap="mapType = item">{{ item }}</text></view>
        <view class="map-locate" @tap="requestLocation">定位</view>
        <view class="map-legend"><text><text class="legend-dot field"></text>飞场</text><text><text class="legend-dot service"></text>服务</text><text><text class="legend-dot risk"></text>风险提示</text></view>
        <text class="community-help map-disclaimer">地图采用 GCJ-02 坐标。仅标记城市中心、后端提供坐标或当前授权位置；没有坐标的飞场和活动不会被虚构标记。</text>
      </view>
      <view class="community-help nearby-source">数据来源：{{ data.source || '待后端提供' }} · 更新时间：{{ data.updatedAt || '待后端提供' }}</view>
      <view class="community-tabs"><text v-for="tab in tabs" :key="tab.key" class="community-tab" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.label }}</text></view>

      <view v-if="loading" class="community-loading"><view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view><text>正在加载同城信息</text></view>
      <view v-else-if="error" class="community-error"><text class="community-state-title">同城信息加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="loadNearby">重新加载</view></view>
      <template v-else>
        <view v-if="activeTab === 'friends'" class="nearby-list">
          <view v-for="friend in data.friends" :key="friend.id" class="community-panel nearby-row"><view class="friend-avatar">{{ friend.name.slice(0, 1) }}</view><view class="nearby-copy"><text class="nearby-title">{{ friend.name }}</text><text class="community-muted">{{ friend.specialty }} · {{ friend.area }}</text><text class="community-help">{{ friend.privacyScope || '仅展示公开范围' }}</text></view><text class="community-status success">{{ friend.distanceText || friend.distance || '距离待后端提供' }}</text></view>
        </view>
        <view v-else-if="activeTab === 'fields'" class="nearby-list">
          <view v-for="field in data.fields" :key="field.id" class="community-panel field-card">
            <view class="field-head"><view><text class="nearby-title">{{ field.name }}</text><text class="community-muted">{{ field.area }} · {{ field.source || '来源待核验' }}</text><text class="community-help">更新时间：{{ field.updatedAt || '待后端提供' }}</text></view><text :class="['community-status', field.risk === 'restricted' ? 'warning' : '']">{{ riskLabel(field.risk) }}</text></view>
            <text class="field-note">{{ field.note }}</text>
            <view v-if="field.risk === 'restricted'" class="risk-block">存在风险提示。不要把此地点名称、收藏状态或社区记录当作起飞许可。</view>
            <view class="field-actions"><text @tap="showFieldSource(field)">信息说明</text><text @tap="openReport(field)">纠错或举报</text></view>
          </view>
        </view>
        <view v-else class="nearby-list">
          <view v-for="event in data.events" :key="event.id" class="community-panel nearby-row"><view class="nearby-copy"><text class="nearby-title">{{ event.name }}</text><text class="community-muted">{{ event.area }} · {{ event.schedule }}</text><text class="community-help">{{ event.privacyScope || '活动地点以报名确认信息为准' }}</text></view><view class="event-actions"><text class="community-status success">{{ event.registrationStatus || event.status }}</text><text v-if="event.permissions?.register" class="community-link" @tap="registerEvent(event)">{{ event.registered ? '取消报名' : '报名' }}</text></view></view>
        </view>
        <view v-if="!activeItems.length" class="community-empty"><text class="community-state-title">{{ city }}暂无相关信息</text><text>可以切换城市或稍后重试。</text></view>
      </template>
    </view>
    <view v-if="showCity" class="community-sheet-mask" @tap="showCity = false"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择城市回退范围</text><text class="community-muted city-note">未授权定位时按所选城市展示，不推断精确位置。</text><city-picker :value="city" @change="selectCity" /></view></view>
    <view v-if="fieldSource" class="community-sheet-mask" @tap="fieldSource = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">飞场信息说明</text><view class="source-copy"><text class="community-label">{{ fieldSource.name }}</text><text>数据状态：{{ fieldSource.source || '来源待核验' }}</text><text>更新时间：{{ fieldSource.updatedAt || '待后端提供' }}</text><text>风险状态：{{ riskLabel(fieldSource.risk) }}</text><text>{{ fieldSource.note }}</text><text>平台仍需接入场地运营状态、空域核验与主管部门数据，当前记录仅供查找线索。</text></view><view class="community-button" @tap="fieldSource = null">知道了</view></view></view>
    <view v-if="reportField" class="community-sheet-mask" @tap="reportField = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">纠错或举报飞场</text><text v-for="reason in reasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportField = null">取消</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { listNearby, registerCommunityEvent, reportCommunityTarget } from '../services'
import { requirePermission } from '../../../utils/route-guard'
import H5AmapMap from '../../home/components/H5AmapMap.vue'
import CityPicker from '../../home/components/CityPicker.vue'

export default {
  name: 'CommunityNearbyPage',
  components: { AppPageShell, H5AmapMap, CityPicker },
  data() { return { tabs: [{ key: 'friends', label: '附近飞友' }, { key: 'fields', label: '常用飞场' }, { key: 'events', label: '活动赛事' }], activeTab: 'friends', city: '北京', mapCityCoordinates: null, mapTypes: ['标准', '飞场', '服务'], mapType: '标准', located: false, coordinates: null, data: { friends: [], fields: [], events: [] }, loading: true, error: '', showCity: false, fieldSource: null, reportField: null, selectedMapItem: null, reasons: ['位置或名称错误', '场地已停止开放', '风险提示缺失', '存在危险或误导信息'], theme: 'ocean', locale: 'zh', toast: '' } },
  computed: {
    locationTitle() { return this.located ? '已按授权位置展示同城内容' : `当前按${this.city}城市范围展示` },
    locationNote() { return this.located ? '精确坐标仅用于本次附近查询，页面只展示区级范围。' : '定位默认不启用。授权失败或拒绝时继续使用城市回退。' },
    activeItems() { return this.data[this.activeTab] || [] },
    mapCenter() { if (this.located && this.coordinates) return { latitude: this.coordinates.latitude, longitude: this.coordinates.longitude, scale: 12 }; if (this.mapCityCoordinates) return { latitude: this.mapCityCoordinates.latitude, longitude: this.mapCityCoordinates.longitude, scale: 10 }; const centers = { 北京: [39.9042, 116.4074], 上海: [31.2304, 121.4737], 广州: [23.1291, 113.2644], 深圳: [22.5431, 114.0579], 杭州: [30.2741, 120.1551], 天津: [39.0842, 117.2009], 石家庄: [38.0428, 114.5149], 成都: [30.5728, 104.0668], 重庆: [29.5630, 106.5516], 武汉: [30.5931, 114.3054], 西安: [34.3416, 108.9398] }; const value = centers[this.city] || centers.北京; return { latitude: value[0], longitude: value[1], scale: 10 } },
    mapMarkers() { const supplied = [...(this.data.fields || []), ...(this.data.events || [])].filter((item) => Number.isFinite(Number(item.longitude)) && Number.isFinite(Number(item.latitude))).map((item, index) => ({ id: Number(item.id) || index + 1, latitude: Number(item.latitude), longitude: Number(item.longitude), title: item.name, width: 26, height: 32, callout: { content: item.name, display: 'BYCLICK', padding: 6, borderRadius: 4 } })); if (supplied.length) return supplied; if (this.located && this.coordinates) return [{ id: 1, latitude: this.coordinates.latitude, longitude: this.coordinates.longitude, title: '当前授权位置', width: 26, height: 32 }]; return [{ id: 1, latitude: this.mapCenter.latitude, longitude: this.mapCenter.longitude, title: this.city + '城市中心', width: 26, height: 32, callout: { content: this.city + '城市中心', display: 'BYCLICK', padding: 6, borderRadius: 4 } }] },
    fallbackMarkers() { const points = [['21%','30%'],['67%','24%'],['44%','62%'],['77%','69%']]; const fields = (this.data.fields || []).map((item) => ({ ...item, kind: 'field' })); const events = (this.data.events || []).map((item) => ({ ...item, kind: 'service' })); const source = [...fields, ...events]; if (!source.length) source.push({ id: 'city-center', name: `${this.city}低空服务中心`, kind: 'service' }); return source.slice(0, 4).map((item, index) => ({ id: item.id, title: item.name, kind: item.kind, left: points[index][0], top: points[index][1] })) }
  },
  created() { this.restorePreferences(); this.loadNearby() },
  methods: {
    restorePreferences() { const theme = uni.getStorageSync('lowair-demo-theme'); const locale = uni.getStorageSync('lowair-demo-locale'); const city = uni.getStorageSync('lowair-community-city'); if (theme) this.theme = theme; if (locale) this.locale = locale; if (city) this.city = city },
    async loadNearby() { this.loading = true; this.error = ''; try { this.data = await listNearby({ city: this.city, location_mode: this.located ? 'authorized' : 'city', ...(this.located ? (this.coordinates || {}) : {}) }); this.located = Boolean(this.data.located) } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    requestLocation() { uni.getLocation({ type: 'gcj02', success: async (result) => { this.coordinates = { latitude: result.latitude, longitude: result.longitude }; this.located = true; await this.loadNearby(); this.showToast('定位授权成功，仅展示区级范围') }, fail: () => { this.coordinates = null; this.located = false; this.showToast(`定位未授权，继续按${this.city}展示`) } }) },
    async selectCity(item) { const city = typeof item === 'string' ? item : item?.name; if (!city) return; this.city = city; this.mapCityCoordinates = Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude)) ? { latitude: Number(item.latitude), longitude: Number(item.longitude) } : null; this.coordinates = null; this.located = false; uni.setStorageSync('lowair-community-city', city); this.showCity = false; await this.loadNearby() },
    riskLabel(risk) { return { review: '待运营核验', unknown: '状态未知', restricted: '风险提示' }[risk] || '待核验' },
    showFieldSource(field) { this.fieldSource = field },
    async registerEvent(event) {
      if (!requirePermission('login')) return
      try { await registerCommunityEvent(event.id, !event.registered); await this.loadNearby(); this.showToast(event.registered ? '已取消报名' : '报名状态已更新') } catch (error) { this.showToast(error.message || '报名操作失败') }
    },
    openReport(field) { if (!requirePermission('login')) return; this.reportField = field },
    async submitReport(reason) { try { await reportCommunityTarget({ targetType: 'field', targetId: this.reportField.id, reason }); this.reportField = null; this.showToast('已提交，平台将复核飞场与风险信息') } catch (error) { this.showToast(error.message) } },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2000) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.location-panel { display: flex; flex-direction: column; gap: 18rpx; background: var(--surface-strong); }.location-panel .community-section-title { margin-bottom: 8rpx; }.location-actions { display: flex; gap: 12rpx; }.location-actions .community-button { min-width: 0; flex: 1; }.map-search-bar { display: flex; height: 72rpx; align-items: center; gap: 12rpx; margin-bottom: 14rpx; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 22rpx; }.map-search-bar text:nth-child(2) { min-width: 0; flex: 1; }.map-search-bar text:last-child, .map-search-mark { color: var(--accent); }.nearby-map { position: relative; padding: 0; overflow: hidden; }.nearby-map map, .map-fallback { display: block; width: 100%; height: 430rpx; }.map-fallback { position: relative; overflow: hidden; background-color: #dce9e4; background-image: linear-gradient(32deg,transparent 47%,rgba(255,255,255,.9) 48%,rgba(255,255,255,.9) 52%,transparent 53%),linear-gradient(118deg,transparent 46%,rgba(255,255,255,.75) 47%,rgba(255,255,255,.75) 51%,transparent 52%),linear-gradient(rgba(92,126,119,.1) 1rpx,transparent 1rpx),linear-gradient(90deg,rgba(92,126,119,.1) 1rpx,transparent 1rpx); background-size: 100% 100%,100% 100%,52rpx 52rpx,52rpx 52rpx; }.map-road { position: absolute; height: 11rpx; border: 3rpx solid rgba(255,255,255,.92); border-radius: 20rpx; background: #c8d2cf; transform-origin: left center; }.road-one { left: -5%; top: 45%; width: 116%; transform: rotate(-13deg); }.road-two { left: 18%; top: -2%; width: 92%; transform: rotate(72deg); }.road-three { left: 5%; top: 78%; width: 86%; transform: rotate(-34deg); }.map-water { position: absolute; right: -8%; top: 8%; width: 32%; height: 96%; border-radius: 48%; background: rgba(126,189,224,.34); transform: rotate(8deg); }.map-district { position: absolute; color: rgba(55,82,77,.58); font-size: 18rpx; font-weight: 700; }.district-one { left: 10%; top: 18%; }.district-two { right: 10%; top: 51%; }.fallback-marker { position: absolute; z-index: 2; display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; transform: translate(-50%,-100%); border: 4rpx solid #fff; border-radius: 50% 50% 50% 4rpx; background: #287e68; color: #fff; box-shadow: 0 5rpx 14rpx rgba(20,57,50,.24); font-size: 18rpx; }.fallback-marker.service { background: #397da1; }.map-callout { position: absolute; z-index: 4; left: 50%; top: 48%; display: flex; min-width: 250rpx; flex-direction: column; gap: 5rpx; padding: 14rpx; transform: translate(-50%,-50%); border: 1rpx solid rgba(32,79,69,.26); border-radius: 6rpx; background: #fff; color: #183d35; box-shadow: 0 10rpx 26rpx rgba(20,57,50,.2); font-size: 20rpx; }.map-callout text:first-child { font-weight: 700; }.map-callout text:last-child { color: #69827d; font-size: 17rpx; }.map-type-row { position: absolute; z-index: 5; left: 14rpx; top: 14rpx; display: flex; padding: 5rpx; border-radius: 6px; background: rgba(5,25,39,.9); }.map-type-row text { padding: 9rpx 14rpx; border-radius: 4px; color: #b8cbd3; font-size: 19rpx; }.map-type-row text.active { background: #19cfa0; color: #062218; }.map-locate { position: absolute; z-index: 5; right: 16rpx; bottom: 96rpx; display: flex; width: 68rpx; height: 68rpx; align-items: center; justify-content: center; border: 1rpx solid rgba(25,207,160,.52); border-radius: 50%; background: rgba(5,25,39,.92); color: #79e6c6; font-size: 19rpx; }.map-legend { position: absolute; z-index: 5; left: 14rpx; bottom: 72rpx; display: flex; gap: 15rpx; padding: 9rpx 12rpx; border-radius: 5px; background: rgba(5,25,39,.88); color: #c8d7dc; font-size: 17rpx; }.map-legend text { display: flex; align-items: center; gap: 5rpx; }.legend-dot { display: inline-block; width: 10rpx; height: 10rpx; border-radius: 50%; background: #35dfb2; }.legend-dot.service { background: #7ebde0; }.legend-dot.risk { background: #f2b456; }.nearby-map .map-disclaimer { display: block; padding: 13rpx 16rpx; }.nearby-source { display: block; margin: -5rpx 0 16rpx; }.nearby-row { display: flex; align-items: center; gap: 15rpx; }.friend-avatar { display: flex; width: 58rpx; height: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface-strong); color: var(--accent); font-size: 22rpx; font-weight: 700; }.nearby-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 6rpx; }.nearby-title { color: var(--text); font-size: 26rpx; font-weight: 700; }.event-actions { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 9rpx; }.field-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 15rpx; }.field-head > view { min-width: 0; display: flex; flex-direction: column; gap: 7rpx; }.field-note { display: block; margin-top: 15rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.risk-block { margin-top: 14rpx; padding: 13rpx; border-left: 4rpx solid #f2b456; background: rgba(242, 180, 86, .08); color: #f2b456; font-size: 21rpx; line-height: 1.5; }.field-actions { display: flex; gap: 22rpx; margin-top: 16rpx; padding-top: 14rpx; border-top: 1rpx solid var(--line); color: var(--accent); font-size: 21rpx; }.city-note { display: block; margin-bottom: 18rpx; }.source-copy { display: flex; flex-direction: column; gap: 13rpx; margin-bottom: 24rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }
</style>
