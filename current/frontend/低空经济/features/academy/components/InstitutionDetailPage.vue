<template>
  <academy-layout ref="layout" title="机构详情">
    <view v-if="loading" class="academy-skeleton detail-skeleton" />
    <view v-else-if="error" class="academy-state"><text class="academy-state__title">无法打开机构详情</text><text class="academy-state__note">{{ error }}</text><view class="academy-button academy-button--secondary" @tap="load">重新加载</view></view>
    <template v-else-if="institution">
      <view class="detail-cover"><image v-if="!imageFailed" :src="institution.image" mode="aspectFill" @error="imageFailed = true" /><view v-else class="detail-cover__placeholder"><text>无人机培训场地</text></view><view class="detail-cover__scrim" /><view class="detail-cover__copy"><text class="academy-tag" :class="institution.verified ? 'academy-tag--accent' : 'academy-tag--warn'">{{ institution.verified ? '培训资质已核验' : '部分材料待复核' }}</text><text class="detail-cover__title">{{ institution.name }}</text><text>{{ institution.tagline }}</text></view></view>
      <view class="academy-metrics"><view class="academy-metric"><text class="academy-metric__value">{{ institution.rating }}</text><text class="academy-metric__label">学员评分</text></view><view class="academy-metric"><text class="academy-metric__value">{{ institution.courses.length }}</text><text class="academy-metric__label">在售课程</text></view><view class="academy-metric"><text class="academy-metric__value">{{ institution.coaches.length }}</text><text class="academy-metric__label">教练资料</text></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">课程与试听</text></view><view class="academy-list"><view v-for="course in institution.courses" :key="course.id" class="academy-row"><view class="academy-row__main"><text class="academy-row__title">{{ course.name }}</text><text class="academy-row__note">{{ course.level }} · {{ course.schedule }} · {{ course.duration }}</text><text class="course-price">￥{{ course.price }}</text></view><view class="academy-button academy-button--small" :class="{ 'academy-button--disabled': !course.trial }" @tap="course.trial && book(course.id)">{{ course.trial ? '预约试听' : '暂不可约' }}</view></view></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">资质与数据说明</text></view><view class="academy-panel"><text class="detail-line">{{ institution.qualification }}</text><text class="detail-line">过考率：{{ institution.passRate ? institution.passRate + '%' : '暂无可核验数据' }}</text><text class="academy-source">数据来源：{{ institution.passRateSource }}。平台不会将机构自报数据标记为官方数据。</text></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">教练团队</text></view><view class="coach-grid"><view v-for="coach in institution.coaches" :key="coach.name" class="academy-panel"><text class="coach-name">{{ coach.name }}</text><text class="coach-title">{{ coach.title }}</text><text class="academy-section__note">{{ coach.experience }}</text></view></view></view>
      <view class="academy-section"><view class="academy-section__head"><text class="academy-section__title">场地与联系</text></view><view class="academy-panel"><text class="detail-line">{{ institution.address }}</text><view class="facility-row"><text v-for="facility in institution.facilities" :key="facility" class="academy-tag">{{ facility }}</text></view><text class="academy-source">{{ institution.phonePolicy }}</text></view></view>
      <view class="detail-bottom"><view class="academy-button academy-button--secondary" @tap="message">平台内咨询</view><view class="academy-button" @tap="book('')">预约试听</view></view>
    </template>
    <view v-else class="academy-state"><text class="academy-state__title">无法打开机构详情</text><text class="academy-state__note">机构信息暂不可用，请稍后重试。</text><view class="academy-button academy-button--secondary" @tap="load">重新加载</view></view>
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import { academyService } from '../services'
import { getAcademyRouteOptions } from '../utils/route-options'
export default {
  name: 'InstitutionDetailPage', components: { AcademyLayout },
  data() { return { loading: true, error: '', institution: null, imageFailed: false, id: getAcademyRouteOptions('institutionDetail').id || '' } },
  mounted() { this.load() },
  methods: {
    async load() { this.loading = true; this.error = ''; this.imageFailed = false; if (!this.id) { this.error = '缺少机构标识，无法加载对应机构'; this.loading = false; return } try { this.institution = await academyService.getInstitution(this.id) } catch (error) { this.error = error.message } finally { this.loading = false } },
    book(courseId) { uni.navigateTo({ url: `/pages/academy/visit?institutionId=${this.institution.id}${courseId ? '&courseId=' + courseId : ''}` }) },
    message() { uni.navigateTo({ url: `/pages/messages/index?category=academy&institutionId=${this.institution.id}` }) }
  }
}
</script>

<style scoped>
.detail-skeleton { min-height: 520rpx; }.detail-cover { position: relative; overflow: hidden; height: 360rpx; margin-bottom: 18rpx; border-radius: 16rpx; }.detail-cover image { width: 100%; height: 100%; }.detail-cover__placeholder { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--surface-strong); color: var(--muted); font-size: 24rpx; }.detail-cover__scrim { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(3,20,31,.92), rgba(3,20,31,.08)); }.detail-cover__copy { position: absolute; left: 26rpx; right: 26rpx; bottom: 26rpx; display: flex; flex-direction: column; align-items: flex-start; gap: 10rpx; color: #b8ccd5; font-size: 23rpx; }.detail-cover__title { color: #edf7f8; font-size: 38rpx; font-weight: 760; }.course-price { color: var(--accent); font-size: 24rpx; font-weight: 700; }.detail-line { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 23rpx; }.facility-row { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 18rpx; }.coach-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; }.coach-name { display: block; color: var(--text); font-size: 27rpx; font-weight: 700; }.coach-title { display: block; margin: 5rpx 0; color: var(--accent); font-size: 21rpx; }.detail-bottom { position: sticky; bottom: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; padding: 16rpx 0; background: var(--app-bg); }
</style>
