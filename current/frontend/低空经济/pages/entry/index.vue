<template>
  <view class="entry-page">
    <view class="entry-grid">
      <view class="entry-main">
        <text class="entry-kicker">SKYDOME AVIATION</text>
        <text class="entry-title">{{ t('飞向可信的低空未来') }}</text>
        <text class="entry-note">{{ t('资质、任务、设备与飞行经验，在一个可信入口连接。') }}</text>
        <view class="entry-points"><view><text>{{ t('资质状态') }}</text><text>{{ t('可信展示') }}</text></view><view><text>{{ t('设备履历') }}</text><text>{{ t('可追溯') }}</text></view><view><text>{{ t('任务协作') }}</text><text>{{ t('在线管理') }}</text></view></view>
        <view class="entry-actions"><view class="entry-primary" @tap="enterLogin" @longpress="showNote('登录')">{{ t('登录') }}</view><view class="entry-register" @tap="enterRegister" @longpress="showNote('注册')">{{ t('注册') }}</view></view>
        <text class="entry-guest-link" @tap="enterGuest">{{ t('游客体验') }}</text>
        <view class="entry-legal"><text>{{ t('继续即表示同意') }}</text><text class="legal-link" @tap="openLegal('terms')">{{ t('用户协议') }}</text><text>{{ t('和') }}</text><text class="legal-link" @tap="openLegal('privacy')">{{ t('隐私政策') }}</text></view>
      </view>
      <view class="entry-art" aria-hidden="true"><image class="entry-drone-image" src="/static/images/online-drone-login.jpg" mode="aspectFill"></image><view class="entry-art-scrim"></view><view class="tech-grid"></view><view class="flight-pulse pulse-one"></view><view class="flight-pulse pulse-two"></view><view class="flight-status"><text>FLIGHT LINK</text><text>READY · 99.8%</text></view></view>
    </view>
    <view v-if="restoring" class="entry-toast">{{ t('正在恢复登录状态...') }}</view>
    <view v-else-if="note" class="entry-toast">{{ note }}</view>
    <view v-if="introOpen" class="entry-mask" @tap="acceptIntro"><view class="entry-dialog" @tap.stop><text class="entry-dialog-title">{{ t('首次使用说明') }}</text><text class="entry-dialog-copy">{{ t('游客可浏览公开信息；登录、认证、交易和工作台操作会按服务端账户、角色与资质状态授权。') }}</text><view class="entry-dialog-links"><text @tap="openLegal('terms')">{{ t('用户协议') }}</text><text @tap="openLegal('privacy')">{{ t('隐私政策') }}</text></view><view class="entry-dialog-button" @tap="acceptIntro">{{ t('我知道了') }}</view></view></view>
    <view v-if="legalDoc" class="entry-mask" @tap="legalDoc = ''"><view class="entry-dialog" @tap.stop><text class="entry-dialog-title">{{ legalDoc === 'privacy' ? t('隐私政策') : t('用户协议') }}</text><text class="entry-dialog-copy">{{ legalDoc === 'privacy' ? t('平台仅在登录、身份与资质审核、以及必要履约时处理资料。认证材料通过私有上传接口提交。') : t('公开信息可供游客浏览；受限操作须通过登录与服务端认证校验，认证结果以审核状态为准。') }}</text><view class="entry-dialog-button" @tap="legalDoc = ''">{{ t('知道了') }}</view></view></view>
  </view>
</template>

<script>
import { getAccessToken, getRefreshToken, resumeSession, setGuestSession } from '../../utils/auth'
import { getCurrentUser, refreshSession } from '../../api/auth'
import { translate } from '../../data/localization'

