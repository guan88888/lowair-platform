<template>
  <app-page-shell title="全局搜索" active="home">
    <view class="search-screen">
      <view class="search-box">
        <text class="search-symbol">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索机构、岗位、任务、商品、内容"
          placeholder-class="search-placeholder"
          @input="handleKeywordInput"
          @confirm="submitSearch"
        />
        <text v-if="keyword" class="clear-button" @tap="clearKeyword">×</text>
        <view class="search-button" @tap="submitSearch">搜索</view>
      </view>

      <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
        <view class="category-list">
          <text
            v-for="item in categories"
            :key="item"
            class="category-item"
            :class="{ selected: category === item }"
            @tap="selectCategory(item)"
          >{{ item }}</text>
        </view>
      </scroll-view>

      <view v-if="!searchedKeyword && state !== 'loading'" class="discovery-panel">
        <view class="discovery-head">
          <text class="discovery-title">最近搜索</text>
          <text v-if="history.length" class="text-action" @tap="clearHistory">清除</text>
        </view>
        <view v-if="history.length" class="chip-list">
          <text v-for="item in history" :key="item" class="chip" @tap="applyKeyword(item)">{{ item }}</text>
        </view>
        <text v-else class="history-empty">搜索记录仅保存在当前设备。</text>

        <view class="discovery-head hot-head"><text class="discovery-title">常用搜索</text></view>
        <view class="chip-list">
          <text v-for="item in hotWords" :key="item" class="chip chip-subtle" @tap="applyKeyword(item)">{{ item }}</text>
        </view>
      </view>

      <view v-if="searchedKeyword" class="result-head">
        <view><text class="result-title">“{{ searchedKeyword }}”</text><text class="result-count">{{ total }} 条结果</text></view>
        <text class="result-category">{{ category }}</text>
      </view>

      <view v-if="searchedKeyword" class="ai-search-panel">
        <view class="ai-search-head"><view><text>低空 AI 搜索</text><text>仅用于理解意图与改写关键词</text></view><text>{{ aiState === 'loading' ? '分析中' : 'AI' }}</text></view>
        <text v-if="aiAssist?.intent" class="ai-intent">{{ aiAssist.intent }}</text>
        <view v-if="aiAssist?.suggestions?.length" class="ai-suggestions"><text v-for="item in aiAssist.suggestions" :key="item" @tap="applyKeyword(item)">{{ item }}</text></view>
        <view v-if="aiState === 'error'" class="ai-search-error"><text>{{ aiError }}</text><text @tap="loadAiAssist">重试</text></view>
      </view>

      <module-state
        v-if="searchedKeyword || state === 'loading' || state === 'error'"
        :state="state"
        :error="error"
        empty-title="没有匹配结果"
        empty-note="换个关键词或分类再试一次。"
        @retry="runSearch(1)"
      >
        <template #loading>
          <view class="result-skeleton">
            <view v-for="item in 4" :key="item" class="skeleton-row"><view></view><view></view><view></view></view>
          </view>
        </template>

        <view class="result-list">
          <view v-for="item in results" :key="item.category + '-' + item.id" class="result-row" @tap="openResult(item)">
            <text class="category-mark">{{ item.category.slice(0, 1) }}</text>
            <view class="result-copy">
              <view class="result-line"><text class="item-title">{{ item.title }}</text><text class="item-category">{{ item.category }}</text></view>
              <text class="item-note">{{ item.note }}</text>
              <text class="item-source">来源：{{ item.source || meta.source }}</text>
            </view>
            <text class="item-arrow">›</text>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" :class="{ disabled: loadingMore }" @tap="loadMore">
          {{ loadingMore ? '正在加载...' : '加载更多' }}
        </view>
        <text v-else-if="results.length" class="result-end">已显示全部结果</text>
        <source-meta :meta="meta" />
      </module-state>

      <text class="search-note">搜索结果用于信息导航。机构资质、岗位、任务、商品与官方内容状态须在详情页继续核验。</text>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import ModuleState from './ModuleState.vue'
import SourceMeta from './SourceMeta.vue'
import { assistSearch, searchGlobal } from '../services'
import { buildSearchRoute } from '../services/contracts.mjs'

const HISTORY_KEY = 'lowair-global-search-history'

