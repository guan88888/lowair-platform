<template>
  <view class="module-state">
    <slot v-if="state === 'ready'"></slot>
    <slot v-else-if="state === 'loading'" name="loading">
      <view class="skeleton" aria-label="正在加载">
        <view class="skeleton-line skeleton-title"></view>
        <view class="skeleton-line"></view>
        <view class="skeleton-line skeleton-short"></view>
      </view>
    </slot>
    <view v-else-if="state === 'empty'" class="state-panel">
      <text class="state-mark">○</text>
      <text class="state-title">{{ emptyTitle }}</text>
      <text class="state-note">{{ emptyNote }}</text>
      <view v-if="retryable" class="state-action" @tap="$emit('retry')">重新加载</view>
    </view>
    <view v-else class="state-panel state-panel-error">
      <text class="state-mark">!</text>
      <text class="state-title">{{ errorTitle }}</text>
      <text class="state-note">{{ error || '请检查网络后重试。' }}</text>
      <view class="state-action" @tap="$emit('retry')">重试</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'HomeModuleState',
  emits: ['retry'],
  props: {
    state: { type: String, default: 'loading' },
    error: { type: String, default: '' },
    emptyTitle: { type: String, default: '暂无内容' },
    emptyNote: { type: String, default: '当前没有可展示的数据。' },
    errorTitle: { type: String, default: '加载失败' },
    retryable: { type: Boolean, default: true }
  }
}
</script>

<style scoped>
.module-state { min-height: 100rpx; }
.skeleton { padding: 28rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); }
.skeleton-line { width: 100%; height: 24rpx; margin-top: 18rpx; border-radius: 6rpx; background: var(--surface-strong); opacity: .76; animation: skeleton-pulse 1.35s ease-in-out infinite; }
.skeleton-line:first-child { margin-top: 0; }
.skeleton-title { width: 42%; height: 30rpx; }
.skeleton-short { width: 68%; }
.state-panel { display: flex; min-height: 180rpx; align-items: center; justify-content: center; flex-direction: column; padding: 28rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); text-align: center; }
.state-panel-error { border-color: rgba(255, 158, 117, .55); }
.state-mark { display: flex; width: 46rpx; height: 46rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 50%; color: var(--muted); font-size: 27rpx; }
.state-title { margin-top: 14rpx; color: var(--text); font-size: 26rpx; font-weight: 650; }
.state-note { max-width: 520rpx; margin-top: 8rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }
.state-action { margin-top: 18rpx; padding: 13rpx 28rpx; border: 1rpx solid var(--accent); border-radius: 8rpx; color: var(--accent); font-size: 23rpx; }
.state-action:active { transform: scale(.98); }
@keyframes skeleton-pulse { 0%, 100% { opacity: .48; } 50% { opacity: .92; } }
@media (prefers-reduced-motion: reduce) { .skeleton-line { animation: none; } }
</style>
