<template>
  <view class="request-state" :class="'request-state--' + state" :role="state === 'loading' ? 'status' : undefined" :aria-live="state === 'loading' ? 'polite' : undefined">
    <view v-if="state === 'loading'" class="request-state__loading"><view class="request-state__skeleton" aria-hidden="true"></view><text>{{ t('加载中...') }}</text></view>
    <slot v-else></slot>
  </view>
</template>

<script>
import { translate } from '../../../data/localization'

export default {
  name: 'RequestState',
  props: { state: { type: String, default: 'ready' }, locale: { type: String, default: 'zh' } },
  methods: { t(value) { return translate(value, this.locale) } }
}
</script>

<style scoped>
.request-state { padding: 28rpx; color: var(--muted); text-align: center; }.request-state__loading { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }.request-state__skeleton { width: min(100%, 480rpx); height: 20rpx; border-radius: 6rpx; background: var(--surface-strong); opacity: .72; }
</style>
