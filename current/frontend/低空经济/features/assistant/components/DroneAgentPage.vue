<template>
  <app-page-shell title="低空 AI 智能体" active="home" :theme="theme" :locale="locale" :show-assistant="false">
    <view class="agent-page">
      <view class="workspace-bar">
        <view class="workspace-button" @tap="drawerOpen = true"><text class="workspace-icon">≡</text><text>会话</text><text class="workspace-count">{{ conversations.length }}</text></view>
        <view class="workspace-actions">
          <view class="icon-button" @tap="createConversation" aria-label="新建会话">+</view>
          <view class="text-action danger" :class="{ disabled: !activeConversation || busy }" @tap="confirmClear">清空</view>
        </view>
      </view>

      <view class="connection-banner" :class="connectionTone">
        <view class="connection-copy">
          <text class="connection-title">{{ connectionTitle }}</text>
          <text class="connection-note">{{ connectionNote }}</text>
        </view>
        <view v-if="connectionError && liveEnabled" class="banner-actions">
          <view v-if="requiresLogin" class="banner-action" @tap="goLogin">登录使用</view>
          <view v-else class="banner-action" @tap="loadConversations">重试连接</view>
          <view class="banner-action" @tap="useLocalDemo">本地演示</view>
        </view>
      </view>

      <view class="mode-section">
        <text class="section-label">工作模式</text>
        <scroll-view scroll-x :show-scrollbar="false" class="mode-scroll">
          <view class="mode-row">
            <view v-for="item in modes" :key="item" class="mode-option" :class="{ selected: mode === item }" @tap="selectMode(item)">{{ item }}</view>
          </view>
        </scroll-view>
      </view>

      <view class="conversation-head">
        <view class="conversation-heading">
          <text>{{ activeConversation ? activeConversation.title : '新会话' }}</text>
          <text>{{ mode }}　{{ activeConversation ? formatTime(activeConversation.updatedAt) : '未开始' }}</text>
        </view>
        <text class="safety-label">飞行安全优先</text>
      </view>

      <view v-if="loading" class="loading-state" aria-live="polite">
        <view class="loading-line wide"></view><view class="loading-line"></view><view class="loading-line short"></view>
        <text>正在恢复会话</text>
      </view>

      <view v-else class="message-flow" aria-live="polite">
        <view v-if="!messages.length" class="welcome-panel">
          <view class="welcome-mark">AI</view>
          <text class="welcome-title">先说明现场，再开始判断</text>
          <text class="welcome-copy">我会引用你的问题，标出缺失信息和安全边界。空域、气象和紧急事件必须由官方信息与现场负责人复核。</text>
          <view class="capability-line"><text>可恢复会话</text><text>来源可核对</text><text>支持停止与重试</text></view>
        </view>

        <view v-for="(message, index) in messages" :key="message.id" class="message" :class="message.role">
          <view v-if="message.role === 'assistant'" class="message-avatar">AI</view>
          <view class="message-body">
            <view class="message-meta">
              <text>{{ message.role === 'user' ? '你' : '低空 AI' }}</text>
              <text v-if="message.status === 'failed'" class="failed-label">生成失败</text>
              <text v-else-if="message.status === 'cancelled'" class="cancelled-label">已停止</text>
              <text v-else>{{ formatTime(message.createdAt) }}</text>
            </view>
            <text class="message-content">{{ message.content }}</text>
            <view v-if="message.error" class="message-error">{{ message.error }}</view>
            <view v-if="message.sources && message.sources.length" class="source-block">
              <view class="source-toggle" @tap="toggleSources(message.id)">
                <text>来源与核对项　{{ message.sources.length }}</text><text>{{ openSources[message.id] ? '收起' : '展开' }}</text>
              </view>
              <view v-if="openSources[message.id]" class="source-list">
                <view v-for="source in message.sources" :key="source.id" class="source-item" @tap="openSource(source)">
                  <view class="source-number">{{ sourceIndex(message.sources, source) }}</view>
                  <view class="source-copy"><text>{{ source.title }}</text><text>{{ source.excerpt || source.kind }}</text></view>
                  <text v-if="source.url" class="source-link">↗</text>
                  <text v-else-if="source.pending" class="source-pending">待核对</text>
                </view>
              </view>
            </view>
            <view class="message-actions">
              <view class="message-action" @tap="copyMessage(message)">复制</view>
              <view v-if="message.role === 'assistant' && message.status !== 'generating'" class="message-action primary" @tap="retryMessage(message, index)">{{ message.status === 'completed' ? '重新生成' : '重试生成' }}</view>
            </view>
          </view>
        </view>

        <view v-if="busy" class="message assistant generating">
          <view class="message-avatar">AI</view>
          <view class="message-body">
            <view class="message-meta"><text>低空 AI</text><text>{{ generationStatus }}</text></view>
            <view class="thinking-lines"><view></view><view></view><view></view></view>
          </view>
        </view>
      </view>

      <view v-if="!messages.length && !loading" class="recommendations">
        <view class="recommendation-head"><text>推荐问题</text><text>选择后仍可编辑</text></view>
        <view class="recommendation-list">
          <view v-for="prompt in activeSuggestions" :key="prompt" class="recommendation" @tap="applySuggestion(prompt)"><text>{{ prompt }}</text><text>→</text></view>
        </view>
      </view>

      <view class="composer-wrap">
        <view v-if="rateLimitSeconds > 0" class="rate-limit-note">请求受限，约 {{ rateLimitSeconds }} 秒后可重试。</view>
        <view class="context-toggle" @tap="contextOpen = !contextOpen">
          <view><text>任务上下文</text><text>仅发送你主动填写的内容</text></view><text>{{ contextOpen ? '收起' : '填写' }}</text>
        </view>
        <view v-if="contextOpen" class="context-fields">
          <input v-model="context.aircraftModel" :disabled="busy" :maxlength="80" placeholder="机型 / 载荷（选填）" placeholder-class="composer-placeholder" />
          <input v-model="context.city" :disabled="busy" :maxlength="80" placeholder="城市 / 作业区域（选填）" placeholder-class="composer-placeholder" />
          <textarea v-model="context.task" :disabled="busy" :maxlength="500" auto-height placeholder="任务目标、时间或已获授权（选填）" placeholder-class="composer-placeholder" />
          <text>不会自动读取精确位置、证件、飞行日志或私人聊天。</text>
        </view>
        <textarea v-model="input" class="composer-input" :disabled="busy" :maxlength="2000" auto-height :placeholder="composerPlaceholder" placeholder-class="composer-placeholder" @confirm="sendMessage" />
        <view class="composer-footer">
          <text>{{ input.length }}/2000　请勿输入敏感个人信息</text>
          <view v-if="busy" class="stop-button" @tap="stopGeneration"><text class="stop-square"></text><text>停止</text></view>
          <view v-else class="send-button" :class="{ disabled: !canSend }" @tap="sendMessage"><text>发送</text><text>↑</text></view>
        </view>
      </view>

      <text class="legal-note">AI 建议不构成空域批复、气象放行、维修结论或紧急救援指令。飞行决策以官方信息、设备手册和现场负责人判断为准。</text>
    </view>

    <view v-if="drawerOpen" class="drawer-overlay" @tap="drawerOpen = false">
      <view class="conversation-drawer" @tap.stop>
        <view class="drawer-head"><view><text>会话记录</text><text>最多在本机保留 30 条演示会话</text></view><view class="drawer-close" @tap="drawerOpen = false">×</view></view>
        <view class="drawer-new" @tap="createConversation"><text>+</text><text>新建会话</text></view>
        <scroll-view scroll-y class="conversation-list" :show-scrollbar="false">
          <view v-if="!conversations.length" class="drawer-empty"><text>还没有会话</text><text>提出第一个问题后会自动保存。</text></view>
          <view v-for="conversation in conversations" :key="conversation.id" class="conversation-item" :class="{ selected: activeConversation && activeConversation.id === conversation.id }" @tap="openConversation(conversation)">
            <view class="conversation-item-copy"><text>{{ conversation.title }}</text><text>{{ conversation.mode }}　{{ formatTime(conversation.updatedAt) }}</text></view>
            <view class="delete-action" @tap.stop="confirmDelete(conversation)">删除</view>
          </view>
        </scroll-view>
        <view class="drawer-foot">{{ liveEnabled && !demoMode ? '会话由后端 AI 代理恢复' : '本地演示会话保存在当前设备' }}</view>
      </view>
    </view>

    <view v-if="toast" class="agent-toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import { ASSISTANT_MODES, AssistantApiError } from '../services/protocol.mjs'
