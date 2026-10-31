<template>
  <view v-if="mode === 'demo'" class="market-mode-notice">
    <text class="market-mode-notice__title">演示目录</text>
    <text>库存、价格、资质、质检、履历和订单均为样例。支付与托管未接入。</text>
  </view>
</template>

<script>
export default { name: 'MarketModeNotice', props: { mode: { type: String, default: 'demo' } } }
</script>
