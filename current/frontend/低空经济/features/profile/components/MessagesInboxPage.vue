<template>
  <app-page-shell title="消息中心" :active="''" :theme="theme" :locale="locale" @annotate="showToast">
    <view class="messages-page">
      <view class="page-tools">
        <view>
          <text class="page-kicker">站内会话</text>
          <text class="page-note">号码与敏感资料由后端授权并脱敏返回</text>
        </view>
        <view class="tool-actions">
          <text class="tool-link" @tap="refresh">刷新</text>
          <text class="tool-link danger" @tap="askClear">清空</text>
        </view>
      </view>

      <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
        <view class="category-row">
          <text v-for="item in categories" :key="item.key" class="category" :class="{ active: category === item.key }" @tap="selectCategory(item.key)">
            {{ item.label }}<text v-if="item.key === 'all' && unreadTotal" class="count">{{ unreadTotal }}</text><text v-else-if="unreadByCategory[item.key]" class="count">{{ unreadByCategory[item.key] }}</text>
          </text>
        </view>
      </scroll-view>

      <view v-if="listLoading && !conversations.length" class="list-skeleton"><view v-for="i in 4" :key="i" class="skeleton-row"></view></view>
      <error-state v-else-if="listError && !conversations.length" :message="listError" @retry="loadConversations(true)" />
      <empty-state v-else-if="!conversations.length" title="暂无会话" note="新的系统通知、交易、学考、工作或社区消息会显示在这里。" />
      <view v-else class="conversation-list">
        <view v-for="conversation in conversations" :key="conversation.id" class="conversation" :class="{ selected: selectedConversation && selectedConversation.id === conversation.id }" @tap="openConversation(conversation)">
          <view class="conversation-avatar"><text>{{ conversation.avatarText }}</text></view>
          <view class="conversation-copy"><view class="conversation-head"><text class="conversation-title">{{ conversation.title }}</text><text class="conversation-time">{{ formatDate(conversation.updatedAt) }}</text></view><text class="conversation-preview">{{ conversation.preview }}</text><view class="conversation-foot"><text class="category-label">{{ categoryLabel(conversation.category) }}</text><text v-if="conversation.statusLabel" class="state-label">{{ conversation.statusLabel }}</text></view></view>
          <view class="conversation-actions"><text v-if="conversation.unread" class="unread-dot">{{ conversation.unread > 99 ? '99+' : conversation.unread }}</text><text class="delete-link" @tap.stop="askDelete(conversation)">删除</text></view>
        </view>
        <view v-if="listError" class="inline-error"><text>{{ listError }}</text><text @tap="loadConversations(false)">重试</text></view>
        <view v-if="page.hasMore" class="load-more" @tap="loadConversations(false)">{{ listLoading ? '加载中…' : '加载更多' }}</view>
      </view>

      <view v-if="selectedConversation" class="conversation-panel">
        <view class="panel-head"><view><text class="panel-title">{{ selectedConversation.title }}</text><text class="panel-source">{{ categoryLabel(selectedConversation.category) }} · 对方信息已脱敏</text></view><text class="close-link" @tap="closeConversation">关闭</text></view>
        <view v-if="detailLoading" class="detail-loading"><view v-for="i in 3" :key="i" class="skeleton-message"></view></view>
        <error-state v-else-if="detailError" :message="detailError" @retry="loadConversation(selectedConversation.id)" />
        <empty-state v-else-if="!messages.length" title="暂无消息" note="可以发送一条平台内消息开始沟通。" />
        <scroll-view v-else scroll-y class="message-thread" :scroll-into-view="lastMessageAnchor">
          <view v-for="message in messages" :id="'message-' + message.id" :key="message.id" class="message-row" :class="{ mine: message.mine }">
            <view class="message-bubble"><image v-if="message.type === 'image' && message.mediaUrl" :src="message.mediaUrl" mode="widthFix" class="message-image"></image><text v-else>{{ message.body }}</text><text class="message-meta">{{ formatDate(message.createdAt) }} · {{ message.mine ? (message.read ? '已读' : '已送达') : '已读回执' }}</text></view>
          </view>
        </scroll-view>
        <view class="composer"><text class="image-button" @tap="chooseImage">图片</text><input v-model="draft" class="composer-input" maxlength="2000" placeholder="输入平台内消息" placeholder-class="placeholder" confirm-type="send" @confirm="sendText" /><text class="send-button" :class="{ disabled: sending || !draft.trim() }" @tap="sendText">发送</text></view>
      </view>

      <confirm-dialog :visible="confirmAction === 'clear'" title="清空会话" message="清空后仅影响当前账号的会话列表，消息删除不可恢复。是否继续？" @cancel="confirmAction = ''" @confirm="clearAll" />
      <confirm-dialog :visible="Boolean(conversationToDelete)" title="删除会话" message="删除后无法在本端恢复，关联订单或任务不会被删除。是否继续？" @cancel="conversationToDelete = null" @confirm="deleteSelectedConversation" />
      <view v-if="toast" class="toast" aria-live="polite">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ConfirmDialog from '../../shared/components/ConfirmDialog.vue'
