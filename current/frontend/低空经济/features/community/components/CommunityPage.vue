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

      <view class="topic-board">
        <view class="topic-board-head"><view><text>低空专题板块</text><text>按行业主题进入长期讨论</text></view><text @tap="go('/pages/community/knowledge')">知识库 ›</text></view>
        <scroll-view scroll-x class="topic-scroll" :show-scrollbar="false"><view class="topic-row">
          <view v-for="topic in topicBoards" :key="topic.name" class="topic-item" @tap="openTopic(topic)"><text class="topic-mark">{{ topic.mark }}</text><view><text>{{ topic.name }}</text><text>{{ topic.note }}</text></view><text class="topic-arrow">›</text></view>
        </view></scroll-view>
      </view>

      <view class="community-dock">
        <view @tap="go('/pages/community/publish')"><text class="dock-mark">发</text><text>发布</text></view>
        <view @tap="go('/pages/community/knowledge')"><text class="dock-mark">知</text><text>知识</text></view>
        <view @tap="go('/pages/community/live')"><text class="dock-mark">播</text><text>直播</text></view>
        <view @tap="go('/pages/community/nearby')"><text class="dock-mark">图</text><text>低空地图</text></view>
      </view>

      <view class="feed-heading"><view><text>{{ activeTab === '发现' ? '精选飞行笔记' : activeTab + '内容' }}</text><text>图片记录与深度讨论混合呈现</text></view><text @tap="refreshFeed">刷新</text></view>

      <view v-if="refreshing || (loading && !posts.length)" class="community-loading">
        <view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view>
        <text>{{ refreshing ? '正在刷新信息流' : '正在加载信息流' }}</text>
      </view>
      <view v-else-if="error && !posts.length" class="community-error"><text class="community-state-title">信息流加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="refreshFeed">重新加载</view></view>
      <view v-else-if="!posts.length" class="community-empty"><text class="community-state-title">当前频道暂无内容</text><text>可以切换频道或发布第一条动态。</text><view class="community-button" @tap="go('/pages/community/publish')">发布动态</view></view>

      <view class="community-masonry">
        <post-card
          v-for="post in posts"
          :key="post.id"
          :post="post"
          variant="masonry"
          :ai-enabled="aiEnabled"
          :can-manage="canOpenMenu(post)"
          @open="openPost"
          @manage="managePost"
          @like="toggleReaction($event, 'like')"
          @save="toggleReaction($event, 'save')"
          @comment="openComment"
          @share="share"
          @ai="loadAiSuggestion"
          @close-ai="closeAiSuggestion"
          @report-ai="openReport('ai', $event.aiSuggestion?.id || $event.id)"
        />
      </view>

      <view v-if="loading && posts.length" class="community-loading compact"><text>正在加载更多内容</text></view>
      <view v-else-if="hasMore && posts.length" class="community-button secondary load-more" @tap="loadMore">加载更多</view>
      <text v-else-if="posts.length" class="feed-end">已显示当前频道全部内容</text>

      <view class="community-panel ai-control">
        <view><text class="community-label">社区 AI 建议</text><text class="community-help">可关闭、可举报，仅作为讨论线索。</text></view>
        <switch :checked="aiEnabled" color="#19cfa0" @change="toggleAi" />
      </view>
    </view>

    <view v-if="commentTarget" class="community-sheet-mask" @tap="commentTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">评论 {{ commentTarget.author.name }} 的动态</text><view class="community-field"><text class="community-label">评论内容</text><textarea v-model="commentText" class="community-textarea" maxlength="300" placeholder="写下友善、具体的回复" /></view><view class="community-actions-row"><view class="community-button secondary" @tap="commentTarget = null">取消</view><view class="community-button" @tap="submitComment">发表评论</view></view></view></view>
    <view v-if="manageTarget" class="community-sheet-mask" @tap="manageTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">内容操作</text><text v-if="canDelete(manageTarget)" class="community-sheet-option danger" @tap="confirmDelete">{{ manageTarget.permissions?.moderate ? '管理员删除动态' : '删除我的动态' }}</text><text v-if="manageTarget.permissions?.report" class="community-sheet-option" @tap="openReport('post', manageTarget.id)">举报动态</text><text class="community-sheet-option" @tap="manageTarget = null">取消</text></view></view>
    <view v-if="reportTarget" class="community-sheet-mask" @tap="reportTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择举报原因</text><text v-for="reason in reportReasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportTarget = null">取消</text></view></view>
    <view v-if="showCity" class="community-sheet-mask" @tap="showCity = false"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择城市</text><text v-for="item in cities" :key="item" class="community-sheet-option" @tap="selectCity(item)">{{ item }}</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import PostCard from './PostCard.vue'
