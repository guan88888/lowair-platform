<template>
  <app-page-shell title="租赁方案" active="market">
    <view class="market-screen market-stack">
      <market-mode-notice :mode="mode" />
      <view v-if="state === 'loading'" class="market-stack"><view class="market-skeleton"></view><view class="market-skeleton" style="height:360rpx"></view></view>
      <view v-else-if="state === 'error'" class="market-state"><text class="market-state__title">无法加载租赁方案</text><text class="market-state__note">{{ errorMessage }}</text><view class="market-button market-button--secondary" @tap="load">重试</view></view>
      <template v-else-if="product">
        <view class="market-summary" @tap="go(`/pages/market/product-detail?id=${product.id}`)">
          <view class="market-summary__meta"><text>{{ product.model }}</text><text>{{ product.city }}</text></view>
          <text class="market-summary__title">{{ product.title }}</text><text class="market-summary__copy">{{ product.condition }}，库存与租期必须在服务端报价时校验。</text>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">选择方案</text><text class="market-section__note">演示金额，不触发扣款</text></view>
          <view v-if="plans.length" class="market-plan-list">
            <view v-for="plan in plans" :key="plan.id" class="market-plan" :class="{ active: selectedPlanId === plan.id }" @tap="selectPlan(plan)">
              <view class="market-plan__head"><text class="market-plan__name">{{ plan.name }}</text><text class="market-plan__price">¥ {{ money(plan.rent) }}</text></view>
              <text class="market-plan__note">初始押金：¥ {{ money(plan.deposit) }}</text><text class="market-plan__note">{{ plan.depositRule }}</text><text class="market-plan__note">到期归属：{{ plan.ownership }}</text>
            </view>
          </view>
          <view v-else class="market-state"><text class="market-state__title">暂无可租方案</text><text class="market-state__note">该商品当前没有可用租赁计划。</text></view>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">日期与交付</text></view>
          <view class="market-form">
            <view class="market-field"><text class="market-field__label">开始日期</text><picker mode="date" :value="form.startDate" @change="form.startDate = $event.detail.value"><view class="market-select">{{ form.startDate || '选择日期' }}</view></picker></view>
            <view class="market-field"><text class="market-field__label">结束日期</text><picker mode="date" :value="form.endDate" @change="form.endDate = $event.detail.value"><view class="market-select">{{ form.endDate || '选择日期' }}</view></picker></view>
            <view class="market-field"><text class="market-field__label">交付方式</text><picker range-key="label" :range="deliveryOptions" @change="form.delivery = deliveryOptions[$event.detail.value].value"><view class="market-select">{{ deliveryOptions.find((item) => item.value === form.delivery)?.label || '请选择' }}</view></picker></view>
            <view class="market-field"><text class="market-field__label">保障服务</text><picker range-key="label" :range="protectionOptions" @change="selectProtection($event.detail.value)"><view class="market-select">{{ protectionLabel }}</view></picker><text class="market-helper">第三方保障未接入时不可选择。</text></view>
          </view>
          <text v-if="formError" class="market-error-text">{{ formError }}</text>
        </view>

        <view class="market-section">
          <view class="market-section__head"><text class="market-section__title">租赁规则</text></view>
          <view class="market-list-group">
            <view class="market-list-row"><text class="market-list-row__label">库存校验</text><text class="market-list-row__value">选择日期后由租赁报价接口确认</text></view>
            <view class="market-list-row"><text class="market-list-row__label">提前退租</text><text class="market-list-row__value">费用和违约规则以服务端合同为准</text></view>
            <view class="market-list-row"><text class="market-list-row__label">续租 / 买断</text><text class="market-list-row__value">需重新获取服务端报价</text></view>
            <view class="market-list-row"><text class="market-list-row__label">押金 / 赔付</text><text class="market-list-row__value">仅展示服务端状态，前端不冻结或结算</text></view>
          </view>
        </view>

        <view v-if="selectedPlan" class="market-fee-box">
          <view class="market-fee-row"><text>租金</text><text>¥ {{ money(selectedPlan.rent) }}</text></view>
          <view class="market-fee-row"><text>初始押金</text><text>¥ {{ money(selectedPlan.deposit) }}</text></view>
          <view class="market-fee-row total"><text>进入下单页确认</text><text>¥ {{ money(selectedPlan.rent + selectedPlan.deposit) }}</text></view>
          <text class="market-helper">这里只展示演示拆分。配送、保障、税费和真实总额以订单报价接口为准。</text>
        </view>

        <view class="market-bottom-actions"><view class="market-button market-button--secondary" @tap="go(`/pages/market/product-detail?id=${product.id}`)">返回商品</view><view class="market-button market-button--primary" :class="{ disabled: !selectedPlan }" @tap="confirmLease">确认租赁</view></view>
      </template>
      <view v-if="toast" class="market-toast">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import MarketModeNotice from './MarketModeNotice.vue'
import { getRouteOptions } from '../../shared/utils/route-options'
import { getMarketMode, getMarketService } from '../services'

export default {
  name: 'LeasePage', components: { AppPageShell, MarketModeNotice },
  data() { return { id: '', mode: getMarketMode(), service: getMarketService(), product: null, plans: [], selectedPlanId: '', state: 'loading', errorMessage: '', formError: '', toast: '', form: { startDate: '', endDate: '', delivery: 'pickup', protection: 'none' }, deliveryOptions: [{ label: '自提', value: 'pickup' }, { label: '配送', value: 'shipping' }], protectionOptions: [{ label: '不选择保障', value: 'none', enabled: true }, { label: '基础意外保障 ¥ 199', value: 'basic', enabled: true }, { label: '第三方延保（接入中）', value: 'extended', enabled: false }] } },
  computed: { selectedPlan() { return this.plans.find((item) => item.id === this.selectedPlanId) }, protectionLabel() { return this.protectionOptions.find((item) => item.value === this.form.protection)?.label || '不选择保障' } },
  mounted() { this.id = getRouteOptions().id || ''; this.load() },
  methods: {
    money(value) { return Number(value || 0).toLocaleString('zh-CN') },
    async load() { this.state = 'loading'; try { const [product, plans] = await Promise.all([this.service.getProduct(this.id), this.service.getRentalPlans(this.id)]); this.product = product; this.plans = plans; this.selectedPlanId = plans[0]?.id || ''; this.state = 'ready' } catch (error) { this.errorMessage = error.message || '请稍后重试'; this.state = 'error' } },
    selectPlan(plan) { this.selectedPlanId = plan.id; this.formError = '' },
    selectProtection(index) { const option = this.protectionOptions[index]; if (!option.enabled) return this.showToast('该保障服务尚未接入'); this.form.protection = option.value },
    confirmLease() { this.formError = ''; if (!this.selectedPlan) this.formError = '请选择租赁方案'; else if (!this.form.startDate || !this.form.endDate) this.formError = '请选择完整租赁日期'; else if (new Date(this.form.endDate) <= new Date(this.form.startDate)) this.formError = '结束日期必须晚于开始日期'; if (this.formError) return; const query = [`mode=checkout`, `id=${encodeURIComponent(this.product.id)}`, 'tradeType=lease', `planId=${encodeURIComponent(this.selectedPlan.id)}`, `startDate=${this.form.startDate}`, `endDate=${this.form.endDate}`, `delivery=${this.form.delivery}`, `protection=${this.form.protection}`].join('&'); this.go(`/pages/market/order?${query}`) },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2200) },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style src="../styles/market.css"></style>
