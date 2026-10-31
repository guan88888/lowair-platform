<template>
  <app-page-shell title="低空社区" active="community" root :city="city" :theme="theme" :locale="locale" @city="showCity = true">
    <view class="community-screen">
      <view class="community-toolbar">
        <view class="community-search" @tap="go('/pages/search/index?scope=community')"><text>搜索话题、飞行日志与问答</text></view>
        <text class="community-toolbar-action" @tap="go('/pages/community/publish')">发布</text>
      </view>

      <view class="community-tabs">
        <text v-for="tab in tabs" :key="tab" class="community-tab" :class="{ active: activeTab === tab }" @tap="changeTab(tab)">{{ tab }}</text>
      </view>

      <view class="community-panel feed-entry">
        <view class="feed-avatar">林</view>
        <text class="community-muted" @tap="go('/pages/community/publish')">分享飞行经验、提问或项目记录</text>
        <text class="community-link" @tap="go('/pages/community/publish')">去发布</text>
      </view>

      <view class="feature-links">
        <view class="community-panel feature-link" @tap="go('/pages/community/knowledge')"><text>知识库</text><text>核对来源状态</text></view>
        <view class="community-panel feature-link" @tap="go('/pages/community/live')"><text>直播</text><text>预告、直播、回放</text></view>
        <view class="community-panel feature-link" @tap="go('/pages/community/nearby')"><text>附近飞场</text><text>先授权，再按城市回退</text></view>
      </view>

      <view v-if="refreshing || (loading && !posts.length)" class="community-loading">
        <view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view>
        <text>{{ refreshing ? '正在刷新信息流' : '正在加载信息流' }}</text>
      </view>
      <view v-else-if="error && !posts.length" class="community-error"><text class="community-state-title">信息流加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="refreshFeed">重新加载</view></view>
      <view v-else-if="!posts.length" class="community-empty"><text class="community-state-title">当前频道暂无内容</text><text>可以切换频道或发布第一条动态。</text><view class="community-button" @tap="go('/pages/community/publish')">发布动态</view></view>

      <post-card
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :ai-enabled="aiEnabled"
        @open="openPost"
        @manage="managePost"
        @like="toggleReaction($event, 'like')"
        @save="toggleReaction($event, 'save')"
        @comment="openComment"
        @ai="loadAiSuggestion"
        @close-ai="closeAiSuggestion"
        @report-ai="openReport('ai', $event.aiSuggestion?.id || $event.id)"
      />

      <view v-if="loading && posts.length" class="community-loading compact"><text>正在加载更多内容</text></view>
      <view v-else-if="hasMore && posts.length" class="community-button secondary load-more" @tap="loadMore">加载更多</view>
      <text v-else-if="posts.length" class="feed-end">已显示当前频道全部内容</text>

      <view class="community-panel ai-control">
        <view><text class="community-label">社区 AI 建议</text><text class="community-help">可关闭、可举报，仅作为讨论线索。</text></view>
        <switch :checked="aiEnabled" color="#19cfa0" @change="toggleAi" />
      </view>
    </view>

    <view v-if="commentTarget" class="community-sheet-mask" @tap="commentTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">评论 {{ commentTarget.author.name }} 的动态</text><view class="community-field"><text class="community-label">评论内容</text><textarea v-model="commentText" class="community-textarea" maxlength="300" placeholder="写下友善、具体的回复" /></view><view class="community-actions-row"><view class="community-button secondary" @tap="commentTarget = null">取消</view><view class="community-button" @tap="submitComment">发表评论</view></view></view></view>
    <view v-if="manageTarget" class="community-sheet-mask" @tap="manageTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">内容操作</text><text v-if="manageTarget.owner" class="community-sheet-option danger" @tap="confirmDelete">删除我的动态</text><text v-else class="community-sheet-option" @tap="openReport('post', manageTarget.id)">举报动态</text><text class="community-sheet-option" @tap="manageTarget = null">取消</text></view></view>
    <view v-if="reportTarget" class="community-sheet-mask" @tap="reportTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择举报原因</text><text v-for="reason in reportReasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportTarget = null">取消</text></view></view>
    <view v-if="showCity" class="community-sheet-mask" @tap="showCity = false"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择城市</text><text v-for="item in cities" :key="item" class="community-sheet-option" @tap="selectCity(item)">{{ item }}</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import PostCard from './PostCard.vue'
import { addPostComment, deletePost, getCommunityAiSuggestion, listPosts, reportCommunityTarget, updatePostReaction } from '../services'

