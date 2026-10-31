<template>
  <academy-layout ref="layout" title="培训机构" :city="filters.city || '全国'">
    <view class="academy-panel filter-panel">
      <view class="academy-field"><text class="academy-label">机构或课程关键词</text><input v-model="filters.keyword" class="academy-input" placeholder="例如：超视距、周末班" placeholder-class="academy-placeholder" confirm-type="search" @confirm="applyFilters" /></view>
      <view class="academy-filter-grid">
        <picker :range="cities" @change="pickFilter('city', cities, $event)"><view class="academy-select">{{ filters.city || '全部城市' }}</view></picker>
        <picker :range="levels" @change="pickFilter('level', levels, $event)"><view class="academy-select">{{ filters.level || '全部等级' }}</view></picker>
        <picker :range="schedules" @change="pickFilter('schedule', schedules, $event)"><view class="academy-select">{{ filters.schedule || '全部班型' }}</view></picker>
        <picker range-key="label" :range="sorts" @change="pickSort"><view class="academy-select">{{ activeSortLabel }}</view></picker>
      </view>
      <view class="filter-bottom"><label class="verify-check" @tap="filters.verifiedOnly = !filters.verifiedOnly"><text class="check-box" :class="{ checked: filters.verifiedOnly }">{{ filters.verifiedOnly ? '✓' : '' }}</text><text>仅看已核验</text></label><view class="academy-button academy-button--small" @tap="applyFilters">应用筛选</view></view>
    </view>

    <view class="compare-bar" :class="{ active: compareIds.length }"><text>已选 {{ compareIds.length }}/4 家</text><view class="compare-bar__actions"><text class="academy-link" @tap="clearCompare">清空</text><view class="academy-button academy-button--small" :class="{ 'academy-button--disabled': compareIds.length < 2 }" @tap="showCompare = compareIds.length >= 2">查看对比</view></view></view>

    <view class="academy-section">
      <view class="academy-section__head"><view><text class="academy-section__title">机构列表</text><text class="academy-section__note">{{ result.total }} 家结果，第 {{ result.page }}/{{ result.pages }} 页</text></view></view>
      <view v-if="loading" class="institution-skeletons"><view v-for="i in 3" :key="i" class="academy-skeleton" /></view>
      <view v-else-if="error" class="academy-state"><text class="academy-state__title">机构加载失败</text><text class="academy-state__note">{{ error }}</text><view class="academy-button academy-button--secondary" @tap="load">重新加载</view></view>
      <view v-else-if="!result.items.length" class="academy-state"><text class="academy-state__title">没有匹配机构</text><text class="academy-state__note">放宽城市、等级或班型条件后再试</text><view class="academy-button academy-button--secondary" @tap="resetFilters">重置筛选</view></view>
      <view v-else class="institution-list">
        <view v-for="item in result.items" :key="item.id" class="institution-card">
          <image class="institution-card__image" :src="item.image" mode="aspectFill" @tap="openInstitution(item.id)" />
          <view class="institution-card__body">
            <view class="institution-card__head"><view class="institution-card__name"><text>{{ item.name }}</text><text>{{ item.district }} · {{ item.distance }} km</text></view><view class="compare-check" :class="{ checked: compareIds.includes(item.id) }" @tap="toggleCompare(item)">{{ compareIds.includes(item.id) ? '✓' : '+' }}</view></view>
            <text class="institution-card__tagline">{{ item.tagline }}</text>
            <view class="institution-tags"><text v-if="item.verified" class="academy-tag academy-tag--accent">资质已核验</text><text v-for="level in item.levels" :key="level" class="academy-tag">{{ level }}</text></view>
            <view class="institution-card__meta"><text>评分 {{ item.rating }}（{{ item.reviewCount }}）</text><text>￥{{ item.priceFrom }} 起</text></view>
            <view class="academy-actions"><view class="academy-button academy-button--secondary academy-button--small" @tap="openInstitution(item.id)">查看详情</view><view class="academy-button academy-button--small" @tap="book(item.id)">预约试听</view></view>
          </view>
        </view>
      </view>
      <view v-if="result.pages > 1" class="pagination"><view class="academy-button academy-button--secondary academy-button--small" :class="{ 'academy-button--disabled': result.page <= 1 }" @tap="changePage(-1)">上一页</view><text>{{ result.page }} / {{ result.pages }}</text><view class="academy-button academy-button--secondary academy-button--small" :class="{ 'academy-button--disabled': !result.hasMore }" @tap="changePage(1)">下一页</view></view>
    </view>

    <view v-if="showCompare" class="compare-mask" @tap.self="showCompare = false"><view class="compare-sheet"><view class="compare-sheet__head"><view><text class="academy-section__title">机构对比</text><text class="academy-section__note">最多同时对比 4 家</text></view><text class="academy-link" @tap="showCompare = false">关闭</text></view><scroll-view scroll-x class="compare-scroll"><view class="compare-table"><view v-for="item in comparedInstitutions" :key="item.id" class="compare-column"><text class="compare-column__name">{{ item.name }}</text><text>{{ item.city }} {{ item.district }}</text><text>{{ item.distance }} km</text><text>评分 {{ item.rating }}</text><text>￥{{ item.priceFrom }} 起</text><text>{{ item.levels.join(' / ') }}</text><text>{{ item.schedules.join(' / ') }}</text><text>{{ item.passRate ? '公示过考率 ' + item.passRate + '%' : '过考率暂无数据' }}</text><view class="academy-button academy-button--small" @tap="openInstitution(item.id)">详情</view></view></view></scroll-view></view></view>
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import { academyService } from '../services'