export default {
  data() { return { note: '', locale: 'zh', restoring: false, introOpen: false, legalDoc: '' } },
  async onLoad() {
    const locale = uni.getStorageSync('lowair-demo-locale')
    if (['zh', 'en', 'ja', 'ru', 'de'].includes(locale)) this.locale = locale
    this.introOpen = !uni.getStorageSync('lowair-entry-consent')
    if (getAccessToken() || getRefreshToken()) {
      this.restoring = true
      try {
        await resumeSession({ fetchCurrentUser: getCurrentUser, refresh: refreshSession })
        uni.reLaunch({ url: '/pages/index/index' })
        return
      } catch (error) {
        this.note = this.t('登录状态已失效，请重新登录')
      } finally {
        this.restoring = false
      }
    }
    if (uni.getStorageSync('lowair-entry-complete')) uni.reLaunch({ url: '/pages/index/index' })
  },
  methods: {
    t(value) { return translate(value, this.locale) },
    enterLogin() {
      uni.navigateTo({ url: '/pages/auth/index?mode=login' })
    },
    enterRegister() {
      uni.navigateTo({ url: '/pages/auth/index?mode=register' })
    },
    enterGuest() {
      setGuestSession()
      uni.reLaunch({ url: '/pages/index/index' })
    },
    acceptIntro() { uni.setStorageSync('lowair-entry-consent', true); this.introOpen = false },
    openLegal(kind) { this.legalDoc = kind },
    showNote(label) {
      this.note = this.t('长按说明：') + this.t(label)
      setTimeout(() => { this.note = '' }, 1800)
    }
  }
}
</script>

