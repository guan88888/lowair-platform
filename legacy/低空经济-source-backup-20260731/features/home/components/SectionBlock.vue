<template>
  <view class="section-block">
    <view class="section-head">
      <text class="section-title">{{ title }}</text>
      <text v-if="action" class="section-action" @tap="$emit('action')">{{ action }} ›</text>
    </view>
    <slot></slot>
  </view>
</template>

<script>
export default {
  name: 'HomeSectionBlock',
  emits: ['action'],
  props: {
    title: { type: String, required: true },
    action: { type: String, default: '' }
  }
}
</script>

<style scoped>
.section-block { margin-top: 30rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.section-title { color: var(--text); font-size: 28rpx; font-weight: 700; }
.section-action { min-height: 48rpx; display: flex; align-items: center; color: var(--accent); font-size: 21rpx; }
</style>
