<template>
  <view
    class="safe-media"
    :class="[`safe-media-${fit}`, { 'is-loaded': loaded, 'is-error': failed, 'is-previewable': previewable }]"
    :style="frameStyle"
    :aria-label="alt"
    :role="previewable ? 'button' : 'img'"
    @tap="openPreview"
  >
    <view v-if="!loaded && !failed" class="safe-media-skeleton" aria-hidden="true"></view>
    <image
      v-if="!failed"
      class="safe-media-image"
      :src="src"
      :mode="imageMode"
      :lazy-load="lazy"
      :show-menu-by-longpress="previewable"
      :aria-label="alt"
      @load="handleLoad"
      @error="handleError"
    ></image>
    <view v-else class="safe-media-fallback" role="img" :aria-label="fallbackLabel">
      <text class="safe-media-fallback-mark" aria-hidden="true">▧</text>
      <text>{{ fallbackLabel }}</text>
    </view>
    <text v-if="badge" class="safe-media-badge">{{ badge }}</text>
  </view>
</template>

<script>
import { reportMediaError } from './media-registry'

export default {
  name: 'SafeMedia',
  props: {
    src: { type: String, required: true },
    alt: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    ratio: { type: String, default: '3 / 2' },
    fit: { type: String, default: 'cover' },
    lazy: { type: Boolean, default: true },
    previewable: { type: Boolean, default: false },
    fallbackLabel: { type: String, default: '图片暂时无法显示' },
    badge: { type: String, default: '' },
    page: { type: String, default: '' },
    onError: { type: Function, default: null }
  },
  emits: ['load', 'error', 'preview'],
  data() {
    return { loaded: false, failed: false }
  },
  computed: {
    frameStyle() {
      return {
        aspectRatio: this.ratio || (this.width && this.height ? `${this.width} / ${this.height}` : '3 / 2')
      }
    },
    imageMode() {
      return this.fit === 'contain' ? 'aspectFit' : 'aspectFill'
    }
  },
  watch: {
    src() {
      this.loaded = false
      this.failed = false
    }
  },
  methods: {
    handleLoad(event) {
      this.loaded = true
      this.failed = false
      this.$emit('load', event)
    },
    handleError(event) {
      this.loaded = false
      this.failed = true
      const detail = reportMediaError({ src: this.src, alt: this.alt, page: this.page }, this.onError)
      this.$emit('error', { ...detail, event })
    },
    openPreview() {
      if (!this.previewable || this.failed || !this.loaded || !this.src) return
      this.$emit('preview', this.src)
      if (typeof uni !== 'undefined' && typeof uni.previewImage === 'function') {
        uni.previewImage({ current: this.src, urls: [this.src] })
      }
    }
  }
}
</script>

<style scoped>
.safe-media { position: relative; display: block; width: 100%; min-height: 1px; overflow: hidden; background: #0b263a; }
.safe-media-image { position: absolute; inset: 0; display: block; width: 100%; height: 100%; opacity: 0; transition: opacity .2s ease; }
.safe-media.is-loaded .safe-media-image { opacity: 1; }
.safe-media-skeleton { position: absolute; inset: 0; background: linear-gradient(100deg, #0b263a 20%, #153a4f 38%, #0b263a 58%); background-size: 200% 100%; animation: safe-media-shimmer 1.3s ease-in-out infinite; }
.safe-media-fallback { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10rpx; padding: 24rpx; color: #a8bec9; font-size: 22rpx; text-align: center; }
.safe-media-fallback-mark { color: #35dfb2; font-size: 40rpx; }
.safe-media-badge { position: absolute; right: 12rpx; bottom: 12rpx; max-width: calc(100% - 24rpx); padding: 7rpx 10rpx; border-radius: 4rpx; background: rgba(3, 18, 30, .84); color: #edf7f8; font-size: 18rpx; line-height: 1.35; }
.safe-media.is-previewable:active { opacity: .92; }
@keyframes safe-media-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) { .safe-media-image { transition: none; } .safe-media-skeleton { animation: none; } }
</style>
