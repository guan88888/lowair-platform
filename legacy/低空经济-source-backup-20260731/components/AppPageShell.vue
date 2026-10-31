<template>
  <view class="app-shell" :class="'theme-' + theme">
    <view class="safe-top"></view>
    <view class="app-header">
      <view class="header-side left" :role="root ? undefined : 'button'" :tabindex="root ? -1 : 0" :aria-label="root ? undefined : t('返回上一页')" @tap="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack" @longpress="$emit('annotate', root ? t('城市选择') : t('返回上一页'))">
        <text v-if="!root" class="back-icon" aria-hidden="true">‹</text>
        <text v-else class="city" role="button" tabindex="0" :aria-label="t('选择城市') + ': ' + displayCity" @tap.stop="$emit('city')" @keyup.enter.stop="$emit('city')" @keyup.space.stop.prevent="$emit('city')" @longpress.stop="$emit('annotate', t('城市选择'))">{{ displayCity }}<text class="city-chevron" aria-hidden="true">⌄</text></text>
      </view>
      <text class="page-title">{{ displayTitle }}</text>
      <view class="header-side right">
        <view class="header-icon" role="button" tabindex="0" :aria-label="t('消息中心')" @tap="go('/pages/messages/index')" @keyup.enter="go('/pages/messages/index')" @keyup.space.prevent="go('/pages/messages/index')" @longpress="$emit('annotate', t('消息中心'))"><text aria-hidden="true">◌</text></view>
      </view>
    </view>
    <scroll-view class="page-scroll" scroll-y :show-scrollbar="false">
      <view class="page-content"><slot /></view>
      <view class="tab-spacer"></view>
    </scroll-view>
    <view
      v-if="showAssistant"
      class="ai-helper"
      :class="{ ready: assistantReady, dragging: assistantDragging }"
      :style="assistantStyle"
      role="button"
      tabindex="0"
      :aria-label="t('打开低空 AI 无人机智能体')"
      @tap="handleAssistantTap"
      @keyup.enter="handleAssistantTap"
      @keyup.space.prevent="handleAssistantTap"
      @touchstart.stop="startAssistantTouch"
      @touchmove.stop.prevent="moveAssistantTouch"
      @touchend.stop="endAssistantTouch"
      @touchcancel.stop="endAssistantTouch"
      @mousedown.stop.prevent="startAssistantMouse"
    >
      <view class="ai-helper-body">
        <view class="ai-helper-orbit" aria-hidden="true"></view>
        <view class="ai-helper-mark">AI</view>
        <view class="ai-helper-copy"><text>{{ t('低空 AI') }}</text><text>{{ t('无人机智能体') }}</text></view>
      </view>
    </view>
    <view class="app-tabbar" role="navigation" :aria-label="t('主导航')">
      <view v-for="item in tabs" :key="item.key" class="tab-item" :class="{ active: active === item.key }" role="button" tabindex="0" :aria-label="item.label" :aria-current="active === item.key ? 'page' : undefined" @tap="goTab(item)" @keyup.enter="goTab(item)" @keyup.space.prevent="goTab(item)" @longpress="$emit('annotate', item.label)">
        <image class="tab-icon" :src="item.icon" mode="aspectFit" alt="" aria-hidden="true"></image>
        <text class="tab-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { translate } from '../data/localization'

