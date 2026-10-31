<template>
  <app-page-shell title="我的交易" active="market">
    <view class="market-screen market-stack">
      <view v-if="!loggedIn" class="market-state"><text class="market-state__title">登录后查看交易</text><text class="market-state__note">订单、支付、押金、退款和担保仅展示服务端状态。</text><view class="market-button market-button--primary" @tap="goLogin">去登录</view></view>
      <template v-else-if="checkout">
        <view v-if="state === 'loading'" class="market-skeleton"></view>
        <view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">无法加载下单信息</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="loadCheckout">重试</view></view>
        <template v-else-if="product">
          <view class="market-summary"><text class="market-summary__title">{{ product.title }}</text><text class="market-summary__copy">{{ product.city }} · {{ product.condition }} · 数量 {{ quantity }}</text></view>
          <view class="market-section"><view class="market-section__head"><text class="market-section__title">交付与保障</text></view><view class="market-form"><view class="market-field"><text class="market-field__label">交付方式</text><picker range-key="label" :range="deliveryOptions" @change="form.delivery = deliveryOptions[$event.detail.value].value; quote()"><view class="market-select">{{ deliveryLabel }}</view></picker></view><view class="market-field"><text class="market-field__label">保障服务</text><picker range-key="label" :range="protectionOptions" @change="form.protection = protectionOptions[$event.detail.value].value; quote()"><view class="market-select">{{ protectionLabel }}</view></picker></view></view></view>
          <view class="market-section"><view class="market-section__head"><text class="market-section__title">费用明细</text><text class="market-section__note">以服务端报价为准</text></view><view v-if="quoting" class="market-helper">正在获取报价...</view><view v-else class="market-fee-box"><view v-for="item in feeItems" :key="item.label" class="market-fee-row"><text>{{ item.label }}</text><text>{{ item.amount }}</text></view><view class="market-fee-row total"><text>应付 / 待托管</text><text>{{ totalAmount }}</text></view><text class="market-helper">前端不处理支付、押金冻结、退款或担保；创建订单后等待服务端支付状态。</text></view></view>
          <text v-if="error" class="market-error-text">{{ error }}</text><view class="market-bottom-actions market-bottom-actions--single"><view class="market-button market-button--primary" :class="{ disabled: submitting }" @tap="submitOrder">{{ submitting ? '创建中...' : '创建订单' }}</view></view>
        </template>
      </template>
      <template v-else-if="orderId">
        <view v-if="state === 'loading'" class="market-skeleton"></view><view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">订单加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="loadOrder">重试</view></view>
        <view v-else-if="order" class="market-stack"><view class="market-summary"><text class="market-summary__meta">订单号 {{ order.order_no || order.orderNo || order.id }}</text><text class="market-summary__title">{{ order.product_title || order.product?.title || '交易订单' }}</text><text class="market-status market-status--neutral">{{ orderStatus(order) }}</text></view><view class="market-section"><view class="market-section__head"><text class="market-section__title">订单状态</text><text class="market-section__note">服务端流转</text></view><view class="market-list-group"><view v-for="stage in stages" :key="stage.label" class="market-list-row"><text class="market-list-row__label">{{ stage.label }}</text><text class="market-list-row__value">{{ stage.value }}</text></view></view></view><view v-if="actions.length" class="market-actions"><view v-for="action in actions.slice(0, 2)" :key="action.code" class="market-button market-button--secondary" @tap="runAction(action)">{{ action.label }}</view></view><view class="market-bottom-actions market-bottom-actions--single"><view class="market-button market-button--secondary" @tap="go('/pages/market/order?mode=list')">返回订单</view></view></view>
      </template>
      <template v-else>
        <view class="market-tabs"><view v-for="item in statusTabs" :key="item.value" class="market-tab" :class="{ active: filters.status === item.value }" @tap="filters.status = item.value; loadOrders()">{{ item.label }}</view></view>
        <view v-if="state === 'loading'" class="market-skeleton-grid"><view v-for="i in 4" :key="i" class="market-skeleton"></view></view><view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">订单加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="loadOrders">重试</view></view><view v-else-if="!orders.length" class="market-state"><text class="market-state__title">暂无订单</text><text class="market-state__note">下单后可在这里查看付款、交付、验机、归还和售后状态。</text></view><view v-else class="market-list-group"><view v-for="item in orders" :key="item.id" class="market-order-card" @tap="go(`/pages/market/order?mode=detail&orderId=${encodeURIComponent(item.id)}`)"><text class="market-order-card__title">{{ item.product_title || item.product?.title || '交易订单' }}</text><text class="market-order-card__meta">{{ item.order_no || item.orderNo || item.id }}</text><view class="market-order-card__bottom"><text>{{ orderStatus(item) }}</text><text>{{ item.total_amount || item.total || '金额由服务端返回' }}</text></view></view></view>
      </template>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'