export default {
  name: 'CommunityPage',
  components: { AppPageShell, PostCard },
  data() {
    return {
      tabs: ['推荐', '关注', '同城', '机型圈', '官方'], activeTab: '推荐', posts: [], cursor: '', hasMore: true, loading: false, refreshing: false, error: '',
      city: '北京', cities: ['北京', '天津', '石家庄', '成都'], showCity: false, theme: 'ocean', locale: 'zh', aiEnabled: true,
      commentTarget: null, commentText: '', manageTarget: null, reportTarget: null, reportReasons: ['不实或误导信息', '危险飞行引导', '骚扰或不友善内容', '广告与垃圾信息'], toast: ''
    }
  },
  created() {
    this.restorePreferences()
    this.refreshFeed()
  },
  methods: {
    restorePreferences() {
      const theme = uni.getStorageSync('lowair-demo-theme')
      const locale = uni.getStorageSync('lowair-demo-locale')
      const city = uni.getStorageSync('lowair-community-city')
      const aiEnabled = uni.getStorageSync('lowair-community-ai-enabled')
      if (theme) this.theme = theme
      if (locale) this.locale = locale
      if (city) this.city = city
      if (aiEnabled !== '') this.aiEnabled = Boolean(aiEnabled)
    },
    go(url) { uni.navigateTo({ url }) },
    async changeTab(tab) { if (tab === this.activeTab) return; this.activeTab = tab; await this.refreshFeed() },
    async refreshFeed() {
      if (this.refreshing) return
      this.refreshing = true
      this.error = ''
      try {
        const result = await listPosts({ tab: this.activeTab, cursor: '', limit: 3 })
        this.posts = result.items
        this.cursor = result.nextCursor
        this.hasMore = result.hasMore
      } catch (error) { this.error = error.message || '请检查网络后重试' }
      finally { this.refreshing = false }
    },
    async loadMore() {
      if (this.loading || !this.hasMore) return
      this.loading = true
      this.error = ''
      try {
        const result = await listPosts({ tab: this.activeTab, cursor: this.cursor, limit: 3 })
        this.posts = [...this.posts, ...result.items]
        this.cursor = result.nextCursor
        this.hasMore = result.hasMore
      } catch (error) { this.showToast(error.message || '加载失败，请重试') }
      finally { this.loading = false }
    },
    openPost(post) { this.go('/pages/community/post-detail?id=' + encodeURIComponent(post.id)) },
    async toggleReaction(post, type) {
      try {
        const active = type === 'like' ? !post.liked : !post.saved
        const updated = await updatePostReaction(post.id, type, active)
        Object.assign(post, updated)
      } catch (error) { this.showToast(error.message) }
    },
    openComment(post) { this.commentTarget = post; this.commentText = '' },
    async submitComment() {
      if (!this.commentText.trim()) return this.showToast('请输入评论内容')
      try {
        await addPostComment(this.commentTarget.id, this.commentText)
        this.commentTarget.stats.comments += 1
        this.commentTarget = null
        this.commentText = ''
        this.showToast('评论已发布')
      } catch (error) { this.showToast(error.message) }
    },
    managePost(post) { this.manageTarget = post },
    confirmDelete() {
      const post = this.manageTarget
      uni.showModal({ title: '删除动态', content: '删除后不可在社区中恢复，确认删除吗？', confirmColor: '#d48745', success: async (result) => {
        if (!result.confirm) return
        try { await deletePost(post.id); this.posts = this.posts.filter((item) => item.id !== post.id); this.showToast('动态已删除') } catch (error) { this.showToast(error.message) }
        this.manageTarget = null
      } })
    },
    async loadAiSuggestion(post) {
      try { post.aiSuggestion = await getCommunityAiSuggestion(post) } catch (error) { this.showToast(error.message) }
    },
    closeAiSuggestion(post) { post.aiSuggestion = null },
    toggleAi(event) {
      this.aiEnabled = event.detail.value
      uni.setStorageSync('lowair-community-ai-enabled', this.aiEnabled)
      if (!this.aiEnabled) this.posts.forEach((post) => { post.aiSuggestion = null })
    },
    openReport(type, id) { this.manageTarget = null; this.reportTarget = { type, id } },
    async submitReport(reason) {
      try { await reportCommunityTarget({ targetType: this.reportTarget.type, targetId: this.reportTarget.id, reason }); this.reportTarget = null; this.showToast('举报已提交，平台将按规则处理') } catch (error) { this.showToast(error.message) }
    },
    selectCity(city) { this.city = city; uni.setStorageSync('lowair-community-city', city); this.showCity = false },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.feed-entry { display: flex; align-items: center; gap: 14rpx; }.feed-entry .community-muted { min-width: 0; flex: 1; }.feed-avatar { display: flex; width: 56rpx; height: 56rpx; flex: 0 0 56rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 50%; color: var(--accent); font-size: 23rpx; }.feature-links { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14rpx; margin-bottom: 2rpx; }.feature-link { min-width: 0; display: flex; min-height: 114rpx; flex-direction: column; justify-content: space-between; margin-bottom: 0; }.feature-link:first-child { grid-row: span 2; min-height: 242rpx; background: var(--surface-strong); }.feature-link text:first-child { color: var(--text); font-size: 26rpx; font-weight: 700; }.feature-link text:last-child { color: var(--muted); font-size: 20rpx; line-height: 1.45; }.compact { padding: 22rpx; }.load-more { margin: 8rpx 0 22rpx; }.feed-end { display: block; margin: 20rpx 0 28rpx; color: var(--muted); font-size: 21rpx; text-align: center; }.ai-control { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }.ai-control view { display: flex; flex-direction: column; gap: 5rpx; }.danger { color: #f2b456; }
</style>
