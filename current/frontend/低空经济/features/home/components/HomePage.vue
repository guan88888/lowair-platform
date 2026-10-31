<template>
  <app-page-shell title="天穹智航" active="home" root :city="city" @city="showCity = true">
    <view class="home-screen">
      <view class="search-entry" @tap="go('/pages/search/index')">
        <text class="search-icon">⌕</text>
        <text class="search-copy">搜索机构、岗位、任务、商品与内容</text>
        <text class="search-arrow">›</text>
      </view>

      <module-state :state="flight.state" :error="flight.error" empty-title="暂无飞行参考" @retry="loadFlight">
        <template #loading><view class="flight-skeleton"><view></view><view></view></view></template>
        <view class="flight-brief" @tap="go('/pages/flight/index?city=' + encodeURIComponent(city))">
          <view class="flight-place">
            <text class="flight-place-label">当前位置参考</text>
            <text class="flight-address">{{ selectedAddress || city }}</text>
            <text class="flight-source">{{ flight.data.meta?.source || '飞行条件服务' }} · {{ flight.data.meta?.updatedAt || '更新时间待提供' }}</text>
          </view>
          <view class="flight-weather">
            <text>{{ flight.data.weather?.temperature || '--' }}</text>
            <text>{{ flight.data.weather?.condition || '天气待接入' }}</text>
          </view>
          <view class="flight-status" :class="flight.data.statusTone"><text>{{ flight.data.status || '待复核' }}</text><text>不构成放飞许可</text></view>
          <text class="flight-arrow">›</text>
        </view>
      </module-state>

      <section-block title="低空地图" action="查看飞行服务" @action="go('/pages/flight/index?city=' + encodeURIComponent(city))">
        <view class="home-map-panel">
          <view v-if="!showCity" class="home-map-stage">
            <!-- #ifdef H5 -->
            <h5-amap-map :center="mapCenter" :markers="mapMarkers" :coordinate-system="location ? 'gcj02' : 'wgs84'" />
            <!-- #endif -->
            <!-- #ifndef H5 -->
            <map class="home-native-map" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :scale="mapCenter.scale" :markers="mapMarkers" :show-location="Boolean(location)" />
            <!-- #endif -->
          </view>
          <view v-else class="home-map-paused"><text>正在选择位置</text><text>关闭面板后将按新位置加载地图与飞行参考。</text></view>
          <view class="home-map-caption"><view><text>{{ selectedAddress || city }}</text><text>{{ mapCaption }}</text></view><text @tap.stop="showCity = true">更换地址</text></view>
        </view>
      </section-block>

      <module-state :state="modules.carousel.state" :error="modules.carousel.error" empty-title="暂无轮播内容" @retry="loadModule('carousel')">
        <template #loading>
          <view class="carousel-skeleton"><view></view><view></view><view></view></view>
        </template>
        <view class="carousel-wrap">
          <swiper
            class="carousel"
            circular
            :autoplay="modules.carousel.data.items.length > 1"
            :interval="5000"
            :duration="420"
            :current="carouselIndex"
            @change="handleCarouselChange"
          >
            <swiper-item v-for="item in modules.carousel.data.items" :key="item.id">
              <view class="carousel-slide" @tap="go(item.to)">
                <image v-if="!imageErrors[item.id]" class="carousel-image" :src="item.image" mode="aspectFill" @error="markImageError(item.id)"></image>
                <view v-else class="image-fallback">
                  <text class="fallback-mark">无人机</text>
                  <text>图片暂不可用</text>
                </view>
                <view class="carousel-scrim"></view>
                <view class="carousel-copy">
                  <text class="carousel-kicker">{{ item.kicker }}</text>
                  <text class="carousel-title">{{ item.title }}</text>
                  <text class="carousel-note">{{ item.note }}</text>
                  <text class="carousel-action">{{ item.action }} ›</text>
                </view>
              </view>
            </swiper-item>
          </swiper>
          <view class="carousel-indicators" aria-label="轮播指示器">
            <view
              v-for="(item, index) in modules.carousel.data.items"
              :key="item.id"
              class="indicator-hit"
              @tap.stop="carouselIndex = index"
            ><view class="indicator" :class="{ active: carouselIndex === index }"></view></view>
          </view>
          <source-meta :meta="modules.carousel.data.meta" />
        </view>
      </module-state>

      <section-block title="常用入口">
        <module-state :state="modules.entries.state" :error="modules.entries.error" empty-title="暂无业务入口" @retry="loadModule('entries')">
          <view class="entry-grid">
            <view v-for="item in modules.entries.data.items" :key="item.id" class="entry-item" @tap="go(item.to)">
              <text class="entry-mark">{{ item.short }}</text>
              <view class="entry-copy"><text>{{ item.label }}</text><text>{{ item.note }}</text></view>
              <text class="entry-arrow">›</text>
            </view>
          </view>
          <source-meta :meta="modules.entries.data.meta" />
        </module-state>
      </section-block>

      <section-block
        v-for="key in collectionKeys"
        :key="key"
        :title="modules[key].data.title || collectionTitles[key]"
        :action="modules[key].data.action"
        @action="go(modules[key].data.to)"
      >
        <module-state :state="modules[key].state" :error="modules[key].error" :empty-title="collectionTitles[key] + '暂无内容'" @retry="loadModule(key)">
          <view class="item-list">
            <view v-for="item in modules[key].data.items" :key="item.id" class="info-row" @tap="go(item.to)">
              <view class="info-main"><text class="info-title">{{ item.title }}</text><text class="info-note">{{ item.note }}</text></view>
              <view class="info-side"><text class="info-tag">{{ item.tag }}</text><text class="info-arrow">›</text></view>
            </view>
          </view>
          <source-meta :meta="modules[key].data.meta" />
        </module-state>
      </section-block>

      <text class="page-disclaimer">首页聚合信息仅作业务浏览。演示数量、核验状态和适飞提示不得作为交易、资质或放飞依据。</text>
    </view>

      <view v-if="showCity" class="overlay" @tap="showCity = false">
        <view class="city-sheet" @tap.stop>
        <text class="sheet-title">选择地址</text>
        <view class="address-search"><input v-model="addressQuery" placeholder="输入区县、道路或场地名称" placeholder-class="address-placeholder" @input="scheduleAddressTips" @confirm="searchAddress" /><view :class="['address-button', { disabled: locating }]" @tap="searchAddress">{{ locating ? '查找中' : '高德查找' }}</view></view>
        <view v-if="addressTips.length" class="address-tips"><view v-for="item in addressTips" :key="item.id" @tap="selectAddressTip(item)"><text>{{ item.name }}</text><text>{{ item.district || item.address }}</text></view></view>
        <text class="address-note">地址与联想由后端高德 Web 服务代理。未配置 Key 时不会伪造地址或实时天气，可继续选择城市查看风险参考。</text>
        <text class="sheet-subtitle">搜索城市</text>
        <city-picker :value="city" @change="selectCity" />
      </view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ModuleState from './ModuleState.vue'