import { assistantApi, demoSessionStore, liveAssistantEnabled } from '../services'

const SUGGESTIONS = {
  '飞前检查': ['明天在城区飞行，帮我列出起飞前必须确认的信息', '阵风比较大，应该怎样设置中止条件？', '帮我生成一份包含返航和备降点的检查单'],
  '任务方案': ['规划一次电力巡检前，你需要我提供哪些信息？', '如何为测绘任务设置中止条件和交付验收点？', '城市建筑外立面航拍有哪些地面风险？'],
  '设备诊断': ['无人机电池鼓包后应该怎样隔离和处置？', '图传断连但没有告警代码，怎样逐步排查？', '飞行器悬停抖动，哪些情况必须停飞？'],
  '学考答疑': ['请用一个实际场景解释超视距的通信链路冗余', '为什么发现临时空域限制时必须先停止任务？', '帮我把气象题的判断依据整理成记忆卡']
}

export default {
  name: 'DroneAgentPage',
  components: { AppPageShell },
  data() {
    return {
      modes: ASSISTANT_MODES,
      mode: ASSISTANT_MODES[0],
      conversations: [],
      activeConversation: null,
      input: '',
      contextOpen: false,
      context: { aircraftModel: '', city: '', task: '' },
      busy: false,
      loading: true,
      drawerOpen: false,
      openSources: {},
      activeRequest: null,
      demoTimer: null,
      generationStatus: '正在连接 AI 代理',
      connectionError: '',
      demoMode: !liveAssistantEnabled,
      liveEnabled: liveAssistantEnabled,
      rateLimitSeconds: 0,
      rateLimitTimer: null,
      toast: '',
      toastTimer: null,
      theme: 'ocean',
      locale: 'zh'
    }
  },
  computed: {
    messages() { return this.activeConversation?.messages || [] },
    activeSuggestions() { return SUGGESTIONS[this.mode] || SUGGESTIONS['飞前检查'] },
    canSend() { return Boolean(this.input.trim()) && !this.busy && this.rateLimitSeconds <= 0 },
    composerPlaceholder() {
      const values = {
        '飞前检查': '说明机型、地点、时间、任务和现场气象…',
        '任务方案': '说明任务目标、区域、交付标准和已有授权…',
        '设备诊断': '说明机型、异常阶段、告警原文和日志…',
        '学考答疑': '输入目标等级、题目原文和全部选项…'
      }
      return values[this.mode]
    },
    connectionTitle() {
      if (this.requiresLogin) return '登录后使用低空 AI'
      if (this.connectionError && !this.demoMode) return 'AI 代理连接失败'
      return this.demoMode ? '本地演示模式' : 'AI 代理已连接'
    },
    connectionNote() {
      if (this.requiresLogin) return '真实模型仅通过本应用后端代理调用。登录后可保存并恢复会话，模型凭证不会进入前端。'
      if (this.connectionError && !this.demoMode) return this.connectionError
      if (this.demoMode) return '未调用文本模型。回答由本机场景规则生成，会引用问题并标出缺失信息。'
      return '所有模型凭证保留在服务端，前端仅调用会话代理。'
    },
    connectionTone() {
      if (this.connectionError && !this.demoMode) return 'error'
      return this.demoMode ? 'demo' : 'online'
    },
    requiresLogin() {
      return this.liveEnabled && !this.demoMode && /登录|认证/.test(this.connectionError)
    }
  },
  async mounted() {
    const savedTheme = uni.getStorageSync('lowair-demo-theme')
    if (savedTheme) this.theme = savedTheme
    const savedLocale = uni.getStorageSync('lowair-demo-locale')
    if (savedLocale) this.locale = savedLocale
    await this.loadConversations()
  },
  beforeUnmount() {
    if (this.activeRequest) this.activeRequest.cancel()
    if (this.demoTimer) clearTimeout(this.demoTimer)
    if (this.rateLimitTimer) clearInterval(this.rateLimitTimer)
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },
  methods: {
    async loadConversations() {
      this.loading = true
      try {
        if (this.demoMode) {
          this.conversations = demoSessionStore.list()
          const activeId = demoSessionStore.activeId()
          this.activeConversation = demoSessionStore.get(activeId) || this.conversations[0] || null
        } else {
          this.conversations = await assistantApi.listConversations()
          const activeId = uni.getStorageSync('lowair-assistant-live-active')
          const summary = this.conversations.find((item) => item.id === activeId) || this.conversations[0]
          this.activeConversation = summary ? await assistantApi.getConversation(summary.id) : null
        }
        if (this.activeConversation) this.mode = this.activeConversation.mode || this.mode
        this.connectionError = ''
        if (!this.demoMode && this.activeConversation) this.resumeInterruptedRun()
      } catch (error) {
        this.connectionError = this.describeError(error)
        this.activeConversation = null
        this.conversations = []
      } finally {
        this.loading = false
      }
    },
    useLocalDemo() {
      this.demoMode = true
      this.connectionError = ''
      this.loadConversations()
    },
    goLogin() {
      const redirect = encodeURIComponent('/pages/assistant/index?entry=global')
      uni.navigateTo({ url: '/pages/auth/index?mode=login&redirect=' + redirect })
    },
    async createConversation() {
      if (this.busy) return this.showToast('请先停止当前生成')
      try {
        const conversation = this.demoMode
          ? demoSessionStore.create({ mode: this.mode })
          : await assistantApi.createConversation({ mode: this.mode })
        this.activeConversation = conversation
        this.conversations = [conversation, ...this.conversations.filter((item) => item.id !== conversation.id)]
        this.drawerOpen = false
        this.input = ''
        this.connectionError = ''
        if (!this.demoMode) uni.setStorageSync('lowair-assistant-live-active', conversation.id)
      } catch (error) {
        this.connectionError = this.describeError(error)
        this.showToast(this.connectionError)
      }
    },
    async openConversation(conversation) {
      if (this.busy) return this.showToast('请先停止当前生成')
      this.loading = true
      this.drawerOpen = false
      try {
        this.activeConversation = this.demoMode ? demoSessionStore.get(conversation.id) : await assistantApi.getConversation(conversation.id)
        this.mode = this.activeConversation?.mode || this.mode
        if (this.demoMode) demoSessionStore.setActive(conversation.id)
        else uni.setStorageSync('lowair-assistant-live-active', conversation.id)
        if (!this.demoMode && this.activeConversation) this.resumeInterruptedRun()
      } catch (error) {
        this.showToast(this.describeError(error))
      } finally {
        this.loading = false
      }
    },
    selectMode(mode) {
      if (this.busy) return this.showToast('生成期间不能切换模式')
      this.mode = mode
      if (!this.activeConversation) return
      this.activeConversation = { ...this.activeConversation, mode }
      if (this.demoMode) this.saveDemoConversation()
    },
    applySuggestion(prompt) {
      this.input = prompt
    },
    async ensureConversation(question) {
      if (this.activeConversation) return this.activeConversation
      const title = this.makeTitle(question)
      const conversation = this.demoMode
        ? demoSessionStore.create({ mode: this.mode, title })
        : await assistantApi.createConversation({ mode: this.mode, title })
      this.activeConversation = conversation
      this.conversations = [conversation, ...this.conversations.filter((item) => item.id !== conversation.id)]
      return conversation
    },
    async sendMessage(forcedPrompt) {
      const question = typeof forcedPrompt === 'string' ? forcedPrompt.trim() : this.input.trim()
      if (!question || this.busy || this.rateLimitSeconds > 0) return
      try {
        await this.ensureConversation(question)
      } catch (error) {
        return this.handleSendError(error, question)
      }
      const userMessage = {
        id: 'user-' + Date.now().toString(36),
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
        status: 'completed',
        sources: []
      }
      this.activeConversation.messages.push(userMessage)
      if (this.activeConversation.title === '新会话') this.activeConversation.title = this.makeTitle(question)
      this.activeConversation.mode = this.mode
      this.activeConversation.updatedAt = new Date().toISOString()
      this.input = ''
      this.busy = true
      this.generationStatus = this.demoMode ? '正在生成本地演示回答' : '正在连接 AI 代理'
      if (this.demoMode) this.saveDemoConversation()

      if (this.demoMode) {
        this.demoTimer = setTimeout(() => {
          if (!this.busy) return
          const reply = demoSessionStore.generate({ prompt: question, mode: this.mode, context: this.context })
          this.activeConversation.messages.push(reply)
          this.busy = false
          this.demoTimer = null
          this.saveDemoConversation()
        }, 420)
        return
      }

      this.activeRequest = assistantApi.sendMessage({
        conversationId: this.activeConversation.id,
        content: question,
        mode: this.mode,
        context: this.context,
        onUpdate: (run) => { this.generationStatus = run.status === 'queued' ? '已排队，等待生成' : '正在生成回答' },
        onDelta: ({ runId, delta }) => this.appendStreamingReply(runId, delta)
      })
      try {
        const reply = await this.activeRequest.promise
        this.replaceStreamingReply(reply, question)
        this.activeConversation.updatedAt = new Date().toISOString()
        this.refreshConversationSummary()
      } catch (error) {
        if (error.kind !== 'cancelled') this.handleSendError(error, question, true)
      } finally {
        this.busy = false
        this.activeRequest = null
      }
    },
    async resumeInterruptedRun() {
      if (this.busy || !this.activeConversation) return
      const task = assistantApi.resumeRun({
        conversationId: this.activeConversation.id,
        onUpdate: (run) => { this.generationStatus = run.status === 'queued' ? '正在恢复排队任务' : '正在恢复未完成回答' },
        onDelta: ({ runId, delta }) => this.appendStreamingReply(runId, delta)
      })
      if (!task) return
      this.activeRequest = task
      this.busy = true
      this.generationStatus = '正在恢复未完成回答'
      try {
        const reply = await task.promise
        this.replaceStreamingReply(reply)
        this.activeConversation.updatedAt = new Date().toISOString()
        this.refreshConversationSummary()
        this.showToast('已恢复上次中断的回答')
      } catch (error) {
        if (error.kind !== 'cancelled') {
          const question = [...this.messages].reverse().find((item) => item.role === 'user')?.content || ''
          this.handleSendError(error, question, true)
        }
      } finally {
        this.busy = false
        this.activeRequest = null
      }
    },
    async stopGeneration() {
      if (!this.busy) return
      const lastQuestion = [...this.messages].reverse().find((item) => item.role === 'user')?.content || ''
      if (this.demoTimer) {
        clearTimeout(this.demoTimer)
        this.demoTimer = null
      }
      if (this.activeRequest) await this.activeRequest.cancel()
      this.discardStreamingReply()
      this.busy = false
      this.activeRequest = null
      this.activeConversation.messages.push({
        id: 'cancelled-' + Date.now().toString(36), role: 'assistant', content: '本次生成已由你停止。', status: 'cancelled', createdAt: new Date().toISOString(), sources: [], request: lastQuestion
      })
      if (this.demoMode) this.saveDemoConversation()
    },
    retryMessage(message, index) {
      if (this.busy) return
      const prompt = message.request || [...this.messages.slice(0, index)].reverse().find((item) => item.role === 'user')?.content
      if (!prompt) return this.showToast('未找到可重试的问题')
      this.sendMessage(prompt)
    },
    handleSendError(error, question, append = false) {
      this.discardStreamingReply()
      const message = this.describeError(error)
      if (error.kind === 'rate-limit') this.startRateLimit(error.retryAfter || 10)
      if (append && this.activeConversation) {
        this.activeConversation.messages.push({
          id: 'failed-' + Date.now().toString(36), role: 'assistant', content: '本次没有生成完整回答。', error: message, status: 'failed', createdAt: new Date().toISOString(), sources: [], request: question
        })
      }
      this.showToast(message)
    },
    startRateLimit(seconds) {
      this.rateLimitSeconds = Math.max(1, Math.ceil(seconds))
      if (this.rateLimitTimer) clearInterval(this.rateLimitTimer)
      this.rateLimitTimer = setInterval(() => {
        this.rateLimitSeconds = Math.max(0, this.rateLimitSeconds - 1)
        if (!this.rateLimitSeconds) { clearInterval(this.rateLimitTimer); this.rateLimitTimer = null }
      }, 1000)
    },
    confirmClear() {
      if (!this.activeConversation || this.busy) return
      uni.showModal({ title: '清空当前会话？', content: '所有消息和来源将被移除，会话仍保留。', confirmText: '清空', confirmColor: '#c85f5f', success: (result) => { if (result.confirm) this.clearConversation() } })
    },
    async clearConversation() {
      try {
        if (!this.demoMode) await assistantApi.clearConversation(this.activeConversation.id)
        this.activeConversation.messages = []
        this.activeConversation.title = '新会话'
        if (this.demoMode) this.saveDemoConversation()
        this.showToast('当前会话已清空')
      } catch (error) {
        this.showToast(this.describeError(error))
      }
    },
    confirmDelete(conversation) {
      if (this.busy) return
      uni.showModal({ title: '删除会话？', content: `“${conversation.title}”将不再可恢复。`, confirmText: '删除', confirmColor: '#c85f5f', success: (result) => { if (result.confirm) this.deleteConversation(conversation) } })
    },
    async deleteConversation(conversation) {
      try {
        if (this.demoMode) demoSessionStore.remove(conversation.id)
        else await assistantApi.deleteConversation(conversation.id)
        this.conversations = this.conversations.filter((item) => item.id !== conversation.id)
        if (this.activeConversation?.id === conversation.id) this.activeConversation = this.conversations[0] || null
        if (this.activeConversation) await this.openConversation(this.activeConversation)
        this.showToast('会话已删除')
      } catch (error) {
        this.showToast(this.describeError(error))
      }
    },
    saveDemoConversation() {
      this.activeConversation = demoSessionStore.save(this.activeConversation)
      this.refreshConversationSummary()
    },
    appendStreamingReply(runId, delta) {
      if (!delta || !this.activeConversation) return
      const index = this.activeConversation.messages.findIndex((item) => item.streamRunId === runId)
      if (index < 0) {
        this.activeConversation.messages.push({
          id: 'stream-' + runId, streamRunId: runId, role: 'assistant', content: delta,
          status: 'generating', createdAt: new Date().toISOString(), sources: []
        })
        return
      }
      const current = this.activeConversation.messages[index]
      this.activeConversation.messages[index] = { ...current, content: current.content + delta }
    },
    replaceStreamingReply(reply, request) {
      const index = this.activeConversation.messages.findIndex((item) => item.streamRunId)
      const normalized = { ...reply, request: request || reply.request }
      if (index < 0) this.activeConversation.messages.push(normalized)
      else this.activeConversation.messages.splice(index, 1, normalized)
    },
    discardStreamingReply() {
      if (!this.activeConversation) return
      this.activeConversation.messages = this.activeConversation.messages.filter((item) => !item.streamRunId)
    },
    refreshConversationSummary() {
      const summary = { ...this.activeConversation, messages: this.activeConversation.messages }
      this.conversations = [summary, ...this.conversations.filter((item) => item.id !== summary.id)]
    },
    toggleSources(id) {
      this.openSources = { ...this.openSources, [id]: !this.openSources[id] }
    },
    sourceIndex(sources, source) { return String(sources.indexOf(source) + 1).padStart(2, '0') },
    openSource(source) {
      if (!source.url) return this.showToast(source.pending ? '请先提供准确机型，再核对对应手册' : source.excerpt || source.kind)
      if (typeof window !== 'undefined' && typeof window.open === 'function') window.open(source.url, '_blank', 'noopener,noreferrer')
      else uni.setClipboardData({ data: source.url, success: () => this.showToast('来源链接已复制') })
    },
    copyMessage(message) {
      uni.setClipboardData({ data: message.content, success: () => this.showToast('回答已复制') })
    },
    makeTitle(question) {
      const value = question.replace(/\s+/g, ' ').trim()
      return value.length > 18 ? value.slice(0, 18) + '…' : value
    },
    formatTime(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const sameDay = date.toDateString() === now.toDateString()
      return sameDay ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : `${date.getMonth() + 1}月${date.getDate()}日`
    },
    describeError(error) {
      if (error instanceof AssistantApiError) return error.message
      return error?.message || 'AI 服务暂时不可用'
    },
    showToast(text) {
      this.toast = text
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast = '' }, 2200)
    }
  }
}
</script>

