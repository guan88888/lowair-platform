<template>
  <view class="h5-map" :data-provider="provider" :data-error="message">
    <div ref="map" class="h5-map-canvas"></div>
    <view v-if="state !== 'ready'" class="h5-map-status">
      <text>{{ state === 'loading' ? '正在加载地图…' : message }}</text>
      <text v-if="state === 'unavailable'">请检查网络连接后重试，或使用城市搜索继续核查。</text>
      <button v-if="state === 'unavailable'" class="h5-map-retry" @tap="initialize">重新加载</button>
    </view>
  </view>
</template>

<script>
const env = import.meta.env || {}
const AMAP_JS_KEY = String(env.VITE_AMAP_JS_API_KEY || '').trim()
const AMAP_SECURITY_CODE = String(env.VITE_AMAP_SECURITY_JS_CODE || '').trim()
const TILE_URL = String(env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png').trim()
const TILE_ATTRIBUTION = String(env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors').trim()

let amapLoader
let leafletLoader

function loadAmap() {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (amapLoader) return amapLoader
  amapLoader = new Promise((resolve, reject) => {
    if (AMAP_SECURITY_CODE) window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE }
    const script = document.createElement('script')
    script.src = 'https://webapi.amap.com/maps?v=2.0&plugin=AMap.Marker&key=' + encodeURIComponent(AMAP_JS_KEY)
    script.async = true
    script.onload = () => window.AMap ? resolve(window.AMap) : reject(new Error('高德地图脚本未初始化'))
    script.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(script)
  }).catch((error) => {
    amapLoader = null
    throw error
  })
  return amapLoader
}

function loadLeaflet() {
  if (!leafletLoader) {
    leafletLoader = Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css')
    ]).then(([module]) => module.default || module).catch((error) => {
      leafletLoader = null
      throw error
    })
  }
  return leafletLoader
}

function validCoordinate(value) {
  return Number.isFinite(Number(value))
}

function outOfChina(longitude, latitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function transformLatitude(longitude, latitude) {
  let value = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude * latitude + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
  value += (20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3
  value += (20 * Math.sin(latitude * Math.PI) + 40 * Math.sin(latitude / 3 * Math.PI)) * 2 / 3
  return value + (160 * Math.sin(latitude / 12 * Math.PI) + 320 * Math.sin(latitude * Math.PI / 30)) * 2 / 3
}

function transformLongitude(longitude, latitude) {
  let value = 300 + longitude + 2 * latitude + 0.1 * longitude * longitude + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
  value += (20 * Math.sin(6 * longitude * Math.PI) + 20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3
  value += (20 * Math.sin(longitude * Math.PI) + 40 * Math.sin(longitude / 3 * Math.PI)) * 2 / 3
  return value + (150 * Math.sin(longitude / 12 * Math.PI) + 300 * Math.sin(longitude / 30 * Math.PI)) * 2 / 3
}

function gcj02ToWgs84(longitude, latitude) {
  if (outOfChina(longitude, latitude)) return [longitude, latitude]
  const earthRadius = 6378245
  const eccentricity = 0.006693421622965943
  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35)
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35)
  const radianLatitude = latitude / 180 * Math.PI
  let magic = Math.sin(radianLatitude)
  magic = 1 - eccentricity * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  latitudeDelta = latitudeDelta * 180 / ((earthRadius * (1 - eccentricity)) / (magic * sqrtMagic) * Math.PI)
  longitudeDelta = longitudeDelta * 180 / (earthRadius / sqrtMagic * Math.cos(radianLatitude) * Math.PI)
  return [longitude * 2 - (longitude + longitudeDelta), latitude * 2 - (latitude + latitudeDelta)]
}

export default {
  name: 'H5AmapMap',
  props: {
    center: { type: Object, required: true },
    markers: { type: Array, default: () => [] },
    coordinateSystem: { type: String, default: 'wgs84' }
  },
  data() {
    return {
      state: 'loading',
      message: '',
      provider: '',
      mapInstance: null,
      markerInstances: [],
      leaflet: null,
      initialization: null
    }
  },
  mounted() {
    this.initialize()
  },
  beforeUnmount() {
    this.destroyMap()
  },
  watch: {
    center: { deep: true, handler() { this.renderMap() } },
    markers: { deep: true, handler() { this.renderMap() } },
    coordinateSystem() { this.renderMap() }
  },
  methods: {
    async initialize() {
      if (this.initialization || this.state === 'ready') return this.initialization
      this.state = 'loading'
      this.message = ''
      this.initialization = this.initializeProvider()
      try {
        await this.initialization
      } catch (error) {
        this.state = 'unavailable'
        this.message = error?.message ? '地图加载失败：' + error.message : '地图暂时不可用'
      } finally {
        this.initialization = null
      }
    },
    async initializeProvider() {
      if (AMAP_JS_KEY) {
        try {
          const AMap = await loadAmap()
          this.provider = 'amap'
          this.mapInstance = new AMap.Map(this.$refs.map, {
            center: [Number(this.center.longitude), Number(this.center.latitude)],
            zoom: Number(this.center.scale) || 11,
            resizeEnable: true,
            viewMode: '2D'
          })
          this.state = 'ready'
          this.renderMap()
          return
        } catch (_) {
          this.destroyMap()
        }
      }

      const L = await loadLeaflet()
      this.leaflet = L
      this.provider = 'openstreetmap'
      this.mapInstance = L.map(this.$refs.map, {
        attributionControl: true,
        zoomControl: true,
        fadeAnimation: false,
        markerZoomAnimation: false,
        zoomAnimation: false
      })
      this.mapInstance.attributionControl.setPrefix(false)
      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
        minZoom: 3
      }).addTo(this.mapInstance)
      this.state = 'ready'
      this.renderMap()
      this.$nextTick(() => this.mapInstance?.invalidateSize?.())
    },
    destroyMap() {
      if (this.mapInstance) {
        if (this.provider === 'amap') this.mapInstance.destroy?.()
        else this.mapInstance.remove?.()
      }
      this.mapInstance = null
      this.markerInstances = []
      this.provider = ''
      if (this.$refs.map) this.$refs.map.innerHTML = ''
    },
    leafletPosition(item) {
      const longitude = Number(item.longitude)
      const latitude = Number(item.latitude)
      const position = this.coordinateSystem === 'gcj02' ? gcj02ToWgs84(longitude, latitude) : [longitude, latitude]
      return [position[1], position[0]]
    },
    renderMap() {
      if (!this.mapInstance || !this.center) return
      const points = this.markers.filter((item) => validCoordinate(item.longitude) && validCoordinate(item.latitude))
      if (this.provider === 'amap' && window.AMap) {
        this.mapInstance.setZoomAndCenter(Number(this.center.scale) || 11, [Number(this.center.longitude), Number(this.center.latitude)])
        if (this.markerInstances.length) this.mapInstance.remove(this.markerInstances)
        this.markerInstances = points.map((item) => new window.AMap.Marker({
          position: [Number(item.longitude), Number(item.latitude)],
          title: item.title || item.name || ''
        }))
        if (this.markerInstances.length) this.mapInstance.add(this.markerInstances)
        return
      }
      if (this.provider !== 'openstreetmap' || !this.leaflet) return
      this.mapInstance.setView(this.leafletPosition(this.center), Number(this.center.scale) || 11, { animate: false })
      this.markerInstances.forEach((marker) => marker.remove())
      const icon = this.leaflet.divIcon({ className: 'lowair-map-marker', html: '<span></span>', iconSize: [28, 36], iconAnchor: [14, 34] })
      this.markerInstances = points.map((item) => {
        const marker = this.leaflet.marker(this.leafletPosition(item), { icon }).addTo(this.mapInstance)
        const title = String(item.title || item.name || '').trim()
        if (title) {
          const label = document.createElement('span')
          label.textContent = title
          marker.bindTooltip(label, { direction: 'top', offset: [0, -22] })
        }
        return marker
      })
    }
  }
}
</script>