export default {
  name: 'InstitutionsPage', components: { AcademyLayout },
  data() { return { loading: true, error: '', showCompare: false, filters: { keyword: '', city: '', level: '', schedule: '', verifiedOnly: false, sort: 'recommended', page: 1, pageSize: 4 }, cities: ['全部城市', '北京', '天津', '石家庄'], levels: ['全部等级', '视距内', '超视距', '教员'], schedules: ['全部班型', '周末班', '工作日班', '晚班', '脱产班'], sorts: [{ value: 'recommended', label: '综合推荐' }, { value: 'distance', label: '距离优先' }, { value: 'rating', label: '评分优先' }, { value: 'price', label: '价格从低到高' }], result: { items: [], total: 0, page: 1, pages: 1, hasMore: false }, compareIds: [], compareCache: [] } },
  computed: { activeSortLabel() { return this.sorts.find((item) => item.value === this.filters.sort)?.label || '综合推荐' }, comparedInstitutions() { return this.compareIds.map((id) => this.compareCache.find((item) => item.id === id)).filter(Boolean) } },
  created() { const saved = uni.getStorageSync('lowair-academy-compare'); if (Array.isArray(saved)) { this.compareIds = saved.map((item) => item.id).slice(0, 4); this.compareCache = saved.slice(0, 4) } },
  mounted() { this.load() },
  methods: {
    async load() { this.loading = true; this.error = ''; try { this.result = await academyService.listInstitutions(this.filters) } catch (error) { this.error = error.message } finally { this.loading = false } },
    applyFilters() { this.filters.page = 1; this.load() },
    resetFilters() { this.filters = { keyword: '', city: '', level: '', schedule: '', verifiedOnly: false, sort: 'recommended', page: 1, pageSize: 4 }; this.load() },
    pickFilter(key, values, event) { const value = values[Number(event.detail.value)]; this.filters[key] = value.startsWith('全部') ? '' : value },
    pickSort(event) { this.filters.sort = this.sorts[Number(event.detail.value)].value },
    changePage(delta) { const next = this.result.page + delta; if (next < 1 || next > this.result.pages) return; this.filters.page = next; this.load() },
    toggleCompare(item) { const index = this.compareIds.indexOf(item.id); if (index >= 0) { this.compareIds.splice(index, 1); this.compareCache = this.compareCache.filter((entry) => entry.id !== item.id) } else { if (this.compareIds.length >= 4) return this.$refs.layout.showToast('最多对比 4 家机构'); this.compareIds.push(item.id); this.compareCache.push(item) } uni.setStorageSync('lowair-academy-compare', this.comparedInstitutions) },
    clearCompare() { this.compareIds = []; this.compareCache = []; uni.removeStorageSync('lowair-academy-compare') },
    openInstitution(id) { uni.navigateTo({ url: `/pages/academy/institution-detail?id=${id}` }) },
    book(id) { uni.navigateTo({ url: `/pages/academy/visit?institutionId=${id}` }) }
  }
}
</script>

<style scoped>
.filter-panel { margin-bottom: 18rpx; }.academy-filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }.filter-bottom { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-top: 18rpx; }.verify-check { display: flex; align-items: center; gap: 10rpx; color: var(--muted); font-size: 22rpx; }.check-box, .compare-check { display: flex; width: 40rpx; height: 40rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 8rpx; color: var(--muted); }.check-box.checked, .compare-check.checked { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }.compare-bar { position: sticky; z-index: 4; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-bottom: 26rpx; padding: 14rpx 18rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); color: var(--muted); font-size: 22rpx; }.compare-bar__actions { display: flex; align-items: center; gap: 16rpx; }.institution-skeletons, .institution-list { display: flex; flex-direction: column; gap: 16rpx; }.institution-card { overflow: hidden; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }.institution-card__image { width: 100%; height: 220rpx; display: block; }.institution-card__body { padding: 20rpx; }.institution-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }.institution-card__name { min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }.institution-card__name text:first-child { color: var(--text); font-size: 29rpx; font-weight: 730; }.institution-card__name text:last-child { color: var(--muted); font-size: 20rpx; }.institution-card__tagline { display: block; margin: 12rpx 0; color: var(--muted); font-size: 23rpx; }.institution-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }.institution-card__meta { display: flex; justify-content: space-between; margin: 17rpx 0; color: var(--text); font-size: 22rpx; }.pagination { display: flex; align-items: center; justify-content: center; gap: 24rpx; margin-top: 22rpx; color: var(--muted); font-size: 21rpx; }.compare-mask { position: fixed; z-index: 90; inset: 0; display: flex; align-items: flex-end; background: rgba(2,14,24,.68); }.compare-sheet { width: 100%; max-height: 78%; padding: 26rpx; border-radius: 18rpx 18rpx 0 0; background: var(--app-bg); }.compare-sheet__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18rpx; }.compare-scroll { width: 100%; }.compare-table { display: flex; gap: 12rpx; width: max-content; }.compare-column { width: 260rpx; display: flex; flex-direction: column; gap: 14rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); color: var(--muted); font-size: 21rpx; }.compare-column__name { min-height: 74rpx; color: var(--text); font-size: 25rpx; font-weight: 700; }
@media (min-width: 768px) { .institution-card { display: grid; grid-template-columns: 280px minmax(0, 1fr); }.institution-card__image { height: 100%; min-height: 240px; }.academy-filter-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
