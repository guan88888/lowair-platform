<template>
  <view class="work-media-hero" :class="{ interactive: Boolean(actionText) }" @tap="handleAction">
    <image
      v-if="!imageFailed"
      class="work-media-image"
      :src="media.src"
      mode="aspectFill"
      :aria-label="media.alt"
      @error="imageFailed = true"
    ></image>
    <view v-else class="work-media-fallback" role="img" :aria-label="media.alt">
      <text class="fallback-title">无人机作业服务</text>
      <text>图片暂时无法显示</text>
    </view>
    <view class="work-media-scrim"></view>
    <view class="work-media-copy">
      <text class="work-media-eyebrow">{{ eyebrow }}</text>
      <text class="work-media-title">{{ title }}</text>
      <text class="work-media-note">{{ note }}</text>
      <text v-if="actionText" class="work-media-action">{{ actionText }} ›</text>
    </view>
  </view>
</template>

<script>
import { workMedia } from '../media'

export default {
  name: 'WorkMediaHero',
  props: {
    eyebrow: { type: String, default: '' },
    title: { type: String, required: true },
    note: { type: String, default: '' },
    actionText: { type: String, default: '' }
  },
  emits: ['action'],
  data() {
    return { media: workMedia.inspection, imageFailed: false }
  },
  methods: {
    handleAction() {
      if (this.actionText) this.$emit('action')
    }
  }
}
</script>

<style scoped>
.work-media-hero { position: relative; min-height: 284rpx; overflow: hidden; margin-bottom: 22rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface-strong); }
.work-media-hero.interactive { transition: transform .16s ease, border-color .16s ease; }
.work-media-hero.interactive:active { transform: scale(.99); border-color: var(--accent); }
.work-media-image, .work-media-scrim, .work-media-fallback { position: absolute; inset: 0; width: 100%; height: 100%; }
.work-media-image { display: block; }
.work-media-scrim { background: linear-gradient(90deg, rgba(4,20,34,.94) 0%, rgba(4,20,34,.72) 52%, rgba(4,20,34,.2) 100%); }
.work-media-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; background: var(--surface-strong); color: var(--muted); font-size: 21rpx; }
.fallback-title { color: var(--text); font-size: 29rpx; font-weight: 700; }
.work-media-copy { position: relative; z-index: 1; display: flex; min-height: 284rpx; max-width: 500rpx; flex-direction: column; align-items: flex-start; box-sizing: border-box; padding: 28rpx; }
.work-media-eyebrow { color: #35dfb2; font-size: 21rpx; }
.work-media-title { display: block; margin-top: 10rpx; color: #edf7f8; font-size: 39rpx; font-weight: 750; line-height: 1.25; }
.work-media-note { display: block; margin-top: 10rpx; color: #c1d2d8; font-size: 23rpx; line-height: 1.55; }
.work-media-action { margin-top: auto; padding-top: 18rpx; color: #35dfb2; font-size: 24rpx; }
@media (prefers-reduced-motion: reduce) { .work-media-hero.interactive { transition: none; } }
</style>
