<template>
  <view class="community-panel community-card post-card" :class="'post-card-' + variant">
    <view class="post-head">
      <view class="post-avatar">{{ post.author.avatar }}</view>
      <view class="post-author">
        <view class="post-name-row"><text class="post-name">{{ post.author.name }}</text><text v-if="post.author.official" class="community-status success">官方</text></view>
        <text class="community-muted">{{ post.createdAt }} · #{{ post.topic }} · {{ post.visibility }}</text>
      </view>
      <text v-if="canManage" class="post-more" @tap.stop="$emit('manage', post)">•••</text>
    </view>
    <text v-if="post.title" class="post-title" @tap="$emit('open', post)">{{ post.title }}</text>
    <text class="post-content" @tap="$emit('open', post)">{{ post.content }}</text>
    <view v-if="post.media && post.media.length" class="post-media" @tap="$emit('open', post)">
      <image v-if="post.media[0].type !== 'video'" class="post-image" :src="post.media[0].url" mode="aspectFill"></image>
      <view v-else class="post-video"><image class="post-image" :src="post.media[0].poster || post.media[0].url" mode="aspectFill"></image><text class="post-play">播放视频</text></view>
    </view>
    <view class="post-actions">
      <text class="community-action" :class="{ active: post.liked }" @tap.stop="$emit('like', post)">{{ post.liked ? '已赞' : '点赞' }} {{ post.stats.likes }}</text>
      <text class="community-action" @tap.stop="$emit('comment', post)">评论 {{ post.stats.comments }}</text>
      <text class="community-action" :class="{ active: post.saved }" @tap.stop="$emit('save', post)">{{ post.saved ? '已收藏' : '收藏' }}</text>
      <text class="community-action" @tap.stop="$emit('share', post)">分享 {{ post.stats.shares || 0 }}</text>
      <text v-if="aiEnabled" class="community-action ai" @tap.stop="$emit('ai', post)">AI 建议</text>
    </view>
    <view v-if="post.aiSuggestion" class="post-ai">
      <view class="post-ai-head"><text>AI 建议</text><view><text @tap="$emit('report-ai', post)">举报</text><text @tap="$emit('close-ai', post)">关闭</text></view></view>
      <text>{{ post.aiSuggestion.content }}</text>
      <text class="post-ai-note">{{ post.aiSuggestion.disclaimer }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CommunityPostCard',
  props: {
    post: { type: Object, required: true },
    aiEnabled: { type: Boolean, default: true },
    canManage: { type: Boolean, default: false },
    variant: { type: String, default: 'feed' }
  },
  emits: ['open', 'manage', 'like', 'save', 'comment', 'share', 'ai', 'close-ai', 'report-ai']
}
</script>

<style scoped>
.post-head { display: flex; align-items: center; gap: 12rpx; }.post-avatar { display: flex; width: 58rpx; height: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface-strong); color: var(--accent); font-size: 23rpx; font-weight: 750; }.post-author { min-width: 0; flex: 1; }.post-name-row { display: flex; align-items: center; gap: 9rpx; }.post-name { color: var(--text); font-size: 25rpx; font-weight: 700; }.post-name-row .community-status { padding: 2rpx 7rpx; font-size: 17rpx; }.post-more { padding: 8rpx; color: var(--muted); font-size: 24rpx; letter-spacing: 2rpx; }.post-title { display: block; margin-top: 15rpx; color: var(--text); font-size: 27rpx; font-weight: 750; line-height: 1.4; }.post-content { display: block; margin: 12rpx 0 17rpx; color: var(--text); font-size: 25rpx; line-height: 1.65; white-space: pre-line; }.post-media, .post-video { position: relative; overflow: hidden; border-radius: 7px; }.post-image { display: block; width: 100%; height: 310rpx; background: var(--surface-strong); }.post-play { position: absolute; left: 18rpx; bottom: 18rpx; padding: 8rpx 14rpx; border-radius: 999px; background: rgba(3, 17, 27, .82); color: #f4fafb; font-size: 21rpx; }.post-actions { display: flex; flex-wrap: wrap; gap: 22rpx; margin-top: 18rpx; color: var(--muted); font-size: 22rpx; }.community-action { transition: transform .16s ease, color .16s ease; }.community-action.active, .community-action.ai { color: var(--accent); }.community-action.ai { margin-left: auto; }.post-ai { display: flex; flex-direction: column; gap: 9rpx; margin-top: 17rpx; padding: 15rpx; border-left: 4rpx solid var(--accent); border-radius: 0 7px 7px 0; background: rgba(25, 207, 160, .07); color: var(--muted); font-size: 22rpx; line-height: 1.55; }.post-ai-head { display: flex; align-items: center; justify-content: space-between; color: var(--accent); }.post-ai-head view { display: flex; gap: 18rpx; color: var(--muted); font-size: 20rpx; }.post-ai-note { font-size: 19rpx; }.post-card-masonry { display: flex; flex-direction: column; padding: 0 0 15rpx; overflow: hidden; }.post-card-masonry .post-media { order: -1; border-radius: 0; }.post-card-masonry .post-image { height: 260rpx; }.post-card-masonry .post-head, .post-card-masonry .post-title, .post-card-masonry .post-content, .post-card-masonry .post-actions, .post-card-masonry .post-ai { margin-left: 14rpx; margin-right: 14rpx; }.post-card-masonry .post-head { margin-top: 14rpx; }.post-card-masonry .post-avatar { width: 42rpx; height: 42rpx; flex-basis: 42rpx; font-size: 18rpx; }.post-card-masonry .post-name { font-size: 21rpx; }.post-card-masonry .post-author .community-muted { display: none; }.post-card-masonry .post-title { margin-top: 11rpx; font-size: 23rpx; }.post-card-masonry .post-content { display: -webkit-box; overflow: hidden; margin-top: 8rpx; margin-bottom: 10rpx; font-size: 21rpx; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }.post-card-masonry .post-actions { gap: 12rpx; margin-top: 7rpx; font-size: 19rpx; }.post-card-masonry .community-action:nth-child(n+4) { display: none; }
</style>