export default {
  name: 'AppPageShell',
  props: {
    title: { type: String, default: '' },
    active: { type: String, default: '' },
    root: { type: Boolean, default: false },
    city: { type: String, default: '' },
    theme: { type: String, default: 'ocean' },
    locale: { type: String, default: 'zh' },
    showAssistant: { type: Boolean, default: true }
  },
  data() {
    return {
      assistantReady: false,
      assistantDragging: false,
      assistantDragged: false,
      assistantSuppressTap: false,
      assistantX: 0,
      assistantY: 0,
      assistantBounds: { minX: 12, maxX: 12, minY: 56, maxY: 56 },
      assistantDragStart: { pointerX: 0, pointerY: 0, x: 0, y: 0 },
      assistantLastTouchAt: 0,
      assistantResizeTimer: null,
      baseTabs: [
        { key: 'home', label: '首页', icon: '/static/nav/home.svg', url: '/pages/index/index' },
        { key: 'academy', label: '学考', icon: '/static/nav/academy.svg', url: '/pages/academy/index' },
        { key: 'work', label: '工作', icon: '/static/nav/work.svg', url: '/pages/work/index' },
        { key: 'market', label: '交易', icon: '/static/nav/market.svg', url: '/pages/market/index' },
        { key: 'community', label: '社区', icon: '/static/nav/community.svg', url: '/pages/community/index' },
        { key: 'profile', label: '我的', icon: '/static/nav/profile.svg', url: '/pages/profile/index' }
      ]
    }
  },
  computed: {
    displayTitle() { return translate(this.title, this.locale) },
    displayCity() { return translate(this.city || '北京', this.locale) },
    assistantStyle() {
      return { transform: `translate3d(${this.assistantX}px, ${this.assistantY}px, 0)` }
    },
    tabs() {
      return this.baseTabs.map((item) => ({ ...item, label: translate(item.label, this.locale) }))
    }
  },
  mounted() {
    this.$nextTick(() => this.initAssistantPosition())
    this.$nextTick(() => this.localizeSlotText())
    if (typeof uni.onWindowResize === 'function') uni.onWindowResize(this.handleAssistantResize)
    if (typeof window !== 'undefined') window.addEventListener('resize', this.handleAssistantResize)
  },
  beforeUnmount() {
    if (typeof uni.offWindowResize === 'function') uni.offWindowResize(this.handleAssistantResize)
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.handleAssistantResize)
    this.removeAssistantMouseListeners()
    if (this.assistantResizeTimer) clearTimeout(this.assistantResizeTimer)
  },
  updated() {
    this.$nextTick(() => this.localizeSlotText())
  },
  methods: {
    t(value) { return translate(value, this.locale) },
    // Domain pages still contain a few static labels while they are being
    // migrated. Translate only exact registered text nodes and retain the
    // original value so a later locale switch can be applied safely.
    localizeSlotText() {
      if (typeof document === 'undefined' || !this.$el || !this.$el.querySelectorAll) return
      const nodes = this.$el.querySelectorAll('*')
      nodes.forEach((element) => {
        if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(element.tagName)) return
        Array.from(element.childNodes || []).forEach((node) => {
          if (node.nodeType !== 3) return
          const current = node.nodeValue || ''
          const source = node.__lowairSource || current.trim()
          if (!source) return
          node.__lowairSource = source
          const translated = translate(source, this.locale)
          if (translated !== source) node.nodeValue = current.replace(source, translated)
          else if (this.locale === 'zh') node.nodeValue = current.replace(translated, source)
        })
      })
    },
    initAssistantPosition() {
      if (!this.showAssistant) return
      const query = uni.createSelectorQuery().in(this)
      query.select('.ai-helper').boundingClientRect()
      query.select('.app-shell').boundingClientRect()
      query.select('.app-header').boundingClientRect()
      query.select('.app-tabbar').boundingClientRect()
      query.exec((rects) => {
        const helper = rects && rects[0]
        if (!helper) return
        const shell = rects[1]
        const header = rects[2]
        const tabbar = rects[3]
        const system = uni.getSystemInfoSync()
        const viewportWidth = shell ? shell.width : system.windowWidth
        const viewportHeight = shell ? shell.height : system.windowHeight
        const margin = 12
        const minX = margin
        const maxX = Math.max(minX, viewportWidth - helper.width - margin)
        const minY = Math.max(margin, (header ? header.bottom : 44) + margin)
        const maxY = Math.max(minY, (tabbar ? tabbar.top : viewportHeight - 64) - helper.height - margin)
        this.assistantBounds = { minX, maxX, minY, maxY }
        const saved = uni.getStorageSync('lowair-ai-helper-position')
        const xRatio = saved && Number.isFinite(Number(saved.x)) ? Math.min(1, Math.max(0, Number(saved.x))) : 1
        const yRatio = saved && Number.isFinite(Number(saved.y)) ? Math.min(1, Math.max(0, Number(saved.y))) : 1
        this.assistantX = minX + (maxX - minX) * xRatio
        this.assistantY = minY + (maxY - minY) * yRatio
        this.assistantReady = true
      })
    },
    handleAssistantResize() {
      if (this.assistantResizeTimer) clearTimeout(this.assistantResizeTimer)
      this.assistantResizeTimer = setTimeout(() => this.initAssistantPosition(), 80)
    },
    beginAssistantDrag(pointerX, pointerY) {
      if (!this.assistantReady) return
      this.assistantDragging = true
      this.assistantDragged = false
      this.assistantDragStart = { pointerX, pointerY, x: this.assistantX, y: this.assistantY }
    },
    updateAssistantDrag(pointerX, pointerY) {
      if (!this.assistantDragging) return
      const deltaX = pointerX - this.assistantDragStart.pointerX
      const deltaY = pointerY - this.assistantDragStart.pointerY
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) this.assistantDragged = true
      this.assistantX = Math.min(this.assistantBounds.maxX, Math.max(this.assistantBounds.minX, this.assistantDragStart.x + deltaX))
      this.assistantY = Math.min(this.assistantBounds.maxY, Math.max(this.assistantBounds.minY, this.assistantDragStart.y + deltaY))
    },
    finishAssistantDrag() {
      if (!this.assistantDragging) return
      this.assistantDragging = false
      if (!this.assistantDragged) return
      const xRange = this.assistantBounds.maxX - this.assistantBounds.minX
      const yRange = this.assistantBounds.maxY - this.assistantBounds.minY
      uni.setStorageSync('lowair-ai-helper-position', {
        x: xRange > 0 ? (this.assistantX - this.assistantBounds.minX) / xRange : 0,
        y: yRange > 0 ? (this.assistantY - this.assistantBounds.minY) / yRange : 0
      })
      this.assistantSuppressTap = true
      setTimeout(() => {
        this.assistantSuppressTap = false
        this.assistantDragged = false
      }, 180)
    },
    startAssistantTouch(event) {
      const touch = event.touches && event.touches[0]
      if (!touch) return
      this.assistantLastTouchAt = Date.now()
      this.beginAssistantDrag(touch.clientX, touch.clientY)
    },
    moveAssistantTouch(event) {
      const touch = event.touches && event.touches[0]
      if (touch) this.updateAssistantDrag(touch.clientX, touch.clientY)
    },
    endAssistantTouch() { this.finishAssistantDrag() },
    startAssistantMouse(event) {
      if (Date.now() - this.assistantLastTouchAt < 500) return
      this.beginAssistantDrag(event.clientX, event.clientY)
      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', this.moveAssistantMouse)
        window.addEventListener('mouseup', this.endAssistantMouse)
      }
    },
    moveAssistantMouse(event) { this.updateAssistantDrag(event.clientX, event.clientY) },
    endAssistantMouse() {
      this.finishAssistantDrag()
      this.removeAssistantMouseListeners()
    },
    removeAssistantMouseListeners() {
      if (typeof window === 'undefined') return
      window.removeEventListener('mousemove', this.moveAssistantMouse)
      window.removeEventListener('mouseup', this.endAssistantMouse)
    },
    handleAssistantTap() {
      if (this.assistantSuppressTap) return
      this.assistantDragged = false
      this.goAssistant()
    },
    goTab(item) {
      if (this.active === item.key && this.root) return
      uni.reLaunch({ url: item.url })
    },
    go(url) {
      if (!url) return
      uni.navigateTo({ url })
    },
    goAssistant() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (current && current.route === 'pages/assistant/index') return
      uni.navigateTo({ url: '/pages/assistant/index?entry=global' })
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  }
}
</script>

