<template>
  <view class="error-state" role="alert"><text class="error-state__message">{{ t(message) }}</text><view class="error-state__retry" role="button" tabindex="0" @tap="$emit('retry')" @keyup.enter="$emit('retry')" @keyup.space.prevent="$emit('retry')">{{ t('重试') }}</view></view>
</template>

<script>
import { translate } from '../../../data/localization'

export default {
  name: 'ErrorState',
  emits: ['retry'],
  props: { message: { type: String, default: '加载失败，请稍后重试' }, locale: { type: String, default: 'zh' } },
  methods: { t(value) { return translate(value, this.locale) } }
}
</script>

<style scoped>
.error-state { display: flex; flex-direction: column; align-items: center; gap: 18rpx; padding: 48rpx 28rpx; color: var(--muted); text-align: center; }.error-state__message { overflow-wrap: anywhere; line-height: 1.55; }.error-state__retry { display: inline-flex; min-height: 88rpx; align-items: center; justify-content: center; padding: 0 28rpx; border: 1rpx solid var(--line); border-radius: 6rpx; color: var(--accent); white-space: nowrap; }.error-state__retry:active { transform: scale(.98); }.error-state__retry:focus-visible { outline: 4rpx solid var(--focus-ring, var(--accent)); outline-offset: 2rpx; }
</style>
