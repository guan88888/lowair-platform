<template>
  <academy-layout ref="layout" title="试听预约">
    <view v-if="loading" class="academy-skeleton" />
    <view v-else-if="loadError" class="academy-state"><text class="academy-state__title">预约信息加载失败</text><text class="academy-state__note">{{ loadError }}</text><view class="academy-button academy-button--secondary" @tap="load">重新加载</view></view>
    <template v-else>
      <view class="academy-section"><view class="academy-section__head"><view><text class="academy-section__title">{{ editingId ? '改期试听' : '预约试听' }}</text><text class="academy-section__note">预约成功、改期和取消都会生成站内通知</text></view></view>
        <view class="academy-panel">
          <view class="academy-field"><text class="academy-label">培训机构</text><picker range-key="name" :range="institutions" @change="pickInstitution"><view class="academy-select">{{ selectedInstitution?.name || '请选择机构' }}</view></picker><text v-if="errors.institutionId" class="academy-error">{{ errors.institutionId }}</text></view>
          <view class="academy-field"><text class="academy-label">试听课程</text><picker range-key="name" :range="availableCourses" @change="pickCourse"><view class="academy-select">{{ selectedCourse?.name || '到校后再确定' }}</view></picker></view>
          <view class="form-grid"><view class="academy-field"><text class="academy-label">体验课日期</text><picker mode="date" :start="today" :value="form.date" @change="form.date = $event.detail.value"><view class="academy-select">{{ form.date || '选择日期' }}</view></picker><text v-if="errors.date" class="academy-error">{{ errors.date }}</text></view><view class="academy-field"><text class="academy-label">可选时段</text><picker :range="slots" @change="form.slot = slots[Number($event.detail.value)]"><view class="academy-select">{{ form.slot || '选择时段' }}</view></picker><text v-if="errors.slot" class="academy-error">{{ errors.slot }}</text></view></view>
          <view class="form-grid"><view class="academy-field"><text class="academy-label">到访人数</text><picker :range="partySizes" @change="form.partySize = partySizes[Number($event.detail.value)]"><view class="academy-select">{{ form.partySize }} 人</view></picker><text v-if="errors.partySize" class="academy-error">{{ errors.partySize }}</text></view><view class="academy-field"><text class="academy-label">联系人姓名</text><input v-model="form.name" class="academy-input" placeholder="填写真实姓名" placeholder-class="academy-placeholder" /><text v-if="errors.name" class="academy-error">{{ errors.name }}</text></view></view>
          <view class="academy-field"><text class="academy-label">联系电话</text><input v-model="form.phone" class="academy-input" type="number" maxlength="11" placeholder="用于确认本次到访安排" placeholder-class="academy-placeholder" /><text class="academy-helper">仅向本次预约机构提供必要联系信息</text><text v-if="errors.phone" class="academy-error">{{ errors.phone }}</text></view>
          <view class="consent" @tap="form.consent = !form.consent"><text class="check-box" :class="{ checked: form.consent }">{{ form.consent ? '✓' : '' }}</text><text>同意将以上信息用于本次试听预约和变更通知</text></view><text v-if="errors.consent" class="academy-error consent-error">{{ errors.consent }}</text>
          <view class="academy-actions form-actions"><view class="academy-button academy-button--secondary" @tap="saveDraft">保存草稿</view><view class="academy-button" :class="{ 'academy-button--disabled': submitting }" @tap="submit">{{ submitting ? '提交中' : (editingId ? '确认改期' : '提交预约') }}</view></view>
        </view>
      </view>

      <view class="academy-section"><view class="academy-section__head"><view><text class="academy-section__title">我的预约</text><text class="academy-section__note">有效预约支持改期和取消</text></view></view><view v-if="!visits.length" class="academy-state"><text class="academy-state__title">暂无预约</text><text class="academy-state__note">填写上方信息即可预约试听</text></view><view v-else class="academy-list"><view v-for="visit in visits" :key="visit.id" class="academy-row visit-row"><view class="academy-row__main"><view class="visit-title"><text class="academy-row__title">{{ visit.institutionName }}</text><text class="academy-tag" :class="statusTone(visit.status)">{{ statusLabel(visit.status) }}</text></view><text class="academy-row__note">{{ visit.date }} · {{ visit.slot }} · {{ visit.partySize }} 人</text><text class="visit-notice">{{ visit.notification }}</text></view><view v-if="visit.status !== 'cancelled'" class="visit-actions"><text class="academy-link" @tap="editVisit(visit)">改期</text><text class="cancel-link" @tap="requestCancel(visit)">取消</text></view></view></view></view>
    </template>
    <confirm-dialog :visible="Boolean(cancelTarget)" title="取消试听预约" message="取消后原时段不再保留。如仍需到访，请重新提交预约。" @cancel="cancelTarget = null" @confirm="confirmCancel" />
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import ConfirmDialog from '../../shared/components/ConfirmDialog.vue'
import { academyService, validateVisit } from '../services'
import { getRouteOptions } from '../../shared/utils/route-options'
const blankForm = () => ({ institutionId: '', courseId: '', date: '', slot: '', partySize: 1, name: '', phone: '', consent: false })
export default {
  name: 'VisitPage', components: { AcademyLayout, ConfirmDialog },
  data() { const options = getRouteOptions(); return { loading: true, loadError: '', submitting: false, institutions: [], visits: [], editingId: '', cancelTarget: null, errors: {}, today: new Date().toISOString().slice(0, 10), slots: ['09:30-10:30', '14:00-15:00', '16:00-17:00'], partySizes: [1, 2, 3, 4, 5, 6], form: { ...blankForm(), institutionId: options.institutionId || '', courseId: options.courseId || '' } } },
  computed: { selectedInstitution() { return this.institutions.find((item) => item.id === this.form.institutionId) }, availableCourses() { return this.selectedInstitution?.courses || [] }, selectedCourse() { return this.availableCourses.find((item) => item.id === this.form.courseId) } },
  mounted() { this.load() },
  methods: {
    async load() { this.loading = true; this.loadError = ''; try { const [institutionResult, visits] = await Promise.all([academyService.listInstitutions({ page: 1, pageSize: 20 }), academyService.getVisits()]); this.institutions = institutionResult.items; this.visits = visits; const draft = uni.getStorageSync('lowair-academy-visit-draft'); if (draft && !this.form.institutionId) this.form = { ...blankForm(), ...draft } } catch (error) { this.loadError = error.message } finally { this.loading = false } },
    pickInstitution(event) { const institution = this.institutions[Number(event.detail.value)]; this.form.institutionId = institution.id; this.form.courseId = '' },
    pickCourse(event) { this.form.courseId = this.availableCourses[Number(event.detail.value)]?.id || '' },
    saveDraft() { uni.setStorageSync('lowair-academy-visit-draft', this.form); this.$refs.layout.showToast('预约草稿已保存到本机') },
    async submit() { const checked = validateVisit(this.form); this.errors = checked.errors; if (!checked.valid) return this.$refs.layout.showToast(Object.values(checked.errors)[0]); this.submitting = true; try { if (this.editingId) await academyService.rescheduleVisit(this.editingId, checked.value); else await academyService.createVisit(checked.value); uni.removeStorageSync('lowair-academy-visit-draft'); this.$refs.layout.showToast(this.editingId ? '改期已提交，等待机构确认' : '预约已提交，通知已写入消息记录'); this.form = blankForm(); this.editingId = ''; this.visits = await academyService.getVisits() } catch (error) { this.errors = error.fields || {}; this.$refs.layout.showToast(error.message) } finally { this.submitting = false } },
    editVisit(visit) { this.editingId = visit.id; this.form = { institutionId: visit.institutionId, courseId: visit.courseId || '', date: visit.date, slot: visit.slot, partySize: visit.partySize, name: visit.name, phone: visit.phone, consent: true }; this.errors = {}; this.$refs.layout.showToast('已载入原预约，请选择新日期或时段') },
    requestCancel(visit) { this.cancelTarget = visit },
    async confirmCancel() { const id = this.cancelTarget.id; this.cancelTarget = null; try { await academyService.cancelVisit(id, '用户主动取消'); this.visits = await academyService.getVisits(); this.$refs.layout.showToast('预约已取消，站内通知已更新') } catch (error) { this.$refs.layout.showToast(error.message) } },
    statusLabel(status) { return { pending: '待确认', confirmed: '已确认', rescheduled: '改期待确认', cancelled: '已取消' }[status] || status },
    statusTone(status) { return status === 'confirmed' ? 'academy-tag--accent' : status === 'cancelled' ? 'academy-tag--danger' : 'academy-tag--warn' }
  }
}
</script>

<style scoped>
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }.consent { display: flex; align-items: flex-start; gap: 12rpx; color: var(--muted); font-size: 21rpx; }.check-box { flex: 0 0 auto; display: flex; width: 38rpx; height: 38rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 8rpx; }.check-box.checked { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }.consent-error { display: block; margin-top: 7rpx; }.form-actions { justify-content: flex-end; margin-top: 24rpx; }.visit-row { align-items: flex-start; }.visit-title { display: flex; align-items: center; flex-wrap: wrap; gap: 9rpx; }.visit-notice { color: var(--accent); font-size: 20rpx; }.visit-actions { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 16rpx; }.cancel-link { color: var(--academy-danger); font-size: 22rpx; }
</style>
