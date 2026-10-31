<template>
  <app-page-shell title="发布内容" active="community" :theme="theme" :locale="locale">
    <view class="community-screen publish-screen">
      <view class="community-tabs publish-tabs"><text v-for="type in types" :key="type" class="community-tab" :class="{ active: form.type === type }" @tap="changeType(type)">{{ type }}</text></view>

      <view v-if="draftRestored" class="community-notice draft-notice">已恢复本机草稿。媒体临时文件可能需要重新选择。</view>

      <view class="community-panel">
        <view class="community-field"><text class="community-label">标题</text><input v-model="form.title" class="community-input" maxlength="60" placeholder="用一句话说明内容" /><text class="community-help">{{ form.title.length }}/60</text></view>
        <view class="community-field"><text class="community-label">正文</text><textarea v-model="form.content" class="community-textarea" maxlength="2000" placeholder="说明背景、条件和可核验的信息来源" /><text class="community-help">{{ form.content.length }}/2000</text></view>
        <view class="community-field"><text class="community-label">话题</text><view class="topic-list"><text v-for="topic in topics" :key="topic" class="community-tab" :class="{ active: form.topic === topic }" @tap="form.topic = topic">#{{ topic }}</text></view><input v-model="customTopic" class="community-input" maxlength="20" placeholder="也可以输入自定义话题" /></view>
      </view>

      <view class="community-panel">
        <view class="media-head"><view><text class="community-label">图片或视频</text><text class="community-help">图文最多 9 张，视频最多 1 个。上传失败后可单独重传。</text></view><text class="community-link" @tap="chooseMedia">添加{{ form.type === '视频' ? '视频' : '图片' }}</text></view>
        <view v-if="media.length" class="media-list">
          <view v-for="item in media" :key="item.localId" class="media-row">
            <image v-if="item.type === 'image'" class="media-preview" :src="item.path" mode="aspectFill"></image>
            <view v-else class="media-preview media-video">视频</view>
            <view class="media-copy"><text>{{ item.name }}</text><text :class="['media-state', item.status]">{{ mediaState(item) }}</text><view v-if="item.status === 'uploading'" class="media-progress"><view :style="{ width: item.progress + '%' }"></view></view></view>
            <view class="media-actions"><text v-if="item.status === 'failed'" @tap="uploadItem(item, false)">重传</text><text @tap="removeMedia(item.localId)">移除</text></view>
          </view>
        </view>
        <view v-else class="media-empty" @tap="chooseMedia"><text>尚未添加媒体</text><text>发布纯文字内容也可以。</text></view>
      </view>

      <view class="community-panel">
        <view class="community-field"><text class="community-label">可见范围</text><view class="visibility-grid"><text v-for="scope in visibilityOptions" :key="scope" :class="{ active: form.visibility === scope }" @tap="form.visibility = scope">{{ scope }}</text></view></view>
        <view class="community-switch-row"><view class="community-switch-copy"><text class="community-label">显示城市范围</text><text class="community-help">仅显示城市或区级范围，不公开坐标。</text></view><switch :checked="form.locationEnabled" color="#19cfa0" @change="form.locationEnabled = $event.detail.value" /></view>
        <view v-if="form.locationEnabled" class="community-field"><text class="community-label">城市范围</text><picker :range="cities" :value="cityIndex" @change="cityIndex = Number($event.detail.value)"><view class="community-input picker-input">{{ cities[cityIndex] }}</view></picker></view>
        <view class="community-switch-row"><view class="community-switch-copy"><text class="community-label">分享精确位置</text><text class="community-help">默认关闭。开启后仍需系统定位授权，并在发布前再次确认。</text></view><switch :checked="form.preciseLocation" color="#19cfa0" @change="togglePreciseLocation" /></view>
        <view v-if="form.preciseLocation" class="community-notice precise-notice">精确位置已授权，仅用于本次发布。请确认内容不会暴露敏感起降点或个人住址。</view>
      </view>

      <view class="community-actions-row publish-actions"><view class="community-button secondary" @tap="saveDraft">保存草稿</view><view class="community-button" :class="{ disabled: submitting || hasPendingMedia }" @tap="publish">{{ submitting ? '发布中' : '确认发布' }}</view></view>
    </view>
    <view v-if="toast" class="community-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { createPost, uploadCommunityMedia, validateCommunityContent } from '../services'
import { requirePermission } from '../../../utils/route-guard'

