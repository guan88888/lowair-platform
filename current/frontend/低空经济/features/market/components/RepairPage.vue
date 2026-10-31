<template>
  <app-page-shell title="无人机维修" active="market">
    <view class="market-screen market-stack repair-screen">
      <view class="repair-intro">
        <image src="/static/images/lowair-market-accessories-thumb.webp" mode="aspectFill" aria-label="无人机维修与配件检测"></image>
        <view><text>检测、保养与寄修</text><text>服务商资质、报价和维修结论均以服务端及线下检测为准。</text></view>
      </view>

      <view class="repair-segment"><text :class="{ active: tab === 'providers' }" @tap="tab = 'providers'">找维修点</text><text :class="{ active: tab === 'bookings' }" @tap="openBookings">我的预约</text></view>

      <template v-if="tab === 'providers'">
        <view class="repair-search"><input v-model="filters.keyword" placeholder="搜索维修点或地址" @confirm="loadProviders" /><picker :range="cities" @change="selectCity"><view>{{ filters.city || '全部城市' }}⌄</view></picker><view @tap="loadProviders">搜索</view></view>
        <view v-if="loading" class="market-skeleton-grid"><view v-for="n in 3" :key="n" class="market-skeleton repair-skeleton"></view></view>
        <view v-else-if="error" class="market-state"><text class="market-state__title">维修服务加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="loadProviders">重试</view></view>
        <view v-else-if="!providers.length" class="market-state"><text class="market-state__title">暂无匹配维修点</text><text class="market-state__note">切换城市或减少搜索条件后再试。</text></view>
        <view v-else class="repair-list">
          <view v-for="provider in providers" :key="provider.id" class="repair-provider">
            <view class="repair-provider-head"><view><text>{{ provider.name }}</text><text>{{ provider.city }} {{ provider.district }}</text></view><text :class="['repair-verify', provider.verificationStatus]">{{ verificationText(provider.verificationStatus) }}</text></view>
            <text class="repair-address">{{ provider.address }}</text>
            <view class="repair-tags"><text v-for="service in provider.services" :key="service">{{ service }}</text></view>
            <view class="repair-source"><text>来源：{{ provider.source }}</text><text>{{ provider.contactMode }}</text></view>
            <view class="market-button market-button--primary" @tap="startBooking(provider)">预约检测</view>
          </view>
        </view>
      </template>

      <template v-else>
        <view v-if="loading" class="market-skeleton-grid"><view v-for="n in 2" :key="n" class="market-skeleton repair-skeleton"></view></view>
        <view v-else-if="error" class="market-state"><text class="market-state__title">预约记录加载失败</text><text class="market-state__note">{{ error }}</text><view class="market-button market-button--secondary" @tap="loadBookings">重试</view></view>
        <view v-else-if="!bookings.length" class="market-state"><text class="market-state__title">暂无维修预约</text><text class="market-state__note">选择维修点并提交设备故障信息后，会在这里查看受理进度。</text></view>
        <view v-else class="repair-list"><view v-for="item in bookings" :key="item.id" class="repair-booking"><view class="repair-provider-head"><view><text>{{ item.provider?.name || '维修服务商' }}</text><text>{{ item.brand }} {{ item.model }}</text></view><text class="repair-verify">{{ bookingStatus(item.status) }}</text></view><text class="repair-address">{{ item.issueType }} · {{ item.serviceMode }} · {{ formatDate(item.preferredDate) }}</text><text class="repair-source">预约编号 {{ item.id }} · 报价以检测后服务端结果为准</text></view></view>
      </template>
    </view>

    <view v-if="bookingProvider" class="repair-mask" @tap="bookingProvider = null"><view class="repair-sheet" @tap.stop>
      <text class="repair-sheet-title">预约 {{ bookingProvider.name }}</text>
      <view class="market-field"><text class="market-field__label">品牌</text><input v-model="form.brand" class="market-input" placeholder="例如 DJI" /></view>
      <view class="market-field"><text class="market-field__label">机型</text><input v-model="form.model" class="market-input" placeholder="例如 Mavic 3E" /></view>
      <view class="market-field"><text class="market-field__label">故障类型</text><picker :range="issueTypes" @change="form.issueType = issueTypes[$event.detail.value]"><view class="market-select">{{ form.issueType || '请选择' }}</view></picker></view>
      <view class="market-field"><text class="market-field__label">服务方式</text><picker :range="serviceModes" @change="form.serviceMode = serviceModes[$event.detail.value]"><view class="market-select">{{ form.serviceMode }}</view></picker></view>
      <view class="market-field"><text class="market-field__label">预约日期</text><picker mode="date" :start="minimumDate" @change="form.date = $event.detail.value"><view class="market-select">{{ form.date || '请选择日期' }}</view></picker></view>
      <view class="market-field"><text class="market-field__label">故障描述</text><textarea v-model="form.description" class="market-textarea" maxlength="2000" placeholder="描述异常、碰撞或进水情况，不要填写 SN 等敏感信息" /></view>
      <view class="market-actions"><view class="market-button market-button--secondary" @tap="bookingProvider = null">取消</view><view :class="['market-button market-button--primary', { disabled: submitting }]" @tap="submitBooking">{{ submitting ? '提交中' : '提交预约' }}</view></view>
    </view></view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'
import { getRouteOptions } from '../../shared/utils/route-options'
import { createRepairBooking, listRepairBookings, listRepairProviders } from '../services'

const freshForm = () => ({ brand: '', model: '', issueType: '', serviceMode: '到店', date: '', description: '' })

