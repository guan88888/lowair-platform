<template>
  <app-page-shell title="内容详情" active="community" :theme="theme" :locale="locale">
    <view class="community-screen">
      <view v-if="loading" class="community-loading"><view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view><text>正在按内容 id 加载</text></view>
      <view v-else-if="error" class="community-error"><text class="community-state-title">无法打开这条内容</text><text>{{ error }}</text><view class="community-button secondary" @tap="loadPost">重试</view></view>
      <template v-else-if="post">
        <post-card :post="post" :ai-enabled="aiEnabled" @manage="managePost" @like="toggleReaction('like')" @save="toggleReaction('save')" @comment="focusComment" @ai="loadAiSuggestion" @close-ai="post.aiSuggestion = null" @report-ai="openReport('ai', post.aiSuggestion?.id || post.id)" />

        <view class="community-notice">动态中的风险区、飞场和空域描述仅用于交流，不能充当飞行许可。飞行前仍需核对主管部门要求、实时状态和现场条件。</view>

        <view class="community-panel comments-panel">
          <view class="comments-head"><text class="community-section-title">评论</text><text class="community-muted">{{ post.stats.comments }} 条</text></view>
          <view v-if="post.comments && post.comments.length" class="comment-list">
            <view v-for="comment in post.comments" :key="comment.id" class="comment-row">
              <view><text class="comment-author">{{ comment.author }}</text><text class="community-muted">{{ comment.createdAt }}</text></view>
              <text class="comment-content">{{ comment.content }}</text>
              <text class="comment-report" @tap="openReport('comment', comment.id)">举报</text>
            </view>
          </view>
          <view v-else class="comment-empty"><text>还没有可展示的评论</text><text>可以提出具体问题或补充可靠来源。</text></view>
          <view class="comment-composer">
            <text class="community-label">发表评论</text>
            <textarea ref="commentInput" v-model="commentText" class="community-textarea" maxlength="300" placeholder="写下友善、具体的回复" />
            <view class="community-button" :class="{ disabled: commenting }" @tap="submitComment">{{ commenting ? '发布中' : '发表评论' }}</view>
          </view>
        </view>

        <view class="community-panel ai-setting"><view><text class="community-label">社区 AI 建议</text><text class="community-help">默认沿用社区设置，可随时关闭并举报。</text></view><switch :checked="aiEnabled" color="#19cfa0" @change="toggleAi" /></view>
      </template>
    </view>

    <view v-if="showManage" class="community-sheet-mask" @tap="showManage = false"><view class="community-sheet" @tap.stop><text class="community-sheet-title">内容操作</text><text v-if="post && post.owner" class="community-sheet-option danger" @tap="confirmDelete">删除我的动态</text><text v-else class="community-sheet-option" @tap="openReport('post', post.id)">举报动态</text><text class="community-sheet-option" @tap="showManage = false">取消</text></view></view>
    <view v-if="reportTarget" class="community-sheet-mask" @tap="reportTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">选择举报原因</text><text v-for="reason in reportReasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportTarget = null">取消</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import PostCard from './PostCard.vue'
import { addPostComment, deletePost, getCommunityAiSuggestion, getPostById, reportCommunityTarget, updatePostReaction } from '../services'
import { getRouteOptions } from '../../shared/utils/route-options'

export default {
  name: 'CommunityPostDetailPage',
  components: { AppPageShell, PostCard },
  data() {
    return { postId: '', post: null, loading: true, commenting: false, error: '', commentText: '', showManage: false, reportTarget: null, reportReasons: ['不实或误导信息', '危险飞行引导', '骚扰或不友善内容', '广告与垃圾信息'], aiEnabled: true, theme: 'ocean', locale: 'zh', toast: '' }
  },
  created() {
    this.postId = String(getRouteOptions().id || '')
    const theme = uni.getStorageSync('lowair-demo-theme')
    const locale = uni.getStorageSync('lowair-demo-locale')
    const aiEnabled = uni.getStorageSync('lowair-community-ai-enabled')
    if (theme) this.theme = theme
    if (locale) this.locale = locale
    if (aiEnabled !== '') this.aiEnabled = Boolean(aiEnabled)
    this.loadPost()
  },
  methods: {
    async loadPost() {
      this.loading = true
      this.error = ''
      try {
        if (!this.postId) throw new Error('链接缺少内容 id')
        const post = await getPostById(this.postId)
        if (!post) throw new Error('内容不存在、已删除或你无权查看')
        this.post = post
      } catch (error) { this.post = null; this.error = error.message || '加载失败' }
      finally { this.loading = false }
    },
    managePost() { this.showManage = true },
    async toggleReaction(type) {
      try {
        const active = type === 'like' ? !this.post.liked : !this.post.saved
        this.post = await updatePostReaction(this.post.id, type, active)
      } catch (error) { this.showToast(error.message) }
    },
    focusComment() { this.showToast('可在下方发表评论') },
    async submitComment() {
      if (this.commenting) return
      if (!this.commentText.trim()) return this.showToast('请输入评论内容')
      this.commenting = true
      try {
        const comment = await addPostComment(this.post.id, this.commentText)
        this.post.comments = [...(this.post.comments || []), comment]
        this.post.stats.comments += 1
        this.commentText = ''
        this.showToast('评论已发布')
      } catch (error) { this.showToast(error.message) }
      finally { this.commenting = false }
    },
    confirmDelete() {
      uni.showModal({ title: '删除动态', content: '删除后不可在社区中恢复，确认删除吗？', confirmColor: '#d48745', success: async (result) => {
        if (!result.confirm) return
        try { await deletePost(this.post.id); uni.navigateBack() } catch (error) { this.showToast(error.message) }
      } })
    },
    async loadAiSuggestion() {
      try { this.post.aiSuggestion = await getCommunityAiSuggestion(this.post) } catch (error) { this.showToast(error.message) }
    },
    toggleAi(event) { this.aiEnabled = event.detail.value; uni.setStorageSync('lowair-community-ai-enabled', this.aiEnabled); if (!this.aiEnabled) this.post.aiSuggestion = null },
    openReport(type, id) { this.showManage = false; this.reportTarget = { type, id } },
    async submitReport(reason) {
      try { await reportCommunityTarget({ targetType: this.reportTarget.type, targetId: this.reportTarget.id, reason }); this.reportTarget = null; this.showToast('举报已提交，平台将按规则处理') } catch (error) { this.showToast(error.message) }
    },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.comments-head { display: flex; align-items: center; justify-content: space-between; }.comments-head .community-section-title { margin-bottom: 0; }.comment-list { margin-top: 12rpx; }.comment-row { position: relative; padding: 20rpx 0; border-top: 1rpx solid var(--line); }.comment-row > view { display: flex; align-items: center; gap: 12rpx; }.comment-author { color: var(--text); font-size: 23rpx; font-weight: 700; }.comment-content { display: block; padding: 12rpx 70rpx 0 0; color: var(--text); font-size: 23rpx; line-height: 1.55; }.comment-report { position: absolute; right: 0; bottom: 20rpx; color: var(--muted); font-size: 20rpx; }.comment-empty { display: flex; flex-direction: column; gap: 7rpx; padding: 34rpx 0; color: var(--muted); font-size: 22rpx; text-align: center; }.comment-composer { display: flex; flex-direction: column; gap: 12rpx; padding-top: 18rpx; border-top: 1rpx solid var(--line); }.comment-composer .community-textarea { min-height: 150rpx; }.ai-setting { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }.ai-setting > view { display: flex; flex-direction: column; gap: 5rpx; }.danger { color: #f2b456; }
</style>
