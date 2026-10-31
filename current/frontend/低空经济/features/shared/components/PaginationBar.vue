<template>
  <view v-if="hasMore" class="pagination-bar" role="button" tabindex="0" @tap="$emit('load-more')" @keyup.enter="$emit('load-more')" @keyup.space.prevent="$emit('load-more')">{{ t('加载更多') }}</view>
</template>

<script>
import { translate } from '../../../data/localization'

export default {
  name: 'PaginationBar',
  emits: ['load-more'],
  props: { hasMore: { type: Boolean, default: false }, locale: { type: String, default: 'zh' } },
  methods: { t(value) { return translate(value, this.locale) } }
}
</script>

<style scoped>
.pagination-bar { display: flex; min-height: 88rpx; align-items: center; justify-content: center; padding: 0 24rpx; color: var(--accent); font-size: 24rpx; text-align: center; white-space: nowrap; }.pagination-bar:active { transform: scale(.98); }.pagination-bar:focus-visible { outline: 4rpx solid var(--focus-ring, var(--accent)); outline-offset: -4rpx; }
</style>
