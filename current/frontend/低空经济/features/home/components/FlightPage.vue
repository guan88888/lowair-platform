<template>
  <app-page-shell title="本地飞行服务" active="home" :city="city" @city="showCity = true">
    <view class="flight-screen">
      <module-state :state="conditions.state" :error="conditions.error" empty-title="暂无飞行条件" @retry="loadConditions">
        <template #loading>
          <view class="flight-hero hero-loading"><view></view><view></view><view></view></view>
        </template>

        <view class="flight-hero">
          <image v-if="!heroImageError" class="hero-image" src="/static/images/lowair-flight-service.png" mode="aspectFill" @error="heroImageError = true"></image>
          <view v-else class="hero-image hero-image-fallback"><text>飞行服务</text><text>图片暂不可用</text></view>
          <view class="hero-scrim"></view>
          <view class="hero-copy">
            <text class="hero-label">飞前综合参考</text>
            <text class="hero-status">{{ conditions.data.status }}</text>
            <text class="hero-city">{{ conditions.data.city }}，{{ conditions.data.weather.condition }}</text>
            <view class="city-action" @tap="showCity = true">切换城市</view>
          </view>
        </view>

        <source-meta :meta="conditions.data.meta" />

        <view class="disclaimer-panel">
          <text class="disclaimer-title">重要说明</text>
          <text class="disclaimer-copy">{{ conditions.data.disclaimer }}</text>
        </view>
      </module-state>

      <section-block title="气象与风险概览">
        <module-state :state="weather.state" :error="weather.error" empty-title="暂无气象数据" @retry="loadWeather">
          <view class="weather-grid">
            <view class="weather-item"><text>{{ weather.data.weather.temperature }}</text><text>温度</text></view>
            <view class="weather-item"><text>{{ weather.data.weather.windSpeed }}</text><text>风速</text></view>
            <view class="weather-item"><text>{{ weather.data.weather.visibility }}</text><text>能见度</text></view>
            <view class="weather-item"><text>{{ weather.data.weather.riskCount }}</text><text>风险提示</text></view>
          </view>
          <text class="weather-condition">{{ weather.data.weather.condition }} · 气象信息仅供飞前核查</text>
          <source-meta :meta="weather.data.meta" />
        </module-state>
      </section-block>

      <section-block title="定位与地图">
        <view class="location-panel">
          <view class="location-copy"><text class="location-title">{{ locationTitle }}</text><text class="location-note">{{ locationNote }}</text></view>
          <view class="location-action" @tap="requestLocation">{{ location.state === 'loading' ? '定位中' : '授权定位' }}</view>
        </view>
        <view class="map-action" @tap="openMap">打开地图核查附近飞场与风险区 ›</view>
      </section-block>

      <section-block title="评估依据">
        <module-state :state="conditions.state" :error="conditions.error" empty-title="暂无评估依据" @retry="loadConditions">
          <view class="reason-list">
            <view v-for="(reason, index) in conditions.data.reasons" :key="reason" class="reason-row">
              <text class="reason-index">{{ index + 1 }}</text><text>{{ reason }}</text>
            </view>
          </view>
        </module-state>
      </section-block>

      <section-block title="风险区提示">
        <module-state :state="conditions.state" :error="conditions.error" empty-title="暂无风险提示" empty-note="仍需通过属地官方渠道核对空域与临时管制。" @retry="loadConditions">
          <view class="risk-list">
            <view v-for="item in conditions.data.risks" :key="item.id" class="risk-row">
              <text class="risk-level" :class="'risk-' + item.level">{{ item.level }}风险</text>
              <view class="risk-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text><text>来源：{{ item.source }} · 更新：{{ item.updatedAt }}</text></view>
            </view>
          </view>
          <source-meta :meta="conditions.data.meta" />
        </module-state>
      </section-block>

      <section-block title="空域与临时管制">
        <module-state :state="airspace.state" :error="airspace.error" empty-title="暂无空域提示" empty-note="未获取到权威空域数据，不能据此判断可飞。" @retry="loadAirspace">
          <view class="notice-list"><view v-for="item in airspace.data.items" :key="item.id" class="notice-row"><text class="risk-level">{{ item.level }}</text><view class="risk-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text><text>来源：{{ item.source }} · 更新：{{ item.updatedAt }}</text></view></view></view>
          <source-meta :meta="airspace.data.meta" />
          <text class="source-disclaimer">{{ airspace.data.disclaimer }}</text>
        </module-state>
      </section-block>

      <section-block title="禁飞区与临时限制">
        <view class="notice-columns">
          <view class="notice-column"><text class="notice-column-title">禁飞区</text><module-state :state="noFly.state" :error="noFly.error" empty-title="暂无禁飞区" @retry="loadNoFly"><view class="notice-list"><view v-for="item in noFly.data.items" :key="item.id" class="notice-row"><view class="risk-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text><text>来源：{{ item.source }} · 更新：{{ item.updatedAt }}</text></view></view></view><source-meta :meta="noFly.data.meta" /></module-state></view>
          <view class="notice-column"><text class="notice-column-title">临时管制</text><module-state :state="temporary.state" :error="temporary.error" empty-title="暂无临时管制" @retry="loadTemporary"><view class="notice-list"><view v-for="item in temporary.data.items" :key="item.id" class="notice-row"><view class="risk-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text><text>来源：{{ item.source }} · 更新：{{ item.updatedAt }}</text></view></view></view><source-meta :meta="temporary.data.meta" /></module-state></view>
        </view>
      </section-block>

      <section-block title="起飞前检查">
        <module-state :state="conditions.state" :error="conditions.error" empty-title="暂无检查项" @retry="loadConditions">
          <view class="check-list">
            <view v-for="item in conditions.data.checklist" :key="item.id" class="check-row" @tap="toggleCheck(item.id)">
              <view class="check-box" :class="{ checked: checkedItems[item.id] }">{{ checkedItems[item.id] ? '✓' : '' }}</view>
              <view class="check-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text></view>
            </view>
          </view>
          <text class="check-note">{{ checkedCount }} / {{ conditions.data.checklist.length }} 项已在本机勾选。勾选不代表已取得飞行许可。</text>
        </module-state>
      </section-block>

      <section-block title="常用飞场" action="查看地图列表" @action="go('/pages/community/nearby?mode=field')">
        <module-state :state="fields.state" :error="fields.error" empty-title="暂无飞场信息" empty-note="可切换城市或稍后重试。" @retry="loadFields">
          <service-list :items="fields.data.items" />
          <source-meta :meta="fields.data.meta" />
        </module-state>
      </section-block>

      <section-block title="维修与检测" action="更多服务" @action="go('/pages/market/index?mode=service')">
        <module-state :state="maintenance.state" :error="maintenance.error" empty-title="暂无维修服务" empty-note="设备异常时先停止使用，再联系合格服务方。" @retry="loadMaintenance">
          <service-list :items="maintenance.data.items" />
          <source-meta :meta="maintenance.data.meta" />
        </module-state>
      </section-block>

      <text class="final-warning">现场条件可能快速变化。起飞前必须重新核对空域许可、临时管制、实时气象、设备状态和人员安全边界。</text>
    </view>

    <view v-if="showCity" class="overlay" @tap="showCity = false">
      <view class="city-sheet" @tap.stop>
        <text class="sheet-title">选择城市</text>
        <city-picker :value="city" @change="selectCity" />
      </view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ModuleState from './ModuleState.vue'
