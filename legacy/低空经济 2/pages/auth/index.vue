<template>
  <view class="auth-page">
    <view class="auth-visual">
      <image src="/static/images/online-drone-login.jpg" mode="aspectFill"></image>
      <view class="visual-scrim"></view>
      <view class="brand-block">
        <text class="brand-kicker">SKYDOME AVIATION</text>
        <text class="brand-title">天穹智航</text>
        <text class="brand-note">连接资质、任务与飞行服务</text>
      </view>
    </view>

    <scroll-view class="auth-scroll" scroll-y :show-scrollbar="false">
      <view class="auth-main">
        <view class="auth-head">
          <view class="back-button" @tap="goBack" aria-label="返回"><text>‹</text></view>
          <view class="mode-tabs">
            <text class="mode-tab" :class="{ active: mode === 'login' }" @tap="switchMode('login')">登录</text>
            <text class="mode-tab" :class="{ active: mode === 'register' }" @tap="switchMode('register')">注册</text>
          </view>
        </view>

        <view class="form-heading">
          <text class="form-title">{{ title }}</text>
          <text class="form-note">{{ note }}</text>
        </view>

        <view class="auth-form">
          <view v-if="mode === 'register'" class="field">
            <text class="field-label">昵称</text>
            <input v-model.trim="form.nickname" class="field-input" maxlength="30" placeholder="请输入昵称" placeholder-class="placeholder" />
          </view>

          <view class="field">
            <text class="field-label">手机号</text>
            <input v-model.trim="form.phone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号" placeholder-class="placeholder" />
          </view>

          <view v-if="mode === 'forgot'" class="field">
            <text class="field-label">验证码</text>
            <view class="code-row">
              <input v-model.trim="form.code" class="field-input" type="number" maxlength="6" placeholder="6 位验证码" placeholder-class="placeholder" />
              <view class="code-button" :class="{ disabled: countdown > 0 || sendingCode }" @tap="sendCode">
                {{ countdown > 0 ? countdown + 's' : (sendingCode ? '发送中' : '获取验证码') }}
              </view>
            </view>
          </view>

          <view class="field">
            <text class="field-label">{{ mode === 'forgot' ? '新密码' : '密码' }}</text>
            <view class="password-row">
              <input v-model="form.password" class="field-input" :password="!showPassword" maxlength="64" :placeholder="mode === 'forgot' ? '设置至少 8 位新密码' : '请输入至少 8 位密码'" placeholder-class="placeholder" />
              <text class="visibility-button" @tap="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
            </view>
          </view>

          <view v-if="mode !== 'login'" class="field">
            <text class="field-label">确认密码</text>
            <input v-model="form.confirmPassword" class="field-input" :password="!showPassword" maxlength="64" placeholder="请再次输入密码" placeholder-class="placeholder" />
          </view>

          <view v-if="mode === 'register'" class="agreement" @tap="form.agreed = !form.agreed">
            <view class="checkbox" :class="{ checked: form.agreed }"><text v-if="form.agreed">✓</text></view>
            <text>我已阅读并同意平台服务说明与隐私政策</text>
          </view>

          <view class="submit-button" :class="{ disabled: loading }" @tap="submit">
            {{ loading ? '处理中...' : submitText }}
          </view>

          <view v-if="mode === 'login'" class="form-links">
            <text @tap="switchMode('forgot')">忘记密码</text>
            <text @tap="switchMode('register')">还没有账号？立即注册</text>
          </view>
          <view v-else class="form-links single"><text @tap="switchMode('login')">返回登录</text></view>
        </view>
      </view>
    </scroll-view>

    <view v-if="toast" class="auth-toast">{{ toast }}</view>
  </view>
</template>

<script>
import { login, register, requestPasswordReset, resetPassword } from '../../api/auth'
import { saveSession } from '../../utils/auth'

const emptyForm = () => ({ phone: '', nickname: '', password: '', confirmPassword: '', code: '', agreed: false })