import { addPostComment, deletePost, getCommunityAiSuggestion, listPosts, reportCommunityTarget, sharePost, updatePostReaction } from '../services'
import { getAuthState } from '../../../utils/auth'
import { requirePermission } from '../../../utils/route-guard'

export default {
  name: 'CommunityPage',
  components: { AppPageShell, PostCard },
  data() {
    return {
      tabs: ['发现', '关注', '同城', '机型圈', '官方'], activeTab: '发现', posts: [], cursor: '', hasMore: true, loading: false, refreshing: false, error: '',
      topicBoards: [{ name: '飞行安全', mark: '安', note: '法规、空域与事故复盘' }, { name: '航拍作品', mark: '影', note: '作品、参数与后期交流' }, { name: '设备维修', mark: '修', note: '故障、保养与验机经验' }, { name: 'CAAC备考', mark: '考', note: '学考经验与错题讨论' }],
      city: '北京', cities: ['北京', '天津', '石家庄', '成都'], showCity: false, theme: 'ocean', locale: 'zh', aiEnabled: true,
      auth: getAuthState(), commentTarget: null, commentText: '', manageTarget: null, reportTarget: null, reportReasons: ['不实或误导信息', '危险飞行引导', '骚扰或不友善内容', '广告与垃圾信息'], toast: ''
    }
  },
  created() {
    this.restorePreferences()
    this.refreshFeed()
  },
  onPullDownRefresh() { this.refreshFeed().finally(() => uni.stopPullDownRefresh?.()) },
  onReachBottom() { this.loadMore() },
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
    go(url) { if (url.includes('/community/publish') && !this.requireLogin()) return; uni.navigateTo({ url }) },
    openTopic(topic) { uni.navigateTo({ url: '/pages/search/index?scope=community&keyword=' + encodeURIComponent(topic.name) }) },
    async changeTab(tab) { if (tab === this.activeTab) return; this.activeTab = tab; await this.refreshFeed() },
    async refreshFeed() {
      if (this.refreshing) return
      this.refreshing = true
      this.error = ''
      try {
        const result = await listPosts({ tab: this.activeTab, city: this.city, cursor: '', limit: 6 })
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
        const result = await listPosts({ tab: this.activeTab, city: this.city, cursor: this.cursor, limit: 6 })
        this.posts = [...this.posts, ...result.items]
        this.cursor = result.nextCursor
        this.hasMore = result.hasMore
      } catch (error) { this.showToast(error.message || '加载失败，请重试') }
      finally { this.loading = false }
    },
    openPost(post) { this.go('/pages/community/post-detail?id=' + encodeURIComponent(post.id)) },
    async toggleReaction(post, type) {
      if (!this.requireLogin()) return
      if (post.permissions?.[type] === false) return this.showToast('当前账号没有此操作权限')
      try {
        const active = type === 'like' ? !post.liked : !post.saved
        const result = await updatePostReaction(post.id, type, active)
        if (result.post) Object.assign(post, result.post)
        else await this.refreshFeed()
      } catch (error) { this.showToast(error.message) }
    },
    async share(post) {
      if (!this.requireLogin()) return
      if (post.permissions?.share === false) return this.showToast('当前账号没有分享权限')
      try {
        const result = await sharePost(post.id)
        if (result.post) Object.assign(post, result.post)
        const url = '/pages/community/post-detail?id=' + encodeURIComponent(post.id)
        uni.setClipboardData({ data: url, success: () => this.showToast('链接已复制，可分享给同事') })
      } catch (error) { this.showToast(error.message || '分享失败') }
    },
    openComment(post) { if (!this.requireLogin()) return; if (post.permissions?.comment === false) return this.showToast('当前账号没有评论权限'); this.commentTarget = post; this.commentText = '' },
    async submitComment() {
      if (!this.commentText.trim()) return this.showToast('请输入评论内容')
      try {
        const result = await addPostComment(this.commentTarget.id, this.commentText)
        if (result.post) Object.assign(this.commentTarget, result.post)
        else await this.refreshFeed()
        this.commentTarget = null
        this.commentText = ''
        this.showToast('评论已发布')
      } catch (error) { this.showToast(error.message) }
    },
    managePost(post) { if (!this.requireLogin()) return; this.manageTarget = post },
    confirmDelete() {
      const post = this.manageTarget
      uni.showModal({ title: '删除动态', content: '删除后不可在社区中恢复，确认删除吗？', confirmColor: '#d48745', success: async (result) => {
        if (!result.confirm) return
        try { await deletePost(post.id); this.posts = this.posts.filter((item) => item.id !== post.id); this.showToast('动态已删除') } catch (error) { this.showToast(error.message) }
        this.manageTarget = null
      } })
    },
    async loadAiSuggestion(post) {
      if (!this.requireLogin()) return
      try { post.aiSuggestion = await getCommunityAiSuggestion(post) } catch (error) { this.showToast(error.message) }
    },
    closeAiSuggestion(post) { post.aiSuggestion = null },
    toggleAi(event) {
      this.aiEnabled = event.detail.value
      uni.setStorageSync('lowair-community-ai-enabled', this.aiEnabled)
      if (!this.aiEnabled) this.posts.forEach((post) => { post.aiSuggestion = null })
    },
    openReport(type, id) { if (!this.requireLogin()) return; this.manageTarget = null; this.reportTarget = { type, id } },
    async submitReport(reason) {
      try { await reportCommunityTarget({ targetType: this.reportTarget.type, targetId: this.reportTarget.id, reason }); this.reportTarget = null; this.showToast('举报已提交，平台将按规则处理') } catch (error) { this.showToast(error.message) }
    },
    selectCity(city) { this.city = city; uni.setStorageSync('lowair-community-city', city); this.showCity = false; this.refreshFeed() },
    canDelete(post) { return Boolean(post?.permissions?.delete) },
    canOpenMenu(post) { return this.auth.loggedIn && Boolean(post?.permissions?.delete || post?.permissions?.report || post?.permissions?.moderate) },
    requireLogin() { this.auth = getAuthState(); return requirePermission('login') },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.topic-board { margin-bottom: 18rpx; padding: 18rpx 0; border-top: 1rpx solid var(--line); border-bottom: 1rpx solid var(--line); }.topic-board-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 2rpx 14rpx; color: var(--text); }.topic-board-head > view { display: flex; flex-direction: column; gap: 4rpx; }.topic-board-head > view text:first-child { font-size: 25rpx; font-weight: 700; }.topic-board-head > view text:last-child { color: var(--muted); font-size: 18rpx; }.topic-board-head > text { color: var(--accent); font-size: 20rpx; }.topic-scroll { white-space: nowrap; }.topic-row { display: inline-flex; gap: 12rpx; padding-right: 20rpx; }.topic-item { display: grid; width: 300rpx; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 12rpx; padding: 16rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface); }.topic-mark { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border-radius: 6px; background: rgba(25,207,160,.12); color: var(--accent); font-weight: 800; }.topic-item view { min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }.topic-item view text:first-child { color: var(--text); font-size: 22rpx; font-weight: 700; }.topic-item view text:last-child { overflow: hidden; color: var(--muted); font-size: 17rpx; text-overflow: ellipsis; white-space: nowrap; }.topic-arrow { color: var(--muted); font-size: 28rpx; }.community-dock { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); margin-bottom: 20rpx; padding: 16rpx 8rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.community-dock > view { display: flex; flex-direction: column; align-items: center; gap: 8rpx; color: var(--text); font-size: 20rpx; }.dock-mark { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border: 1rpx solid rgba(25,207,160,.42); border-radius: 6px; color: var(--accent); font-size: 21rpx; font-weight: 700; }.feed-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18rpx; margin: 24rpx 2rpx 14rpx; }.feed-heading > view { display: flex; flex-direction: column; gap: 4rpx; }.feed-heading > view text:first-child { color: var(--text); font-size: 27rpx; font-weight: 750; }.feed-heading > view text:last-child { color: var(--muted); font-size: 18rpx; }.feed-heading > text { color: var(--accent); font-size: 20rpx; }.community-masonry { columns: 2; column-gap: 14rpx; }.community-masonry :deep(.post-card) { break-inside: avoid; margin: 0 0 14rpx; }.compact { padding: 22rpx; }.load-more { margin: 8rpx 0 22rpx; }.feed-end { display: block; margin: 20rpx 0 28rpx; color: var(--muted); font-size: 21rpx; text-align: center; }.ai-control { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }.ai-control view { display: flex; flex-direction: column; gap: 5rpx; }.danger { color: #f2b456; } @media (min-width: 900px) { .community-masonry { columns: 3; } }
</style>
