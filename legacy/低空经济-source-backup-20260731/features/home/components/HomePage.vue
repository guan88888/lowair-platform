<template>
  <app-page-shell title="天穹智航" active="home" root :city="city" @city="showCity = true">
    <view class="home-screen">
      <view class="search-entry" @tap="go('/pages/search/index')">
        <text class="search-icon">⌕</text>
        <text class="search-copy">搜索机构、岗位、任务、商品与内容</text>
        <text class="search-arrow">›</text>
      </view>

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

      <section-block title="业务概览">
        <module-state :state="modules.summary.state" :error="modules.summary.error" empty-title="暂无指标" @retry="loadModule('summary')">
          <view class="metric-grid">
            <view v-for="item in modules.summary.data.items" :key="item.key" class="metric-item" @tap="go(item.to)">
              <text class="metric-value">{{ item.value }}</text>
              <text class="metric-label">{{ item.label }}</text>
              <text class="metric-note">{{ item.note }}</text>
            </view>
          </view>
          <source-meta :meta="modules.summary.data.meta" />
        </module-state>
      </section-block>

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
        <text class="sheet-title">选择城市</text>
        <text v-for="item in cities" :key="item" class="city-option" :class="{ selected: item === city }" @tap="selectCity(item)">{{ item }}</text>
      </view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ModuleState from './ModuleState.vue'
import SourceMeta from './SourceMeta.vue'
import SectionBlock from './SectionBlock.vue'
import { loadHomeModule } from '../services'

const moduleKeys = ['carousel', 'summary', 'entries', 'tasks', 'institutions', 'devices', 'rumors']

function initialModule() {
  return { state: 'loading', error: '', data: { items: [], meta: null } }
}

export default {
  name: 'HomePage',
  components: { AppPageShell, ModuleState, SourceMeta, SectionBlock },
  data() {
    return {
      city: '北京',
      cities: ['北京', '天津', '石家庄', '成都'],
      showCity: false,
      carouselIndex: 0,
      imageErrors: {},
      collectionKeys: ['tasks', 'institutions', 'devices', 'rumors'],
      collectionTitles: { tasks: '加急任务', institutions: '附近认证机构', devices: '平台严选设备', rumors: '官方辟谣' },
      modules: moduleKeys.reduce((result, key) => ({ ...result, [key]: initialModule() }), {})
    }
  },
  created() {
    moduleKeys.forEach((key) => this.loadModule(key))
  },
  methods: {
    async loadModule(key) {
      const target = this.modules[key]
      target.state = 'loading'
      target.error = ''
      try {
        const data = await loadHomeModule(key, { city: this.city })
        target.data = { ...data, items: Array.isArray(data.items) ? data.items : [] }
        target.state = target.data.items.length ? 'ready' : 'empty'
        if (key === 'carousel' && this.carouselIndex >= target.data.items.length) this.carouselIndex = 0
      } catch (error) {
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
    selectCity(city) {
      this.city = city
      this.showCity = false
      moduleKeys.forEach((key) => this.loadModule(key))
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
.overlay { position: fixed; z-index: 60; inset: 0; display: flex; align-items: flex-end; background: rgba(2, 14, 23, .7); }
.city-sheet { width: 100%; padding: 28rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 16rpx 16rpx 0 0; background: var(--surface); }
.sheet-title { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 30rpx; font-weight: 700; }
.city-option { display: block; padding: 23rpx 0; border-bottom: 1rpx solid var(--line); color: var(--text); font-size: 26rpx; }
.city-option.selected { color: var(--accent); font-weight: 700; }
@keyframes pulse { 0%, 100% { opacity: .48; } 50% { opacity: .92; } }
@media (prefers-reduced-motion: reduce) { .carousel-skeleton view { animation: none; }.indicator { transition: none; } }
@media (min-width: 768px) { .home-screen { max-width: 980rpx; margin: 0 auto; }.entry-grid { grid-template-columns: repeat(4, 1fr); } }
</style>