export default {
  data() {
    return {
      mode: 'login',
      redirect: '',
      form: emptyForm(),
      loading: false,
      sendingCode: false,
      showPassword: false,
      countdown: 0,
      timer: null,
      toast: ''
    }
  },
  computed: {
    title() {
      return { login: '欢迎回来', register: '创建账号', forgot: '重置密码' }[this.mode]
    },
    note() {
      return { login: '使用手机号和密码继续', register: '注册不需要邮箱', forgot: '通过手机验证码设置新密码' }[this.mode]
    },
    submitText() {
      return { login: '登录', register: '注册并登录', forgot: '确认重置' }[this.mode]
    }
  },
  onLoad(options) {
    if (['login', 'register', 'forgot'].includes(options?.mode)) this.mode = options.mode
    if (options?.redirect) {
      try { this.redirect = decodeURIComponent(options.redirect) } catch (error) { this.redirect = '' }
    }
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    switchMode(mode) {
      this.mode = mode
      this.form = emptyForm()
      this.showPassword = false
    },
    validPhone() {
      if (!/^1\d{10}$/.test(this.form.phone)) {
        this.showToast('请输入正确的 11 位手机号')
        return false
      }
      return true
    },
    validate() {
      if (!this.validPhone()) return false
      if (this.mode === 'register' && this.form.nickname.length < 2) {
        this.showToast('昵称至少需要 2 个字符')
        return false
      }
      if (this.mode === 'forgot' && !/^\d{6}$/.test(this.form.code)) {
        this.showToast('请输入 6 位验证码')
        return false
      }
      if (this.form.password.length < 8) {
        this.showToast('密码至少需要 8 位')
        return false
      }
      if (this.mode !== 'login' && this.form.password !== this.form.confirmPassword) {
        this.showToast('两次输入的密码不一致')
        return false
      }
      if (this.mode === 'register' && !this.form.agreed) {
        this.showToast('请先同意平台服务说明与隐私政策')
        return false
      }
      return true
    },
    async submit() {
      if (this.loading || !this.validate()) return
      this.loading = true
      try {
        if (this.mode === 'login') {
          const session = await login({ phone: this.form.phone, password: this.form.password })
          saveSession(session)
          this.showToast('登录成功')
          setTimeout(() => this.finishAuthentication(), 350)
        } else if (this.mode === 'register') {
          const session = await register({ phone: this.form.phone, nickname: this.form.nickname, password: this.form.password })
          saveSession(session)
          this.showToast('注册成功')
          setTimeout(() => this.finishAuthentication(), 350)
        } else {
          const response = await resetPassword({ phone: this.form.phone, code: this.form.code, new_password: this.form.password })
          this.showToast(response.message)
          setTimeout(() => this.switchMode('login'), 900)
        }
      } catch (error) {
        this.showToast(error.message)
      } finally {
        this.loading = false
      }
    },
    async sendCode() {
      if (this.countdown > 0 || this.sendingCode || !this.validPhone()) return
      this.sendingCode = true
      try {
        const response = await requestPasswordReset({ phone: this.form.phone })
        this.showToast(response.message || '验证码已发送')
        this.countdown = 60
        this.timer = setInterval(() => {
          this.countdown -= 1
          if (this.countdown <= 0) {
            clearInterval(this.timer)
            this.timer = null
          }
        }, 1000)
      } catch (error) {
        this.showToast(error.message)
      } finally {
        this.sendingCode = false
      }
    },
    showToast(message) {
      this.toast = message
      setTimeout(() => { this.toast = '' }, 2400)
    },
    finishAuthentication() {
      const target = this.redirect || '/pages/index/index'
      if (/^\/pages\/(index|academy|work|market|community|profile)\/index(?:\?|$)/.test(target)) {
        uni.reLaunch({ url: target })
      } else {
        uni.redirectTo({ url: target })
      }
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.reLaunch({ url: '/pages/entry/index' })
    }
  }
}
</script>

