<template>
  <view class="service-list">
    <view v-for="item in items" :key="item.id" class="service-row" @tap="go(item.to)">
      <view class="service-copy"><text>{{ item.title }}</text><text>{{ item.note }}</text></view>
      <view class="service-side"><text>{{ item.tag }}</text><text>›</text></view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'HomeServiceList',
  props: { items: { type: Array, default: () => [] } },
  methods: { go(url) { if (url) uni.navigateTo({ url }) } }
}
</script>

<style scoped>
.service-list { overflow: hidden; border: 1rpx solid var(--line); border-radius: 11rpx; background: var(--surface); }
.service-row { display: flex; align-items: center; gap: 15rpx; padding: 22rpx; border-bottom: 1rpx solid var(--line); transition: transform .16s ease, background .16s ease; }
.service-row:last-child { border-bottom: 0; }
.service-row:active { transform: scale(.985); }
.service-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 7rpx; }
.service-copy text:first-child { color: var(--text); font-size: 24rpx; font-weight: 650; }
.service-copy text:last-child { color: var(--muted); font-size: 21rpx; line-height: 1.45; }
.service-side { display: flex; flex: 0 0 auto; align-items: center; gap: 8rpx; }
.service-side text:first-child { max-width: 145rpx; color: var(--accent); font-size: 19rpx; text-align: right; }
.service-side text:last-child { color: var(--muted); font-size: 30rpx; }
</style>
