<template>
  <app-page-shell title="社区直播" active="community" :theme="theme" :locale="locale">
    <view class="community-screen">
      <view v-if="!online" class="community-notice offline-notice"><text>当前网络不可用，直播已暂停。</text><text v-if="lastConnectedAt">上次连接：{{ lastConnectedAt }}</text><text class="community-link" @tap="retryConnection">重试连接</text></view>
      <view class="community-tabs"><text v-for="tab in tabs" :key="tab.key" class="community-tab" :class="{ active: activeState === tab.key }" @tap="changeState(tab.key)">{{ tab.label }}</text></view>

      <view v-if="loading" class="community-loading"><view class="community-loading-line short"></view><view class="community-loading-line"></view><view class="community-loading-line"></view><text>正在加载直播列表</text></view>
      <view v-else-if="error" class="community-error"><text class="community-state-title">直播列表加载失败</text><text>{{ error }}</text><view class="community-button secondary" @tap="loadRooms">重新加载</view></view>
      <view v-else-if="!rooms.length" class="community-empty"><text class="community-state-title">当前分类暂无内容</text><text>直播预告发布后会显示在这里。</text></view>
      <view v-else class="room-list">
        <view v-for="room in rooms" :key="room.id" class="community-panel room-card" @tap="openRoom(room)">
          <view class="room-cover"><image :src="room.cover" mode="aspectFill"></image><text :class="['room-state', room.state]">{{ roomStateLabel(room.state) }}</text></view>
          <view class="room-copy"><text class="room-title">{{ room.title }}</text><text class="community-muted">{{ room.host }}</text><view class="room-meta"><text>{{ room.schedule }}</text><text v-if="room.viewers">{{ room.viewers }} 人观看</text></view></view>
        </view>
      </view>
    </view>

    <view v-if="activeRoom" class="community-sheet-mask" @tap="activeRoom = null"><view class="community-sheet live-sheet" @tap.stop>
      <view class="live-room-head"><view><text class="community-sheet-title">{{ activeRoom.title }}</text><text class="community-muted">{{ activeRoom.host }} · {{ activeRoom.schedule }}</text></view><text @tap="activeRoom = null">关闭</text></view>
      <view class="live-stage" :class="{ offline: !online }"><image :src="activeRoom.cover" mode="aspectFill"></image><view class="live-stage-copy"><text>{{ stageMessage }}</text><view v-if="!online" class="community-button secondary" @tap="retryConnection">重新连接</view></view></view>
      <view v-if="activeRoom.state === 'scheduled'" class="community-button" @tap="toggleReminder">{{ reminded ? '已预约提醒' : '预约开播提醒' }}</view>
      <template v-else>
        <view class="live-comments"><text class="community-label">互动评论</text><view v-if="activeRoom.comments.length"><view v-for="comment in activeRoom.comments" :key="comment.id" class="live-comment"><text><b>{{ comment.author }}</b> {{ comment.content }}</text><text @tap="openReport(comment.id)">举报</text></view></view><text v-else class="community-muted">暂无评论，可以提出与主题相关的问题。</text></view>
        <view class="live-composer"><input v-model="commentText" class="community-input" placeholder="输入直播评论" :disabled="!online || activeRoom.state === 'replay'" /><view class="community-button" :class="{ disabled: !online || activeRoom.state === 'replay' }" @tap="submitComment">发送</view></view>
      </template>
    </view></view>
    <view v-if="reportTarget" class="community-sheet-mask" @tap="reportTarget = null"><view class="community-sheet" @tap.stop><text class="community-sheet-title">举报直播评论</text><text v-for="reason in reasons" :key="reason" class="community-sheet-option" @tap="submitReport(reason)">{{ reason }}</text><text class="community-sheet-option" @tap="reportTarget = null">取消</text></view></view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { addLiveComment, listLiveRooms, reportCommunityTarget } from '../services'

