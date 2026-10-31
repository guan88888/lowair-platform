<template>
  <app-page-shell :title="title" active="academy" :root="root" :city="city" :theme="theme" :locale="locale" @city="cityHint" @annotate="annotate">
    <view class="academy-screen"><slot /></view>
    <view v-if="toast" class="academy-toast" role="status">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'

export default {
  name: 'AcademyLayout',
  components: { AppPageShell },
  props: { title: { type: String, required: true }, root: Boolean, city: { type: String, default: '北京' } },
  data() { return { toast: '', toastTimer: null, theme: 'ocean', locale: 'zh' } },
  created() {
    const theme = uni.getStorageSync('lowair-demo-theme')
    const locale = uni.getStorageSync('lowair-demo-locale')
    if (['ocean', 'forest', 'slate', 'mist', 'sky', 'sage'].includes(theme)) this.theme = theme
    if (['zh', 'en', 'ja', 'ru', 'de'].includes(locale)) this.locale = locale
  },
  beforeUnmount() { if (this.toastTimer) clearTimeout(this.toastTimer) },
  methods: {
    showToast(message) { this.toast = message; if (this.toastTimer) clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { this.toast = '' }, 2200) },
    annotate(label) { this.showToast(`长按说明：${label}，点击可执行对应操作`) },
    cityHint() { this.showToast('机构城市可在筛选栏切换') }
  }
}
</script>