export default {
  name: 'SearchPage',
  components: { AppPageShell, ModuleState, SourceMeta },
  data() {
    const options = getRouteOptions()
    const categories = ['全部', '机构', '岗位', '任务', '商品', '内容']
    const initialCategory = categories.includes(options.category) ? options.category : '全部'
    return {
      categories,
      category: initialCategory,
      scope: options.scope || '',
      keyword: options.q || options.keyword || '',
      searchedKeyword: '',
      history: [],
      hotWords: ['CAAC 超视距', '电力巡检', '二手无人机', '飞前检查'],
      results: [],
      total: 0,
      page: 1,
      pageSize: 5,
      state: 'ready',
      error: '',
      meta: null,
      loadingMore: false,
      aiState: 'idle',
      aiAssist: null,
      aiError: '',
      aiSequence: 0,
      debounceTimer: null,
      activeRequest: null,
      searchSequence: 0
    }
  },
  computed: {
    hasMore() {
      return this.results.length < this.total
    }
  },
  created() {
    const saved = uni.getStorageSync(HISTORY_KEY)
    this.history = Array.isArray(saved) ? saved.slice(0, 8) : []
    if (this.keyword.trim()) this.runSearch(1)
  },
  beforeUnmount() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.activeRequest?.cancel) this.activeRequest.cancel()
  },
  methods: {
    handleKeywordInput() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      const normalized = this.keyword.trim()
      if (!normalized) {
        if (this.activeRequest?.cancel) this.activeRequest.cancel()
        this.searchSequence += 1
        this.activeRequest = null
        this.results = []
        this.total = 0
        this.searchedKeyword = ''
        this.state = 'ready'
        this.syncUrl()
        return
      }
      this.debounceTimer = setTimeout(() => this.runSearch(1), 380)
    },
    submitSearch() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      if (!this.keyword.trim()) {
        uni.showToast({ title: '请输入搜索内容', icon: 'none' })
        return
      }
      this.runSearch(1, true)
    },
    selectCategory(category) {
      if (this.category === category) return
      this.category = category
      if (this.keyword.trim()) this.runSearch(1)
      else this.syncUrl()
    },
    applyKeyword(value) {
      this.keyword = value
      this.runSearch(1, true)
    },
    clearKeyword() {
      this.keyword = ''
      this.handleKeywordInput()
    },
    clearHistory() {
      this.history = []
      uni.removeStorageSync(HISTORY_KEY)
    },
    rememberKeyword(value) {
      this.history = [value, ...this.history.filter((item) => item !== value)].slice(0, 8)
      uni.setStorageSync(HISTORY_KEY, this.history)
    },
    async runSearch(page = 1, remember = false) {
      const normalized = this.keyword.trim()
      if (!normalized) return
      if (this.activeRequest?.cancel) this.activeRequest.cancel()
      const sequence = ++this.searchSequence
      this.error = ''
      this.loadingMore = page > 1
      if (page === 1) {
        this.state = 'loading'
        this.results = []
        this.total = 0
      }
      this.searchedKeyword = normalized
      if (page === 1) this.loadAiAssist()
      this.syncUrl(normalized)
      const task = searchGlobal({ keyword: normalized, category: this.category, scope: this.scope, page, pageSize: this.pageSize })
      this.activeRequest = task
      try {
        const payload = await task.promise
        if (sequence !== this.searchSequence) return
        const items = Array.isArray(payload.items) ? payload.items : []
        this.results = page === 1 ? items : [...this.results, ...items]
        this.total = Number(payload.total || 0)
        this.page = page
        this.meta = payload.meta
        this.state = this.results.length ? 'ready' : 'empty'
        if (remember) this.rememberKeyword(normalized)
      } catch (error) {
        if (sequence !== this.searchSequence) return
        if (error.canceled) return
        this.error = error.message || '搜索服务暂不可用'
        if (page === 1) this.state = 'error'
        else uni.showToast({ title: this.error, icon: 'none' })
      } finally {
        if (sequence === this.searchSequence) {
          this.loadingMore = false
          this.activeRequest = null
        }
      }
    },
    async loadAiAssist() {
      const keyword = this.keyword.trim()
      if (!keyword) return
      const sequence = ++this.aiSequence
      this.aiState = 'loading'
      this.aiError = ''
      this.aiAssist = null
      try {
        const result = await assistSearch({ keyword, category: this.category })
        if (sequence !== this.aiSequence) return
        this.aiAssist = result
        this.aiState = 'ready'
      } catch (error) {
        if (sequence !== this.aiSequence) return
        this.aiState = 'error'
        this.aiError = error.message || 'AI 搜索建议暂不可用'
      }
    },
    loadMore() {
      if (!this.loadingMore && this.hasMore) this.runSearch(this.page + 1)
    },
    openResult(item) {
      if (item.to) uni.navigateTo({ url: item.to })
    },
    syncUrl(keyword = this.keyword.trim()) {
      const route = buildSearchRoute({ keyword, category: this.category, scope: this.scope })
      // H5 can update the address without reloading; other targets retain the same state in-page.
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const usesHashRouting = window.location.hash.includes('/pages/search/index')
        const url = usesHashRouting
          ? window.location.pathname + window.location.search + '#' + route
          : route
        window.history.replaceState({}, '', url)
      }
    }
  }
}
</script>