export default {
  name: 'CommunityLivePage',
  components: { AppPageShell },
  data() { return { tabs: [{ key: 'all', label: '全部' }, { key: 'scheduled', label: '预告' }, { key: 'live', label: '直播中' }, { key: 'replay', label: '回放' }], activeState: 'all', rooms: [], activeRoom: null, loading: true, error: '', online: true, lastConnectedAt: '', commentText: '', reminded: false, reportTarget: null, reasons: ['不友善或骚扰', '危险或误导信息', '广告与垃圾信息'], networkHandler: null, theme: 'ocean', locale: 'zh', toast: '' } },
  computed: {
    stageMessage() { if (!this.online) return '网络已断开，画面和互动已暂停'; if (this.activeRoom?.state === 'scheduled') return '直播尚未开始'; if (this.activeRoom?.state === 'replay') return '正在播放回放'; return '直播画面由流媒体服务接入' }
  },
  created() { this.restorePreferences(); this.setupNetwork(); this.loadRooms() },
  beforeUnmount() { if (this.networkHandler && typeof uni.offNetworkStatusChange === 'function') uni.offNetworkStatusChange(this.networkHandler) },
  methods: {
    restorePreferences() { const theme = uni.getStorageSync('lowair-demo-theme'); const locale = uni.getStorageSync('lowair-demo-locale'); if (theme) this.theme = theme; if (locale) this.locale = locale },
    setupNetwork() {
      uni.getNetworkType({ success: (result) => { this.online = result.networkType !== 'none'; if (this.online) this.lastConnectedAt = this.currentTime() } })
      this.networkHandler = (status) => { this.online = status.isConnected; if (status.isConnected) { this.lastConnectedAt = this.currentTime(); this.loadRooms() } }
      if (typeof uni.onNetworkStatusChange === 'function') uni.onNetworkStatusChange(this.networkHandler)
    },
    currentTime() { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` },
    roomStateLabel(state) { return { scheduled: '预告', live: '直播中', replay: '回放' }[state] || state },
    async changeState(state) { this.activeState = state; await this.loadRooms() },
    async loadRooms() { this.loading = true; this.error = ''; try { this.rooms = await listLiveRooms({ state: this.activeState }) } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false } },
    openRoom(room) { this.activeRoom = room; this.commentText = ''; this.reminded = false },
    toggleReminder() { this.reminded = !this.reminded; this.showToast(this.reminded ? '已预约开播提醒' : '已取消开播提醒') },
    async submitComment() {
      if (!this.online) return this.showToast('网络不可用，暂时无法发送')
      if (this.activeRoom.state === 'replay') return this.showToast('回放评论需后端开放后使用')
      if (!this.commentText.trim()) return this.showToast('请输入评论内容')
      try { const comment = await addLiveComment(this.activeRoom.id, this.commentText); this.activeRoom.comments.push(comment); this.commentText = ''; this.showToast('评论已发送') } catch (error) { this.showToast(error.message) }
    },
    retryConnection() { uni.getNetworkType({ success: (result) => { this.online = result.networkType !== 'none'; if (this.online) { this.lastConnectedAt = this.currentTime(); this.loadRooms(); this.showToast('网络已恢复') } else this.showToast('仍未连接网络') }, fail: () => this.showToast('无法获取网络状态') }) },
    openReport(id) { this.reportTarget = id },
    async submitReport(reason) { try { await reportCommunityTarget({ targetType: 'live-comment', targetId: this.reportTarget, reason }); this.reportTarget = null; this.showToast('举报已提交') } catch (error) { this.showToast(error.message) } },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 1900) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.offline-notice { display: flex; flex-direction: column; gap: 5rpx; }.room-card { display: flex; gap: 17rpx; }.room-cover { position: relative; width: 220rpx; height: 150rpx; flex: 0 0 220rpx; overflow: hidden; border-radius: 7px; background: var(--surface-strong); }.room-cover image { width: 100%; height: 100%; }.room-state { position: absolute; left: 10rpx; top: 10rpx; padding: 5rpx 9rpx; border-radius: 5px; background: rgba(3, 17, 27, .84); color: #f4fafb; font-size: 18rpx; }.room-state.live { background: rgba(194, 69, 69, .9); }.room-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 8rpx; }.room-title { color: var(--text); font-size: 27rpx; font-weight: 700; line-height: 1.4; }.room-meta { display: flex; flex-direction: column; gap: 5rpx; color: var(--muted); font-size: 20rpx; }.live-sheet { max-height: 88%; }.live-room-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; margin-bottom: 18rpx; }.live-room-head > view { min-width: 0; }.live-room-head > text { color: var(--muted); font-size: 22rpx; }.live-stage { position: relative; height: 330rpx; overflow: hidden; margin-bottom: 18rpx; border-radius: 8px; background: var(--surface-strong); }.live-stage image { width: 100%; height: 100%; opacity: .7; }.live-stage.offline image { opacity: .2; }.live-stage-copy { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; padding: 22rpx; background: rgba(3, 17, 27, .36); color: #f4fafb; font-size: 24rpx; text-align: center; }.live-comments { display: flex; flex-direction: column; gap: 12rpx; margin-top: 20rpx; }.live-comment { display: flex; align-items: flex-start; justify-content: space-between; gap: 14rpx; padding: 13rpx 0; border-top: 1rpx solid var(--line); color: var(--text); font-size: 22rpx; line-height: 1.5; }.live-comment > text:last-child { color: var(--muted); white-space: nowrap; }.live-composer { display: flex; gap: 12rpx; margin-top: 18rpx; }.live-composer .community-input { min-width: 0; flex: 1; }.live-composer .community-button { flex: 0 0 110rpx; }
</style>