import EmptyState from '../../shared/components/EmptyState.vue'
import ErrorState from '../../shared/components/ErrorState.vue'
import { formatDateTime } from '../../shared/utils/formatters'
import { getRouteOptions } from '../../shared/utils/route-options'
import { clearConversations, deleteConversation, getConversation, listMessages, markConversationRead, sendConversationMessage, uploadConversationImage } from '../services'

const categoryNames = { all: '全部', system: '系统', market: '交易', academy: '学考', work: '工作', community: '社区' }

export default {
  name: 'MessagesInboxPage',
  components: { AppPageShell, ConfirmDialog, EmptyState, ErrorState },
  data() {
    return {
      theme: uni.getStorageSync('lowair-demo-theme') || 'ocean', locale: uni.getStorageSync('lowair-demo-locale') || 'zh',
      categories: Object.keys(categoryNames).map((key) => ({ key, label: categoryNames[key] })), category: 'all',
      conversations: [], unreadTotal: 0, unreadByCategory: {}, page: { page: 0, hasMore: false }, listLoading: false, listError: '',
      selectedConversation: null, messages: [], detailLoading: false, detailError: '', draft: '', sending: false, lastMessageAnchor: '',
      confirmAction: '', conversationToDelete: null, toast: '', toastTimer: null
    }
  },
  mounted() {
    const options = getRouteOptions()
    if (options.category && Object.prototype.hasOwnProperty.call(categoryNames, options.category)) this.category = options.category
    this.loadConversations(true)
    if (options.conversationId) this.openConversation({ id: options.conversationId, title: '正在打开会话', category: this.category })
    if (typeof uni.$on === 'function') uni.$on('messages:updated', this.refresh)
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
    if (typeof uni.$off === 'function') uni.$off('messages:updated', this.refresh)
  },
  methods: {
    async loadConversations(reset = false) {
      if (this.listLoading || (!reset && !this.page.hasMore && this.page.page > 0)) return
      this.listLoading = true; this.listError = ''
      const nextPage = reset ? 1 : this.page.page + 1
      try {
        const result = await listMessages({ category: this.category, page: nextPage, pageSize: 20 })
        const items = result.items.map(normalizeConversation)
        this.conversations = reset ? items : [...this.conversations, ...items]
        this.page = { page: result.page, hasMore: result.hasMore, total: result.total }
        if (result.unread_total !== undefined) this.unreadTotal = Number(result.unread_total) || 0
        else if (reset) this.unreadTotal = items.reduce((total, item) => total + item.unread, 0)
        if (result.unread_by_category) this.unreadByCategory = result.unread_by_category
        else if (reset) this.unreadByCategory = items.reduce((counts, item) => ({ ...counts, [item.category]: (counts[item.category] || 0) + item.unread }), {})
      } catch (error) { this.listError = error.message || '消息加载失败，请稍后重试' } finally { this.listLoading = false }
    },
    async refresh() { await this.loadConversations(true); if (!this.listError) this.showToast('消息已刷新') },
    async pullRefresh() { await this.refresh() },
    selectCategory(key) { if (this.category === key) return; this.category = key; this.loadConversations(true) },
    async openConversation(conversation) {
      this.selectedConversation = normalizeConversation(conversation); this.messages = []; this.detailError = ''; this.detailLoading = true
      try {
        const payload = await getConversation(this.selectedConversation.id)
        const source = payload?.conversation || payload || {}
        this.selectedConversation = normalizeConversation({ ...this.selectedConversation, ...source })
        this.messages = (source.messages || payload.items || []).map(normalizeMessage)
        this.lastMessageAnchor = this.messages.length ? 'message-' + this.messages[this.messages.length - 1].id : ''
        if (this.selectedConversation.unread) await markConversationRead(this.selectedConversation.id, this.messages[this.messages.length - 1]?.id)
        this.selectedConversation.unread = 0
        this.conversations = this.conversations.map((item) => item.id === this.selectedConversation.id ? { ...item, unread: 0 } : item)
        this.unreadTotal = Math.max(0, this.unreadTotal - (Number(conversation.unread) || 0))
      } catch (error) { this.detailError = error.message || '会话加载失败，请稍后重试' } finally { this.detailLoading = false }
    },
    closeConversation() { this.selectedConversation = null; this.messages = []; this.draft = '' },
    async sendText() {
      if (this.sending || !this.draft.trim() || !this.selectedConversation) return
      const body = this.draft.trim(); this.draft = ''; this.sending = true
      try { await sendConversationMessage(this.selectedConversation.id, { type: 'text', body }); await this.loadConversation(this.selectedConversation.id); this.showToast('消息已发送') } catch (error) { this.draft = body; this.showToast(error.message || '消息发送失败，请重试') } finally { this.sending = false }
    },
    async chooseImage() {
      if (!this.selectedConversation || this.sending) return
      try {
        const chosen = await chooseImage()
        this.sending = true
        await uploadConversationImage(this.selectedConversation.id, chosen)
        await this.loadConversation(this.selectedConversation.id)
        this.showToast('图片已发送')
      } catch (error) { if (!/取消/.test(error.message || '')) this.showToast(error.message || '图片发送失败，请重试') } finally { this.sending = false }
    },
    async loadConversation(id) {
      this.detailLoading = true; this.detailError = ''
      try { const payload = await getConversation(id); const source = payload?.conversation || payload || {}; this.messages = (source.messages || payload.items || []).map(normalizeMessage); this.lastMessageAnchor = this.messages.length ? 'message-' + this.messages[this.messages.length - 1].id : '' } catch (error) { this.detailError = error.message || '会话加载失败，请稍后重试' } finally { this.detailLoading = false }
    },
    askClear() { if (this.conversations.length) this.confirmAction = 'clear' },
    async clearAll() { this.confirmAction = ''; try { await clearConversations(this.category); this.closeConversation(); await this.loadConversations(true); this.showToast('会话已清空') } catch (error) { this.showToast(error.message || '清空失败，请重试') } },
    askDelete(conversation) { this.conversationToDelete = conversation },
    async deleteSelectedConversation() { const item = this.conversationToDelete; this.conversationToDelete = null; if (!item) return; try { await deleteConversation(item.id); if (this.selectedConversation?.id === item.id) this.closeConversation(); this.conversations = this.conversations.filter((conversation) => conversation.id !== item.id); this.showToast('会话已删除') } catch (error) { this.showToast(error.message || '删除失败，请重试') } },
    categoryLabel(key) { return categoryNames[key] || '平台' },
    formatDate(value) { return formatDateTime(value) },
    showToast(text) { this.toast = text; if (this.toastTimer) clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { this.toast = '' }, 2000) }
  }
}

