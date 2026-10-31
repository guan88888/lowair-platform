<template>
  <view class="auth-page">
    <view class="auth-visual">
      <image src="/static/images/online-drone-login.jpg" mode="aspectFill"></image>
      <view class="visual-scrim"></view>
      <view class="brand-block">
        <text class="brand-kicker">SKYDOME AVIATION</text>
        <text class="brand-title">天穹智航</text>
        <text class="brand-note">{{ t('连接资质、任务与飞行服务') }}</text>
      </view>
    </view>

    <scroll-view class="auth-scroll" scroll-y :show-scrollbar="false">
      <view class="auth-main">
        <view class="auth-head">
          <view class="back-button" @tap="goBack" :aria-label="t('返回')"><text>‹</text></view>
          <view class="mode-tabs">
            <text class="mode-tab" :class="{ active: mode === 'login' }" @tap="switchMode('login')">{{ t('登录') }}</text>
            <text class="mode-tab" :class="{ active: mode === 'register' }" @tap="switchMode('register')">{{ t('注册') }}</text>
          </view>
        </view>

        <view class="form-heading">
          <text class="form-title">{{ t(title) }}</text>
          <text class="form-note">{{ t(note) }}</text>
        </view>

        <view class="auth-form">
          <view v-if="errorMessage" class="error-banner">
            <text>{{ errorMessage }}</text>
            <text class="retry-link" @tap="submit">{{ t('重试') }}</text>
          </view>
          <view v-if="mode === 'login'" class="account-type-tabs">
            <view :class="{ active: accountType === 'personal' }" @tap="selectAccountType('personal')"><text>个人登录</text><text>飞手与普通用户</text></view>
            <view :class="{ active: accountType === 'enterprise' }" @tap="selectAccountType('enterprise')"><text>企业登录</text><text>招聘与任务发布</text></view>
          </view>
          <view v-if="mode === 'register'" class="field">
            <text class="field-label">{{ t('昵称') }}</text>
            <input v-model.trim="form.nickname" class="field-input" maxlength="30" :placeholder="t('请输入昵称')" placeholder-class="placeholder" />
          </view>

          <view class="field">
            <text class="field-label">{{ t('手机号') }}</text>
            <input v-model.trim="form.phone" class="field-input" type="number" maxlength="11" :placeholder="t('请输入手机号')" placeholder-class="placeholder" />
          </view>

          <view v-if="mode === 'login' && accountType === 'personal'" class="login-methods">
            <text class="login-method" :class="{ active: loginMode === 'password' }" @tap="loginMode = 'password'">{{ t('密码登录') }}</text>
            <text class="login-method" :class="{ active: loginMode === 'code' }" @tap="loginMode = 'code'">{{ t('验证码登录') }}</text>
          </view>

          <view v-if="mode === 'forgot' || (mode === 'login' && loginMode === 'code')" class="field">
            <text class="field-label">{{ t('验证码') }}</text>
            <view class="code-row">
              <input v-model.trim="form.code" class="field-input" type="number" maxlength="6" :placeholder="t('6 位验证码')" placeholder-class="placeholder" />
              <view class="code-button" :class="{ disabled: countdown > 0 || sendingCode }" @tap="sendCode">
                {{ countdown > 0 ? countdown + 's' : (sendingCode ? t('发送中') : t('获取验证码')) }}
              </view>
            </view>
          </view>

          <view v-if="mode !== 'login' || loginMode === 'password'" class="field">
            <text class="field-label">{{ t(mode === 'forgot' ? '新密码' : '密码') }}</text>
            <view class="password-row">
              <input v-model="form.password" class="field-input" :password="!showPassword" maxlength="64" :placeholder="t(mode === 'forgot' ? '设置至少 8 位新密码' : '请输入至少 8 位密码')" placeholder-class="placeholder" />
              <text class="visibility-button" @tap="showPassword = !showPassword">{{ t(showPassword ? '隐藏' : '显示') }}</text>
            </view>
            <text v-if="mode !== 'login' || loginMode === 'password'" class="password-strength" :class="passwordStrength.tone">{{ t(passwordStrength.label) }}</text>
          </view>

          <view v-if="mode !== 'login'" class="field">
            <text class="field-label">{{ t('确认密码') }}</text>
            <input v-model="form.confirmPassword" class="field-input" :password="!showPassword" maxlength="64" :placeholder="t('请再次输入密码')" placeholder-class="placeholder" />
          </view>

          <view v-if="mode === 'register'" class="agreement" @tap="form.agreed = !form.agreed">
            <view class="checkbox" :class="{ checked: form.agreed }"><text v-if="form.agreed">✓</text></view>
            <text>{{ t('我已阅读并同意') }} <text class="legal-link" @tap.stop="openLegal('terms')">{{ t('用户协议') }}</text> {{ t('和') }} <text class="legal-link" @tap.stop="openLegal('privacy')">{{ t('隐私政策') }}</text></text>
          </view>

          <view v-if="mode === 'login'" class="auth-legal"><text>{{ t('登录即表示同意') }}</text><text class="legal-link" @tap="openLegal('terms')">{{ t('用户协议') }}</text><text>{{ t('和') }}</text><text class="legal-link" @tap="openLegal('privacy')">{{ t('隐私政策') }}</text></view>

          <view class="submit-button" :class="{ disabled: loading }" @tap="submit">
            {{ loading ? t('处理中...') : t(submitText) }}
          </view>

          <view v-if="mode === 'login'" class="form-links">
            <text @tap="switchMode('forgot')">{{ t('忘记密码') }}</text>
            <text @tap="switchMode('register')">{{ t('还没有账号？立即注册') }}</text>
          </view>
          <view v-else class="form-links single"><text @tap="switchMode('login')">{{ t('返回登录') }}</text></view>
        </view>
      </view>
    </scroll-view>

    <view v-if="toast" class="auth-toast">{{ toast }}</view>
    <view v-if="legalDoc" class="legal-mask" @tap="legalDoc = ''"><view class="legal-sheet" @tap.stop><text class="legal-title">{{ legalDoc === 'privacy' ? t('隐私政策') : t('用户协议') }}</text><text class="legal-copy">{{ legalDoc === 'privacy' ? t('我们仅在登录、身份认证和业务履约所必需的范围处理资料。证件材料通过私有接口提交，密码、验证码和原始材料不会由本地页面保存。') : t('你可以浏览公开内容；投递、抢单、购买和工作台操作会根据登录状态与服务端认证结果开放。') }}</text><view class="legal-close" @tap="legalDoc = ''">{{ t('知道了') }}</view></view></view>
  </view>