import SourceMeta from './SourceMeta.vue'
import SectionBlock from './SectionBlock.vue'
import CityPicker from './CityPicker.vue'
import H5AmapMap from './H5AmapMap.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { loadFlightConditions, loadHomeModule, resolveAddress, searchAddressTips } from '../services'

const moduleKeys = ['carousel', 'entries', 'tasks', 'institutions', 'devices', 'rumors']

function initialModule() {
  return { state: 'loading', error: '', data: { items: [], meta: null } }
}

export default {
  name: 'HomePage',
  components: { AppPageShell, ModuleState, SourceMeta, SectionBlock, CityPicker, H5AmapMap },
  data() {
    const options = getRouteOptions()
    return {
      city: options.city || '北京',
      showCity: false,
      addressQuery: '',
      selectedAddress: '',
      location: null,
      locating: false,
      addressTips: [],
      addressTimer: null,
      flight: { state: 'loading', error: '', data: { weather: {}, meta: null } },
      carouselIndex: 0,
      imageErrors: {},
      collectionKeys: ['tasks', 'institutions', 'devices', 'rumors'],
      collectionTitles: { tasks: '加急任务', institutions: '附近认证机构', devices: '平台严选设备', rumors: '官方辟谣' },
      moduleRequests: {},
      modules: moduleKeys.reduce((result, key) => ({ ...result, [key]: initialModule() }), {})
    }
  },
  computed: {
    mapCenter() {
      const latitude = Number(this.location?.latitude)
      const longitude = Number(this.location?.longitude)
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude, scale: 13 }
      const centers = { 北京: [39.9042, 116.4074], 上海: [31.2304, 121.4737], 广州: [23.1291, 113.2644], 深圳: [22.5431, 114.0579], 杭州: [30.2741, 120.1551], 成都: [30.5728, 104.0668], 武汉: [30.5931, 114.3054], 西安: [34.3416, 108.9398] }
      const value = centers[this.city] || centers.北京
      return { latitude: value[0], longitude: value[1], scale: 11 }
    },
    mapMarkers() {
      const label = this.selectedAddress || this.city + '城市中心'
      return [{ id: 1, latitude: this.mapCenter.latitude, longitude: this.mapCenter.longitude, title: label, width: 28, height: 34 }]
    },
    mapCaption() {
      if (this.location) return '已按所选地址展示，坐标仅用于本次查询'
      return '当前显示城市中心；选择地址可精确查看'
    }
  },
  created() {
    moduleKeys.forEach((key) => this.loadModule(key))
    this.loadFlight()
  },
  methods: {
    async loadModule(key) {
      const target = this.modules[key]
      const sequence = (this.moduleRequests[key] || 0) + 1
      this.moduleRequests[key] = sequence
      target.state = 'loading'
      target.error = ''
      try {
        const data = await loadHomeModule(key, { city: this.city })
        if (sequence !== this.moduleRequests[key]) return
        target.data = { ...data, items: Array.isArray(data.items) ? data.items : [] }
        target.state = target.data.items.length ? 'ready' : 'empty'
        if (key === 'carousel' && this.carouselIndex >= target.data.items.length) this.carouselIndex = 0
      } catch (error) {
        if (sequence !== this.moduleRequests[key]) return
        target.state = 'error'
        target.error = error.message || '该模块暂时无法加载'
      }
    },
    handleCarouselChange(event) {
      this.carouselIndex = Number(event.detail?.current || 0)
    },
    markImageError(id) {
      this.imageErrors[id] = true
    },
    selectCity(item) {
      const city = typeof item === 'string' ? item : item.name
      if (!city) return
      this.city = city
      this.selectedAddress = item?.label || city
      this.location = null
      this.showCity = false
      this.syncUrl()
      moduleKeys.forEach((key) => this.loadModule(key))
      this.loadFlight()
    },
    async searchAddress() {
      const address = this.addressQuery.trim()
      if (!address || this.locating) return uni.showToast({ title: '请输入具体地址', icon: 'none' })
      this.locating = true
      try {
        const result = await resolveAddress(address, this.city)
        this.selectedAddress = result.address || address
        this.city = result.city || this.city
        this.location = result
        this.showCity = false
        this.syncUrl()
        moduleKeys.forEach((key) => this.loadModule(key))
        await this.loadFlight()
      } catch (error) { uni.showToast({ title: error.message || '地址查找失败', icon: 'none' }) }
      finally { this.locating = false }
    },
    scheduleAddressTips() {
      if (this.addressTimer) clearTimeout(this.addressTimer)
      this.addressTimer = setTimeout(async () => {
        const keyword = this.addressQuery.trim()
        if (!keyword) { this.addressTips = []; return }
        try { const data = await searchAddressTips({ keyword, city: this.city }); this.addressTips = data.items || [] } catch (_) { this.addressTips = [] }
      }, 260)
    },
    async selectAddressTip(item) {
      this.selectedAddress = [item.name, item.address].filter(Boolean).join(' · ')
      this.addressQuery = item.name
      this.addressTips = []
      this.city = String(item.city || this.city).replace(/市$/, '') || this.city
      this.location = item
      this.showCity = false
      this.syncUrl(); moduleKeys.forEach((key) => this.loadModule(key)); await this.loadFlight()
    },
    async loadFlight() {
      this.flight.state = 'loading'
      this.flight.error = ''
      try {
        const data = await loadFlightConditions({ city: this.city, adcode: this.location?.adcode || '' })
        this.flight.data = data
        this.flight.state = data.available ? 'ready' : 'empty'
      } catch (error) {
        this.flight.state = 'error'
        this.flight.error = error.message || '天气与飞行参考加载失败'
      }
    },
    syncUrl() {
      if (typeof window === 'undefined' || !window.history?.replaceState) return
      const query = encodeURIComponent(this.city)
      const path = '/pages/index/index?city=' + query
      const hash = window.location.hash.includes('/pages/index/index')
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
.home-screen { padding: 22rpx 22rpx 44rpx; color: var(--text); }
.search-entry { display: flex; height: 76rpx; align-items: center; gap: 14rpx; margin-bottom: 20rpx; padding: 0 22rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); color: var(--muted); }
.search-entry:active, .metric-item:active, .entry-item:active, .info-row:active, .carousel-slide:active { transform: scale(.985); }
.search-icon { color: var(--accent); font-size: 36rpx; }
.search-copy { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 23rpx; }
.search-arrow { font-size: 36rpx; }
.flight-brief { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 16rpx; margin-bottom: 20rpx; padding: 20rpx 54rpx 20rpx 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); transition: transform .16s ease; }.flight-brief:active { transform: scale(.985); }.flight-place { min-width: 0; display: flex; flex-direction: column; gap: 5rpx; }.flight-place-label { color: var(--accent); font-size: 19rpx; }.flight-address { overflow: hidden; color: var(--text); font-size: 26rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.flight-source { color: var(--muted); font-size: 17rpx; line-height: 1.4; }.flight-weather { display: flex; min-width: 118rpx; flex-direction: column; align-items: flex-end; gap: 3rpx; }.flight-weather text:first-child { color: var(--text); font-size: 30rpx; font-weight: 750; }.flight-weather text:last-child { color: var(--muted); font-size: 19rpx; }.flight-status { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 16rpx; padding-top: 12rpx; border-top: 1rpx solid var(--line); color: #e5b66d; font-size: 20rpx; }.flight-status text:last-child { color: var(--muted); font-size: 17rpx; }.flight-status.danger { color: #ee8080; }.flight-arrow { position: absolute; right: 20rpx; top: 45%; color: var(--muted); font-size: 34rpx; }.flight-skeleton { display: grid; gap: 12rpx; height: 150rpx; margin-bottom: 20rpx; padding: 22rpx; box-sizing: border-box; border-radius: 10rpx; background: var(--surface); }.flight-skeleton view { width: 78%; height: 24rpx; border-radius: 5rpx; background: var(--surface-strong); animation: pulse 1.35s ease-in-out infinite; }.flight-skeleton view:last-child { width: 45%; }
.home-map-panel { position: relative; isolation: isolate; overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }.home-map-stage { position: relative; z-index: 0; height: 430rpx; }.home-native-map { display: block; width: 100%; height: 430rpx; }.home-map-paused { display: flex; height: 430rpx; align-items: center; justify-content: center; flex-direction: column; gap: 12rpx; padding: 34rpx; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; line-height: 1.5; text-align: center; }.home-map-paused text:first-child { color: var(--text); font-size: 25rpx; font-weight: 700; }.home-map-caption { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 16rpx 18rpx; }.home-map-caption view { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4rpx; }.home-map-caption text:first-child { overflow: hidden; color: var(--text); font-size: 23rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.home-map-caption text:nth-child(2) { color: var(--muted); font-size: 18rpx; }.home-map-caption > text { flex: 0 0 auto; color: var(--accent); font-size: 21rpx; }
.carousel-wrap { margin-bottom: 6rpx; }
.carousel { height: 340rpx; overflow: hidden; border-radius: 14rpx; background: var(--surface); }
.carousel-slide { position: relative; height: 100%; overflow: hidden; transition: transform .16s ease; }
.carousel-image, .image-fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
.image-fallback { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12rpx; background: var(--surface-strong); color: var(--muted); font-size: 22rpx; }
.fallback-mark { padding: 14rpx 18rpx; border: 1rpx solid var(--line); border-radius: 8rpx; color: var(--text); font-weight: 700; }
.carousel-scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,18,29,.92), rgba(4,18,29,.56) 62%, rgba(4,18,29,.18)); }
.carousel-copy { position: relative; z-index: 1; display: flex; width: 72%; height: 100%; justify-content: center; flex-direction: column; box-sizing: border-box; padding: 30rpx; color: #edf7f8; }
.carousel-kicker { color: #78dec4; font-size: 20rpx; font-weight: 650; }
.carousel-title { margin-top: 8rpx; font-size: 35rpx; font-weight: 750; line-height: 1.25; }
.carousel-note { margin-top: 11rpx; color: #c4d2d9; font-size: 21rpx; line-height: 1.5; }
.carousel-action { margin-top: 20rpx; color: #78dec4; font-size: 23rpx; font-weight: 650; }
.carousel-indicators { display: flex; justify-content: center; margin-top: 7rpx; }
.indicator-hit { display: flex; width: 42rpx; height: 34rpx; align-items: center; justify-content: center; }
.indicator { width: 13rpx; height: 7rpx; border-radius: 4rpx; background: var(--line); transition: width .18s ease, background .18s ease; }
.indicator.active { width: 28rpx; background: var(--accent); }
.carousel-skeleton { height: 340rpx; padding: 34rpx; box-sizing: border-box; border-radius: 14rpx; background: var(--surface); }
.carousel-skeleton view { width: 56%; height: 26rpx; margin-top: 22rpx; border-radius: 6rpx; background: var(--surface-strong); animation: pulse 1.35s ease-in-out infinite; }
.carousel-skeleton view:first-child { width: 72%; height: 44rpx; margin-top: 72rpx; }
.carousel-skeleton view:last-child { width: 38%; }
.metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.metric-item { display: flex; min-height: 128rpx; flex-direction: column; justify-content: center; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); transition: transform .16s ease; }
.metric-value { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 33rpx; font-weight: 750; }
.metric-label { margin-top: 5rpx; color: var(--text); font-size: 23rpx; font-weight: 650; }
.metric-note { margin-top: 4rpx; color: var(--muted); font-size: 18rpx; }
.entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.entry-item { display: flex; min-width: 0; align-items: center; gap: 13rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); transition: transform .16s ease; }
.entry-mark { display: flex; width: 52rpx; height: 52rpx; flex: 0 0 52rpx; align-items: center; justify-content: center; border-radius: 9rpx; background: var(--surface-strong); color: var(--accent); font-size: 23rpx; font-weight: 700; }
.entry-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5rpx; }
.entry-copy text:first-child { color: var(--text); font-size: 23rpx; font-weight: 650; }
.entry-copy text:last-child { color: var(--muted); font-size: 18rpx; }
.entry-arrow { color: var(--muted); font-size: 29rpx; }
.item-list { overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.info-row { display: flex; align-items: center; gap: 18rpx; padding: 22rpx; border-bottom: 1rpx solid var(--line); transition: transform .16s ease, background .16s ease; }
.info-row:last-child { border-bottom: 0; }
.info-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7rpx; }
.info-title { color: var(--text); font-size: 25rpx; font-weight: 650; }
.info-note { color: var(--muted); font-size: 21rpx; line-height: 1.45; }
.info-side { display: flex; flex: 0 0 auto; align-items: center; gap: 8rpx; }
.info-tag { max-width: 150rpx; color: var(--accent); font-size: 19rpx; text-align: right; }
.info-arrow { color: var(--muted); font-size: 30rpx; }
.page-disclaimer { display: block; margin-top: 30rpx; padding: 20rpx; border-left: 4rpx solid var(--accent); background: var(--surface); color: var(--muted); font-size: 20rpx; line-height: 1.55; }
.overlay { position: fixed; z-index: 9999; inset: 0; display: flex; align-items: flex-end; background: rgba(2, 14, 23, .7); }
.city-sheet { width: 100%; padding: 28rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 16rpx 16rpx 0 0; background: var(--surface); }
.sheet-title { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 30rpx; font-weight: 700; }
.sheet-subtitle { display: block; margin: 24rpx 0 8rpx; color: var(--text); font-size: 24rpx; font-weight: 700; }.address-search { display: flex; gap: 10rpx; }.address-search input { min-width: 0; height: 70rpx; flex: 1; padding: 0 16rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; }.address-placeholder { color: var(--muted); }.address-button { display: flex; min-width: 142rpx; align-items: center; justify-content: center; border-radius: 7px; background: var(--accent); color: var(--accent-ink); font-size: 21rpx; font-weight: 700; }.address-button.disabled { opacity: .55; }.address-note { display: block; margin-top: 11rpx; color: var(--muted); font-size: 18rpx; line-height: 1.5; }
.address-tips { overflow: hidden; margin-top: 10rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); }.address-tips view { display: flex; flex-direction: column; gap: 4rpx; padding: 14rpx 16rpx; border-bottom: 1rpx solid var(--line); }.address-tips view:last-child { border-bottom: 0; }.address-tips text:first-child { color: var(--text); font-size: 21rpx; }.address-tips text:last-child { color: var(--muted); font-size: 18rpx; }
.city-option { display: block; padding: 23rpx 0; border-bottom: 1rpx solid var(--line); color: var(--text); font-size: 26rpx; }
.city-option.selected { color: var(--accent); font-weight: 700; }
@keyframes pulse { 0%, 100% { opacity: .48; } 50% { opacity: .92; } }
@media (prefers-reduced-motion: reduce) { .carousel-skeleton view { animation: none; }.indicator { transition: none; } }
@media (min-width: 768px) { .home-screen { max-width: 980rpx; margin: 0 auto; }.entry-grid { grid-template-columns: repeat(4, 1fr); } }
</style>
