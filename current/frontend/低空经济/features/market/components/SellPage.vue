<template>
  <app-page-shell :title="isRental ? '发布租赁' : '发布出售'" active="market">
    <view class="market-screen market-stack">
      <market-mode-notice :mode="mode" />
      <view v-if="!loggedIn" class="market-state">
        <text class="market-state__title">登录后可发布</text>
        <text class="market-state__note">发布主体与认证要求由服务端校验，前端不会预设审核结论。</text>
        <view class="market-button market-button--primary" @tap="goLogin">去登录</view>
      </view>
      <template v-else>
        <view class="market-summary"><text class="market-summary__title">{{ isRental ? '出租设备信息' : '出售设备信息' }}</text><text class="market-summary__copy">提交后状态、可见范围和质检预约均以服务端返回为准。</text></view>
        <view v-if="eligibilityNote" class="market-mode-notice"><text>{{ eligibilityNote }}</text></view>
        <view v-if="progressItems.length" class="market-section"><view class="market-section__head"><text class="market-section__title">发布 / 质检 / 寄售进度</text><text class="market-section__note">服务端状态</text></view><view class="market-list-group"><view v-for="item in progressItems" :key="item.label" class="market-list-row"><text class="market-list-row__label">{{ item.label }}</text><text class="market-list-row__value">{{ item.value }}</text></view></view></view>
        <view class="market-section">
          <view class="market-form">
            <view class="market-field"><text class="market-field__label">品牌 *</text><input v-model.trim="form.brand" class="market-input" placeholder="例如 DJI" /></view>
            <view class="market-field"><text class="market-field__label">机型 *</text><picker :range="models" @change="chooseModel"><view class="market-select">{{ form.model || '选择机型或填写其他型号' }}</view></picker><input v-model.trim="form.model" class="market-input" placeholder="例如 Matrice 30T" /></view>
            <view class="market-field"><text class="market-field__label">SN *</text><view class="market-inline-input"><input v-model.trim="form.sn" class="market-input" placeholder="完整 SN 仅提交至服务端" /><text class="market-inline-action" @tap="scanSn">扫码</text></view></view>
            <view class="market-field"><text class="market-field__label">配置 *</text><textarea v-model.trim="form.configurationText" class="market-input market-textarea" placeholder="遥控器、电池、充电箱等，以换行分隔" /></view>
            <view class="market-field"><text class="market-field__label">{{ isRental ? '日租金' : '售价' }} *</text><input v-model="form.price" class="market-input" type="digit" placeholder="请输入金额" /></view>
            <view class="market-field"><text class="market-field__label">交付城市 *</text><input v-model.trim="form.city" class="market-input" placeholder="例如 北京" /></view>
            <view class="market-field"><text class="market-field__label">交付方式 *</text><view class="market-choice-row"><text v-for="item in deliveryOptions" :key="item.value" class="market-choice" :class="{ active: form.delivery.includes(item.value) }" @tap="toggleDelivery(item.value)">{{ item.label }}</text></view></view>
            <view class="market-field"><text class="market-field__label">照片 *</text><view class="market-actions"><view class="market-button market-button--secondary" @tap="choosePhotos">选择照片</view></view><view v-if="form.photos.length" class="market-photo-grid"><image v-for="item in form.photos" :key="item.localPath || item.url" :src="item.localPath || item.url" class="market-photo" mode="aspectFill" /></view><text class="market-helper">已上传 {{ uploadedCount }} / {{ form.photos.length }} 张{{ uploading ? '，正在上传' : '' }}；媒体地址由服务端签发。</text></view>
            <view class="market-field"><text class="market-field__label">说明 *</text><textarea v-model.trim="form.description" class="market-input market-textarea" placeholder="说明成色、维修记录、租赁规则或交付注意事项" /></view>
            <view class="market-field"><text class="market-field__label">质检预约</text><switch :checked="form.inspectionAppointment" color="#18b7a0" @change="form.inspectionAppointment = $event.detail.value" /><text class="market-helper">预约受理与质检状态由服务端返回。</text></view>
          </view>
          <text v-if="error" class="market-error-text">{{ error }}</text>
        </view>
        <view v-if="estimateText" class="market-fee-box"><text class="market-helper">估价结果（服务端返回）</text><text>{{ estimateText }}</text></view>
        <view class="market-bottom-actions"><view class="market-button market-button--secondary" :class="{ disabled: estimating }" @tap="estimate">{{ estimating ? '估价中...' : '获取估价' }}</view><view class="market-button market-button--primary" :class="{ disabled: submitting || uploading }" @tap="submit">{{ submitting ? '提交中...' : '提交发布' }}</view></view>
      </template>
      <view v-if="toast" class="market-toast">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import MarketModeNotice from './MarketModeNotice.vue'
import { getAuthState } from '../../../utils/auth'
import { guardedUrl } from '../../../utils/route-guard'
import { getMarketRouteOptions } from '../utils/route-options'
import { getMarketMode, getMarketService } from '../services'

const emptyForm = () => ({ brand: '', model: '', sn: '', configurationText: '', price: '', city: '', delivery: [], photos: [], description: '', inspectionAppointment: false })