</template>

<script>
import { login, loginWithCode, register, requestLoginCode, requestPasswordReset, resetPassword } from '../../api/auth'
import { resolveReturnUrl, saveSession } from '../../utils/auth'
import { translate } from '../../data/localization'

const emptyForm = () => ({ phone: '', nickname: '', password: '', confirmPassword: '', code: '', agreed: false })

export default {
  data() {
    return {
      mode: 'login',
      loginMode: 'password',
      accountType: 'personal',
      redirect: '',
      form: emptyForm(),
      loading: false,
      sendingCode: false,
      showPassword: false,
      countdown: 0,
      timer: null,
      toast: '',
      errorMessage: '',
      legalDoc: '',
      locale: 'zh'
    }
  },
  computed: {
    title() {
      if (this.mode === 'login' && this.accountType === 'enterprise') return '企业账号登录'
      return { login: '欢迎回来', register: '创建账号', forgot: '重置密码' }[this.mode]
    },
    note() {
      if (this.mode === 'login' && this.loginMode === 'code') return '使用手机号和验证码继续'
      if (this.mode === 'login' && this.accountType === 'enterprise') return '仅已具备企业角色的账号可进入企业工作台'
      return { login: '使用手机号和密码继续', register: '注册不需要邮箱', forgot: '通过手机验证码设置新密码' }[this.mode]
    },
    submitText() {
      if (this.mode === 'login' && this.loginMode === 'code') return '验证码登录'
      return { login: '登录', register: '注册并登录', forgot: '确认重置' }[this.mode]
    },
    passwordStrength() {
      const value = this.form.password || ''
      if (!value) return { label: '请输入密码', tone: 'empty' }
      if (value.length < 8) return { label: '密码至少 8 位', tone: 'weak' }
      const groups = [/[a-z]/i, /\d/, /[^\da-z]/i].filter((pattern) => pattern.test(value)).length
      if (groups < 2) return { label: '密码强度：较弱', tone: 'weak' }
      if (groups === 2 || value.length < 12) return { label: '密码强度：中等', tone: 'medium' }
      return { label: '密码强度：较强', tone: 'strong' }
    }
  },
  onLoad(options) {
    const locale = uni.getStorageSync('lowair-demo-locale')
    if (['zh', 'en', 'ja', 'ru', 'de'].includes(locale)) this.locale = locale
    if (['login', 'register', 'forgot'].includes(options?.mode)) this.mode = options.mode
    this.redirect = resolveReturnUrl(options, '/pages/index/index')
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    t(value) { return translate(value, this.locale) },
    switchMode(mode) {
      this.mode = mode
      this.form = emptyForm()
      this.loginMode = 'password'
      this.showPassword = false
      this.errorMessage = ''
    },
    selectAccountType(type) { this.accountType = type; if (type === 'enterprise') this.loginMode = 'password'; this.errorMessage = '' },
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
      if ((this.mode === 'forgot' || (this.mode === 'login' && this.loginMode === 'code')) && !/^\d{6}$/.test(this.form.code)) {
        this.showToast('请输入 6 位验证码')
        return false
      }
      if ((this.mode !== 'login' || this.loginMode === 'password') && this.form.password.length < 8) {
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
      this.errorMessage = ''
      try {
        if (this.mode === 'login') {
          const session = this.loginMode === 'code'
            ? await loginWithCode({ phone: this.form.phone, code: this.form.code, account_type: this.accountType })
            : await login({ phone: this.form.phone, password: this.form.password, account_type: this.accountType })
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
        this.errorMessage = error.message || this.t('请求失败，请稍后重试')
        this.showToast(error.message)
      } finally {
        this.loading = false
      }
    },
    async sendCode() {
      if (this.countdown > 0 || this.sendingCode || !this.validPhone()) return
      this.sendingCode = true
      try {
        const response = await (this.mode === 'login' ? requestLoginCode({ phone: this.form.phone }) : requestPasswordReset({ phone: this.form.phone }))
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
      this.toast = this.t(message)
      setTimeout(() => { this.toast = '' }, 2400)
    },
    openLegal(kind) { this.legalDoc = kind },
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
.error-banner { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 18rpx; border: 1rpx solid rgba(242,180,86,.48); border-radius: 6rpx; background: rgba(242,180,86,.08); color: #f4c779; font-size: 22rpx; line-height: 1.5; }.retry-link { flex: 0 0 auto; color: #35dfb2; }
.account-type-tabs { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12rpx; }.account-type-tabs > view { display: flex; min-height: 88rpx; flex-direction: column; justify-content: center; gap: 5rpx; padding: 0 16rpx; border: 1rpx solid #28495c; border-radius: 6rpx; background: #0b263a; }.account-type-tabs > view.active { border-color: #19cfa0; background: rgba(25,207,160,.08); }.account-type-tabs text:first-child { color: #edf7f8; font-size: 23rpx; font-weight: 700; }.account-type-tabs text:last-child { color: #7894a3; font-size: 18rpx; }
.form-heading { margin: 70rpx 0 42rpx; }.form-title { display: block; font-size: 48rpx; font-weight: 750; }.form-note { display: block; margin-top: 13rpx; color: #8ea6b3; font-size: 24rpx; }.auth-form { display: flex; flex-direction: column; gap: 25rpx; }.field-label { display: block; margin-bottom: 11rpx; color: #c7d5dc; font-size: 23rpx; }.field-input { width: 100%; height: 82rpx; padding: 0 18rpx; border: 1rpx solid #28495c; border-radius: 6rpx; background: #0b263a; color: #edf7f8; font-size: 26rpx; }.placeholder { color: #607d8c; }.password-row, .code-row { position: relative; display: flex; gap: 12rpx; }.password-row .field-input { padding-right: 100rpx; }.visibility-button { position: absolute; right: 18rpx; top: 0; display: flex; height: 82rpx; align-items: center; color: #19cfa0; font-size: 21rpx; }.code-row .field-input { min-width: 0; flex: 1; }.code-button { display: flex; width: 176rpx; height: 82rpx; flex: 0 0 176rpx; align-items: center; justify-content: center; border: 1rpx solid #2b5962; border-radius: 6rpx; color: #35dfb2; font-size: 22rpx; }
.login-methods { display: flex; gap: 24rpx; border-bottom: 1rpx solid #28495c; }.login-method { padding: 0 0 12rpx; color: #7894a3; font-size: 22rpx; }.login-method.active { border-bottom: 2rpx solid #19cfa0; color: #edf7f8; }.password-strength { display: block; margin-top: 8rpx; font-size: 19rpx; }.password-strength.empty { color: #607d8c; }.password-strength.weak { color: #ee987e; }.password-strength.medium { color: #f2c779; }.password-strength.strong { color: #35dfb2; }.agreement { display: flex; align-items: center; gap: 12rpx; color: #839eac; font-size: 21rpx; line-height: 1.5; }.auth-legal { display: flex; justify-content: center; gap: 8rpx; color: #6d8997; font-size: 19rpx; }.legal-link { color: #35dfb2; }.checkbox { display: flex; width: 34rpx; height: 34rpx; flex: 0 0 34rpx; align-items: center; justify-content: center; border: 1rpx solid #456476; border-radius: 4rpx; color: #062218; font-size: 22rpx; }.checkbox.checked { border-color: #19cfa0; background: #19cfa0; }.submit-button { display: flex; height: 84rpx; align-items: center; justify-content: center; margin-top: 5rpx; border-radius: 6rpx; background: #19cfa0; color: #062218; font-size: 27rpx; font-weight: 700; transition: transform .16s ease; }.submit-button:active { transform: scale(.985); }.disabled { opacity: .55; }.form-links { display: flex; justify-content: space-between; color: #78d9c0; font-size: 22rpx; }.form-links.single { justify-content: center; }.auth-toast { position: fixed; z-index: 10; left: 50%; bottom: calc(40rpx + env(safe-area-inset-bottom)); max-width: 560rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border: 1rpx solid #315365; border-radius: 6rpx; background: rgba(3,18,30,.96); color: #edf7f8; font-size: 23rpx; text-align: center; }.legal-mask { position: fixed; z-index: 20; inset: 0; display: flex; align-items: center; justify-content: center; padding: 36rpx; background: rgba(2,13,21,.72); }.legal-sheet { width: 100%; max-width: 620rpx; padding: 28rpx; border: 1rpx solid #315365; border-radius: 8rpx; background: #0b263a; }.legal-title { display: block; color: #edf7f8; font-size: 29rpx; font-weight: 700; }.legal-copy { display: block; margin-top: 18rpx; color: #b8cbd3; font-size: 22rpx; line-height: 1.7; }.legal-close { display: flex; height: 70rpx; align-items: center; justify-content: center; margin-top: 22rpx; border-radius: 6rpx; background: #19cfa0; color: #062218; font-size: 23rpx; }
@media (max-width: 640px) { .auth-page { display: block; }.auth-visual { position: absolute; inset: 0 0 auto; min-height: 270rpx; height: 270rpx; }.visual-scrim { background: linear-gradient(180deg, rgba(4,20,34,.18), #071d2e); }.brand-block { left: 36rpx; bottom: 34rpx; }.brand-title { font-size: 38rpx; }.brand-note { display: none; }.auth-scroll { position: relative; z-index: 3; }.auth-main { width: calc(100% - 64rpx); padding-top: max(24rpx, env(safe-area-inset-top)); }.auth-head { color: #fff; }.form-heading { margin-top: 160rpx; margin-bottom: 34rpx; }.form-title { font-size: 42rpx; }.auth-form { gap: 22rpx; } }
</style>
