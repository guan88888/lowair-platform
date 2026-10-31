<template>
  <app-page-shell title="商品详情" active="market">
    <view class="market-screen market-stack">
      <market-mode-notice :mode="mode" />
      <view v-if="state === 'loading'" class="market-stack"><view class="market-skeleton"></view><view class="market-skeleton" style="height:280rpx"></view></view>
      <view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">无法加载商品</text><text class="market-state__note">{{ errorMessage }}</text><view class="market-button market-button--secondary" @tap="loadProduct">重试</view></view>
      <template v-else-if="product">
        <swiper class="market-hero-image" :current="imageIndex" @change="imageIndex = $event.detail.current">
          <swiper-item v-for="(image, index) in product.images" :key="index"><image class="market-hero-image" :src="image" mode="aspectFill" @tap="previewImages(index)"></image></swiper-item>
        </swiper>
        <view v-if="product.images.length > 1" class="market-image-dots"><text v-for="(_, index) in product.images" :key="index" class="market-image-dot" :class="{ active: imageIndex === index }"></text></view>

        <view class="market-summary">
          <view class="market-summary__meta"><text>{{ product.categoryLabel }} / {{ product.condition }}</text><text>{{ product.city }}</text></view>
          <text class="market-summary__title">{{ product.title }}</text>
          <text class="market-summary__copy">{{ product.summary }}</text>
          <text class="market-summary__price">¥ {{ money(product.price) }}{{ product.priceUnit || '' }}</text>
          <view class="market-fact-grid">
            <view class="market-fact"><text class="market-fact__label">库存</text><text class="market-fact__value">{{ mode === 'demo' ? '演示 ' : '' }}{{ product.stock }}</text></view>
            <view class="market-fact"><text class="market-fact__label">交付</text><text class="market-fact__value">{{ deliveryLabel }}</text></view>
            <view class="market-fact"><text class="market-fact__label">飞行时长</text><text class="market-fact__value">{{ product.flightHours }}</text></view>
            <view class="market-fact"><text class="market-fact__label">电池状态</text><text class="market-fact__value">{{ product.battery.status }}</text></view>
          </view>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">可追溯字段</text><text class="market-section__note">状态、来源、时间</text></view>
          <view class="market-evidence-grid">
            <evidence-item title="SN" :evidence="product.sn" />
            <evidence-item title="质检" :evidence="product.inspection" />
            <evidence-item title="设备履历" :evidence="product.historyStatus" />
            <evidence-item title="链上存证" :evidence="product.blockchain" />
          </view>
          <view class="market-actions"><view class="market-button market-button--secondary" :class="{ disabled: !canOpenHistory }" @tap="openHistory">查看履历</view><view class="market-button market-button--secondary" @tap="openSellerChat">咨询卖家</view></view>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">配置与参数</text><text class="market-section__note">按当前商品记录</text></view>
          <view class="market-fact-grid"><view v-for="item in product.specs" :key="item.label" class="market-fact"><text class="market-fact__label">{{ item.label }}</text><text class="market-fact__value">{{ item.value }}</text></view></view>
          <view class="market-bullet-list"><text v-for="item in product.configuration" :key="item" class="market-bullet">{{ item }}</text></view>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">成色与履历声明</text></view>
          <view class="market-list-group">
            <view class="market-list-row"><text class="market-list-row__label">维修记录</text><text class="market-list-row__value">{{ product.repairHistory }}</text></view>
            <view class="market-list-row"><text class="market-list-row__label">炸机记录</text><text class="market-list-row__value">{{ product.crashHistory }}</text></view>
            <view class="market-list-row"><text class="market-list-row__label">电池健康</text><text class="market-list-row__value">{{ product.battery.health }}</text></view>
            <view class="market-list-row"><text class="market-list-row__label">电池循环</text><text class="market-list-row__value">{{ product.battery.cycles }}</text></view>
          </view>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">卖家与交付</text></view>
          <view class="market-seller"><text class="market-seller__name">{{ product.seller.name }}</text><text class="market-seller__meta">{{ product.seller.status }}</text><text class="market-seller__meta">来源：{{ product.seller.source }}</text><text class="market-seller__meta">记录时间：{{ product.seller.recordedAt }}</text></view>
          <view class="market-bullet-list"><text v-for="item in product.deliveryNotes" :key="item" class="market-bullet">{{ item }}</text></view>
        </view>

        <view class="market-bottom-actions">
          <view v-if="product.rentable" class="market-button market-button--secondary" @tap="go(`/pages/market/lease?id=${product.id}`)">查看租赁</view>
          <view v-else class="market-button market-button--secondary" @tap="openSellerChat">咨询卖家</view>
          <view class="market-button market-button--primary" @tap="startCheckout">{{ product.category === 'rental' ? '选择租期' : '确认下单' }}</view>
        </view>
      </template>
      <view v-if="toast" class="market-toast">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import EvidenceItem from './EvidenceItem.vue'
import MarketModeNotice from './MarketModeNotice.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { getMarketMode, getMarketService } from '../services'

export default {
  name: 'ProductDetailPage', components: { AppPageShell, EvidenceItem, MarketModeNotice },
  data() { return { id: '', mode: getMarketMode(), service: getMarketService(), product: null, state: 'loading', errorMessage: '', imageIndex: 0, toast: '' } },
  computed: {
    deliveryLabel() { const values = this.product?.delivery || []; return values.includes('shipping') && values.includes('pickup') ? '支持邮寄与自提' : values.includes('pickup') ? '仅支持自提' : '支持邮寄' },
    canOpenHistory() { return this.product && this.product.sn.status !== '不适用' && this.product.sn.label && !this.product.sn.label.includes('待分配') }
  },
  mounted() { this.id = getRouteOptions().id || ''; this.loadProduct() },
  methods: {
    money(value) { return Number(value || 0).toLocaleString('zh-CN') },
    async loadProduct() { this.state = 'loading'; try { this.product = await this.service.getProduct(this.id); this.state = 'ready' } catch (error) { this.errorMessage = error.message || '请稍后重试'; this.state = 'error' } },
    previewImages(index) { uni.previewImage({ current: index, urls: this.product.images }) },
    openHistory() { if (!this.canOpenHistory) return this.showToast('当前商品没有可查询的 SN 履历'); this.go(`/pages/market/device-history?sn=${encodeURIComponent(this.product.sn.label.replace(/•/g, 'DEMO'))}`) },
    openSellerChat() { this.go(`/pages/messages/index?conversationId=market-${this.product.id}`) },
    startCheckout() { if (this.product.category === 'rental') return this.go(`/pages/market/lease?id=${this.product.id}`); this.go(`/pages/market/order?mode=checkout&id=${this.product.id}&tradeType=buy`) },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2200) },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style src="../styles/market.css"></style>