<style scoped>
.auth-page { position: fixed; inset: 0; display: grid; grid-template-columns: minmax(320px, .9fr) minmax(380px, 1.1fr); overflow: hidden; background: #071d2e; color: #edf7f8; }
.auth-visual { position: relative; min-height: 100vh; overflow: hidden; background: #0b263a; }.auth-visual image, .visual-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }.visual-scrim { background: linear-gradient(180deg, rgba(4,20,34,.08), rgba(4,20,34,.86)); }.brand-block { position: absolute; z-index: 2; left: 52rpx; right: 52rpx; bottom: 58rpx; display: flex; flex-direction: column; }.brand-kicker { color: #35dfb2; font-size: 20rpx; letter-spacing: 3rpx; }.brand-title { margin-top: 15rpx; color: #fff; font-size: 52rpx; font-weight: 750; }.brand-note { margin-top: 12rpx; color: #b5c8d1; font-size: 25rpx; }
.auth-scroll { height: 100vh; }.auth-main { width: min(620rpx, calc(100% - 80rpx)); min-height: 100vh; margin: 0 auto; padding: max(28rpx, env(safe-area-inset-top)) 0 max(40rpx, env(safe-area-inset-bottom)); box-sizing: border-box; }.auth-head { display: flex; height: 76rpx; align-items: center; justify-content: space-between; }.back-button { display: flex; width: 64rpx; height: 64rpx; align-items: center; justify-content: center; color: #a8bec9; font-size: 52rpx; }.mode-tabs { display: flex; gap: 32rpx; }.mode-tab { padding: 16rpx 0 12rpx; border-bottom: 3rpx solid transparent; color: #7894a3; font-size: 25rpx; }.mode-tab.active { border-color: #19cfa0; color: #edf7f8; }
.form-heading { margin: 70rpx 0 42rpx; }.form-title { display: block; font-size: 48rpx; font-weight: 750; }.form-note { display: block; margin-top: 13rpx; color: #8ea6b3; font-size: 24rpx; }.auth-form { display: flex; flex-direction: column; gap: 25rpx; }.field-label { display: block; margin-bottom: 11rpx; color: #c7d5dc; font-size: 23rpx; }.field-input { width: 100%; height: 82rpx; padding: 0 18rpx; border: 1rpx solid #28495c; border-radius: 6rpx; background: #0b263a; color: #edf7f8; font-size: 26rpx; }.placeholder { color: #607d8c; }.password-row, .code-row { position: relative; display: flex; gap: 12rpx; }.password-row .field-input { padding-right: 100rpx; }.visibility-button { position: absolute; right: 18rpx; top: 0; display: flex; height: 82rpx; align-items: center; color: #19cfa0; font-size: 21rpx; }.code-row .field-input { min-width: 0; flex: 1; }.code-button { display: flex; width: 176rpx; height: 82rpx; flex: 0 0 176rpx; align-items: center; justify-content: center; border: 1rpx solid #2b5962; border-radius: 6rpx; color: #35dfb2; font-size: 22rpx; }
.agreement { display: flex; align-items: center; gap: 12rpx; color: #839eac; font-size: 21rpx; line-height: 1.5; }.checkbox { display: flex; width: 34rpx; height: 34rpx; flex: 0 0 34rpx; align-items: center; justify-content: center; border: 1rpx solid #456476; border-radius: 4rpx; color: #062218; font-size: 22rpx; }.checkbox.checked { border-color: #19cfa0; background: #19cfa0; }.submit-button { display: flex; height: 84rpx; align-items: center; justify-content: center; margin-top: 5rpx; border-radius: 6rpx; background: #19cfa0; color: #062218; font-size: 27rpx; font-weight: 700; transition: transform .16s ease; }.submit-button:active { transform: scale(.985); }.disabled { opacity: .55; }.form-links { display: flex; justify-content: space-between; color: #78d9c0; font-size: 22rpx; }.form-links.single { justify-content: center; }.auth-toast { position: fixed; z-index: 10; left: 50%; bottom: calc(40rpx + env(safe-area-inset-bottom)); max-width: 560rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border: 1rpx solid #315365; border-radius: 6rpx; background: rgba(3,18,30,.96); color: #edf7f8; font-size: 23rpx; text-align: center; }
@media (max-width: 640px) { .auth-page { display: block; }.auth-visual { position: absolute; inset: 0 0 auto; min-height: 270rpx; height: 270rpx; }.visual-scrim { background: linear-gradient(180deg, rgba(4,20,34,.18), #071d2e); }.brand-block { left: 36rpx; bottom: 34rpx; }.brand-title { font-size: 38rpx; }.brand-note { display: none; }.auth-scroll { position: relative; z-index: 3; }.auth-main { width: calc(100% - 64rpx); padding-top: max(24rpx, env(safe-area-inset-top)); }.auth-head { color: #fff; }.form-heading { margin-top: 160rpx; margin-bottom: 34rpx; }.form-title { font-size: 42rpx; }.auth-form { gap: 22rpx; } }
</style>