export default {
  name: 'SellPage', components: { AppPageShell, MarketModeNotice },
  data() { return { mode: getMarketMode(), service: getMarketService(), isRental: false, loggedIn: getAuthState().loggedIn, eligibilityNote: '', form: emptyForm(), error: '', submitting: false, uploading: false, estimating: false, estimateText: '', progressItems: [], toast: '', models: ['Matrice 30T', 'Mavic 3 Enterprise', 'EVO Max 4T', '其他'], deliveryOptions: [{ label: '邮寄', value: 'shipping' }, { label: '自提', value: 'pickup' }] } },
  computed: { uploadedCount() { return this.form.photos.filter((item) => item.mediaId || item.url).length } },
  mounted() { this.isRental = getMarketRouteOptions().mode === 'lease'; this.loadEligibility() },
  methods: {
    async loadEligibility() { if (!this.loggedIn) return; try { const result = await this.service.getSellerEligibility(); this.eligibilityNote = result?.message || result?.note || '发布资格与认证规则以服务端校验结果为准。' } catch (_) { this.eligibilityNote = '暂未获取发布资格；提交时由服务端进行最终校验。' } },
    toggleDelivery(value) { this.form.delivery = this.form.delivery.includes(value) ? this.form.delivery.filter((item) => item !== value) : this.form.delivery.concat(value) },
    chooseModel(event) { const value = this.models[event.detail.value]; this.form.model = value === '其他' ? '' : value },
    scanSn() { uni.scanCode({ scanType: ['barCode', 'qrCode'], success: (result) => { this.form.sn = String(result.result || '').trim(); }, fail: (error) => { if (!/cancel/i.test(error?.errMsg || '')) this.error = '无法读取 SN，请手动输入' } }) },
    choosePhotos() { uni.chooseImage({ count: Math.max(1, 9 - this.form.photos.length), sourceType: ['album', 'camera'], success: (result) => { const files = (result.tempFilePaths || []).map((localPath) => ({ localPath })); this.form.photos = this.form.photos.concat(files).slice(0, 9); this.uploadPhotos(files) } }) },
    async uploadPhotos(files) { if (!files.length) return; this.uploading = true; this.error = ''; try { await Promise.all(files.map(async (file) => { const media = await this.service.uploadListingMedia(file.localPath); file.mediaId = media.id || ''; file.url = media.url || media.path || ''; if (!file.mediaId && !file.url) throw new Error('媒体上传未返回标识') })) } catch (error) { this.error = error.message || '媒体上传失败，请重试' } finally { this.uploading = false } },
    validate() {
      const form = this.form
      if (!form.brand || !form.model || !form.sn || !form.configurationText || !form.city || !form.description) return '请完整填写必填信息'
      if (!(Number(form.price) > 0)) return '请输入有效金额'
      if (!form.delivery.length) return '请选择至少一种交付方式'
      if (!form.photos.length) return '请至少选择一张设备照片'
      if (this.uploading || this.uploadedCount !== form.photos.length) return '请等待所有媒体上传完成'
      return ''
    },
    async estimate() { this.error = this.validateForEstimate(); if (this.error || this.estimating) return; this.estimating = true; try { const result = await this.service.estimateListing({ category: this.isRental ? 'rental' : 'drone', brand: this.form.brand, model: this.form.model, configuration: this.form.configurationText.split(/\n|,/).map((item) => item.trim()).filter(Boolean), city: this.form.city }); this.estimateText = result?.amount ? `¥ ${Number(result.amount).toLocaleString('zh-CN')}` : (result?.message || '服务端未返回估价金额') } catch (error) { this.error = error.message || '估价暂不可用' } finally { this.estimating = false } },
    validateForEstimate() { if (!this.form.brand || !this.form.model || !this.form.configurationText || !this.form.city) return '填写品牌、机型、配置和城市后可获取估价'; return '' },
    async submit() {
      if (!this.loggedIn) return this.goLogin()
      this.error = this.validate(); if (this.error || this.submitting) return
      this.submitting = true
      try {
        const result = await this.service.publishListing({ ...this.form, photos: this.form.photos.map((item) => item.mediaId || item.url), category: this.isRental ? 'rental' : 'drone', price: Number(this.form.price), configuration: this.form.configurationText.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })
        const id = result?.id || result?.listing_id
        if (id) this.loadProgress(id)
        this.toast = '发布申请已提交，状态以服务端返回为准'
        setTimeout(() => this.go(id ? `/pages/market/product-detail?id=${encodeURIComponent(id)}` : '/pages/market/index'), 900)
      } catch (err) { this.error = err.message || '提交失败，请稍后重试' } finally { this.submitting = false }
    },
    async loadProgress(id) { try { const result = await this.service.getListingProgress(id); const rows = Array.isArray(result?.items) ? result.items : (Array.isArray(result) ? result : []); this.progressItems = rows.map((item) => ({ label: item.label || item.name || '处理进度', value: item.status || item.value || '等待服务端返回' })) } catch (_) { this.progressItems = [] } },
    goLogin() { uni.navigateTo({ url: guardedUrl('login', '/pages/market/sell?mode=' + (this.isRental ? 'lease' : 'listing')) }) },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style src="../styles/market.css"></style>