function normalizeConversation(item = {}) {
  const title = item.title || item.name || item.subject || item.counterparty?.display_name || item.counterparty_name || '平台会话'
  return { ...item, id: String(item.id || item.conversation_id || item.conversationId || item.thread_id || ''), title: String(title), category: item.category || item.biz_type || 'system', preview: item.preview || item.summary || item.last_message?.body || item.last_message?.text || '暂无消息', updatedAt: item.updated_at || item.updatedAt || item.time || item.last_message?.created_at || item.last_message_at || '', unread: Number(item.unread_count ?? item.unreadCount ?? item.unread ?? 0) || 0, statusLabel: item.status_label || item.businessStatus || item.status || '', avatarText: String(title).slice(0, 1) }
}

function normalizeMessage(item = {}) {
  return { ...item, id: String(item.id || item.message_id || Math.random().toString(36).slice(2)), type: item.type || (item.media_url || item.imageUrl ? 'image' : 'text'), body: item.body || item.text || item.content || '', mediaUrl: item.media_url || item.mediaUrl || item.imageUrl || item.url || '', createdAt: item.created_at || item.createdAt || item.sentAt || '', mine: Boolean(item.mine ?? item.is_mine ?? item.sender === 'self' ?? item.sender_id === item.current_user_id), read: Boolean(item.read ?? item.is_read ?? item.deliveryStatus === 'read') }
}

function chooseImage() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (result) => resolve(result.tempFilePaths[0]), fail: (error) => reject(new Error(/cancel/i.test(error.errMsg || '') ? '已取消图片选择' : error.errMsg || '图片选择失败')) })
  })
}
</script>