<style scoped>
.search-screen { padding: 22rpx 22rpx 46rpx; color: var(--text); }
.search-box { display: flex; height: 78rpx; align-items: center; gap: 12rpx; padding-left: 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }
.search-symbol { color: var(--accent); font-size: 35rpx; }
.search-input { min-width: 0; height: 100%; flex: 1; color: var(--text); font-size: 24rpx; }
.search-placeholder { color: var(--muted); }
.clear-button { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; color: var(--muted); font-size: 34rpx; }
.search-button { display: flex; height: 100%; align-items: center; padding: 0 24rpx; border-radius: 0 9rpx 9rpx 0; background: var(--accent); color: var(--accent-ink); font-size: 23rpx; font-weight: 700; white-space: nowrap; }
.search-button:active, .chip:active, .result-row:active, .load-more:active { transform: scale(.98); }
.category-scroll { width: 100%; margin: 20rpx 0 24rpx; white-space: nowrap; }
.category-list { display: inline-flex; min-width: 100%; gap: 10rpx; }
.category-item { display: inline-flex; min-width: 96rpx; height: 58rpx; align-items: center; justify-content: center; padding: 0 18rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 8rpx; background: var(--surface); color: var(--muted); font-size: 22rpx; }
.category-item.selected { border-color: var(--accent); background: var(--surface-strong); color: var(--accent); font-weight: 700; }
.discovery-panel { padding: 24rpx; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.discovery-head { display: flex; align-items: center; justify-content: space-between; }
.hot-head { margin-top: 28rpx; }
.discovery-title { color: var(--text); font-size: 26rpx; font-weight: 700; }
.text-action { min-height: 48rpx; display: flex; align-items: center; color: var(--accent); font-size: 21rpx; }
.chip-list { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 15rpx; }
.chip { padding: 13rpx 18rpx; border: 1rpx solid var(--line); border-radius: 8rpx; background: var(--surface-strong); color: var(--text); font-size: 21rpx; transition: transform .16s ease; }
.chip-subtle { background: transparent; color: var(--muted); }
.history-empty { display: block; margin-top: 14rpx; color: var(--muted); font-size: 21rpx; }
.result-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.result-head > view { display: flex; align-items: baseline; gap: 12rpx; }
.ai-search-panel { margin-bottom: 16rpx; padding: 17rpx 19rpx; border-left: 4rpx solid var(--accent); border-radius: 0 9rpx 9rpx 0; background: var(--surface); }.ai-search-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }.ai-search-head > view { display: flex; flex-direction: column; gap: 3rpx; }.ai-search-head > view text:first-child { color: var(--text); font-size: 23rpx; font-weight: 700; }.ai-search-head > view text:last-child { color: var(--muted); font-size: 17rpx; }.ai-search-head > text { color: var(--accent); font-size: 19rpx; }.ai-intent { display: block; margin-top: 12rpx; color: var(--text); font-size: 21rpx; line-height: 1.5; }.ai-suggestions { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 12rpx; }.ai-suggestions text { padding: 9rpx 12rpx; border: 1rpx solid var(--line); border-radius: 6rpx; color: var(--accent); font-size: 19rpx; }.ai-search-error { display: flex; justify-content: space-between; gap: 16rpx; margin-top: 11rpx; color: var(--muted); font-size: 19rpx; }.ai-search-error text:last-child { color: var(--accent); }
.result-title { color: var(--text); font-size: 27rpx; font-weight: 700; }
.result-count, .result-category { color: var(--muted); font-size: 20rpx; }
.result-list { overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.result-row { display: flex; align-items: center; gap: 15rpx; padding: 22rpx; border-bottom: 1rpx solid var(--line); transition: transform .16s ease, background .16s ease; }
.result-row:last-child { border-bottom: 0; }
.category-mark { display: flex; width: 54rpx; height: 54rpx; flex: 0 0 54rpx; align-items: center; justify-content: center; border-radius: 9rpx; background: var(--surface-strong); color: var(--accent); font-size: 22rpx; font-weight: 700; }
.result-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7rpx; }
.result-line { display: flex; align-items: center; gap: 10rpx; }
.item-title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); font-size: 25rpx; font-weight: 650; }
.item-category { color: var(--accent); font-size: 18rpx; }
.item-note { color: var(--muted); font-size: 21rpx; line-height: 1.45; }
.item-source { color: var(--muted); font-size: 18rpx; opacity: .82; }
.item-arrow { color: var(--muted); font-size: 31rpx; }
.load-more { margin-top: 18rpx; padding: 19rpx; border: 1rpx solid var(--line); border-radius: 9rpx; color: var(--accent); font-size: 22rpx; text-align: center; }
.load-more.disabled { color: var(--muted); }
.result-end { display: block; margin-top: 19rpx; color: var(--muted); font-size: 20rpx; text-align: center; }
.result-skeleton { display: flex; flex-direction: column; gap: 12rpx; }
.skeleton-row { padding: 22rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }
.skeleton-row view { width: 100%; height: 20rpx; margin-top: 14rpx; border-radius: 5rpx; background: var(--surface-strong); animation: pulse 1.3s ease-in-out infinite; }
.skeleton-row view:first-child { width: 48%; height: 27rpx; margin-top: 0; }
.skeleton-row view:last-child { width: 70%; }
.search-note { display: block; margin-top: 26rpx; padding: 18rpx; border-left: 4rpx solid var(--accent); background: var(--surface); color: var(--muted); font-size: 20rpx; line-height: 1.55; }
@keyframes pulse { 0%, 100% { opacity: .46; } 50% { opacity: .92; } }
@media (prefers-reduced-motion: reduce) { .skeleton-row view { animation: none; } }
@media (min-width: 768px) { .search-screen { max-width: 980rpx; margin: 0 auto; } }
</style>