<style>
.academy-screen { --academy-danger: #ee7777; --academy-warn: #e6b96a; min-height: 100%; padding: 24rpx 26rpx 44rpx; color: var(--text); }
.academy-screen text { line-height: 1.45; }
.academy-hero { position: relative; overflow: hidden; min-height: 300rpx; margin-bottom: 28rpx; border: 1rpx solid var(--line); border-radius: 16rpx; background: var(--surface); }
.academy-hero__image { width: 100%; height: 300rpx; display: block; }
.academy-hero__scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,24,38,.94), rgba(4,24,38,.52) 68%, rgba(4,24,38,.18)); }
.academy-hero__copy { position: absolute; inset: 0; display: flex; max-width: 560rpx; flex-direction: column; justify-content: center; align-items: flex-start; gap: 10rpx; padding: 30rpx; }
.academy-kicker { color: var(--accent); font-size: 21rpx; font-weight: 700; }
.academy-hero__title { color: #edf7f8; font-size: 42rpx; font-weight: 780; letter-spacing: -1rpx; }
.academy-hero__note { color: #b8ccd5; font-size: 24rpx; }
.academy-button { display: inline-flex; min-height: 68rpx; align-items: center; justify-content: center; padding: 0 26rpx; border: 1rpx solid var(--accent); border-radius: 10rpx; background: var(--accent); color: var(--accent-ink); font-size: 24rpx; font-weight: 700; white-space: nowrap; transition: transform .15s ease, opacity .15s ease; }
.academy-button:active { transform: scale(.98); }
.academy-button--secondary { background: transparent; color: var(--accent); }
.academy-button--danger { border-color: var(--academy-danger); background: transparent; color: var(--academy-danger); }
.academy-button--small { min-height: 56rpx; padding: 0 18rpx; font-size: 22rpx; }
.academy-button--disabled { opacity: .45; pointer-events: none; }
.academy-section { margin-bottom: 30rpx; }
.academy-section__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20rpx; margin-bottom: 16rpx; }
.academy-section__title { color: var(--text); font-size: 30rpx; font-weight: 730; }
.academy-section__note { display: block; margin-top: 5rpx; color: var(--muted); font-size: 22rpx; }
.academy-link { color: var(--accent); font-size: 23rpx; }
.academy-panel { padding: 22rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }
.academy-list { display: flex; flex-direction: column; gap: 14rpx; }
.academy-row { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); }
.academy-row__main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.academy-row__title { color: var(--text); font-size: 26rpx; font-weight: 680; }
.academy-row__note { color: var(--muted); font-size: 22rpx; }
.academy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; }
.academy-tile { min-height: 150rpx; padding: 22rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }
.academy-tile:active, .academy-row:active { transform: translateY(1rpx); }
.academy-tile__icon { display: flex; width: 50rpx; height: 50rpx; align-items: center; justify-content: center; margin-bottom: 20rpx; border-radius: 10rpx; background: var(--surface-strong); color: var(--accent); font-size: 25rpx; font-weight: 760; }
.academy-tile__title { display: block; color: var(--text); font-size: 26rpx; font-weight: 700; }
.academy-tile__note { display: block; margin-top: 6rpx; color: var(--muted); font-size: 21rpx; }
.academy-tag { display: inline-flex; width: max-content; align-items: center; min-height: 38rpx; padding: 0 12rpx; border-radius: 8rpx; background: var(--surface-strong); color: var(--muted); font-size: 19rpx; }
.academy-tag--accent { background: rgba(25,207,160,.12); color: var(--accent); }
.academy-tag--warn { background: rgba(230,185,106,.12); color: var(--academy-warn); }
.academy-tag--danger { background: rgba(238,119,119,.12); color: var(--academy-danger); }
.academy-chip-row { display: flex; gap: 10rpx; overflow-x: auto; padding-bottom: 4rpx; }
.academy-chip { flex: 0 0 auto; min-height: 58rpx; padding: 0 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; color: var(--muted); font-size: 22rpx; line-height: 58rpx; white-space: nowrap; }
.academy-chip--active { border-color: var(--accent); background: rgba(25,207,160,.09); color: var(--accent); }
.academy-field { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 18rpx; }
.academy-label { color: var(--text); font-size: 23rpx; font-weight: 650; }
.academy-input, .academy-select { width: 100%; min-height: 72rpx; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface-strong); color: var(--text); font-size: 24rpx; }
.academy-helper { color: var(--muted); font-size: 20rpx; }
.academy-error { color: var(--academy-danger); font-size: 20rpx; }
.academy-actions { display: flex; flex-wrap: wrap; gap: 12rpx; }
.academy-state { padding: 56rpx 24rpx; border: 1rpx solid var(--line); border-radius: 14rpx; color: var(--muted); text-align: center; }
.academy-state__title { display: block; color: var(--text); font-size: 27rpx; font-weight: 700; }
.academy-state__note { display: block; margin: 9rpx auto 20rpx; max-width: 520rpx; font-size: 22rpx; }
.academy-skeleton { min-height: 140rpx; border-radius: 14rpx; background: linear-gradient(90deg, var(--surface) 25%, var(--surface-strong) 50%, var(--surface) 75%); background-size: 200% 100%; animation: academy-shimmer 1.2s infinite; }
.academy-divider { height: 1rpx; margin: 18rpx 0; background: var(--line); }
.academy-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 28rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }
.academy-metric { min-width: 0; padding: 20rpx 10rpx; text-align: center; }
.academy-metric + .academy-metric { border-left: 1rpx solid var(--line); }
.academy-metric__value { display: block; color: var(--text); font-size: 30rpx; font-weight: 760; }
.academy-metric__label { display: block; margin-top: 4rpx; color: var(--muted); font-size: 19rpx; }
.academy-progress { height: 8rpx; overflow: hidden; border-radius: 4rpx; background: var(--surface-strong); }
.academy-progress__value { height: 100%; border-radius: inherit; background: var(--accent); }
.academy-toast { position: fixed; z-index: 80; left: 50%; bottom: calc(138rpx + env(safe-area-inset-bottom)); max-width: 620rpx; padding: 17rpx 24rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface-strong); color: var(--text); font-size: 22rpx; text-align: center; transform: translateX(-50%); box-shadow: 0 12rpx 30rpx rgba(3,20,31,.28); }
.academy-source { display: block; margin-top: 12rpx; padding-top: 12rpx; border-top: 1rpx solid var(--line); color: var(--muted); font-size: 20rpx; }
@keyframes academy-shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .academy-skeleton { animation: none; } .academy-button { transition: none; } }
@media (min-width: 768px) { .academy-screen { width: 100%; max-width: 1040px; margin: 0 auto; padding: 30rpx 36rpx 54rpx; } .academy-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
