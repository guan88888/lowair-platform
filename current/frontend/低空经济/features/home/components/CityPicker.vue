<template>
  <view class="city-picker">
    <view class="picker-search"><input v-model="keyword" placeholder="搜索城市或行政区" confirm-type="search" @input="scheduleSearch" @confirm="search" /><text @tap="search">搜索</text></view>
    <view class="picker-location" @tap="locate"><text>{{ locating ? '正在定位…' : '授权定位当前城市' }}</text><text>GCJ-02</text></view>
    <text v-if="message" class="picker-message">{{ message }}</text>
    <text class="picker-label">最近使用</text>
    <view class="picker-tags"><text v-for="item in recent" :key="item.id || item.name" @tap="choose(item)">{{ item.name }}</text></view>
    <text class="picker-label">热门城市</text>
    <view class="picker-tags"><text v-for="item in hotCities" :key="item.name" @tap="choose(item)">{{ item.name }}</text></view>
    <text class="picker-label">{{ keyword ? '高德行政区搜索' : '城市目录' }}</text>
    <view v-if="loading" class="picker-loading">正在查询城市…</view>
    <view v-else class="picker-list">
      <view v-for="item in items" :key="item.id || item.name" class="picker-item" :class="{ selected: item.name === value }" @tap="choose(item)"><view><text>{{ item.name }}</text><text>{{ item.province || item.label }}</text></view><text>{{ item.name === value ? '已选' : '›' }}</text></view>
      <text v-if="!items.length" class="picker-empty">未找到城市，请更换关键词。</text>
    </view>
    <view v-if="hasMore" class="picker-more" @tap="load(page + 1, false)">{{ loadingMore ? '加载中…' : '加载更多' }}</view>
    <text v-if="meta.source" class="picker-meta">数据来源：{{ meta.source }} · {{ meta.realtime ? '高德实时查询' : '目录降级' }}</text>
  </view>
</template>

<script>
import { loadCityDirectory, reverseGeocode } from '../services'

const HOT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'].map((name) => ({ id: name, name }))

export default {
  name: 'CityPicker',
  props: { value: { type: String, default: '' } },
  data() { return { keyword: '', items: [], page: 1, hasMore: false, loading: false, loadingMore: false, locating: false, message: '', meta: {}, timer: null, recent: [], hotCities: HOT_CITIES } },
  created() { this.restoreRecent(); this.load(1, true) },
  beforeUnmount() { if (this.timer) clearTimeout(this.timer) },
  methods: {
    restoreRecent() { const saved = uni.getStorageSync('lowair-recent-cities'); this.recent = Array.isArray(saved) ? saved.slice(0, 5) : [] },
    scheduleSearch() { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => this.search(), 280) },
    search() { this.load(1, true) },
    async load(page, reset) {
      if (this.loading || this.loadingMore) return
      if (page > 1) this.loadingMore = true; else this.loading = true
      this.message = ''
      try {
        const data = await loadCityDirectory({ keyword: this.keyword.trim(), page, pageSize: 20 })
        this.items = reset ? data.items : [...this.items, ...data.items]
        this.page = data.page || page; this.hasMore = Boolean(data.hasMore); this.meta = data.meta || {}
        if (data.meta?.message) this.message = data.meta.message
      } catch (error) { this.message = error.message || '城市搜索暂不可用' }
      finally { this.loading = false; this.loadingMore = false }
    },
    choose(item) {
      if (!item?.name) return
      const list = [item, ...this.recent.filter((entry) => entry.name !== item.name)].slice(0, 5)
      this.recent = list; uni.setStorageSync('lowair-recent-cities', list)
      this.$emit('change', item)
    },
    locate() {
      if (this.locating || typeof uni.getLocation !== 'function') return
      this.locating = true; this.message = ''
      uni.getLocation({ type: 'gcj02', isHighAccuracy: true, success: async (position) => {
        try {
          const place = await reverseGeocode({ longitude: position.longitude, latitude: position.latitude })
          if (!place.city) throw new Error('未识别到当前城市')
          this.choose({ id: place.adcode || place.city, name: String(place.city).replace(/市$/, ''), label: place.city, province: place.province, adcode: place.adcode, longitude: place.longitude, latitude: place.latitude })
        } catch (error) { this.message = error.message || '无法通过高德确认当前城市' }
        finally { this.locating = false }
      }, fail: () => { this.locating = false; this.message = '定位未授权，您仍可搜索并选择城市。' } })
    }
  }
}
</script>

<style scoped>
.city-picker { max-height: 68vh; overflow: auto; }.picker-search { display: flex; gap: 10rpx; }.picker-search input { min-width: 0; height: 72rpx; flex: 1; padding: 0 16rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; }.picker-search text { display: flex; align-items: center; padding: 0 18rpx; border-radius: 7px; background: var(--accent); color: var(--accent-ink); font-size: 21rpx; font-weight: 700; }.picker-location { display: flex; justify-content: space-between; margin-top: 14rpx; padding: 16rpx; border: 1rpx solid var(--line); border-radius: 7px; color: var(--accent); font-size: 21rpx; }.picker-location text:last-child { color: var(--muted); font-size: 18rpx; }.picker-message,.picker-meta { display: block; margin-top: 10rpx; color: var(--muted); font-size: 18rpx; line-height: 1.45; }.picker-label { display: block; margin: 20rpx 0 9rpx; color: var(--text); font-size: 22rpx; font-weight: 700; }.picker-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }.picker-tags text { padding: 11rpx 16rpx; border: 1rpx solid var(--line); border-radius: 999px; color: var(--text); font-size: 20rpx; }.picker-item { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 18rpx 0; border-bottom: 1rpx solid var(--line); }.picker-item view { display: flex; min-width: 0; flex-direction: column; gap: 5rpx; }.picker-item text:first-child { color: var(--text); font-size: 24rpx; }.picker-item text:nth-child(2) { color: var(--muted); font-size: 18rpx; }.picker-item > text { color: var(--muted); }.picker-item.selected > text { color: var(--accent); }.picker-loading,.picker-empty,.picker-more { padding: 20rpx 0; color: var(--muted); font-size: 21rpx; text-align: center; }.picker-more { color: var(--accent); }
</style>