export default {
  name: 'RepairPage', components: { AppPageShell },
  data() { return { tab: 'providers', filters: { keyword: '', city: '', page: 1, pageSize: 20 }, cities: ['全部城市', '北京', '成都', '深圳', '杭州'], providers: [], bookings: [], loading: true, error: '', bookingProvider: null, form: freshForm(), issueTypes: ['无法开机', '云台异常', '飞控报警', '电池异常', '碰撞或进水', '周期保养', '其他'], serviceModes: ['到店', '寄修', '上门评估'], submitting: false } },
  computed: { minimumDate() { const date = new Date(Date.now() + 86400000); return date.toISOString().slice(0, 10) } },
  created() { const options = getRouteOptions(); if (options.tab === 'bookings' && getAuthState().loggedIn) { this.tab = 'bookings'; this.loadBookings() } else this.loadProviders() },
  methods: {
    verificationText(value) { return value === 'approved' ? '已核验' : value === 'rejected' ? '核验未通过' : '资质待核验' },
    bookingStatus(value) { return ({ submitted: '已提交', accepted: '已受理', diagnosing: '检测中', quoted: '待确认报价', repairing: '维修中', completed: '已完成', cancelled: '已取消' })[value] || value },
    formatDate(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '时间待确认' },
    selectCity(event) { const value = this.cities[event.detail.value]; this.filters.city = value === '全部城市' ? '' : value; this.loadProviders() },
    async loadProviders() { this.loading = true; this.error = ''; try { const result = await listRepairProviders(this.filters); this.providers = result.items } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    openBookings() { if (!getAuthState().loggedIn) return uni.navigateTo({ url: guardedUrl('login', '/pages/market/repair?tab=bookings') }); this.tab = 'bookings'; this.loadBookings() },
    async loadBookings() { this.loading = true; this.error = ''; try { const result = await listRepairBookings({ page: 1, pageSize: 30 }); this.bookings = result.items } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    startBooking(provider) { if (!getAuthState().loggedIn) return uni.navigateTo({ url: guardedUrl('login', '/pages/market/repair') }); this.bookingProvider = provider; this.form = freshForm() },
    async submitBooking() {
      if (this.submitting) return
      if (!this.form.brand.trim() || !this.form.model.trim() || !this.form.issueType || !this.form.date) return uni.showToast({ title: '请完整填写品牌、机型、故障和日期', icon: 'none' })
      this.submitting = true
      try {
        await createRepairBooking({ providerId: Number(this.bookingProvider.id), brand: this.form.brand.trim(), model: this.form.model.trim(), issueType: this.form.issueType, description: this.form.description.trim(), serviceMode: this.form.serviceMode, preferredDate: this.form.date + 'T09:00:00+08:00' })
        this.bookingProvider = null; this.tab = 'bookings'; await this.loadBookings(); uni.showToast({ title: '预约已提交', icon: 'none' })
      } catch (error) { uni.showToast({ title: error.message || '预约提交失败', icon: 'none' }) }
      finally { this.submitting = false }
    }
  }
}
</script>

<style scoped src="../styles/market.css"></style>
<style scoped>
.repair-intro { position: relative; min-height: 230rpx; overflow: hidden; border-radius: 8px; background: var(--surface); }.repair-intro image { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .42; }.repair-intro::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,20,34,.94), rgba(4,20,34,.54)); }.repair-intro > view { position: relative; z-index: 1; display: flex; min-height: 230rpx; max-width: 72%; flex-direction: column; justify-content: center; gap: 12rpx; padding: 24rpx; box-sizing: border-box; }.repair-intro text:first-child { color: #edf7f8; font-size: 34rpx; font-weight: 750; }.repair-intro text:last-child { color: #c1d2d8; font-size: 21rpx; line-height: 1.55; }.repair-segment { display: grid; grid-template-columns: repeat(2,1fr); padding: 5rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.repair-segment text { padding: 14rpx; color: var(--muted); font-size: 23rpx; text-align: center; }.repair-segment text.active { border-radius: 6px; background: var(--surface-strong); color: var(--accent); font-weight: 700; }.repair-search { display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: 10rpx; }.repair-search input, .repair-search picker, .repair-search > view { min-width: 0; height: 68rpx; padding: 0 14rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface); color: var(--text); font-size: 21rpx; }.repair-search picker > view, .repair-search > view { display: flex; align-items: center; justify-content: center; }.repair-search > view { border-color: var(--accent); color: var(--accent); }.repair-list { display: flex; flex-direction: column; gap: 14rpx; }.repair-provider, .repair-booking { display: flex; flex-direction: column; gap: 13rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.repair-provider-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }.repair-provider-head > view { min-width: 0; display: flex; flex-direction: column; gap: 5rpx; }.repair-provider-head > view text:first-child { color: var(--text); font-size: 26rpx; font-weight: 700; }.repair-provider-head > view text:last-child, .repair-address, .repair-source { color: var(--muted); font-size: 19rpx; line-height: 1.5; }.repair-verify { flex: none; color: #e5b66d; font-size: 18rpx; }.repair-verify.approved { color: var(--accent); }.repair-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }.repair-tags text { padding: 7rpx 10rpx; border: 1rpx solid var(--line); border-radius: 5px; color: var(--text); font-size: 18rpx; }.repair-source { display: flex; justify-content: space-between; gap: 12rpx; padding-top: 12rpx; border-top: 1rpx solid var(--line); }.repair-skeleton { height: 260rpx; }.repair-mask { position: fixed; z-index: 90; inset: 0; display: flex; align-items: flex-end; background: rgba(2,14,23,.72); }.repair-sheet { width: 100%; max-height: 88%; overflow-y: auto; display: flex; flex-direction: column; gap: 16rpx; padding: 26rpx 24rpx calc(28rpx + env(safe-area-inset-bottom)); box-sizing: border-box; border-radius: 12px 12px 0 0; background: var(--app-bg); }.repair-sheet-title { color: var(--text); font-size: 29rpx; font-weight: 750; }
</style>