import SectionBlock from './SectionBlock.vue'
import ServiceList from './ServiceList.vue'
import SourceMeta from './SourceMeta.vue'
import CityPicker from './CityPicker.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { loadFlightAirspace, loadFlightConditions, loadFlightFields, loadFlightWeather, loadMaintenanceServices, loadNoFlyZones, loadTemporaryRestrictions } from '../services'

function resourceState(data = {}) {
  return { state: 'loading', error: '', sequence: 0, data: { ...data, items: [], meta: null } }
}

export default {
  name: 'FlightPage',
  components: { AppPageShell, ModuleState, SectionBlock, ServiceList, SourceMeta, CityPicker },
  data() {
    const options = getRouteOptions()
    return {
      city: options.city || '北京',
      showCity: false,
      heroImageError: false,
      checkedItems: {},
      conditions: resourceState({
        status: '',
        city: '北京',
        weather: { temperature: '-', windSpeed: '-', visibility: '-', condition: '-', riskCount: '-' },
        reasons: [], risks: [], checklist: [], disclaimer: ''
      }),
      weather: resourceState({ weather: { temperature: '--', windSpeed: '--', visibility: '--', condition: '气象待接入', riskCount: '--' } }),
      airspace: resourceState(),
      noFly: resourceState(),
      temporary: resourceState(),
      fields: resourceState(),
      maintenance: resourceState(),
      location: { state: 'idle', error: '', data: null }
    }
  },
  computed: {
    checkedCount() {
      return Object.values(this.checkedItems).filter(Boolean).length
    },
    locationTitle() {
      if (this.location.state === 'ready') return '已获得本机位置'
      if (this.location.state === 'error') return '定位不可用'
      return '未授权定位'
    },
    locationNote() {
      if (this.location.state === 'ready') return `${this.location.data.latitude.toFixed(5)}, ${this.location.data.longitude.toFixed(5)} · 仅用于查询` 
      return this.location.error || '授权后可把坐标传给天气、空域和地图服务。'
    },
    flightQuery() {
      const query = { city: this.city }
      if (this.location.data) {
        query.latitude = this.location.data.latitude
        query.longitude = this.location.data.longitude
      }
      return query
    }
  },
  created() {
    this.restoreChecklist()
    this.loadAll()
  },
  methods: {
    loadAll() {
      this.loadConditions()
      this.loadWeather()
      this.loadAirspace()
      this.loadNoFly()
      this.loadTemporary()
      this.loadFields()
      this.loadMaintenance()
    },
    async loadWeather() {
      const sequence = ++this.weather.sequence
      this.weather.state = 'loading'
      this.weather.error = ''
      try {
        const data = await loadFlightWeather(this.flightQuery)
        if (sequence !== this.weather.sequence) return
        this.weather.data = data
        this.weather.state = data.available ? 'ready' : 'empty'
      } catch (error) {
        if (sequence !== this.weather.sequence) return
        this.weather.state = 'error'
        this.weather.error = error.message || '气象数据加载失败'
      }
    },
    async loadAirspace() {
      await this.loadResource(this.airspace, loadFlightAirspace, '空域数据加载失败')
    },
    async loadNoFly() {
      await this.loadResource(this.noFly, loadNoFlyZones, '禁飞区数据加载失败')
    },
    async loadTemporary() {
      await this.loadResource(this.temporary, loadTemporaryRestrictions, '临时管制数据加载失败')
    },
    async loadConditions() {
      const sequence = ++this.conditions.sequence
      this.conditions.state = 'loading'
      this.conditions.error = ''
      try {
        const data = await loadFlightConditions(this.flightQuery)
        if (sequence !== this.conditions.sequence) return
        this.conditions.data = {
          ...data,
          weather: data.weather || {},
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
          risks: Array.isArray(data.risks) ? data.risks : [],
          checklist: Array.isArray(data.checklist) ? data.checklist : []
        }
        this.conditions.state = data.available ? 'ready' : 'empty'
      } catch (error) {
        if (sequence !== this.conditions.sequence) return
        this.conditions.state = 'error'
        this.conditions.error = error.message || '气象与风险数据加载失败'
      }
    },
    async loadFields() {
      await this.loadResource(this.fields, loadFlightFields, '飞场信息加载失败')
    },
    async loadMaintenance() {
      await this.loadResource(this.maintenance, loadMaintenanceServices, '维修服务加载失败')
    },
    async loadResource(target, loader, fallbackError) {
      const sequence = ++target.sequence
      target.state = 'loading'
      target.error = ''
      try {
        const data = await loader(this.flightQuery)
        if (sequence !== target.sequence) return
        target.data = { ...data, items: Array.isArray(data.items) ? data.items : [] }
        target.state = target.data.items.length ? 'ready' : 'empty'
      } catch (error) {
        if (sequence !== target.sequence) return
        target.state = 'error'
        target.error = error.message || fallbackError
      }
    },
    selectCity(item) {
      const city = typeof item === 'string' ? item : item?.name
      if (!city) return
      this.city = city
      this.showCity = false
      this.checkedItems = {}
      this.restoreChecklist()
      this.syncUrl()
      this.loadAll()
    },
    toggleCheck(id) {
      this.checkedItems[id] = !this.checkedItems[id]
      uni.setStorageSync('lowair-flight-checklist-' + this.city, this.checkedItems)
    },
    restoreChecklist() {
      const saved = uni.getStorageSync('lowair-flight-checklist-' + this.city)
      this.checkedItems = saved && typeof saved === 'object' ? saved : {}
    },
    requestLocation() {
      if (this.location.state === 'loading') return
      this.location = { state: 'loading', error: '', data: null }
      if (typeof uni.getLocation !== 'function') {
        this.location = { state: 'error', error: '当前平台不支持定位授权，请手动选择城市。', data: null }
        return
      }
      uni.getLocation({ type: 'gcj02', isHighAccuracy: true, success: (position) => {
        const latitude = Number(position.latitude)
        const longitude = Number(position.longitude)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          this.location = { state: 'error', error: '定位返回坐标无效，请手动选择城市。', data: null }
          return
        }
        this.location = { state: 'ready', error: '', data: { latitude, longitude } }
        this.loadAll()
      }, fail: (error) => {
        this.location = { state: 'error', error: error?.errMsg || '定位授权失败，请手动选择城市。', data: null }
      } })
    },
    openMap() {
      if (this.location.data && typeof uni.openLocation === 'function') {
        uni.openLocation({ latitude: this.location.data.latitude, longitude: this.location.data.longitude, name: this.city + ' 飞行服务核查点' })
        return
      }
      const query = encodeURIComponent(this.city + ' 无人机飞行服务')
      if (typeof window !== 'undefined') window.open('https://ditu.amap.com/search?query=' + query, '_blank')
      else uni.showToast({ title: '请先授权定位或手动打开地图', icon: 'none' })
    },
    syncUrl() {
      if (typeof window === 'undefined' || !window.history?.replaceState) return
      const query = encodeURIComponent(this.city)
      const path = '/pages/flight/index?city=' + query
      const hash = window.location.hash.includes('/pages/flight/index')
      const url = hash ? window.location.pathname + window.location.search + '#' + path : path
      window.history.replaceState({}, '', url)
    },
    go(url) {
      if (url) uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped>
.flight-screen { padding: 22rpx 22rpx 46rpx; color: var(--text); }
.flight-hero { position: relative; height: 330rpx; overflow: hidden; border-radius: 14rpx; background: var(--surface); }
.hero-image { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-image-fallback { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10rpx; background: var(--surface-strong); color: var(--muted); font-size: 20rpx; }
.hero-image-fallback text:first-child { color: var(--text); font-size: 28rpx; font-weight: 700; }
.hero-scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,18,29,.94), rgba(4,18,29,.62) 66%, rgba(4,18,29,.28)); }
.hero-copy { position: relative; z-index: 1; display: flex; width: 74%; height: 100%; justify-content: center; flex-direction: column; box-sizing: border-box; padding: 30rpx; color: #edf7f8; }
.hero-label { color: #78dec4; font-size: 20rpx; font-weight: 650; }
.hero-status { margin-top: 9rpx; font-size: 39rpx; font-weight: 760; line-height: 1.2; }
.hero-city { margin-top: 9rpx; color: #c4d2d9; font-size: 22rpx; }
.city-action { align-self: flex-start; margin-top: 20rpx; padding: 12rpx 18rpx; border: 1rpx solid #78dec4; border-radius: 8rpx; color: #78dec4; font-size: 21rpx; }
.city-action:active, .check-row:active, .reason-row:active { transform: scale(.985); }
.hero-loading { padding: 36rpx; box-sizing: border-box; }
.hero-loading view { width: 55%; height: 24rpx; margin-top: 21rpx; border-radius: 5rpx; background: var(--surface-strong); animation: pulse 1.3s ease-in-out infinite; }
.hero-loading view:first-child { width: 72%; height: 44rpx; margin-top: 70rpx; }
.hero-loading view:last-child { width: 38%; }
.disclaimer-panel { margin-top: 18rpx; padding: 20rpx; border: 1rpx solid rgba(255, 190, 96, .45); border-radius: 10rpx; background: rgba(255, 190, 96, .08); }
.disclaimer-title { display: block; color: #ffd08a; font-size: 22rpx; font-weight: 700; }
.disclaimer-copy { display: block; margin-top: 8rpx; color: var(--text); font-size: 21rpx; line-height: 1.6; }
.weather-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.weather-item { display: flex; min-height: 116rpx; justify-content: center; flex-direction: column; padding: 19rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }
.weather-item text:first-child { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 30rpx; font-weight: 750; }
.weather-item text:last-child { margin-top: 6rpx; color: var(--muted); font-size: 20rpx; }
.weather-condition { display: block; margin-top: 12rpx; color: var(--muted); font-size: 20rpx; }
.location-panel { display: flex; align-items: center; gap: 14rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }
.location-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7rpx; }
.location-title { color: var(--text); font-size: 24rpx; font-weight: 650; }
.location-note { color: var(--muted); font-size: 19rpx; line-height: 1.45; }
.location-action, .map-action { border: 1rpx solid var(--accent); border-radius: 8rpx; color: var(--accent); font-size: 20rpx; }
.location-action { flex: 0 0 auto; padding: 13rpx 15rpx; }
.map-action { margin-top: 12rpx; padding: 18rpx 20rpx; background: var(--surface); }
.location-action:active, .map-action:active { transform: scale(.985); }
.reason-list, .risk-list, .check-list, .service-list { overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.reason-row { display: flex; align-items: flex-start; gap: 14rpx; padding: 21rpx; border-bottom: 1rpx solid var(--line); color: var(--text); font-size: 22rpx; line-height: 1.55; transition: transform .16s ease; }
.reason-row:last-child { border-bottom: 0; }
.reason-index { display: flex; width: 36rpx; height: 36rpx; flex: 0 0 36rpx; align-items: center; justify-content: center; border-radius: 7rpx; background: var(--surface-strong); color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18rpx; font-weight: 700; }
.risk-row { display: flex; align-items: flex-start; gap: 16rpx; padding: 22rpx; border-bottom: 1rpx solid var(--line); }
.risk-row:last-child { border-bottom: 0; }
.risk-level { min-width: 76rpx; flex: 0 0 auto; padding: 6rpx 8rpx; border: 1rpx solid var(--line); border-radius: 6rpx; color: #ffd08a; font-size: 18rpx; text-align: center; }
.risk-高 { border-color: rgba(255, 135, 115, .55); color: #ffae9f; }
.risk-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7rpx; }
.risk-copy text:first-child { color: var(--text); font-size: 24rpx; font-weight: 650; }
.risk-copy text:nth-child(2) { color: var(--muted); font-size: 21rpx; line-height: 1.45; }
.risk-copy text:last-child { color: var(--muted); font-size: 18rpx; }
.notice-list { overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.notice-row { display: flex; align-items: flex-start; gap: 15rpx; padding: 20rpx; border-bottom: 1rpx solid var(--line); }
.notice-row:last-child { border-bottom: 0; }
.notice-columns { display: grid; gap: 14rpx; }
.notice-column-title { display: block; margin-bottom: 10rpx; color: var(--muted); font-size: 21rpx; font-weight: 650; }
.source-disclaimer { display: block; margin-top: 12rpx; color: var(--muted); font-size: 19rpx; line-height: 1.5; }
.check-row { display: flex; align-items: center; gap: 15rpx; padding: 22rpx; border-bottom: 1rpx solid var(--line); transition: transform .16s ease; }
.check-row:last-child { border-bottom: 0; }
.check-box { display: flex; width: 43rpx; height: 43rpx; flex: 0 0 43rpx; align-items: center; justify-content: center; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 7rpx; color: var(--accent-ink); font-size: 22rpx; }
.check-box.checked { border-color: var(--accent); background: var(--accent); }
.check-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6rpx; }
.check-copy text:first-child { color: var(--text); font-size: 24rpx; font-weight: 650; }
.check-copy text:last-child { color: var(--muted); font-size: 21rpx; line-height: 1.45; }
.check-note { display: block; margin-top: 13rpx; color: var(--muted); font-size: 19rpx; line-height: 1.5; }
.final-warning { display: block; margin-top: 30rpx; padding: 20rpx; border-left: 4rpx solid var(--accent); background: var(--surface); color: var(--muted); font-size: 20rpx; line-height: 1.6; }
.overlay { position: fixed; z-index: 60; inset: 0; display: flex; align-items: flex-end; background: rgba(2, 14, 23, .7); }
.city-sheet { width: 100%; padding: 28rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 16rpx 16rpx 0 0; background: var(--surface); }
.sheet-title { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 30rpx; font-weight: 700; }
.city-option { display: block; padding: 23rpx 0; border-bottom: 1rpx solid var(--line); color: var(--text); font-size: 26rpx; }
.city-option.selected { color: var(--accent); font-weight: 700; }
@keyframes pulse { 0%, 100% { opacity: .46; } 50% { opacity: .92; } }
@media (prefers-reduced-motion: reduce) { .hero-loading view { animation: none; } }
@media (min-width: 768px) { .flight-screen { max-width: 980rpx; margin: 0 auto; }.weather-grid { grid-template-columns: repeat(4, 1fr); } }
</style>