<style scoped>
.agent-page { min-height: 100%; padding: 22rpx 26rpx 34rpx; background: var(--app-bg); }
.workspace-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }.workspace-button, .workspace-actions { display: flex; align-items: center; }.workspace-button { min-height: 64rpx; gap: 10rpx; padding: 0 16rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 23rpx; }.workspace-icon { color: var(--accent); font-size: 28rpx; }.workspace-count { min-width: 32rpx; padding: 3rpx 8rpx; border-radius: 999px; background: var(--surface-strong); color: var(--muted); font-size: 18rpx; text-align: center; }.workspace-actions { gap: 10rpx; }.icon-button, .text-action { display: flex; min-height: 64rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); transition: transform .16s ease, border-color .16s ease; }.icon-button { width: 64rpx; color: var(--accent); font-size: 34rpx; }.text-action { padding: 0 17rpx; color: var(--muted); font-size: 22rpx; }.text-action.danger { color: #df9696; }.disabled { opacity: .46; pointer-events: none; }.workspace-button:active, .icon-button:active, .text-action:active { transform: scale(.97); border-color: var(--accent); }
.connection-banner { display: flex; align-items: center; gap: 14rpx; margin-bottom: 22rpx; padding: 18rpx 20rpx; border: 1rpx solid var(--line); border-left-width: 5rpx; border-radius: 8px; background: var(--surface); }.connection-banner.demo { border-left-color: #d29a4d; }.connection-banner.online { border-left-color: var(--accent); }.connection-banner.error { border-left-color: #d66868; }.connection-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 5rpx; }.connection-title { color: var(--text); font-size: 23rpx; font-weight: 650; }.connection-note { color: var(--muted); font-size: 20rpx; line-height: 1.45; }.banner-actions { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 4rpx; }.banner-action { padding: 5rpx 0 5rpx 12rpx; color: var(--accent); font-size: 21rpx; }
.mode-section { margin-bottom: 22rpx; }.section-label { display: block; margin-bottom: 10rpx; color: var(--muted); font-size: 20rpx; }.mode-scroll { width: 100%; white-space: nowrap; }.mode-row { display: inline-flex; gap: 10rpx; padding-right: 18rpx; }.mode-option { padding: 13rpx 18rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface); color: var(--muted); font-size: 22rpx; transition: transform .16s ease, color .16s ease, border-color .16s ease; }.mode-option.selected { border-color: var(--accent); background: rgba(25, 207, 160, .08); color: var(--accent); }.mode-option:active { transform: scale(.97); }
.conversation-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 18rpx 0; border-top: 1rpx solid var(--line); border-bottom: 1rpx solid var(--line); }.conversation-heading { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 5rpx; }.conversation-heading text:first-child { overflow: hidden; color: var(--text); font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.conversation-heading text:last-child { color: var(--muted); font-size: 19rpx; }.safety-label { flex: 0 0 auto; color: var(--accent); font-size: 19rpx; }
.loading-state { display: flex; flex-direction: column; gap: 12rpx; margin: 24rpx 0; padding: 26rpx; border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 21rpx; }.loading-line { width: 72%; height: 18rpx; border-radius: 4rpx; background: var(--surface-strong); animation: loadingPulse 1.2s ease-in-out infinite; }.loading-line.wide { width: 92%; }.loading-line.short { width: 48%; margin-bottom: 8rpx; }
.message-flow { padding-top: 24rpx; }.welcome-panel { padding: 28rpx 24rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.welcome-mark { display: flex; width: 66rpx; height: 66rpx; align-items: center; justify-content: center; margin-bottom: 20rpx; border-radius: 8px; background: var(--accent); color: var(--accent-ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 21rpx; font-weight: 800; }.welcome-title { display: block; color: var(--text); font-size: 31rpx; font-weight: 750; line-height: 1.35; }.welcome-copy { display: block; margin-top: 12rpx; color: var(--muted); font-size: 23rpx; line-height: 1.65; }.capability-line { display: flex; flex-wrap: wrap; gap: 12rpx 20rpx; margin-top: 22rpx; padding-top: 18rpx; border-top: 1rpx solid var(--line); color: var(--muted); font-size: 19rpx; }.capability-line text::before { content: '✓'; margin-right: 7rpx; color: var(--accent); }
.message { display: flex; align-items: flex-start; gap: 12rpx; margin-bottom: 24rpx; }.message.user { justify-content: flex-end; }.message-avatar { display: flex; width: 48rpx; height: 48rpx; flex: 0 0 48rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 7px; background: var(--surface); color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 16rpx; font-weight: 750; }.message-body { min-width: 0; max-width: calc(100% - 60rpx); padding: 18rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.message.user .message-body { max-width: 87%; border-color: rgba(25, 207, 160, .32); background: var(--surface-strong); }.message-meta { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 11rpx; color: var(--muted); font-size: 18rpx; }.message-meta text:first-child { color: var(--text); font-weight: 650; }.message-content { display: block; color: var(--text); font-size: 23rpx; line-height: 1.72; white-space: pre-wrap; word-break: break-word; }.failed-label { color: #e09090; }.cancelled-label { color: #d29a4d; }.message-error { margin-top: 14rpx; padding: 12rpx 14rpx; border-left: 4rpx solid #d66868; background: rgba(214, 104, 104, .08); color: #e7aaaa; font-size: 20rpx; line-height: 1.5; }
.source-block { margin-top: 17rpx; border-top: 1rpx solid var(--line); }.source-toggle { display: flex; align-items: center; justify-content: space-between; padding: 15rpx 0 4rpx; color: var(--accent); font-size: 20rpx; }.source-list { padding-top: 8rpx; }.source-item { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 10rpx; padding: 13rpx; border-radius: 7px; background: var(--surface-strong); }.source-number { flex: 0 0 auto; color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18rpx; }.source-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 5rpx; }.source-copy text:first-child { color: var(--text); font-size: 20rpx; line-height: 1.4; }.source-copy text:last-child { display: -webkit-box; overflow: hidden; color: var(--muted); font-size: 18rpx; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.source-link { color: var(--accent); font-size: 23rpx; }.source-pending { flex: 0 0 auto; color: #d3a15a; font-size: 17rpx; }
.message-actions { display: flex; justify-content: flex-end; gap: 12rpx; margin-top: 12rpx; }.message-action { padding: 9rpx 0 5rpx 16rpx; color: var(--muted); font-size: 19rpx; }.message-action.primary { color: var(--accent); }.generating .message-body { flex: 1; }.thinking-lines { display: flex; flex-direction: column; gap: 8rpx; }.thinking-lines view { height: 12rpx; border-radius: 4rpx; background: var(--surface-strong); animation: loadingPulse 1.1s ease-in-out infinite; }.thinking-lines view:nth-child(2) { width: 82%; animation-delay: .12s; }.thinking-lines view:nth-child(3) { width: 56%; animation-delay: .24s; }
.recommendations { margin-top: 20rpx; }.recommendation-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; color: var(--text); font-size: 22rpx; }.recommendation-head text:last-child { color: var(--muted); font-size: 18rpx; }.recommendation-list { display: grid; gap: 10rpx; }.recommendation { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; min-height: 76rpx; padding: 14rpx 17rpx; border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface); color: var(--text); font-size: 21rpx; line-height: 1.45; transition: transform .16s ease, border-color .16s ease; }.recommendation text:last-child { flex: 0 0 auto; color: var(--accent); font-size: 25rpx; }.recommendation:active { transform: scale(.985); border-color: var(--accent); }
.composer-wrap { position: sticky; z-index: 5; bottom: calc(108rpx + env(safe-area-inset-bottom)); margin-top: 24rpx; padding: 15rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); box-shadow: 0 12rpx 34rpx rgba(3, 20, 31, .2); }.composer-input { width: 100%; min-height: 90rpx; max-height: 230rpx; padding: 4rpx 4rpx 14rpx; color: var(--text); font-size: 23rpx; line-height: 1.55; }.composer-placeholder { color: var(--muted); }.composer-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 12rpx; padding-top: 12rpx; border-top: 1rpx solid var(--line); }.composer-footer > text { max-width: 66%; color: var(--muted); font-size: 17rpx; line-height: 1.4; }.send-button, .stop-button { display: flex; min-width: 108rpx; height: 58rpx; align-items: center; justify-content: center; gap: 8rpx; border-radius: 7px; font-size: 21rpx; font-weight: 650; transition: transform .16s ease; }.send-button { background: var(--accent); color: var(--accent-ink); }.stop-button { border: 1rpx solid #d29a4d; color: #e1ae69; }.send-button:active, .stop-button:active { transform: scale(.97); }.stop-square { width: 14rpx; height: 14rpx; border-radius: 2rpx; background: currentColor; }.rate-limit-note { margin: -2rpx -2rpx 12rpx; padding: 10rpx 12rpx; border-radius: 6px; background: rgba(210, 154, 77, .1); color: #e1ae69; font-size: 19rpx; }.legal-note { display: block; margin: 18rpx 4rpx 0; color: var(--muted); font-size: 18rpx; line-height: 1.55; }
.context-toggle { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; margin: -2rpx -2rpx 12rpx; padding: 9rpx 6rpx 13rpx; border-bottom: 1rpx solid var(--line); }.context-toggle > view { display: flex; min-width: 0; flex-direction: column; gap: 3rpx; }.context-toggle > view text:first-child { color: var(--text); font-size: 20rpx; font-weight: 650; }.context-toggle > view text:last-child { color: var(--muted); font-size: 17rpx; }.context-toggle > text { color: var(--accent); font-size: 19rpx; }.context-fields { display: grid; gap: 9rpx; margin-bottom: 13rpx; padding-bottom: 13rpx; border-bottom: 1rpx solid var(--line); }.context-fields input, .context-fields textarea { width: 100%; min-height: 58rpx; padding: 11rpx 13rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 20rpx; line-height: 1.45; }.context-fields textarea { min-height: 66rpx; max-height: 150rpx; }.context-fields > text { color: var(--muted); font-size: 16rpx; line-height: 1.4; }
.drawer-overlay { position: fixed; z-index: 70; inset: 0; background: rgba(2, 13, 21, .7); }.conversation-drawer { position: absolute; top: 0; bottom: 0; left: 0; display: flex; width: min(650rpx, 88vw); flex-direction: column; border-right: 1rpx solid var(--line); background: var(--app-bg); box-shadow: 22rpx 0 50rpx rgba(0, 0, 0, .24); }.drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; padding: calc(var(--status-bar-height, 0px) + 27rpx) 24rpx 20rpx; border-bottom: 1rpx solid var(--line); }.drawer-head > view:first-child { display: flex; min-width: 0; flex-direction: column; gap: 6rpx; }.drawer-head > view:first-child text:first-child { color: var(--text); font-size: 29rpx; font-weight: 700; }.drawer-head > view:first-child text:last-child { color: var(--muted); font-size: 18rpx; }.drawer-close { display: flex; width: 54rpx; height: 54rpx; align-items: center; justify-content: center; color: var(--muted); font-size: 38rpx; }.drawer-new { display: flex; min-height: 70rpx; align-items: center; gap: 13rpx; margin: 18rpx 20rpx 10rpx; padding: 0 17rpx; border: 1rpx solid var(--accent); border-radius: 7px; color: var(--accent); font-size: 22rpx; }.drawer-new text:first-child { font-size: 29rpx; }.conversation-list { min-height: 0; flex: 1; }.conversation-item { display: flex; align-items: center; gap: 12rpx; margin: 8rpx 20rpx; padding: 15rpx 13rpx 15rpx 16rpx; border: 1rpx solid transparent; border-radius: 7px; }.conversation-item.selected { border-color: var(--line); background: var(--surface); }.conversation-item-copy { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 6rpx; }.conversation-item-copy text:first-child { overflow: hidden; color: var(--text); font-size: 21rpx; text-overflow: ellipsis; white-space: nowrap; }.conversation-item-copy text:last-child { color: var(--muted); font-size: 17rpx; }.delete-action { flex: 0 0 auto; padding: 11rpx 5rpx 11rpx 12rpx; color: #d48a8a; font-size: 17rpx; }.drawer-empty { display: flex; flex-direction: column; gap: 8rpx; padding: 44rpx 26rpx; color: var(--muted); text-align: center; }.drawer-empty text:first-child { color: var(--text); font-size: 24rpx; }.drawer-empty text:last-child { font-size: 19rpx; }.drawer-foot { padding: 17rpx 22rpx calc(17rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid var(--line); color: var(--muted); font-size: 18rpx; line-height: 1.45; }
.agent-toast { position: fixed; z-index: 100; left: 50%; bottom: calc(130rpx + env(safe-area-inset-bottom)); max-width: 560rpx; padding: 15rpx 20rpx; transform: translateX(-50%); border: 1rpx solid var(--line); border-radius: 7px; background: var(--surface-strong); color: var(--text); font-size: 21rpx; text-align: center; box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, .24); }
@keyframes loadingPulse { 0%, 100% { opacity: .36; } 50% { opacity: .88; } }
@media (min-width: 900px) { .agent-page { width: min(100%, 980px); margin: 0 auto; padding-left: 34px; padding-right: 34px; }.message-body { max-width: 78%; }.message.user .message-body { max-width: 72%; }.recommendation-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }.recommendation:first-child { grid-column: 1 / -1; } }
@media (prefers-reduced-motion: reduce) { .workspace-button, .icon-button, .text-action, .mode-option, .recommendation, .send-button, .stop-button { transition: none; }.loading-line, .thinking-lines view { animation: none; opacity: .72; } }
</style>