<style scoped>
.entry-page { min-height: 100vh; padding: max(36rpx, env(safe-area-inset-top)) 32rpx max(36rpx, env(safe-area-inset-bottom)); background: #061a2b; }
.entry-grid { min-height: calc(100vh - 72rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom)); display: grid; grid-template-columns: minmax(0, 1fr) minmax(280rpx, .94fr); overflow: hidden; border: 1rpx solid #1d4256; border-radius: 12rpx; background: #0b263a; }
.entry-main { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; padding: 64rpx 56rpx; }.entry-kicker { color: #35dfb2; font-size: 21rpx; letter-spacing: 4rpx; }.entry-title { display: block; margin-top: 20rpx; color: #edf7f8; font-size: 56rpx; font-weight: 750; letter-spacing: 1rpx; line-height: 1.24; }.entry-note { display: block; max-width: 500rpx; margin-top: 20rpx; color: #a8bec9; font-size: 27rpx; line-height: 1.65; }.entry-points { display: flex; gap: 26rpx; margin: 58rpx 0 40rpx; }.entry-points view { display: flex; flex-direction: column; gap: 8rpx; padding-left: 16rpx; border-left: 3rpx solid #19cfa0; }.entry-points text:first-child { color: #eaf5f7; font-size: 23rpx; }.entry-points text:last-child { color: #7693a2; font-size: 20rpx; }.entry-actions { display: flex; gap: 16rpx; max-width: 480rpx; }.entry-primary, .entry-guest { display: flex; height: 82rpx; flex: 1; align-items: center; justify-content: center; border-radius: 7rpx; font-size: 27rpx; font-weight: 650; transition: transform .16s ease; }.entry-primary:active, .entry-guest:active { transform: scale(.98); }.entry-primary { background: #19cfa0; color: #062218; }.entry-guest { border: 1rpx solid #33566a; color: #edf7f8; }.entry-legal { display: block; margin-top: 22rpx; color: #6c8795; font-size: 20rpx; }.entry-art { position: relative; overflow: hidden; min-height: 580rpx; }.entry-art image, .entry-art-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }.entry-art image { filter: saturate(.8) contrast(1.08); }.entry-art-scrim { background: linear-gradient(90deg, #0b263a 0%, rgba(6,26,43,.42) 36%, rgba(6,26,43,.04) 100%); }.tech-grid { position: absolute; inset: 0; opacity: .28; background-image: linear-gradient(rgba(73,223,188,.36) 1rpx, transparent 1rpx), linear-gradient(90deg, rgba(73,223,188,.36) 1rpx, transparent 1rpx); background-size: 46rpx 46rpx; mask-image: linear-gradient(90deg, transparent, #000 40%); }.flight-pulse { position: absolute; right: 13%; top: 21%; width: 160rpx; height: 160rpx; border: 2rpx solid rgba(61,226,185,.6); border-radius: 50%; }.pulse-two { right: 5%; top: 13%; width: 280rpx; height: 280rpx; opacity: .55; }.flight-status { position: absolute; right: 30rpx; bottom: 32rpx; display: flex; flex-direction: column; gap: 7rpx; padding: 16rpx; border: 1rpx solid rgba(84,230,194,.55); background: rgba(5,26,40,.75); color: #79e6c6; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 19rpx; }.flight-status text:last-child { color: #eaf5f7; }.entry-toast { position: fixed; z-index: 4; left: 50%; bottom: 70rpx; max-width: 560rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border-radius: 6rpx; background: rgba(3,18,30,.94); color: #edf7f8; font-size: 23rpx; text-align: center; }
/* uni-app's H5 image wrapper starts its internal img transparent; force the above-fold drone visual visible. */
.entry-register { display: flex; height: 82rpx; flex: 1; align-items: center; justify-content: center; border: 1rpx solid #4da78f; border-radius: 7rpx; background: rgba(25,207,160,.08); color: #d9fff4; font-size: 27rpx; font-weight: 650; transition: transform .16s ease; }.entry-register:active { transform: scale(.98); }.entry-guest-link { display: inline-block; align-self: flex-start; margin-top: 20rpx; color: #8fb9ad; font-size: 22rpx; }.entry-legal { display: flex; flex-wrap: wrap; gap: 7rpx; margin-top: 18rpx; color: #6c8795; font-size: 20rpx; }.legal-link { color: #79e6c6; }.entry-mask { position: fixed; z-index: 10; inset: 0; display: flex; align-items: center; justify-content: center; padding: 36rpx; background: rgba(2,13,21,.72); }.entry-dialog { width: 100%; max-width: 620rpx; padding: 30rpx; border: 1rpx solid #315365; border-radius: 8rpx; background: #0b263a; }.entry-dialog-title { display: block; color: #edf7f8; font-size: 31rpx; font-weight: 700; }.entry-dialog-copy { display: block; margin-top: 16rpx; color: #b8cbd3; font-size: 22rpx; line-height: 1.7; }.entry-dialog-links { display: flex; gap: 26rpx; margin-top: 16rpx; color: #79e6c6; font-size: 21rpx; }.entry-dialog-button { display: flex; height: 74rpx; align-items: center; justify-content: center; margin-top: 24rpx; border-radius: 6rpx; background: #19cfa0; color: #062218; font-size: 24rpx; font-weight: 650; }
:deep(.entry-drone-image img) { width: 100%; height: 100%; opacity: 1 !important; object-fit: cover; }
@media (max-width: 640px) { .entry-page { padding: 0; }.entry-grid { min-height: 100vh; grid-template-columns: 1fr; border: 0; border-radius: 0; }.entry-main { justify-content: flex-end; min-height: 100vh; padding: 50rpx 44rpx calc(48rpx + env(safe-area-inset-bottom)); background: linear-gradient(180deg, transparent 33%, rgba(6,26,43,.58) 53%, #061a2b 100%); }.entry-art { position: absolute; inset: 0; min-height: 0; }.entry-art-scrim { background: linear-gradient(180deg, rgba(6,26,43,.06), rgba(6,26,43,.28) 38%, #061a2b 90%); }.entry-title { font-size: 52rpx; }.entry-points { margin: 40rpx 0 34rpx; gap: 14rpx; }.entry-points view { padding-left: 10rpx; }.entry-points text:first-child { font-size: 20rpx; }.entry-points text:last-child { font-size: 18rpx; }.entry-actions { max-width: none; }.tech-grid { mask-image: none; }.flight-pulse { top: 17%; }.pulse-two { top: 9%; } }
</style>
