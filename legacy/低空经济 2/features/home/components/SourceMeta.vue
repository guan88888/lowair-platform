<template>
  <view v-if="meta" class="source-meta">
    <text v-if="meta.demo" class="demo-tag">演示</text>
    <text class="source-text">来源：{{ meta.source }}</text>
    <text class="source-time">更新：{{ meta.updatedAt }}</text>
  </view>
</template>

<script>
export default {
  name: 'HomeSourceMeta',
  props: { meta: { type: Object, default: null } }
}
</script>

<style scoped>
.source-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx 14rpx; margin-top: 16rpx; color: var(--muted); font-size: 19rpx; line-height: 1.45; }
.demo-tag { padding: 3rpx 9rpx; border: 1rpx solid var(--accent); border-radius: 5rpx; color: var(--accent); font-weight: 650; }
.source-text { min-width: 0; }
.source-time { margin-left: auto; }
</style>
