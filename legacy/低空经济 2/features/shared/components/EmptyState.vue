<template>
  <view class="empty-state" role="status"><text class="empty-state__title">{{ t(title) }}</text><text v-if="note" class="empty-state__note">{{ t(note) }}</text></view>
</template>

<script>
import { translate } from '../../../data/localization'

export default {
  name: 'EmptyState',
  props: { title: { type: String, default: '暂无内容' }, note: { type: String, default: '' }, locale: { type: String, default: 'zh' } },
  methods: { t(value) { return translate(value, this.locale) } }
}
</script>

<style scoped>
.empty-state { display: flex; flex-direction: column; gap: 12rpx; padding: 48rpx 28rpx; color: var(--muted); text-align: center; }.empty-state__title, .empty-state__note { overflow-wrap: anywhere; }.empty-state__title { color: var(--text); font-size: 28rpx; font-weight: 650; }.empty-state__note { font-size: 24rpx; line-height: 1.55; }
</style>