<style scoped>
.h5-map { position: relative; width: 100%; height: 430rpx; overflow: hidden; background: var(--surface-strong); }
.h5-map-canvas { width: 100%; height: 100%; }
.h5-map-status { position: absolute; z-index: 500; inset: 0; display: flex; align-items: flex-start; justify-content: center; flex-direction: column; gap: 12rpx; padding: 34rpx; box-sizing: border-box; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; line-height: 1.5; }
.h5-map-status text:first-child { color: var(--text); font-size: 24rpx; font-weight: 700; }
.h5-map-retry { min-width: 150rpx; height: 62rpx; margin: 6rpx 0 0; padding: 0 24rpx; border: 1rpx solid var(--accent); border-radius: 7rpx; background: var(--surface); color: var(--accent); font-size: 21rpx; line-height: 60rpx; }
.h5-map-retry::after { border: 0; }
.h5-map :deep(.leaflet-control-zoom) { overflow: hidden; border: 1px solid rgba(17, 57, 70, .24); border-radius: 6px; box-shadow: 0 4px 14px rgba(17, 57, 70, .12); }
.h5-map :deep(.leaflet-control-zoom a) { color: #163b46; }
.h5-map :deep(.leaflet-control-attribution) { padding: 2px 5px; background: rgba(255, 255, 255, .86); color: #46616a; font-size: 10px; }
.h5-map :deep(.lowair-map-marker) { border: 0; background: transparent; }
.h5-map :deep(.lowair-map-marker span) { position: relative; display: block; width: 28px; height: 28px; border: 3px solid #fff; border-radius: 50% 50% 50% 0; box-sizing: border-box; background: #087b70; box-shadow: 0 4px 12px rgba(8, 57, 63, .32); transform: rotate(-45deg); }
.h5-map :deep(.lowair-map-marker span::after) { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #fff; content: ''; left: 7px; top: 7px; }
.h5-map :deep(.leaflet-tooltip) { border: 0; border-radius: 5px; box-shadow: 0 3px 12px rgba(17, 57, 70, .18); color: #163b46; font-size: 12px; }
</style>