const DRAFT_KEY = 'lowair-community-publish-draft'

export default {
  name: 'CommunityPublishPage',
  components: { AppPageShell },
  data() {
    return {
      types: ['图文', '视频'], topics: ['飞行日志', '安全交流', '设备维护', '同城约飞'], visibilityOptions: ['公开', '关注可见', '同城可见', '机型圈可见'], cities: ['北京', '天津', '石家庄', '成都'], cityIndex: 0,
      form: { type: '图文', title: '', content: '', topic: '飞行日志', visibility: '公开', locationEnabled: false, preciseLocation: false, coordinates: null }, customTopic: '', media: [], submitting: false, draftRestored: false, theme: 'ocean', locale: 'zh', toast: ''
    }
  },
  computed: { hasPendingMedia() { return this.media.some((item) => item.status === 'uploading' || item.status === 'failed') } },
  created() {
    const theme = uni.getStorageSync('lowair-demo-theme')
    const locale = uni.getStorageSync('lowair-demo-locale')
    if (theme) this.theme = theme
    if (locale) this.locale = locale
    const draft = uni.getStorageSync(DRAFT_KEY)
    if (draft?.form) {
      this.form = { ...this.form, ...draft.form, preciseLocation: false, coordinates: null }
      this.customTopic = draft.customTopic || ''
      this.cityIndex = Math.max(0, this.cities.indexOf(draft.city || '北京'))
      this.draftRestored = true
    }
  },
  methods: {
    changeType(type) { this.form.type = type; if (type === '视频') this.media = this.media.filter((item) => item.type === 'video').slice(0, 1); else this.media = this.media.filter((item) => item.type === 'image') },
    chooseMedia() { this.form.type === '视频' ? this.chooseVideo() : this.chooseImages() },
    chooseImages() {
      uni.chooseImage({ count: Math.max(1, 9 - this.media.length), sourceType: ['album', 'camera'], success: (result) => {
        const paths = result.tempFilePaths || []
        paths.forEach((path, index) => this.addMedia({ path, type: 'image', name: result.tempFiles?.[index]?.name || `图片 ${this.media.length + 1}` }))
      } })
    },
    chooseVideo() {
      uni.chooseVideo({ sourceType: ['album', 'camera'], compressed: true, success: (result) => {
        this.media = []
        this.addMedia({ path: result.tempFilePath, type: 'video', name: result.name || '社区视频' })
      } })
    },
    addMedia(file) {
      const validationError = this.validateMedia(file)
      if (validationError) return this.showToast(validationError)
      const item = { ...file, localId: `local-${Date.now()}-${Math.random()}`, progress: 0, status: 'waiting', uploaded: null, error: '' }
      this.media.push(item)
      this.uploadItem(item, true)
    },
    async uploadItem(item, failOnce) {
      item.status = 'uploading'; item.progress = 0; item.error = ''
      try {
        item.uploaded = await uploadCommunityMedia(item, { failOnce, onProgress: (progress) => { item.progress = progress } })
        item.status = 'done'
      } catch (error) { item.status = 'failed'; item.error = error.message || '上传失败' }
    },
    removeMedia(localId) { this.media = this.media.filter((item) => item.localId !== localId) },
    mediaState(item) { if (item.status === 'uploading') return `上传中 ${item.progress}%`; if (item.status === 'failed') return item.error || '上传失败'; if (item.status === 'done') return '上传完成'; return '等待上传' },
    togglePreciseLocation(event) {
      if (!event.detail.value) { this.form.preciseLocation = false; this.form.coordinates = null; return }
      uni.showModal({ title: '分享精确位置', content: '精确坐标可能暴露敏感起降点。仅在确有需要并确认可公开时授权。', confirmText: '继续授权', confirmColor: '#19a982', success: (result) => {
        if (!result.confirm) return
        uni.getLocation({ type: 'gcj02', success: (location) => { this.form.preciseLocation = true; this.form.locationEnabled = true; this.form.coordinates = { latitude: location.latitude, longitude: location.longitude }; this.showToast('已取得本次定位授权') }, fail: () => { this.form.preciseLocation = false; this.form.coordinates = null; this.showToast('定位未授权，继续使用城市范围') } })
      } })
    },
    saveDraft() { uni.setStorageSync(DRAFT_KEY, { form: { ...this.form, preciseLocation: false, coordinates: null }, customTopic: this.customTopic, city: this.cities[this.cityIndex] }); this.draftRestored = true; this.showToast('草稿已保存到本机') },
    async publish() {
      if (this.submitting) return
      if (!requirePermission('login')) return
      if (!this.form.title.trim()) return this.showToast('请填写标题')
      if (!this.form.content.trim()) return this.showToast('请填写正文')
      if (this.hasPendingMedia) return this.showToast('请等待上传完成或重传失败文件')
      const submit = async () => {
        this.submitting = true
        try {
          const payload = { ...this.form, topic: this.customTopic.trim() || this.form.topic, media: this.media.map((item) => item.uploaded).filter(Boolean), location: this.form.locationEnabled ? { city: this.cities[this.cityIndex], precise: this.form.preciseLocation, coordinates: this.form.coordinates } : null }
          const validation = await validateCommunityContent(payload)
          if (validation?.allowed === false || validation?.status === 'rejected') return this.showToast(validation.message || '内容未通过发布校验，请修改后重试')
          const post = await createPost(payload)
          if (!post?.id) throw new Error('发布响应缺少内容 id')
          uni.removeStorageSync(DRAFT_KEY)
          uni.redirectTo({ url: '/pages/community/post-detail?id=' + encodeURIComponent(post.id) })
        } catch (error) { this.showToast(error.message || '发布失败，请稍后重试') }
        finally { this.submitting = false }
      }
      if (this.form.preciseLocation) uni.showModal({ title: '确认公开精确位置', content: '本条动态将包含已授权的精确位置。确认继续发布吗？', confirmColor: '#d48745', success: (result) => { if (result.confirm) submit() } })
      else submit()
    },
    validateMedia(file) {
      const name = String(file.name || file.path || '').toLowerCase()
      const allowed = file.type === 'image' ? /\.(jpg|jpeg|png|webp)$/ : /\.(mp4|mov|m4v)$/
      if (!allowed.test(name)) return file.type === 'image' ? '请选择 JPG、PNG 或 WebP 图片' : '请选择 MP4 或 MOV 视频'
      if (Number(file.size || 0) > (file.type === 'video' ? 200 : 20) * 1024 * 1024) return file.type === 'video' ? '视频不能超过 200MB' : '图片不能超过 20MB'
      return ''
    },
    showToast(message) { this.toast = message; setTimeout(() => { this.toast = '' }, 2000) }
  }
}
</script>