<style scoped>
.messages-page { min-height: 100%; padding: 24rpx 24rpx 48rpx; color: var(--text); }.page-tools { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; padding-bottom: 18rpx; }.page-kicker, .page-note { display: block; }.page-kicker { font-size: 28rpx; font-weight: 700; }.page-note { margin-top: 6rpx; color: var(--muted); font-size: 19rpx; line-height: 1.45; }.tool-actions { display: flex; gap: 18rpx; }.tool-link { color: var(--accent); font-size: 22rpx; }.tool-link.danger { color: #f2b456; }.category-scroll { margin: 2rpx -24rpx 18rpx; padding: 0 24rpx; white-space: nowrap; }.category-row { display: inline-flex; gap: 10rpx; }.category { display: inline-flex; height: 58rpx; align-items: center; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--muted); font-size: 21rpx; }.category.active { border-color: var(--accent); color: var(--accent); }.count { margin-left: 6rpx; color: #f2b456; font-size: 18rpx; }.conversation-list { border-top: 1rpx solid var(--line); }.conversation { display: flex; align-items: center; gap: 16rpx; min-height: 126rpx; padding: 18rpx 2rpx; border-bottom: 1rpx solid var(--line); }.conversation.selected { background: rgba(25,207,160,.06); }.conversation-avatar { display: flex; width: 72rpx; height: 72rpx; flex: none; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 50%; color: var(--accent); font-size: 26rpx; }.conversation-copy { min-width: 0; flex: 1; }.conversation-head, .conversation-foot { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }.conversation-title, .conversation-preview { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.conversation-title { font-size: 25rpx; font-weight: 650; }.conversation-time, .conversation-preview, .state-label { color: var(--muted); font-size: 19rpx; }.conversation-preview { margin-top: 7rpx; font-size: 21rpx; }.conversation-foot { justify-content: flex-start; margin-top: 8rpx; }.category-label { color: var(--accent); font-size: 18rpx; }.state-label { font-size: 18rpx; }.unread-dot { display: flex; min-width: 36rpx; height: 36rpx; align-items: center; justify-content: center; padding: 0 8rpx; border-radius: 999px; background: #f2b456; color: #061a2b; font-size: 17rpx; }.list-skeleton { display: flex; flex-direction: column; gap: 12rpx; }.skeleton-row, .skeleton-message { border-radius: 6px; background: var(--surface-strong); opacity: .75; }.skeleton-row { height: 108rpx; }.skeleton-message { width: 70%; height: 74rpx; margin: 18rpx 0; }.inline-error { display: flex; justify-content: space-between; padding: 16rpx 0; color: #f2b456; font-size: 20rpx; }.load-more { padding: 22rpx; color: var(--accent); font-size: 21rpx; text-align: center; }.conversation-panel { margin-top: 22rpx; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; padding-bottom: 14rpx; border-bottom: 1rpx solid var(--line); }.panel-title, .panel-source { display: block; }.panel-title { font-size: 27rpx; font-weight: 700; }.panel-source { margin-top: 5rpx; color: var(--muted); font-size: 18rpx; }.close-link { color: var(--accent); font-size: 21rpx; }.message-thread { height: 470rpx; padding: 16rpx 0; box-sizing: border-box; }.message-row { display: flex; justify-content: flex-start; margin-bottom: 14rpx; }.message-row.mine { justify-content: flex-end; }.message-bubble { max-width: 78%; padding: 13rpx 15rpx; border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; line-height: 1.5; }.message-row.mine .message-bubble { border: 1rpx solid rgba(25,207,160,.32); background: rgba(25,207,160,.08); }.message-meta { display: block; margin-top: 7rpx; color: var(--muted); font-size: 17rpx; }.message-image { display: block; max-width: 420rpx; max-height: 300rpx; border-radius: 4px; }.composer { display: flex; align-items: center; gap: 10rpx; padding-top: 14rpx; border-top: 1rpx solid var(--line); }.image-button, .send-button { display: flex; height: 66rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 6px; color: var(--accent); font-size: 21rpx; }.image-button { width: 74rpx; }.send-button { width: 86rpx; border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }.send-button.disabled { opacity: .5; }.composer-input { min-width: 0; flex: 1; height: 66rpx; padding: 0 14rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 23rpx; }.placeholder { color: var(--muted); }.toast { position: fixed; z-index: 100; left: 50%; bottom: calc(130rpx + env(safe-area-inset-bottom)); max-width: 560rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 23rpx; text-align: center; }
.conversation-actions { display: flex; flex: none; flex-direction: column; align-items: flex-end; gap: 8rpx; }.delete-link { color: var(--muted); font-size: 18rpx; }
</style>
