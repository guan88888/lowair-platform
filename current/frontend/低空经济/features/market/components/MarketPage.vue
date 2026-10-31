<template>
  <app-page-shell title="设备交易" active="market" root city="北京">
    <view class="market-screen market-stack">
      <market-mode-notice :mode="mode" />

      <view class="market-search">
        <input v-model="filters.keyword" class="market-search__input" confirm-type="search" placeholder="搜索品牌、机型或商品" placeholder-style="color:#91a8b5" @confirm="applyFilters" />
        <text class="market-search__action" @tap="applyFilters">搜索</text>
        <text class="market-search__cart" @tap="goCart">购物车</text>
      </view>

      <view class="market-tabs">
        <view v-for="item in categories" :key="item.value" class="market-tab" :class="{ active: filters.category === item.value }" @tap="selectCategory(item.value)">{{ item.label }}</view>
      </view>

      <view class="market-actions">
        <view class="market-button market-button--primary" @tap="go('/pages/market/sell?mode=listing')">出售 / 出租设备</view>
        <view class="market-button market-button--secondary" @tap="go('/pages/market/repair')">维修服务</view>
      </view>

      <view class="market-filter-toggle" @tap="showFilters = !showFilters">
        <text>{{ activeFilterCount ? `已启用 ${activeFilterCount} 项筛选` : '品牌、价格、城市与交付筛选' }}</text>
        <text>{{ showFilters ? '收起' : '展开' }}</text>
      </view>

      <view v-if="showFilters" class="market-filter-panel">
        <view class="market-field"><text class="market-field__label">品牌</text><picker :range="brands" @change="filters.brand = brands[$event.detail.value]"><view class="market-select">{{ filters.brand || '全部品牌' }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">机型</text><input v-model="filters.model" class="market-input" placeholder="例如 Matrice" placeholder-style="color:#91a8b5" /></view>
        <view class="market-field"><text class="market-field__label">价格</text><picker range-key="label" :range="priceRanges" @change="filters.priceRange = priceRanges[$event.detail.value].value"><view class="market-select">{{ selectedLabel(priceRanges, filters.priceRange, '不限价格') }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">城市</text><picker :range="cities" @change="filters.city = cities[$event.detail.value]"><view class="market-select">{{ filters.city || '全部城市' }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">交付</text><picker range-key="label" :range="deliveries" @change="filters.delivery = deliveries[$event.detail.value].value"><view class="market-select">{{ selectedLabel(deliveries, filters.delivery, '不限交付') }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">质检 / 履历</text><picker range-key="label" :range="verificationOptions" @change="filters.verification = verificationOptions[$event.detail.value].value"><view class="market-select">{{ selectedLabel(verificationOptions, filters.verification, '不限状态') }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">排序</text><picker range-key="label" :range="sortOptions" @change="filters.sort = sortOptions[$event.detail.value].value"><view class="market-select">{{ selectedLabel(sortOptions, filters.sort, '推荐排序') }}</view></picker></view>
        <view class="market-field"><text class="market-field__label">操作</text><view class="market-actions"><view class="market-button market-button--secondary" @tap="resetFilters">重置</view><view class="market-button market-button--primary" @tap="applyFilters">应用</view></view></view>
      </view>

      <view class="market-section">
        <view class="market-section__head"><text class="market-section__title">{{ currentCategoryLabel }}</text><text class="market-section__note">{{ mode === 'demo' ? `演示结果 ${total} 件` : `共 ${total} 件` }}</text></view>

        <view v-if="state === 'loading'" class="market-skeleton-grid"><view v-for="index in 6" :key="index" class="market-skeleton"></view></view>
        <view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">商品加载失败</text><text class="market-state__note">{{ errorMessage }}</text><view class="market-button market-button--secondary" @tap="loadProducts(true)">重试</view></view>
        <view v-else-if="!products.length" class="market-state"><text class="market-state__title">没有匹配商品</text><text class="market-state__note">可减少筛选条件，或切换到其他分类查看。</text><view class="market-button market-button--secondary" @tap="resetFilters">清除筛选</view></view>
        <template v-else>
          <view class="market-product-grid"><product-card v-for="item in products" :key="item.id" :product="item" :mode="mode" @open="openProduct" @cart="addToCart" /></view>
          <view v-if="hasMore" class="market-load-more" @tap="loadMore">{{ loadingMore ? '加载中...' : '加载更多' }}</view>
          <text v-else class="market-load-more">已显示全部结果</text>
        </template>
      </view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import MarketModeNotice from './MarketModeNotice.vue'
import ProductCard from './ProductCard.vue'
import { getMarketMode, getMarketService } from '../services'
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'

const emptyFilters = () => ({ keyword: '', category: '全新整机', brand: '', model: '', priceRange: '', city: '', delivery: '', verification: '', sort: 'recommended', page: 1, pageSize: 6 })

export default {
  name: 'MarketPage',
  components: { AppPageShell, MarketModeNotice, ProductCard },
  data() {
    return {
      mode: getMarketMode(), service: getMarketService(), state: 'loading', errorMessage: '', products: [], total: 0, hasMore: false, loadingMore: false, showFilters: false,
      filters: emptyFilters(),
      // Values follow the server-owned category enum returned by /market/products.
      categories: [{ label: '全新整机', value: '全新整机' }, { label: '二手无人机', value: '二手无人机' }, { label: '配件', value: '配件' }, { label: '租赁', value: '租赁' }],
      brands: ['全部品牌', 'DJI', 'Autel'], cities: ['全部城市', '北京', '上海', '杭州', '成都', '深圳'],
      priceRanges: [{ label: '不限价格', value: '' }, { label: '¥ 2,000 以下', value: '0-2000' }, { label: '¥ 2,000-10,000', value: '2000-10000' }, { label: '¥ 10,000-30,000', value: '10000-30000' }, { label: '¥ 30,000 以上', value: '30000+' }],
      deliveries: [{ label: '不限交付', value: '' }, { label: '支持邮寄', value: 'shipping' }, { label: '支持自提', value: 'pickup' }],
      verificationOptions: [{ label: '不限状态', value: '' }, { label: '待核验', value: '待核验' }, { label: '处理中', value: '处理中' }, { label: '未收录', value: '未收录' }],
      sortOptions: [{ label: '推荐排序', value: 'recommended' }, { label: '价格从低到高', value: 'price_asc' }, { label: '价格从高到低', value: 'price_desc' }, { label: '最近发布', value: 'newest' }]
    }
  },
  computed: {
    currentCategoryLabel() { return this.categories.find((item) => item.value === this.filters.category)?.label || '设备商品' },
    activeFilterCount() { return ['brand', 'model', 'priceRange', 'city', 'delivery', 'verification'].filter((key) => this.filters[key]).length }
  },
  mounted() { this.loadProducts(true) },
  methods: {
    selectedLabel(options, value, fallback) { return options.find((item) => item.value === value)?.label || fallback },
    selectCategory(category) { this.filters.category = category; this.loadProducts(true) },
    applyFilters() { this.showFilters = false; this.loadProducts(true) },
    resetFilters() { const category = this.filters.category; this.filters = { ...emptyFilters(), category }; this.loadProducts(true) },
    async loadProducts(reset) {
      if (reset) { this.filters.page = 1; this.state = 'loading'; this.products = [] }
      try {
        const result = await this.service.listProducts(this.filters)
        this.products = reset ? result.items : this.products.concat(result.items)
        this.total = result.total
        this.hasMore = result.hasMore
        this.state = 'ready'
      } catch (error) {
        this.errorMessage = error.message || '请稍后重试'
        this.state = 'error'
      } finally { this.loadingMore = false }
    },
    loadMore() { if (this.loadingMore || !this.hasMore) return; this.loadingMore = true; this.filters.page += 1; this.loadProducts(false) },
    openProduct(product) { this.go(product.category === 'rental' ? `/pages/market/lease?id=${product.id}` : `/pages/market/product-detail?id=${product.id}`) },
    goCart() { const target = '/pages/market/cart'; if (!getAuthState().loggedIn) return uni.navigateTo({ url: guardedUrl('login', target) }); this.go(target) },
    async addToCart(product) { const target = '/pages/market/cart'; if (!getAuthState().loggedIn) return uni.navigateTo({ url: guardedUrl('login', target) }); try { await this.service.updateCartItem(product.id, 1); uni.showToast({ title: '已加入购物车', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message || '加入失败', icon: 'none' }) } },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style src="../styles/market.css"></style>