<style src="../styles/community.css"></style>
<style scoped>
.publish-tabs { margin-top: 0; }.draft-notice { border-left-color: var(--accent); background: rgba(25, 207, 160, .07); }.topic-list { display: flex; flex-wrap: wrap; gap: 10rpx; }.media-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }.media-head > view { min-width: 0; display: flex; flex-direction: column; gap: 7rpx; }.media-list { margin-top: 18rpx; }.media-row { display: flex; align-items: center; gap: 13rpx; padding: 15rpx 0; border-top: 1rpx solid var(--line); }.media-preview { width: 96rpx; height: 76rpx; flex: 0 0 96rpx; border-radius: 6px; background: var(--surface-strong); }.media-video { display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: 20rpx; }.media-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 7rpx; }.media-copy > text:first-child { overflow: hidden; color: var(--text); font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }.media-state { color: var(--muted); font-size: 19rpx; }.media-state.failed { color: #f2b456; }.media-state.done { color: var(--accent); }.media-progress { width: 100%; height: 5rpx; overflow: hidden; border-radius: 5rpx; background: var(--surface-strong); }.media-progress view { height: 100%; background: var(--accent); transition: width .16s ease; }.media-actions { display: flex; flex-direction: column; gap: 12rpx; color: var(--accent); font-size: 20rpx; }.media-actions text:last-child { color: var(--muted); }.media-empty { display: flex; flex-direction: column; gap: 6rpx; margin-top: 18rpx; padding: 32rpx; border: 1rpx dashed var(--line); border-radius: 7px; color: var(--muted); font-size: 21rpx; text-align: center; }.visibility-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10rpx; }.visibility-grid text { padding: 15rpx; border: 1rpx solid var(--line); border-radius: 7px; color: var(--muted); font-size: 22rpx; text-align: center; }.visibility-grid text.active { border-color: var(--accent); color: var(--accent); background: rgba(25, 207, 160, .07); }.picker-input { display: flex; align-items: center; }.precise-notice { margin: 8rpx 0 0; }.publish-actions { margin: 6rpx 0 20rpx; }
</style>