import { getMarketRouteOptions } from '../utils/route-options'
import { getMarketService } from '../services'
import { availableOrderActions, orderStages, orderStatusLabel } from '../services/order-state'
export default {
  name: 'OrderPage', components: { AppPageShell },
  data() { return { service: getMarketService(), loggedIn: getAuthState().loggedIn, checkout: false, orderId: '', productId: '', quantity: 1, tradeType: 'buy', state: 'loading', error: '', product: null, order: null, orders: [], quoteData: null, quoting: false, submitting: false, form: { delivery: 'shipping', protection: 'none', startDate: '', endDate: '', planId: '' }, deliveryOptions: [{ label: '邮寄', value: 'shipping' }, { label: '自提', value: 'pickup' }], protectionOptions: [{ label: '不选择保障', value: 'none' }, { label: '基础保障（报价以服务端为准）', value: 'basic' }], filters: { status: '', page: 1, pageSize: 10 }, statusTabs: [{ label: '全部', value: '' }, { label: '待付款', value: 'pending_payment' }, { label: '待发货', value: 'pending_shipment' }, { label: '待验机', value: 'pending_inspection' }, { label: '租赁中', value: 'renting' }, { label: '售后/争议', value: 'after_sale' }] } },
  computed: { deliveryLabel() { return this.deliveryOptions.find((item) => item.value === this.form.delivery)?.label || '请选择' }, protectionLabel() { return this.protectionOptions.find((item) => item.value === this.form.protection)?.label || '不选择保障' }, feeItems() { const quote = this.quoteData || {}; const items = quote.items || quote.fees || []; return items.length ? items.map((item) => ({ label: item.label || item.name, amount: item.amount || item.value })) : [{ label: this.tradeType === 'lease' ? '租金' : `商品金额 × ${this.quantity}`, amount: this.product ? '¥ ' + (Number(this.product.price || 0) * this.quantity).toLocaleString('zh-CN') : '待报价' }, { label: '配送、保障、税费', amount: '待服务端报价' }] }, totalAmount() { const value = this.quoteData?.totalAmount ?? this.quoteData?.total_amount ?? this.quoteData?.total; return value === undefined ? '待服务端报价' : '¥ ' + Number(value).toLocaleString('zh-CN') }, stages() { return orderStages(this.order) }, actions() { return availableOrderActions(this.order) } },
  mounted() { const options = getMarketRouteOptions(); this.checkout = options.mode === 'checkout'; this.orderId = options.orderId || (options.mode === 'detail' ? options.id : ''); this.productId = this.checkout ? options.id : ''; this.quantity = Math.min(100, Math.max(1, Number.parseInt(options.quantity, 10) || 1)); this.tradeType = options.tradeType || 'buy'; this.filters.status = options.tab || ''; this.form = { ...this.form, delivery: options.delivery || 'shipping', protection: options.protection || 'none', startDate: options.startDate || '', endDate: options.endDate || '', planId: options.planId || '' }; if (!this.loggedIn) return; if (this.checkout) this.loadCheckout(); else if (this.orderId) this.loadOrder(); else this.loadOrders() },
  methods: {
    orderStatus(order) { return orderStatusLabel(order) },
    serverDate(value) { return value ? new Date(value + (value.includes('T') ? '' : 'T00:00:00')).toISOString() : undefined },
    orderPayload() {
      return {
        productId: Number(this.productId),
        quantity: this.quantity,
        rentalPlanId: this.form.planId ? Number(this.form.planId) : undefined,
        startDate: this.serverDate(this.form.startDate),
        endDate: this.serverDate(this.form.endDate)
      }
    },
    async loadCheckout() { if (!this.productId) { this.state = 'error'; this.error = '缺少商品编号'; return } this.state = 'loading'; try { this.product = await this.service.getProduct(this.productId); this.state = 'ready'; this.quote() } catch (err) { this.error = err.message || '请稍后重试'; this.state = 'error' } },
    async quote() { if (!this.productId || this.quoting) return; this.quoting = true; this.error = ''; try { this.quoteData = await this.service.quoteOrder(this.orderPayload()) } catch (err) { this.quoteData = null; this.error = err.message || '报价暂不可用，请在创建订单时由服务端确认' } finally { this.quoting = false } },
    async submitOrder() { if (this.submitting) return; this.submitting = true; this.error = ''; try { const result = await this.service.createOrder({ ...this.orderPayload(), address: { deliveryMethod: this.form.delivery, protection: this.form.protection } }); const id = result?.id || result?.orderId || result?.order_id; if (!id) throw new Error('服务端未返回订单编号'); this.go(`/pages/market/order?mode=detail&orderId=${encodeURIComponent(id)}`) } catch (err) { this.error = err.message || '创建订单失败' } finally { this.submitting = false } },
    async loadOrders() { this.state = 'loading'; this.error = ''; try { const result = await this.service.listOrders(this.filters); this.orders = result.items || []; this.state = 'ready' } catch (err) { this.error = err.message || '请稍后重试'; this.state = 'error' } },
    async loadOrder() { this.state = 'loading'; try { this.order = await this.service.getOrder(this.orderId); this.state = 'ready' } catch (err) { this.error = err.message || '请稍后重试'; this.state = 'error' } },
    async runAction(action) { try { await this.service.requestOrderAction(this.orderId, action.code); await this.loadOrder() } catch (error) { this.error = error.message || '订单操作失败' } },
    goLogin() { uni.navigateTo({ url: guardedUrl('login', '/pages/market/order?mode=list') }) },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style src="../styles/market.css"></style>
