<template>
  <view v-if="visible" class="confirm-mask" role="presentation" @tap.self="$emit('cancel')">
    <view class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="displayTitle">
      <text class="confirm-dialog__title">{{ displayTitle }}</text>
      <text v-if="message" class="confirm-dialog__message">{{ message }}</text>
      <view class="confirm-dialog__actions">
        <text class="confirm-dialog__button" role="button" tabindex="0" @tap="$emit('cancel')" @keyup.enter="$emit('cancel')" @keyup.space.prevent="$emit('cancel')">{{ t('取消') }}</text>
        <text class="confirm-dialog__button confirm-dialog__confirm" role="button" tabindex="0" @tap="$emit('confirm')" @keyup.enter="$emit('confirm')" @keyup.space.prevent="$emit('confirm')">{{ t('确认') }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { translate } from '../../../data/localization'

export default {
  name: 'ConfirmDialog',
  emits: ['cancel', 'confirm'],
  props: { visible: Boolean, title: { type: String, default: '确认操作' }, message: { type: String, default: '' }, locale: { type: String, default: 'zh' } },
  computed: { displayTitle() { return this.t(this.title) } },
  methods: { t(value) { return translate(value, this.locale) } }
}
</script>

<style scoped>
.confirm-mask { position: fixed; z-index: 100; inset: 0; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(2,15,24,.62); }.confirm-dialog { width: 100%; max-width: 560rpx; padding: 30rpx; border: 1rpx solid var(--line); border-radius: 12rpx; background: var(--surface); box-shadow: 0 16rpx 48rpx var(--shadow, rgba(2,15,24,.28)); }.confirm-dialog__title { display: block; overflow-wrap: anywhere; color: var(--text); font-size: 30rpx; font-weight: 700; }.confirm-dialog__message { display: block; margin-top: 14rpx; overflow-wrap: anywhere; color: var(--muted); font-size: 24rpx; line-height: 1.55; }.confirm-dialog__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12rpx; margin-top: 30rpx; }.confirm-dialog__button { display: inline-flex; min-width: 96rpx; min-height: 88rpx; align-items: center; justify-content: center; padding: 0 24rpx; border: 1rpx solid var(--line); border-radius: 8rpx; color: var(--text); white-space: nowrap; }.confirm-dialog__confirm { border-color: var(--accent); color: var(--accent); }.confirm-dialog__button:active { transform: scale(.98); }.confirm-dialog__button:focus-visible { outline: 4rpx solid var(--focus-ring, var(--accent)); outline-offset: 2rpx; }
</style>
