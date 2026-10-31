<template>
  <view class="market-product-card" @tap="$emit('open', product)">
    <image class="market-product-card__image" :src="product.image" mode="aspectFill"></image>
    <view class="market-product-card__body">
      <view class="market-product-card__meta"><text>{{ product.categoryLabel }}</text><text>{{ product.city }}</text></view>
      <text class="market-product-card__title">{{ product.title }}</text>
      <text class="market-product-card__summary">{{ product.summary }}</text>
      <view class="market-product-card__facts">
        <text>{{ product.condition }}</text>
        <text>{{ deliveryLabel }}</text>
      </view>
      <view class="market-product-card__trust">
        <text>质检 {{ product.inspection.status }}</text>
        <text>履历 {{ product.historyStatus.status }}</text>
      </view>
      <view class="market-product-card__bottom">
        <text class="market-product-card__price">¥ {{ formattedPrice }}<text>{{ product.priceUnit || '' }}</text></text>
        <text v-if="product.category !== 'rental'" class="market-cart-mini" @tap.stop="$emit('cart', product)">加入购物车</text>
        <text v-else class="market-product-card__stock">库存：{{ mode === 'demo' ? '演示 ' : '' }}{{ product.stock }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ProductCard',
  emits: ['open', 'cart'],
  props: { product: { type: Object, required: true }, mode: { type: String, default: 'demo' } },
  computed: {
    formattedPrice() { return Number(this.product.price || 0).toLocaleString('zh-CN') },
    deliveryLabel() {
      const values = this.product.delivery || []
      if (values.includes('shipping') && values.includes('pickup')) return '邮寄 / 自提'
      return values.includes('pickup') ? '仅自提' : '邮寄'
    }
  }
}
</script>
