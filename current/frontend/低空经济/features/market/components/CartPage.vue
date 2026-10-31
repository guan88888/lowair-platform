<template>
  <app-page-shell title="购物车" active="market">
    <view class="market-screen market-stack">
      <view class="cart-head"><view><text class="market-section__title">设备购物车</text><text class="market-helper">库存与价格以服务端实时结果为准</text></view><text class="cart-count">{{ items.length }} 件</text></view>
      <view v-if="loading" class="market-skeleton" style="height:360rpx"></view>
      <view v-else-if="error" class="market-state"><text class="market-state__title">购物车加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="load">重试</view></view>
      <view v-else-if="!items.length" class="market-state"><text class="market-state__title">购物车还是空的</text><text class="market-state__note">可从全新整机、二手无人机或配件中加入商品。</text><view class="market-button market-button--primary" @tap="backToMarket">去选设备</view></view>
      <template v-else>
        <view class="cart-list">
          <view v-for="item in items" :key="item.id" class="cart-item" :class="{ unavailable: !item.available }">
            <view class="cart-check" :class="{ checked: selected.includes(item.id) }" @tap="toggle(item)">{{ selected.includes(item.id) ? '✓' : '' }}</view>
            <image class="cart-image" :src="item.product.image" mode="aspectFill" @tap="openProduct(item.productId)"></image>
            <view class="cart-copy"><text class="cart-title" @tap="openProduct(item.productId)">{{ item.product.title }}</text><text class="market-helper">{{ item.product.categoryLabel }} · {{ item.product.city }}</text><text class="cart-price">¥ {{ money(item.product.price) }}</text><view class="cart-stepper"><text @tap="changeQuantity(item, -1)">−</text><text>{{ item.quantity }}</text><text @tap="changeQuantity(item, 1)">＋</text><text class="cart-remove" @tap="remove(item)">移除</text></view></view>
          </view>
        </view>
        <view class="cart-summary"><view><text>已选 {{ selectedItems.length }} 件</text><text class="cart-total">合计 ¥ {{ money(totalAmount) }}</text></view><view class="market-button market-button--primary" :class="{ disabled: !selectedItems.length }" @tap="checkout">去结算</view></view>
        <text class="market-helper">多商品将按不同卖家拆分订单；当前结算页逐单确认地址、库存与保障服务。</text>
      </template>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getMarketService } from '../services'

export default {
  name: 'MarketCartPage', components: { AppPageShell },
  data() { return { service: getMarketService(), items: [], selected: [], loading: true, error: '', busy: false } },
  computed: { selectedItems() { return this.items.filter((item) => item.available && this.selected.includes(item.id)) }, totalAmount() { return this.selectedItems.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0) } },
  created() { this.load() },
  methods: {
    money(value) { return Number(value || 0).toLocaleString('zh-CN') },
    async load() { this.loading = true; this.error = ''; try { const result = await this.service.listCart(); this.items = result.items || []; this.selected = this.items.filter((item) => item.available).map((item) => item.id) } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    toggle(item) { if (!item.available) return; this.selected = this.selected.includes(item.id) ? this.selected.filter((id) => id !== item.id) : [...this.selected, item.id] },
    async changeQuantity(item, delta) { const quantity = item.quantity + delta; if (quantity < 1 || this.busy) return; this.busy = true; try { const updated = await this.service.updateCartItem(item.productId, quantity); Object.assign(item, updated) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.busy = false } },
    remove(item) { uni.showModal({ title: '移除商品', content: '确认从购物车移除“' + item.product.title + '”吗？', success: async ({ confirm }) => { if (!confirm) return; try { await this.service.removeCartItem(item.id); this.items = this.items.filter((value) => value.id !== item.id); this.selected = this.selected.filter((id) => id !== item.id) } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } } }) },
    checkout() { if (!this.selectedItems.length) return; const item = this.selectedItems[0]; uni.navigateTo({ url: '/pages/market/order?mode=checkout&id=' + encodeURIComponent(item.productId) + '&quantity=' + item.quantity + '&tradeType=buy' }) },
    openProduct(id) { uni.navigateTo({ url: '/pages/market/product-detail?id=' + encodeURIComponent(id) }) },
    backToMarket() { uni.reLaunch({ url: '/pages/market/index' }) }
  }
}
</script>

<style src="../styles/market.css"></style>
<style scoped>
.cart-head { display: flex; align-items: flex-end; justify-content: space-between; }.cart-head > view { display: flex; flex-direction: column; gap: 7rpx; }.cart-count { color: var(--accent); font-size: 22rpx; }.cart-list { display: flex; flex-direction: column; gap: 12rpx; }.cart-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }.cart-item.unavailable { opacity: .55; }.cart-check { display: flex; width: 34rpx; height: 34rpx; flex: 0 0 34rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 50%; color: var(--accent-ink); font-size: 18rpx; }.cart-check.checked { border-color: var(--accent); background: var(--accent); }.cart-image { width: 126rpx; height: 104rpx; flex: 0 0 126rpx; border-radius: 7rpx; background: var(--surface-strong); }.cart-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 7rpx; }.cart-title { overflow: hidden; color: var(--text); font-size: 23rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.cart-price, .cart-total { color: var(--accent); font-size: 23rpx; font-weight: 750; }.cart-stepper { display: flex; align-items: center; gap: 18rpx; color: var(--text); font-size: 22rpx; }.cart-stepper > text:not(.cart-remove) { min-width: 28rpx; text-align: center; }.cart-remove { margin-left: auto; color: var(--muted); font-size: 19rpx; }.cart-summary { position: sticky; z-index: 4; bottom: 20rpx; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 14rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); }.cart-summary > view:first-child { display: flex; flex-direction: column; gap: 5rpx; color: var(--muted); font-size: 20rpx; }.cart-summary .market-button { min-width: 190rpx; }
</style>
