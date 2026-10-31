<template><CommunityPage ref="community" /></template>
<script>
import CommunityPage from '../../features/community/components/CommunityPage.vue'

export default {
  components: { CommunityPage },
  onPullDownRefresh() { this.$refs.community?.refreshFeed().finally(() => uni.stopPullDownRefresh?.()) },
  onReachBottom() { this.$refs.community?.loadMore() }
}
</script>
