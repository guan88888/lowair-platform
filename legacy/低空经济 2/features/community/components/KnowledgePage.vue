<template>
  <app-page-shell title="低空知识库" active="community" :theme="theme" :locale="locale">
    <view class="community-screen">
      <view class="community-notice">知识内容必须区分法规原文、官方整理和用户经验。来源状态用于判断核验路径，不代表平台替用户作出飞行决策。</view>
      <view class="community-toolbar"><view class="community-search"><input v-model="keyword" class="knowledge-search-input" confirm-type="search" placeholder="搜索法规、百科与经验" /></view></view>
      <view class="community-tabs"><text v-for="tab in tabs" :key="tab.key" class="community-tab" :class="{ active: activeType === tab.key }" @tap="changeType(tab.key)">{{ tab.label }}</text></view>

      <view v-if="loading" class="community-loading"><view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view><text>正在加载知识来源</text></view>
      <view v-else-if="error" class="community-error"><text class="community-state-title">知识库加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="loadItems">重新加载</view></view>
      <view v-else-if="!filteredItems.length" class="community-empty"><text class="community-state-title">没有匹配内容</text><text>可以修改关键词或切换来源类型。</text></view>
      <view v-else class="knowledge-list">
        <view v-for="item in filteredItems" :key="item.id" class="community-panel knowledge-card">
          <view class="knowledge-head"><text :class="['source-mark', item.sourceType]">{{ sourceLabel(item.sourceType) }}</text><text :class="['community-status', item.verified ? 'success' : 'warning']">{{ item.sourceStatus }}</text></view>
          <text class="knowledge-title">{{ item.title }}</text>
          <text class="knowledge-summary">{{ item.summary }}</text>
          <view class="knowledge-meta"><text>{{ item.sourceName }}</text><text>{{ item.updatedAt }}</text></view>
          <view class="knowledge-actions"><text @tap="showSource(item)">查看来源说明</text><text @tap="openReport(item)">举报或纠错</text></view>
        </view>
      </view>
    </view>
    <view v-if="sourceItem" class="community-sheet-mask" @tap="sourceItem = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">来源说明</text><view class="source-detail"><text class="community-label">{{ sourceItem.title }}</text><text>来源类型：{{ sourceLabel(sourceItem.sourceType) }}</text><text>来源主体：{{ sourceItem.sourceName }}</text><text>当前状态：{{ sourceItem.sourceStatus }}</text><text>更新时间：{{ sourceItem.updatedAt }}</text><text v-if="sourceItem.sourceType === 'regulation'">后端接入法规原文 URL 和版本号前，页面不会伪造可点击原文链接。</text><text v-else-if="sourceItem.sourceType === 'user'">用户内容需要独立核验，不得标记为法规或官方结论。</text></view><view class="community-button" @tap="sourceItem = null">知道了</view></view></view>
    <view v-if="reportItem" class="community-sheet-mask" @tap="reportItem = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">举报或纠错</text><text v-for="reason in reasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportItem = null">取消</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { listKnowledge, reportCommunityTarget } from '../services'

export default {
  name: 'CommunityKnowledgePage',
  components: { AppPageShell },
  data() { return { tabs: [{ key: 'all', label: '全部' }, { key: 'regulation', label: '法规原文' }, { key: 'official', label: '官方整理' }, { key: 'user', label: '用户经验' }], activeType: 'all', keyword: '', items: [], loading: true, error: '', sourceItem: null, reportItem: null, reasons: ['来源链接失效', '内容与原文不符', '状态标注有误', '存在危险或误导信息'], theme: 'ocean', locale: 'zh', toast: '' } },
  computed: {
    filteredItems() { const term = this.keyword.trim().toLowerCase(); return term ? this.items.filter((item) => [item.title, item.summary, item.sourceName].join(' ').toLowerCase().includes(term)) : this.items }
  },
  created() { this.restorePreferences(); this.loadItems() },
  methods: {
    restorePreferences() { const theme = uni.getStorageSync('lowair-demo-theme'); const locale = uni.getStorageSync('lowair-demo-locale'); if (theme) this.theme = theme; if (locale) this.locale = locale },
    sourceLabel(type) { return { regulation: '法规', official: '官方', user: '用户' }[type] || '来源' },
    async changeType(type) { this.activeType = type; await this.loadItems() },
    async loadItems() { this.loading = true; this.error = ''; try { this.items = await listKnowledge({ type: this.activeType }) } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    showSource(item) { this.sourceItem = item },
    openReport(item) { this.reportItem = item },
    async submitReport(reason) { try { await reportCommunityTarget({ targetType: 'knowledge', targetId: this.reportItem.id, reason }); this.reportItem = null; this.showToast('已提交，平台将核对来源与状态') } catch (error) { this.showToast(error.message) } },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.knowledge-search-input { width: 100%; color: var(--text); font-size: 23rpx; }.knowledge-head { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; }.source-mark { padding: 7rpx 11rpx; border-radius: 6px; color: var(--accent); background: rgba(25, 207, 160, .08); font-size: 20rpx; font-weight: 700; }.source-mark.regulation { color: #80c5ff; background: rgba(128, 197, 255, .08); }.source-mark.user { color: var(--muted); background: var(--surface-strong); }.knowledge-title { display: block; margin-top: 18rpx; color: var(--text); font-size: 28rpx; font-weight: 700; line-height: 1.42; }.knowledge-summary { display: block; margin-top: 11rpx; color: var(--muted); font-size: 23rpx; line-height: 1.58; }.knowledge-meta { display: flex; justify-content: space-between; gap: 16rpx; margin-top: 16rpx; color: var(--muted); font-size: 19rpx; }.knowledge-actions { display: flex; gap: 24rpx; margin-top: 18rpx; padding-top: 15rpx; border-top: 1rpx solid var(--line); color: var(--accent); font-size: 21rpx; }.source-detail { display: flex; flex-direction: column; gap: 13rpx; margin-bottom: 24rpx; color: var(--muted); font-size: 23rpx; line-height: 1.55; }
</style>