<style scoped>
.app-shell { --layer-mist: #e9f1f6; --layer-cyan: #e4f2f1; --layer-sage: #e8efe6; --app-bg: #061a2b; --header-bg: #071d2e; --surface: #0b263a; --surface-strong: #102f45; --line: #1d4256; --text: #edf7f8; --muted: #a4bac3; --accent: #19cfa0; --accent-ink: #062218; --status-success: #62dcb6; --status-success-bg: rgba(98,220,182,.13); --status-pending: #f2c572; --status-pending-bg: rgba(242,197,114,.13); --status-risk: #ff9188; --status-risk-bg: rgba(255,145,136,.13); --status-demo: #9ab9ff; --status-demo-bg: rgba(154,185,255,.13); --focus-ring: #75e6c7; --shadow: rgba(2,15,24,.28); --tabbar-height: 104rpx; --tab-bg: #071a2a; --tab-line: #183a4d; --tab-text: #71899a; --tab-active: #19cfa0; --tab-icon-idle: grayscale(1) brightness(1.45); --tab-icon-active: none; position: fixed; inset: 0; background: var(--app-bg); color: var(--text); overflow: hidden; }
.theme-forest { --app-bg: #102a2c; --header-bg: #123538; --surface: #173f42; --surface-strong: #1c4a4c; --line: #356a6b; --text: #edf8f5; --muted: #b1cecb; --accent: #6ed5ba; --accent-ink: #09241f; --focus-ring: #9be6d3; --tab-bg: #123538; --tab-line: #356a6b; --tab-text: #b1cecb; --tab-active: #8ce4cc; }
.theme-slate { --app-bg: #151d2b; --header-bg: #1b2637; --surface: #202d40; --surface-strong: #29384d; --line: #49617d; --text: #f0f5fa; --muted: #bcc9d6; --accent: #80c5ff; --accent-ink: #0c2134; --focus-ring: #a8d8ff; --tab-bg: #1b2637; --tab-line: #49617d; --tab-text: #bcc9d6; --tab-active: #91ceff; }
.theme-mist { --app-bg: var(--layer-mist); --header-bg: #f8fbfc; --surface: #ffffff; --surface-strong: var(--layer-cyan); --line: #b8cbd3; --text: #16343c; --muted: #526970; --accent: #126b5e; --accent-ink: #f5fffc; --status-success: #176c50; --status-success-bg: #dbeee5; --status-pending: #815a14; --status-pending-bg: #f4e8c9; --status-risk: #9b3936; --status-risk-bg: #f5dfdd; --status-demo: #365c93; --status-demo-bg: var(--layer-sage); --focus-ring: #126b5e; --shadow: rgba(31,67,79,.14); --tab-bg: #f8fbfc; --tab-line: #afc6cf; --tab-text: #526970; --tab-active: #126b5e; --tab-icon-idle: grayscale(1) brightness(.42); --tab-icon-active: brightness(.48) saturate(1.25); }
.theme-sky { --app-bg: #eaf1f8; --header-bg: #f8fbfe; --surface: #ffffff; --surface-strong: #dfeaf5; --line: #b9c9da; --text: #1c3048; --muted: #566b84; --accent: #205f8e; --accent-ink: #f4faff; --status-success: #176c50; --status-success-bg: var(--layer-cyan); --status-pending: #815a14; --status-pending-bg: #f4e8c9; --status-risk: #9b3936; --status-risk-bg: #f5dfdd; --status-demo: #365c93; --status-demo-bg: #dfe9f7; --focus-ring: #205f8e; --shadow: rgba(35,63,94,.14); --tab-bg: #f8fbfe; --tab-line: #afc0d2; --tab-text: #566b84; --tab-active: #205f8e; --tab-icon-idle: grayscale(1) brightness(.44); --tab-icon-active: grayscale(.15) brightness(.5) saturate(1.2); }
.theme-sage { --app-bg: #edf2e9; --header-bg: #fafcf8; --surface: #ffffff; --surface-strong: var(--layer-sage); --line: #bdcbbb; --text: #25362b; --muted: #586b5d; --accent: #426d53; --accent-ink: #f6fbf5; --status-success: #37694b; --status-success-bg: #deece1; --status-pending: #795a1e; --status-pending-bg: #f2e8cd; --status-risk: #963f3a; --status-risk-bg: #f3dfdc; --status-demo: #435f86; --status-demo-bg: var(--layer-mist); --focus-ring: #426d53; --shadow: rgba(51,76,57,.14); --tab-bg: #fafcf8; --tab-line: #b5c6b3; --tab-text: #586b5d; --tab-active: #426d53; --tab-icon-idle: grayscale(1) brightness(.43); --tab-icon-active: grayscale(.3) brightness(.47) saturate(.9); }
.safe-top { height: var(--status-bar-height, 0px); background: var(--app-bg); }
.app-header { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 28rpx; border-bottom: 1rpx solid rgba(29,66,86,.72); background: var(--header-bg); }
.page-title { min-width: 0; max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 34rpx; font-weight: 650; color: var(--text); }
.header-side { width: 174rpx; min-width: 174rpx; display: flex; align-items: center; gap: 12rpx; }
.header-side.left { justify-content: flex-start; }
.header-side.right { justify-content: flex-end; }
.city { display: inline-flex; max-width: 100%; min-height: 88rpx; align-items: center; overflow: hidden; color: var(--muted); font-size: 25rpx; text-overflow: ellipsis; white-space: nowrap; }
.city-chevron { flex: 0 0 auto; margin-left: 4rpx; }
.back-icon { display: inline-flex; width: 88rpx; height: 88rpx; align-items: center; justify-content: center; color: var(--text); font-size: 54rpx; line-height: 1; }
.header-icon { display: flex; width: 88rpx; height: 88rpx; align-items: center; justify-content: center; color: var(--muted); font-size: 38rpx; transition: transform .16s ease; }
.header-icon:active { transform: scale(.94); }
.page-scroll { height: calc(100% - var(--status-bar-height, 0px) - 88rpx); }
.page-content { min-height: 100%; }
.tab-spacer { height: calc(128rpx + env(safe-area-inset-bottom)); }
.ai-helper { position: fixed; z-index: 21; left: 0; top: 0; display: inline-flex; min-height: 88rpx; opacity: 0; touch-action: none; user-select: none; cursor: grab; transition: transform .18s cubic-bezier(.16,1,.3,1), opacity .12s ease; }.ai-helper.ready { opacity: 1; }.ai-helper.dragging { cursor: grabbing; transition: none; will-change: transform; }.ai-helper-body { position: relative; display: flex; min-height: 88rpx; align-items: center; gap: 10rpx; padding: 6rpx 20rpx 6rpx 8rpx; border: 1rpx solid var(--accent); border-radius: 48rpx; background: var(--surface); box-shadow: 0 8rpx 24rpx var(--shadow); transition: transform .16s ease, box-shadow .16s ease; }.ai-helper-body:active { transform: scale(.97); }.ai-helper.dragging .ai-helper-body { transform: scale(1.03); box-shadow: 0 12rpx 34rpx var(--shadow); }.ai-helper-orbit { position: absolute; left: 10rpx; top: 10rpx; width: 66rpx; height: 66rpx; border: 1rpx solid var(--accent); border-radius: 50%; opacity: .38; }.ai-helper-mark { position: relative; z-index: 1; display: flex; width: 66rpx; height: 66rpx; flex: 0 0 66rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 19rpx; font-weight: 800; }.ai-helper-copy { min-width: 0; display: flex; max-width: 210rpx; flex-direction: column; gap: 2rpx; }.ai-helper-copy text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ai-helper-copy text:first-child { color: var(--text); font-size: 23rpx; font-weight: 700; }.ai-helper-copy text:last-child { color: var(--muted); font-size: 17rpx; }
.app-tabbar { position: absolute; z-index: 20; left: 0; right: 0; bottom: 0; display: flex; height: calc(var(--tabbar-height) + env(safe-area-inset-bottom)); padding: 0 0 env(safe-area-inset-bottom); box-sizing: border-box; border-top: 1rpx solid var(--tab-line); background: var(--tab-bg); }
.tab-item { position: relative; flex: 1; min-width: 0; min-height: var(--tabbar-height); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2rpx; color: var(--tab-text); touch-action: manipulation; transition: transform .16s ease, color .16s ease; }
.tab-item::before { display: none; }
.tab-item:active { transform: scale(.96); }
.tab-item.active { color: var(--tab-active); }
.tab-icon { width: 44rpx; height: 44rpx; opacity: .82; filter: var(--tab-icon-idle); transition: opacity .16s ease, filter .16s ease; }.tab-item.active .tab-icon { opacity: 1; filter: var(--tab-icon-active); }
.tab-label { display: block; width: 100%; overflow: hidden; padding: 0 4rpx; font-size: 22rpx; line-height: 30rpx; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.header-side:focus-visible, .city:focus-visible, .header-icon:focus-visible, .ai-helper:focus-visible, .tab-item:focus-visible { outline: 4rpx solid var(--focus-ring); outline-offset: -4rpx; }
@media (max-width: 360px) { .tab-label { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .ai-helper, .ai-helper-body, .header-icon, .tab-item, .tab-icon { transition: none; } }
@media (forced-colors: active) { .app-tabbar { border-top: 1px solid CanvasText; }.tab-item.active::before { background: Highlight; }.tab-icon { opacity: 1; filter: none; } }
</style>
