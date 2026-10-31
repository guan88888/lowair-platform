<template>
  <app-page-shell :title="displayTitle" :active="page.active" :root="page.root" :city="city" :theme="theme" :locale="locale" :show-assistant="page.kind !== 'droneAgent'" @city="showCity = true" @annotate="annotate">
    <view class="screen" :class="'screen-' + page.kind">
      <request-state v-if="pageLoading" state="loading" />
      <error-state v-else-if="pageError" :message="pageError.message" @retry="refreshPage" />
      <view v-if="page.root" class="quick-search" @tap="go('/pages/search/index?scope=' + page.kind)" @longpress="annotate('搜索入口')">
        <text class="search-symbol">⌕</text>
        <text>{{ quickSearchPlaceholder }}</text>
      </view>

      <view v-if="page.carousel" class="carousel-panel">
        <image class="carousel-image" :src="activeCarousel.image" mode="aspectFill"></image>
        <view class="carousel-scrim"></view>
        <view class="carousel-copy">
          <text class="carousel-kicker">{{ activeCarousel.kicker }}</text>
          <text class="carousel-title">{{ activeCarousel.title }}</text>
          <text class="carousel-note">{{ activeCarousel.note }}</text>
          <view class="carousel-action" @tap="go(activeCarousel.to)" @longpress="annotate(activeCarousel.action)">{{ activeCarousel.action }}<text class="arrow">›</text></view>
        </view>
        <view class="carousel-controls"><text v-for="(item, index) in page.carousel" :key="index" class="carousel-dot" :class="{ active: carouselIndex === index }" @tap="carouselIndex = index" @longpress="annotate('轮播图第 ' + (index + 1) + ' 张')"></text></view>
      </view>

      <view v-if="page.kind === 'profile'" class="profile-overview">
        <view class="profile-identity" @tap="handleProfileIdentity" @longpress="annotate('账号与认证')">
          <view class="profile-avatar"><text>{{ auth.loggedIn ? avatarText : t('低') }}</text></view>
          <view class="profile-copy"><text class="profile-name">{{ auth.loggedIn ? (auth.nickname || t('平台用户')) : t('登录后管理档案') }}</text><text class="profile-meta">{{ auth.loggedIn ? maskedPhone : t('手机号登录后同步你的业务记录') }}</text></view>
          <text class="card-arrow">›</text>
        </view>
        <view v-if="!auth.loggedIn" class="profile-login">
          <text class="profile-login-title">{{ t('登录后同步你的业务记录') }}</text>
          <view class="profile-login-row"><view class="primary-button" @tap="goAuth('login')">{{ t('登录') }}</view><view class="secondary-button" @tap="goAuth('register')">{{ t('注册') }}</view></view>
        </view>
        <view v-else class="profile-session">
          <text>账号已安全登录</text>
          <view class="session-logout" @tap="logout">退出登录</view>
        </view>
        <view class="profile-finance">
          <view class="finance-item" @tap="go('/pages/profile/wallet?tab=transactions')" @longpress="annotate(t('付款记录'))"><text class="finance-value">{{ auth.loggedIn ? '2' : '0' }}</text><text>{{ t('付款记录') }}</text></view>
          <view class="finance-item" @tap="go('/pages/profile/wallet?tab=escrow')" @longpress="annotate(t('托管资金'))"><text class="finance-value">{{ t('演示') }}</text><text>{{ t('托管资金') }}</text></view>
          <view class="finance-item" @tap="go('/pages/profile/account')" @longpress="annotate(t('身份状态'))"><text class="finance-value">{{ auth.verified ? t('已认证') : t('待认证') }}</text><text>{{ t('身份状态') }}</text></view>
        </view>
      </view>
      <view v-if="permissionBlocked" class="permission-panel">
        <text class="eyebrow">{{ t('权限校验') }}</text>
        <text class="permission-title">{{ t('此功能需要') }} {{ t(permissionName) }}</text>
        <text class="permission-note">{{ t('认证通过前仍可查看业务说明和示例数据。') }}</text>
        <view class="primary-button" @tap="go('/pages/profile/account?mode=' + page.required)" @longpress="annotate(t('去认证'))">{{ t('去认证') }}</view>
      </view>

      <view v-if="page.kind === 'search'" class="search-panel">
        <view class="search-input-wrap">
          <text class="search-symbol">⌕</text>
          <input v-model="keyword" class="search-input" confirm-type="search" :placeholder="t('搜索机构、岗位、任务、商品、内容')" placeholder-class="input-placeholder" @confirm="search" />
          <text v-if="keyword" class="clear-input" @tap="keyword = ''" @longpress="annotate('清除搜索内容')">×</text>
        </view>
        <view class="search-history" v-if="!keyword">
          <view class="section-heading"><text>{{ t('最近搜索') }}</text><text class="heading-action" @tap="history = []" @longpress="annotate(t('清除搜索历史'))">{{ t('清除') }}</text></view>
          <view class="chip-row"><text v-for="item in history" :key="item" class="chip" @tap="applySearchWord(item)" @longpress="annotate(t('搜索：') + t(item))">{{ t(item) }}</text><text v-for="item in hotWords" :key="item" class="chip subtle" @tap="applySearchWord(item)" @longpress="annotate(t('搜索：') + t(item))">{{ t(item) }}</text></view>
        </view>
      </view>

      <view v-if="page.hero" class="hero-card" :class="{ 'hero-card-image': page.hero.image }">
        <image v-if="page.hero.image" class="hero-image" :src="page.hero.image" mode="aspectFill"></image>
        <view v-if="page.hero.image" class="hero-scrim"></view>
        <view class="hero-copy">
          <text class="eyebrow">{{ page.hero.eyebrow }}</text>
          <text class="hero-title">{{ page.hero.title }}</text>
          <text class="hero-note">{{ page.hero.note }}</text>
          <view v-if="page.hero.action" class="hero-action" @tap="handleAction(page.hero.to, page.hero.action)" @longpress="annotate(page.hero.action)">{{ page.hero.action }}<text class="arrow">›</text></view>
        </view>
        <view v-if="!page.hero.image" class="hero-art" aria-hidden="true">
          <view class="radar-ring ring-one"></view>
          <view class="radar-ring ring-two"></view>
          <image class="brand-mark" src="/static/logo.png" mode="aspectFit"></image>
          <view class="status-beacon"></view>
        </view>
      </view>

      <view v-if="page.tabs" class="segment-wrap">
        <scroll-view scroll-x class="segment-scroll" :show-scrollbar="false">
          <view class="segments"><text v-for="(tab, tabIndex) in page.tabs" :key="tab + tabIndex" class="segment" :class="{ selected: selectedTab === tab }" @tap="selectTab(tab, tabIndex)" @longpress="annotate(tab)">{{ tab }}</text></view>
        </scroll-view>
      </view>

      <view v-if="page.chips" class="chip-row form-chips"><text v-for="chip in page.chips" :key="chip" class="chip selected-chip" @tap="toggleChip(chip)" @longpress="annotate(chip)">{{ chip }}</text></view>

      <view v-if="page.metrics" class="metric-grid">
        <view v-for="(metric, metricIndex) in page.metrics" :key="metricIndex" class="metric-cell"><text class="metric-value">{{ metric[1] }}</text><text class="metric-label">{{ metric[0] }}</text></view>
      </view>

      <view v-if="page.tools" class="tool-grid" :class="{ 'tool-grid-3': page.tools.length === 3 }">
        <view v-for="(tool, toolIndex) in page.tools" :key="toolIndex" class="tool-item" @tap="handleAction(tool[2], tool[0])" @longpress="annotate(tool[0])">
          <view class="tool-icon">{{ toolGlyph(tool[1]) }}</view><text>{{ tool[0] }}</text>
        </view>
      </view>

      <view v-if="page.video" class="video-card" @tap="showToast('正在打开《' + page.video.title + '》')" @longpress="annotate(page.video.title)">
        <image class="video-cover" :src="page.video.image" mode="aspectFill"></image>
        <view class="video-overlay"><view class="video-play">▶</view><view class="video-copy"><text class="video-title">{{ page.video.title }}</text><text class="video-note">{{ page.video.note }}</text></view></view>
      </view>

      <view v-if="displayProducts.length" class="market-products">
        <view v-for="(product, productIndex) in displayProducts" :key="productIndex" class="product-card" @tap="go(product.to)" @longpress="annotate(product.title)">
          <image class="product-image" :src="product.image" mode="aspectFill"></image>
          <view class="product-copy"><text class="product-tag">{{ product.tag }}</text><text class="product-title">{{ product.title }}</text><text class="product-note">{{ product.note }}</text><text class="product-price">{{ product.price }}</text></view>
        </view>
      </view>

      <view v-if="page.kind === 'assistant'" class="assistant-block">
        <view class="assistant-nameplate"><text>航知</text><text>{{ t('AI 助手') }} · {{ t('学习、飞行与设备交易咨询') }}</text></view>
        <view class="chat-row bot"><view class="chat-avatar">航知</view><view class="chat-bubble">{{ t('告诉我城市、基础、目标证书等级和预算，我会按距离、课程与试听安排匹配机构。') }}</view></view>
        <view v-for="message in chatMessages" :key="message.id" class="chat-row" :class="message.role"><view v-if="message.role === 'bot'" class="chat-avatar">航知</view><view class="chat-bubble">{{ t(message.text) }}</view></view>
        <view class="compare-tray"><text>{{ t('已选') }} {{ compareCount }}/4 {{ t('家机构') }}</text><text class="heading-action" @tap="go('/pages/academy/institutions?mode=compare')" @longpress="annotate(t('机构对比'))">{{ t('去对比') }}</text></view>
        <view class="chat-composer"><input v-model="chatInput" class="chat-input" :placeholder="t('例如：北京，零基础，预算 1.2 万')" placeholder-class="input-placeholder" @confirm="sendChat" /><view class="send-button" @tap="sendChat" @longpress="annotate(t('发送选课咨询'))">{{ t('发送') }}</view></view>
      </view>

      <view v-if="page.kind === 'droneAgent'" class="drone-agent">
        <view class="drone-agent-head">
          <view class="drone-agent-mark">AI</view>
          <view class="drone-agent-identity"><text>{{ t('低空 AI') }}</text><text>{{ t('无人机行业智能体') }}</text></view>
          <text class="drone-agent-status">{{ t('前端演示') }}</text>
        </view>
        <view class="drone-agent-context"><text>{{ t('当前模式') }}</text><text>{{ selectedTab }}</text></view>
        <view class="drone-thread" aria-live="polite">
          <view class="chat-row bot"><view class="chat-avatar agent-avatar">AI</view><view class="chat-bubble">{{ t('告诉我你的机型、任务或现场现象。我会先识别风险，再给出检查步骤和下一步建议。') }}</view></view>
          <view v-for="message in droneAgentMessages" :key="message.id" class="chat-row" :class="message.role"><view v-if="message.role === 'bot'" class="chat-avatar agent-avatar">AI</view><view class="chat-bubble">{{ message.text }}</view></view>
          <view v-if="droneAgentBusy" class="chat-row bot"><view class="chat-avatar agent-avatar">AI</view><view class="chat-bubble drone-thinking">{{ t('正在整理建议') }}<text></text><text></text><text></text></view></view>
        </view>
        <view v-if="!droneAgentMessages.length" class="drone-suggestions">
          <text class="drone-suggestions-title">{{ t('可以这样问') }}</text>
          <view class="drone-suggestion-grid"><view v-for="(prompt, promptIndex) in page.suggestions" :key="promptIndex" class="drone-suggestion" @tap="useDroneSuggestion(promptIndex)" @longpress="annotate(prompt)">{{ prompt }}</view></view>
        </view>
        <view class="drone-composer">
          <input v-model="droneAgentInput" class="drone-input" confirm-type="send" :placeholder="t('输入无人机相关问题')" placeholder-class="input-placeholder" @confirm="sendDroneAgent" />
          <view class="send-button" :class="{ disabled: droneAgentBusy }" @tap="sendDroneAgent" @longpress="annotate(t('发送无人机咨询'))">{{ t('发送') }}</view>
        </view>
        <text class="drone-disclaimer">{{ t('当前为前端演示智能体，未连接文本模型。建议仅供参考，飞行决策请以设备手册、现场条件和主管部门要求为准。') }}</text>
      </view>

      <view v-if="page.kind === 'exam'" class="exam-panel">
        <text class="exam-meta">{{ t('第') }} {{ questionIndex + 1 }} / {{ questions.length }} {{ t('题 · 练习模式') }}</text>
        <text class="exam-question">{{ localizedQuestions[questionIndex].title }}</text>
        <view v-for="(answer, index) in localizedQuestions[questionIndex].answers" :key="answer" class="answer-row" :class="{ chosen: selectedAnswer === index, correct: submitted && index === 0, wrong: submitted && selectedAnswer === index && index !== 0 }" @tap="!submitted && (selectedAnswer = index)" @longpress="annotate(t('选择答案') + ['A','B','C','D'][index])"><text class="answer-letter">{{ ['A','B','C','D'][index] }}</text><text>{{ answer }}</text></view>
        <view class="exam-actions"><text class="text-button" @tap="previousQuestion" @longpress="annotate(t('上一题'))">{{ t('上一题') }}</text><text class="text-button" @tap="submitted = true" @longpress="annotate(t('提交本题'))">{{ t('提交本题') }}</text><text class="primary-inline" @tap="nextQuestion" @longpress="annotate(t('下一题'))">{{ t('下一题') }}</text></view>
        <text v-if="submitted" class="answer-explain">{{ t('解析：飞行前先确认设备外观、电源、气象与空域条件。本题为演示题库。') }}</text>
      </view>

      <view v-if="page.form" class="form-panel">
        <view v-for="(field, fieldIndex) in page.form" :key="fieldIndex" class="field-group"><text class="field-label">{{ field }}</text><input v-model="form[field]" class="form-input" :placeholder="t('请输入') + field" placeholder-class="input-placeholder" /></view>
        <view class="form-actions"><view class="secondary-button" @tap="saveDraft" @longpress="annotate(t('保存草稿'))">{{ t('保存草稿') }}</view><view class="primary-button" @tap="submitForm" @longpress="annotate(formActionText)">{{ formActionText }}</view></view>
      </view>

      <view v-if="page.kind === 'account'" class="identity-switch">
        <view class="identity-row"><text>{{ t('当前身份') }}</text><view class="identity-control"><text :class="{ activeIdentity: auth.identity === 'personal' }" @tap="switchIdentity('personal')" @longpress="annotate(t('切换个人身份'))">{{ t('个人') }}</text><text :class="{ activeIdentity: auth.identity === 'enterprise' }" @tap="switchIdentity('enterprise')" @longpress="annotate(t('切换企业身份'))">{{ t('企业') }}</text></view></view>
        <view class="account-actions"><view class="primary-button" @tap="demoVerify" @longpress="annotate(t('模拟提交认证'))">{{ t('模拟提交认证') }}</view></view>
      </view>

      <view v-if="page.kind === 'profile'" class="theme-panel">
        <view class="section-heading"><text>{{ t('背景色彩') }}</text><text class="heading-action">{{ t('已选') }} {{ t(themeLabel) }}</text></view>
        <view class="theme-options"><view v-for="option in themeOptions" :key="option.key" class="theme-option" :class="{ selected: theme === option.key }" @tap="selectTheme(option.key)" @longpress="annotate(t(option.label))"><view class="theme-swatch" :style="{ background: option.color }"></view><text>{{ t(option.label) }}</text></view></view>
      </view>

      <view v-if="page.kind === 'profile'" class="locale-panel" data-locale-control>
        <view class="section-heading"><text>{{ t('语言 / Language') }}</text><text class="heading-action">{{ activeLocale.label }}</text></view>
        <view class="locale-options"><text v-for="option in locales" :key="option.key" class="locale-option" :class="{ selected: locale === option.key }" @tap="selectLocale(option.key)" @longpress="annotate(option.label)">{{ option.label }}</text></view>
      </view>

      <view v-if="page.kind === 'community'" class="social-feed">
        <view class="feed-composer" @tap="go('/pages/community/publish')" @longpress="annotate(t('发布社区内容'))"><view class="feed-avatar self">{{ t('林') }}</view><text>{{ t('分享飞行经验、提问或记录项目…') }}</text><text class="feed-compose-action">{{ t('发布') }}</text></view>
        <view v-for="post in communityPosts" :key="post.id" class="social-post" @longpress="annotate('社区动态：' + post.author)">
          <view class="post-head"><view class="feed-avatar">{{ t(post.avatar) }}</view><view class="post-author"><text>{{ t(post.author) }}</text><text>{{ t(post.time) }} · {{ t(post.topic) }}</text></view><text class="post-more" @tap="openDetail(t('内容管理'), t('已为你打开此动态的演示管理菜单。'), t('社区功能'))" @longpress="annotate(t('内容管理'))">···</text></view>
          <text class="post-copy">{{ t(post.content) }}</text>
          <image :src="post.image" class="post-image" mode="aspectFill" @tap="go('/pages/community/post-detail?id=' + post.id)" @longpress="annotate('查看动态详情')"></image>
          <view class="post-actions"><text @tap="togglePostAction(post, 'like')" @longpress="annotate(t('点赞'))">{{ post.liked ? '♥ ' + t('已赞') : '♡ ' + t('点赞') }} {{ post.likes }}</text><text @tap="focusCommunityComment(post)" @longpress="annotate(t('评论'))">◌ {{ t('评论') }} {{ post.comments }}</text><text @tap="togglePostAction(post, 'saved')" @longpress="annotate(t('收藏'))">{{ post.saved ? '★ ' + t('已收藏') : '☆ ' + t('收藏') }}</text><text class="ai-reply" @tap="askCommunityAi(post)" @longpress="annotate(t('AI 回复'))">{{ t('AI 回复') }}</text></view>
          <view v-if="post.aiReply" class="ai-comment"><text>{{ t('AI 助手') }}</text><text>{{ t(post.aiReply) }}</text></view>
        </view>
        <view class="community-comment"><input v-model="communityInput" :placeholder="t('写下友善、具体的回复…')" placeholder-class="input-placeholder" @confirm="sendCommunityComment" /><view class="send-button" @tap="sendCommunityComment" @longpress="annotate(t('发送社区评论'))">{{ t('发送') }}</view></view>
      </view>

      <view v-if="page.kind === 'messages'" class="message-composer"><input v-model="messageInput" :placeholder="t('输入平台内消息')" placeholder-class="input-placeholder" @confirm="sendMessage" /><view class="send-button" @tap="sendMessage" @longpress="annotate(t('发送消息'))">{{ t('发送') }}</view></view>

      <view v-for="(section, sectionIndex) in page.sections" v-if="page.kind !== 'search' || keyword" :key="sectionIndex" class="content-section">
        <view class="section-heading"><text>{{ section.title }}</text><text v-if="section.action" class="heading-action" @tap="handleAction(section.to, section.action)" @longpress="annotate(section.action)">{{ section.action }} ›</text></view>
        <view class="card-list">
          <view v-for="(card, cardIndex) in filteredCards(section)" :key="cardIndex" class="data-card" @tap="handleCard(card)" @longpress="annotate(card[0])">
            <view class="card-main"><text class="card-title">{{ card[0] }}</text><text class="card-note">{{ card[1] }}</text></view>
            <view class="card-side"><text class="status-tag" :class="tagTone(card[2])">{{ card[2] }}</text><text v-if="card[3]" class="card-arrow">›</text></view>
          </view>
        </view>
      </view>

      <view v-if="showEmpty" class="empty-state"><text class="empty-icon">◌</text><text class="empty-title">{{ t('暂无匹配内容') }}</text><text class="empty-note">{{ t('修改筛选条件，或稍后刷新重试。') }}</text><view class="secondary-button" @tap="showEmpty = false" @longpress="annotate(t('重新加载'))">{{ t('重新加载') }}</view></view>
      <view v-if="page.kind !== 'droneAgent'" class="demo-note">{{ t('演示数据 · 真实资质、资金、签章、质检与存证能力以服务接入状态为准') }}</view>
    </view>

    <view v-if="detailCard" class="overlay" @tap="detailCard = null"><view class="sheet detail-sheet" @tap.stop><text class="sheet-title">{{ detailCard.title }}</text><text class="detail-status">{{ detailCard.status }}</text><text class="detail-copy">{{ detailCard.note }}</text><view class="primary-button" @tap="detailCard = null" @longpress="annotate(t('关闭说明'))">{{ t('知道了') }}</view></view></view>
    <view v-if="showCity" class="overlay" @tap="showCity = false"><view class="sheet" @tap.stop><text class="sheet-title">{{ t('选择城市') }}</text><text v-for="item in cities" :key="item" class="sheet-option" @tap="selectCity(item)" @longpress="annotate(t('切换至') + t(item))">{{ t(item) }}</text></view></view>
    <view v-if="toast" class="toast">{{ toast }}</view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ErrorState from '../../shared/components/ErrorState.vue'
import RequestState from '../../shared/components/RequestState.vue'
import { getOperationsPageModel, loadOperationsPage } from '../services'
import { localizePage, sourceValue, translate } from '../../../data/localization'
import { clearSession } from '../../../utils/auth'
import { createRouteErrorPage, resolveRouteOptions } from '../../shared/utils/route-options'

export default {
  name: 'OperationsPageRenderer',
  components: { AppPageShell, ErrorState, RequestState },
  props: { pageKey: { type: String, required: true } },
  data() {
    const route = resolveRouteOptions('operations', this.pageKey)
    const initialPage = route.error ? createRouteErrorPage(route.error) : getOperationsPageModel(this.pageKey, route.options)
    return {
      rawPage: initialPage, page: localizePage(initialPage, 'zh'), routeOptions: route.options, routeError: route.error, pageLoading: false, pageError: null, city: '北京', selectedTab: '', selectedTabKey: '', keyword: '', history: ['超视距培训', '电力巡检'], hotWords: ['CAAC', '二手无人机', '植保任务'],
      chatInput: '', chatMessages: [], compareCount: 0, droneAgentInput: '', droneAgentMessages: [], droneAgentBusy: false, selectedAnswer: null, questionIndex: 0, submitted: false, showCity: false, cities: ['北京', '天津', '石家庄', '成都'],
      form: {}, toast: '', showEmpty: false, messageInput: '', detailCard: null, carouselIndex: 0, theme: 'ocean', locale: 'zh', communityInput: '', activeCommunityPostId: 'post-01',
      themeOptions: [
        { key: 'ocean', label: '深海蓝', color: '#061a2b' }, { key: 'forest', label: '松石绿', color: '#102a2c' }, { key: 'slate', label: '石墨蓝', color: '#151d2b' },
        { key: 'mist', label: '云雾白', color: '#eef5f7' }, { key: 'sky', label: '晴空蓝', color: '#eef4fb' }, { key: 'sage', label: '浅苔绿', color: '#f0f5ee' }
      ],
      auth: { loggedIn: false, verified: false, caac: false, enterprise: false, institution: false, identity: 'personal' },
      locales: [
        { key: 'zh', label: '中文' }, { key: 'en', label: 'English' }, { key: 'ja', label: '日本語' }, { key: 'ru', label: 'Русский' }, { key: 'de', label: 'Deutsch' }
      ],
      communityPosts: [
        { id: 'post-01', avatar: '周', author: '周宁', time: '12 分钟前', topic: '#山区运输', content: '山区物资运输结束后，复盘了返航点、备降点和风速阈值。把几个容易忽略的检查项整理出来，供大家讨论。', image: '/static/images/lowair-community-flightlog.png', likes: 86, comments: 14, liked: false, saved: false, aiReply: '' },
        { id: 'post-02', avatar: '许', author: '许飞', time: '1 小时前', topic: '#超视距备考', content: '超视距考试的通信链路题，我按“链路检查、冗余、返航设置”做了三步记忆法，欢迎补充。', image: '/static/images/lowair-academy-training.png', likes: 42, comments: 9, liked: false, saved: false, aiReply: '' }
      ],
      questions: [
        { title: '飞行前检查中，最先确认的事项是？', answers: ['机身外观与电源状态', '立即起飞', '忽略气象信息', '跳过空域检查'] },
        { title: '临时任务接单前，应先确认什么？', answers: ['资质、档期与交付要求', '只看报价', '绕开平台沟通', '跳过合同'] },
        { title: '发现临时空域限制信息时，应如何处理？', answers: ['停止进入受限区域并复核信息', '继续按原计划飞行', '关闭遥控器提示', '只询问同行飞手'] },
        { title: '电池出现鼓包或外壳破损时，应采取什么措施？', answers: ['停止使用并按规范处置', '继续低空试飞', '用胶带固定后充电', '放入普通垃圾桶'] },
        { title: '超视距作业前，通信链路应满足什么要求？', answers: ['完成链路检查并保留安全冗余', '只确认图传画面', '不需要返航设置', '由旁观者临时测试'] },
        { title: '任务交付素材上传前，应优先检查什么？', answers: ['交付格式、完整性和脱敏范围', '先公开分享原始文件', '删除所有飞行记录', '跳过客户验收标准'] },
        { title: '遇到突发天气变化时，正确的处置是？', answers: ['评估风险并执行返航或备降', '继续完成当前航线', '关闭气象提醒', '只提高飞行高度'] },
        { title: '起飞前确认返航点的主要目的是什么？', answers: ['保障失联或低电量时安全返航', '提高拍摄清晰度', '减少电池容量', '隐藏飞行记录'] }
      ]
    }
  },
  computed: {
    permissionBlocked() {
      if (!this.page.required) return false
      return !this.auth[this.page.required]
    },
    permissionName() {
      return this.page.required === 'enterprise' ? '企业认证' : '培训机构认证'
    },
    formActionText() {
      const map = { publish: '确认发布', compose: '发布内容', sell: '提交设备信息', campaign: '提交审核', account: '提交材料', visit: '提交预约', order: '演示提交' }
      return this.t(map[this.page.kind] || '保存并提交')
    },
    quickSearchPlaceholder() {
      const map = { home: '搜索机构、岗位、设备与内容', academy: '搜索课程、机构、证书等级', work: '搜索岗位、任务与企业', market: '搜索设备、配件与服务', community: '搜索话题、飞行日志与问答' }
      return this.t(map[this.page.kind] || '搜索')
    },
    activeCarousel() {
      return (this.page.carousel || [])[this.carouselIndex] || {}
    },
    themeLabel() {
      const current = this.themeOptions.find((item) => item.key === this.theme)
      return current ? current.label : '深海蓝'
    },
    activeLocale() {
      return this.locales.find((item) => item.key === this.locale) || this.locales[0]
    },
    avatarText() {
      return (this.auth.nickname || '用').slice(0, 1)
    },
    maskedPhone() {
      const phone = this.auth.phone || ''
      return /^1\d{10}$/.test(phone) ? phone.slice(0, 3) + '****' + phone.slice(-4) : phone
    },
    displayTitle() {
      const titles = {
        en: { home: 'Low-altitude Economy', profile: 'My Profile', market: 'Marketplace', community: 'Community', academy: 'Training', work: 'Work' },
        ja: { home: '低空経済', profile: 'マイページ', market: '取引', community: 'コミュニティ', academy: '学習', work: '仕事' },
        ru: { home: 'Низковысотная экономика', profile: 'Профиль', market: 'Торговля', community: 'Сообщество', academy: 'Обучение', work: 'Работа' },
        de: { home: 'Niedrigflugwirtschaft', profile: 'Mein Bereich', market: 'Marktplatz', community: 'Community', academy: 'Lernen', work: 'Arbeit' }
      }
      return (titles[this.locale] && titles[this.locale][this.page.kind]) || this.page.title
    },
    displayProducts() {
      if (!this.page.products) return []
      if (this.page.kind !== 'market' || this.selectedTabKey === '推荐设备') return this.page.products
      return this.page.products.filter((product, index) => this.rawPage.products[index]?.category === this.selectedTabKey)
    },
    localizedQuestions() {
      return this.questions.map((question) => ({ title: this.t(question.title), answers: question.answers.map((answer) => this.t(answer)) }))
    }
  },
  created() {
    this.selectedTab = this.page.tabs && this.page.tabs[0] ? this.page.tabs[0] : ''
    this.page.form && this.page.form.forEach((field) => { this.$set ? this.$set(this.form, field, '') : (this.form[field] = '') })
    const saved = uni.getStorageSync('lowair-demo-auth')
    if (saved) this.auth = { ...this.auth, ...saved }
    const savedTheme = uni.getStorageSync('lowair-demo-theme')
    if (this.themeOptions.some((item) => item.key === savedTheme)) this.theme = savedTheme
    const savedLocale = uni.getStorageSync('lowair-demo-locale')
    if (this.locales.some((item) => item.key === savedLocale)) {
      this.locale = savedLocale
      this.page = localizePage(this.rawPage, this.locale)
      this.selectedTab = this.page.tabs && this.page.tabs[0] ? this.page.tabs[0] : ''
    }
    this.selectedTabKey = (this.rawPage.tabs || [])[0] || ''
    if (!this.routeError) this.refreshPage()
  },
  methods: {
    async refreshPage() {
      this.pageLoading = true
      this.pageError = null
      try {
        this.rawPage = await loadOperationsPage(this.pageKey, this.routeOptions)
        this.page = localizePage(this.rawPage, this.locale)
        this.selectedTabKey = this.page.initialTab || (this.rawPage.tabs || [])[0] || ''
        const index = (this.rawPage.tabs || []).indexOf(this.selectedTabKey)
        this.selectedTab = (this.page.tabs || [])[index >= 0 ? index : 0] || ''
      } catch (error) {
        if (!error.canceled) this.pageError = error
      } finally {
        this.pageLoading = false
      }
    },
    t(value) { return translate(value, this.locale) },
    toolGlyph(type) {
      const map = { academy: '▣', work: '▱', market: '◈', community: '◉', guide: 'i', exam: '✓', video: '▷', law: '§', simulator: '◎', filter: '≡', city: '⌖', calendar: '□', compare: '⇄', resume: '▤', talent: '◌', publish: '+', job: '▱', trade: '↔', consign: '□', lease: '◒', service: '⌖', log: '⌁', knowledge: '?', live: '◉', nearby: '⌖', identity: '◎', wallet: '￥', order: '□', message: '◌', flight: '⌖', field: '⌖', rule: '§' }
      return map[type] || '•'
    },
    tagTone(value) {
      const content = value || ''
      if (/加急|风险|高风险|驳回/.test(content)) return 'warning'
      if (/接入中|未认证|待处理|待办|待确认|待核验|待审核/.test(content)) return 'pending'
      if (/已认证|已核验|官方发布|已完成|进行中/.test(content)) return 'success'
      return 'neutral'
    },
    handleCard(card) {
      if (this.page.kind === 'assistant' && this.compareCount < 4) this.compareCount += 1
      if (card[3]) return this.handleAction(card[3], card[0])
      this.openDetail(card[0], card[1], card[2])
    },
    selectTab(tab, tabIndex) {
      this.selectedTab = tab
      this.selectedTabKey = (this.rawPage.tabs || [])[tabIndex] || sourceValue(tab, this.locale)
      const actions = {
        '临时任务': () => this.showToast('已切换至临时任务，可抢单任务已优先展示'),
        '超视距': () => this.showToast('已筛选超视距课程与通信链路内容'),
        '教员': () => this.showToast('已筛选教员课程与师资信息'),
        '二手无人机': () => this.showToast('已筛选二手无人机'),
        '配件': () => this.showToast('已筛选无人机配件'),
        '租赁': () => this.showToast('已筛选设备租赁方案')
      }
      if (actions[this.selectedTabKey]) actions[this.selectedTabKey]()
    },
    filteredCards(section) {
      let cards = section.cards || []
      if (this.page.kind === 'work') {
        if (this.selectedTabKey === '临时任务') cards = cards.filter((card) => /任务|抢单|作业/.test(sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)))
        if (this.selectedTabKey === '企业招聘') cards = cards.filter((card) => /招聘|直招|飞手|执行/.test(sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)))
      }
      if (this.page.kind === 'academy' && this.selectedTabKey === '超视距') cards = cards.filter((card) => /超视距|学习|机构/.test(sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)))
      if (this.page.kind === 'academy' && this.selectedTabKey === '教员') cards = cards.filter((card) => /教练|教员|机构/.test(sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)))
      if (this.page.kind === 'market' && this.selectedTabKey !== '推荐设备') cards = cards.filter((card) => (this.selectedTabKey === '租赁' ? /租赁|短租|长租/.test(sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)) : (sourceValue(section.title, this.locale) + sourceValue(card[0], this.locale) + sourceValue(card[1], this.locale)).includes(this.selectedTabKey)))
      if (this.page.kind === 'search') {
        const category = this.selectedTabKey
        if (category && category !== '全部') cards = cards.filter((card) => sourceValue(card[2], this.locale) === category)
        if (this.keyword.trim()) {
          const term = this.keyword.trim().toLowerCase()
          cards = cards.filter((card) => card.join(' ').toLowerCase().includes(term))
        }
      }
      return cards
    },
    handleAction(url, label) {
      const sourceLabel = this.getRawActionLabel(label)
      if (this.permissionBlocked && sourceLabel !== '去认证') {
        this.go('/pages/profile/account?mode=' + this.page.required)
        return
      }
      if (sourceLabel === '报名抢单' && !this.auth.caac) {
        this.go('/pages/profile/account?mode=caac')
        return
      }
      if (sourceLabel === '立即投递' && !this.auth.loggedIn) {
        this.goAuth('login')
        return
      }
      if (url) return this.go(url)
      if (sourceLabel === '切换城市' || sourceLabel === '选择城市') {
        this.showCity = true
        return
      }
      if (sourceLabel === '重新开始') {
        this.chatMessages = []
        this.compareCount = 0
        this.showToast('已重置选课条件')
        return
      }
      if (sourceLabel === '预约试听') {
        this.showToast('请填写下方预约信息')
        return
      }
      this.openDetail(label, '该功能已进入演示流程，可按当前页面信息继续完成操作。', '功能说明')
    },
    getRawActionLabel(label) {
      if (this.locale === 'zh') return label
      const actionLabels = [
        this.rawPage.hero && this.rawPage.hero.action,
        ...(this.rawPage.tools || []).map((tool) => tool[0]),
        ...(this.rawPage.sections || []).map((section) => section.action)
      ].filter(Boolean)
      return actionLabels.find((item) => this.t(item) === label) || sourceValue(label, this.locale)
    },
    go(url) { if (url) uni.navigateTo({ url }) },
    search() {
      if (!this.keyword.trim()) return this.showToast('请输入搜索内容')
      this.history = [this.keyword, ...this.history.filter((item) => item !== this.keyword)].slice(0, 5)
      this.showToast('已按“' + this.keyword + '”筛选')
    },
    applySearchWord(word) { this.keyword = word; this.search() },
    toggleChip(chip) { this.showToast('已更新条件：' + chip) },
    sendChat() {
      if (!this.chatInput.trim()) return
      this.chatMessages.push({ id: Date.now(), role: 'user', text: this.chatInput })
      const question = this.chatInput
      this.chatInput = ''
      setTimeout(() => this.chatMessages.push({ id: Date.now() + 1, role: 'bot', text: '已记录“' + question + '”。请再确认可接受的开课时间。' }), 180)
    },
    useDroneSuggestion(promptIndex) {
      const prompt = (this.rawPage.suggestions || [])[promptIndex]
      if (prompt) this.sendDroneAgent(prompt)
    },
    sendDroneAgent(suggestedPrompt) {
      if (this.droneAgentBusy) return
      const prompt = typeof suggestedPrompt === 'string' ? suggestedPrompt : this.droneAgentInput.trim()
      if (!prompt) return this.showToast('请输入无人机相关问题')
      this.droneAgentMessages.push({ id: Date.now(), role: 'user', text: typeof suggestedPrompt === 'string' ? this.t(prompt) : prompt })
      this.droneAgentInput = ''
      this.droneAgentBusy = true
      const reply = this.droneAgentReply(prompt)
      setTimeout(() => {
        this.droneAgentMessages.push({ id: Date.now() + 1, role: 'bot', text: this.t(reply) })
        this.droneAgentBusy = false
      }, 260)
    },
    droneAgentReply(prompt) {
      const question = prompt.replace(/\s+/g, ' ').trim().slice(0, 72)
      const scenarios = [
        { match: /坠机|撞机|碰撞|起火|冒烟|燃烧/, advice: '先停止起飞与充放电，保持人员远离旋翼和电池风险区。记录现场、断开电源并保留飞行日志，不要立即通电复飞。', followUp: '请补充是否有人受伤、机体是否冒烟，以及最后一次告警。' },
        { match: /鼓包|过热|发热|异味|破损|电池|充电|低电量/, advice: '电池异常时应停止充放电和起飞，将其放入耐火隔离容器或安全区域。检查循环次数、健康度、存放电量和充电器状态，异常电池不要继续试飞。', followUp: '请提供电池型号、是否鼓包、充电时的温度和最近一次异常提示。' },
        { match: /失联|图传|遥控|信号|链路|断连|通信/, advice: '先确认返航点、返航高度和失联动作设置，再检查遥控器、电池、天线方向、遮挡和电磁干扰。发现链路不稳定时不要扩大作业半径。', followUp: '请提供机型、距离高度、信号强度、返航设置和发生位置。' },
        { match: /GPS|指南针|罗盘|定位|漂移|姿态|卫星/, advice: '定位或姿态异常时应暂停起飞，远离金属结构、强磁源和高压设施后重新校验。确认卫星数量、指南针状态和固件提示，不要在漂移状态下强行作业。', followUp: '请说明卫星数、告警代码、起飞环境以及是否更换过桨叶或部件。' },
        { match: /电机|桨叶|螺旋桨|动力|震动|异响|抖动/, advice: '先断电检查桨叶裂纹、安装方向、锁扣、电机转动阻力和机臂变形。出现异响或震动时不要以试飞方式排查，应先完成地面检查。', followUp: '请说明异常发生在起飞前、悬停还是加速阶段，并提供对应电机位置。' },
        { match: /云台|相机|镜头|拍摄|照片|视频|载荷/, advice: '检查云台锁是否取下、减震球与排线是否完好、镜头是否清洁，以及存储卡和载荷供电是否正常。先在地面完成校准和短时自检。', followUp: '请提供机型、云台或相机提示、画面表现和是否有外接载荷。' },
        { match: /风|雨|雪|雾|能见度|天气|温度|气象/, advice: '把现场风速、阵风、降水、能见度和温度与设备手册的限制逐项比对。任何一项接近限制值，都应调整时间、航线或取消作业。', followUp: '请提供现场风速、天气来源、作业高度和计划飞行时长。' },
        { match: /空域|禁飞|限飞|报备|申报|管制|航线|法规/, advice: '先以主管部门发布的当前空域和临时管制信息为准，再确认作业主体、飞手资质、设备要求和申报材料。不要依据过期截图或非官方转发信息飞行。', followUp: '请提供城市、作业区域、日期、飞行高度和任务性质。' },
        { match: /返航|RTH|备降|失控|降落/, advice: '确认返航点有效、返航高度避开障碍物、低电量阈值合理，并预设可用备降点。现场条件变化时，优先选择安全返航或备降而不是完成航线。', followUp: '请提供现场障碍物高度、返航高度、电池余量和备降点情况。' },
        { match: /^(?!.*(?:购买|买|出售|卖|二手|租赁|价格|质检|SN|履历)).*(?:巡检|测绘|建模|航拍|电力|施工|任务|航线规划)/, advice: '先明确作业范围、地面风险、航线高度、重叠率、人员分工和交付标准，再确认机型、载荷、备电、通信与备降方案。高风险区域应设置中止条件。', followUp: '请补充作业面积、目标物、交付格式、机型和现场限制。' },
        { match: /植保|喷洒|农药|播撒|农田/, advice: '植保作业要先核对药剂标签、作物和地块边界，并根据风向、风速、作业高度和流量完成试喷。人员、牲畜和水源保护区应纳入禁入范围。', followUp: '请提供作物类型、地块面积、药剂要求、风速和计划作业时间。' },
        { match: /购买|买|出售|卖|二手|租赁|价格|质检|SN|履历/, advice: '设备交易优先核验机型配置、SN、飞行时长、维修和炸机记录、电池健康度及质检报告。线下验机、支付和交付应通过可追溯流程完成。', followUp: '请提供机型、预算、用途、SN 或希望核验的报告项目。' },
        { match: /维修|保养|校准|固件|升级|清洁|存放/, advice: '维护前先备份飞行记录并核对厂商版本说明。固件升级、校准、清洁和长期存放应按设备手册执行，升级后先在安全场地完成基础测试。', followUp: '请提供机型、当前固件、上次维护时间和具体维护目标。' },
        { match: /考试|CAAC|执照|证书|题目|视距内|超视距|教员/, advice: '备考应先确定目标等级，再按法规、气象空域、飞行原理、设备检查和应急处置分模块练习。涉及报名、考试安排和证书有效期时，以官方最新通知为准。', followUp: '请告诉我目标证书等级、基础情况和最难的题目或知识点。' },
        { match: /新手|入门|学习|怎么飞|机型推荐|选机|续航/, advice: '入门阶段先把安全检查、悬停、定向、返航和异常处置练熟，再逐步增加环境复杂度。选机时优先看任务用途、合规要求、续航、载荷、售后和培训成本。', followUp: '请说明你的用途、预算、已有飞行经验和所在城市。' }
      ]
      const scenario = scenarios.find((item) => item.match.test(question))
      if (scenario) return `关于“${question}”：${scenario.advice}${scenario.followUp}`

      const mode = this.selectedTabKey || '飞前检查'
      const modeReply = {
        '任务方案': '我会按任务目标、作业区域、人员资质、机型载荷、航线、安全边界和交付节点拆解方案。',
        '设备诊断': '我会按电源、动力、定位、链路、云台载荷和日志六个方向排查，并优先识别不能起飞的风险。',
        '学考答疑': '我会按概念、判断依据、常见误区和记忆方法解释，并标明需要以官方通知为准的部分。',
        '飞前检查': '我会从机体、电池、链路、定位、空域气象、返航与备降点六项开始检查。'
      }
      return `我已收到“${question}”。${modeReply[mode] || modeReply['飞前检查']}请补充机型、所在城市、任务目的、现场现象和你最希望解决的结果，我会据此给出更具体的建议。`
    },
    previousQuestion() { this.questionIndex = this.questionIndex > 0 ? this.questionIndex - 1 : 0; this.selectedAnswer = null; this.submitted = false },
    nextQuestion() { this.questionIndex = this.questionIndex < this.questions.length - 1 ? this.questionIndex + 1 : 0; this.selectedAnswer = null; this.submitted = false },
    saveDraft() { uni.setStorageSync('lowair-draft-' + this.pageKey, this.form); this.showToast('草稿已保存到本机') },
    submitForm() {
      const missing = (this.page.form || []).filter((field) => !this.form[field])
      if (missing.length) return this.showToast('请补充：' + missing[0])
      if (this.page.dataSource !== 'mock') return this.showToast('请等待后端操作接口接入后提交')
      if (this.page.kind === 'account') return this.demoVerify()
      this.showToast(this.formActionText + '成功，当前为演示状态')
      if (this.page.kind === 'compose') setTimeout(() => this.go('/pages/community/post-detail?id=post-new'), 300)
      if (this.page.kind === 'publish') setTimeout(() => this.go('/pages/work/task-detail?id=task-new'), 300)
      if (this.page.kind === 'visit') setTimeout(() => this.go('/pages/messages/index?category=academy'), 300)
    },
    switchIdentity(identity) { this.auth.identity = identity; this.persistAuth(); this.showToast('已切换为' + (identity === 'enterprise' ? '企业' : '个人') + '身份') },
    handleProfileIdentity() {
      if (!this.auth.loggedIn) this.goAuth('login')
    },
    goAuth(mode) { uni.navigateTo({ url: '/pages/auth/index?mode=' + mode }) },
    logout() {
      clearSession()
      this.auth = { loggedIn: false, verified: false, caac: false, enterprise: false, institution: false, identity: 'personal' }
      this.showToast('已退出登录')
    },
    demoVerify() { if (this.page.dataSource !== 'mock') return this.showToast('认证状态仅由服务端返回'); this.auth.loggedIn = true; this.auth.verified = true; this.auth.caac = true; this.auth.enterprise = true; this.auth.institution = true; this.persistAuth(); this.showToast('材料已进入演示审核流程') },
    persistAuth() { uni.setStorageSync('lowair-demo-auth', this.auth) },
    selectLocale(locale) {
      const selectedKey = this.selectedTabKey || (this.rawPage.tabs || [])[0] || ''
      this.locale = locale
      this.page = localizePage(this.rawPage, locale)
      const selectedIndex = (this.rawPage.tabs || []).indexOf(selectedKey)
      this.selectedTab = this.page.tabs && this.page.tabs[selectedIndex >= 0 ? selectedIndex : 0] ? this.page.tabs[selectedIndex >= 0 ? selectedIndex : 0] : ''
      this.selectedTabKey = selectedKey
      uni.setStorageSync('lowair-demo-locale', locale)
      this.showToast('Language: ' + this.activeLocale.label)
    },
    selectTheme(theme) { this.theme = theme; uni.setStorageSync('lowair-demo-theme', theme); this.showToast('已切换为' + this.themeLabel + '背景') },
    changeCarousel(direction) {
      const size = (this.page.carousel || []).length
      if (!size) return
      this.carouselIndex = (this.carouselIndex + direction + size) % size
    },
    openDetail(title, note, status) { this.detailCard = { title: this.t(title), note: this.t(note), status: this.t(status) } },
    selectCity(city) { this.city = city; this.showCity = false; this.showToast('已切换至' + city) },
    sendMessage() { if (!this.messageInput.trim()) return; this.showToast('消息已发送'); this.messageInput = '' },
    togglePostAction(post, type) {
      if (type === 'like') { post.liked = !post.liked; post.likes += post.liked ? 1 : -1 }
      if (type === 'saved') post.saved = !post.saved
    },
    focusCommunityComment(post) { this.activeCommunityPostId = post.id; this.showToast('正在回复 ' + post.author) },
    askCommunityAi(post) {
      post.aiReply = post.topic.includes('超视距') ? '建议把通信链路检查、返航设置和异常处置分成三张记忆卡；答题时优先判断安全冗余。' : '复盘很完整。建议再补充起降点的授权范围、气象来源和异常返航的触发条件，便于他人复用。'
    },
    sendCommunityComment() {
      if (!this.communityInput.trim()) return this.showToast('请输入评论内容')
      const post = this.communityPosts.find((item) => item.id === this.activeCommunityPostId) || this.communityPosts[0]
      post.comments += 1
      post.aiReply = '已收到你的评论：“' + this.communityInput.trim() + '”。AI 建议：结合具体机型、现场条件和官方规则补充依据，会让讨论更有帮助。'
      this.communityInput = ''
      this.showToast('评论已发布，AI 已生成建议回复')
    },
    annotate(label) { this.showToast('长按说明：' + label + ' · 点击可执行对应操作') },
    showToast(text) { this.toast = this.t(text); setTimeout(() => { this.toast = '' }, 1800) }
  }
}
</script>

<style scoped>
.screen { min-height: 100%; padding: 24rpx 28rpx 0; box-sizing: border-box; background: var(--app-bg); }
.quick-search { display: flex; height: 72rpx; align-items: center; gap: 12rpx; margin: 0 0 22rpx; padding: 0 20rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface); color: var(--muted); font-size: 25rpx; transition: transform .16s ease, border-color .16s ease; }
.quick-search:active { transform: scale(.99); border-color: var(--accent); }
.hero-card { min-height: 284rpx; display: flex; overflow: hidden; position: relative; margin: 4rpx 0 24rpx; padding: 30rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }
.hero-image, .hero-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }.hero-image { opacity: .94; }.hero-scrim { background: linear-gradient(90deg, rgba(4,20,34,.92) 0%, rgba(4,20,34,.68) 52%, rgba(4,20,34,.12) 100%); }
.hero-copy { position: relative; z-index: 2; display: flex; flex: 1; flex-direction: column; align-items: flex-start; }
.eyebrow { color: var(--accent); font-size: 22rpx; line-height: 34rpx; }
.hero-title { max-width: 410rpx; margin-top: 8rpx; color: var(--text); font-size: 42rpx; font-weight: 700; line-height: 1.2; }
.hero-note { max-width: 420rpx; margin-top: 12rpx; color: var(--muted); font-size: 24rpx; line-height: 1.55; }
.hero-action { display: flex; align-items: center; gap: 10rpx; margin-top: auto; padding-top: 18rpx; color: var(--accent); font-size: 25rpx; }
.hero-card-image .hero-title { color: #edf7f8; }.hero-card-image .hero-note { color: #b8cbd2; }.hero-card-image .eyebrow, .hero-card-image .hero-action { color: #35dfb2; }
.arrow, .card-arrow { font-size: 34rpx; line-height: 1; }
.hero-art { position: absolute; right: -46rpx; bottom: -44rpx; width: 278rpx; height: 278rpx; }
.radar-ring { position: absolute; border: 1rpx solid var(--accent); border-radius: 50%; opacity: .35; }
.ring-one { inset: 14rpx; }.ring-two { inset: 58rpx; }
.brand-mark { position: absolute; left: 84rpx; top: 84rpx; width: 112rpx; height: 112rpx; opacity: .92; }
.status-beacon { position: absolute; top: 45rpx; right: 56rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--accent); }
.segment-wrap { margin: 0 -4rpx 24rpx; }.segment-scroll { white-space: nowrap; }.segments { display: inline-flex; gap: 12rpx; padding: 0 4rpx; }.segment { display: inline-flex; align-items: center; height: 58rpx; padding: 0 22rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; color: var(--muted); font-size: 25rpx; }.segment.selected { border-color: var(--accent); color: var(--accent); background: rgba(25, 207, 160, .08); }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 24rpx; border: 1rpx solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }.metric-cell { min-width: 0; padding: 22rpx 16rpx; border-right: 1rpx solid var(--line); }.metric-cell:last-child { border-right: 0; }.metric-value { display: block; overflow: hidden; color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 30rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.metric-label { display: block; margin-top: 7rpx; color: var(--muted); font-size: 22rpx; }
.tool-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14rpx; margin-bottom: 26rpx; }.tool-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }.tool-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 10rpx; padding: 20rpx 8rpx 16rpx; border: 1rpx solid var(--line); border-radius: 8px; color: var(--text); font-size: 22rpx; text-align: center; transition: transform .16s ease; }.tool-item:active, .data-card:active, .hero-action:active, .primary-button:active, .secondary-button:active { transform: scale(.98); }.tool-icon { display: flex; width: 50rpx; height: 50rpx; align-items: center; justify-content: center; border: 1rpx solid rgba(25, 207, 160, .42); border-radius: 6px; color: var(--accent); font-size: 30rpx; }
.content-section { margin-bottom: 30rpx; }.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 2rpx 14rpx; color: var(--text); font-size: 30rpx; font-weight: 650; }.heading-action { color: var(--accent); font-size: 23rpx; font-weight: 400; }.card-list { border: 1rpx solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }.data-card { min-height: 112rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 20rpx 22rpx; box-sizing: border-box; border-bottom: 1rpx solid var(--line); transition: transform .16s ease; }.data-card:last-child { border-bottom: 0; }.card-main { min-width: 0; flex: 1; }.card-title { display: block; color: var(--text); font-size: 27rpx; font-weight: 600; }.card-note { display: -webkit-box; overflow: hidden; margin-top: 8rpx; color: var(--muted); font-size: 23rpx; line-height: 1.45; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.card-side { max-width: 150rpx; display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; }.status-tag { display: inline-flex; max-width: 150rpx; overflow: hidden; padding: 5rpx 10rpx; border: 1rpx solid var(--line); border-radius: 999px; color: var(--muted); font-size: 20rpx; text-overflow: ellipsis; white-space: nowrap; }.status-tag.success { border-color: rgba(25,207,160,.45); color: var(--accent); }.status-tag.warning { border-color: rgba(242,180,86,.5); color: #f2b456; }.status-tag.pending { border-color: rgba(145,168,181,.45); color: var(--muted); }.card-arrow { color: var(--muted); }
.search-panel { margin-bottom: 24rpx; }.search-input-wrap { display: flex; height: 76rpx; align-items: center; gap: 12rpx; padding: 0 20rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface); }.search-symbol { color: var(--muted); font-size: 35rpx; }.search-input { flex: 1; min-width: 0; color: var(--text); font-size: 26rpx; }.input-placeholder { color: var(--muted); }.clear-input { color: var(--muted); font-size: 34rpx; }.search-history { margin-top: 24rpx; }.chip-row { display: flex; flex-wrap: wrap; gap: 12rpx; }.chip { padding: 10rpx 16rpx; border: 1rpx solid rgba(25,207,160,.42); border-radius: 999px; color: var(--text); font-size: 23rpx; }.chip.subtle { border-color: var(--line); color: var(--muted); }.selected-chip { background: rgba(25,207,160,.07); color: var(--accent); }.form-chips { margin-bottom: 24rpx; }
.assistant-block, .exam-panel, .form-panel, .identity-switch { margin-bottom: 28rpx; padding: 22rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.assistant-nameplate { display: flex; flex-direction: column; gap: 4rpx; margin-bottom: 22rpx; padding-bottom: 18rpx; border-bottom: 1rpx solid var(--line); }.assistant-nameplate text:first-child { color: var(--accent); font-size: 30rpx; font-weight: 750; }.assistant-nameplate text:last-child { color: var(--muted); font-size: 22rpx; }.chat-row { display: flex; justify-content: flex-end; gap: 12rpx; margin-bottom: 16rpx; }.chat-row.bot { justify-content: flex-start; }.chat-avatar { display: flex; width: 46rpx; height: 46rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 6px; color: var(--accent); font-size: 16rpx; }.chat-bubble { max-width: 82%; padding: 14rpx 16rpx; border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 24rpx; line-height: 1.5; }.chat-row.user .chat-bubble { background: var(--surface-strong); color: var(--text); }.compare-tray { display: flex; justify-content: space-between; margin: 18rpx 0; padding: 16rpx 0; border-top: 1rpx solid var(--line); border-bottom: 1rpx solid var(--line); color: var(--muted); font-size: 23rpx; }.chat-composer, .message-composer { display: flex; gap: 12rpx; }.chat-input, .message-composer input { min-width: 0; flex: 1; height: 66rpx; padding: 0 14rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 24rpx; }.send-button { display: flex; min-width: 90rpx; height: 66rpx; align-items: center; justify-content: center; border-radius: 6px; background: var(--accent); color: var(--accent-ink); font-size: 24rpx; font-weight: 650; }
.drone-agent { overflow: hidden; margin-bottom: 28rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.drone-agent-head { display: flex; align-items: center; gap: 14rpx; padding: 20rpx 22rpx; border-bottom: 1rpx solid var(--line); }.drone-agent-mark { display: flex; width: 56rpx; height: 56rpx; flex: 0 0 56rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 19rpx; font-weight: 800; }.drone-agent-identity { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 3rpx; }.drone-agent-identity text:first-child { color: var(--text); font-size: 27rpx; font-weight: 700; }.drone-agent-identity text:last-child { color: var(--muted); font-size: 20rpx; }.drone-agent-status { flex: 0 0 auto; padding: 6rpx 10rpx; border: 1rpx solid var(--line); border-radius: 999px; color: var(--muted); font-size: 19rpx; }.drone-agent-context { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 22rpx; border-bottom: 1rpx solid var(--line); color: var(--muted); font-size: 21rpx; }.drone-agent-context text:last-child { color: var(--accent); }.drone-thread { min-height: 222rpx; padding: 22rpx 22rpx 6rpx; background: var(--surface-strong); }.agent-avatar { flex: 0 0 46rpx; background: var(--surface); }.drone-thread .chat-row.user .chat-bubble { border: 1rpx solid rgba(25,207,160,.32); background: var(--surface); }.drone-thinking { display: flex; align-items: center; gap: 6rpx; }.drone-thinking text { width: 6rpx; height: 6rpx; border-radius: 50%; background: var(--accent); opacity: .35; animation: agentPulse 1s ease-in-out infinite; }.drone-thinking text:nth-child(2) { animation-delay: .14s; }.drone-thinking text:nth-child(3) { animation-delay: .28s; }.drone-suggestions { padding: 18rpx 22rpx 4rpx; }.drone-suggestions-title { display: block; margin-bottom: 12rpx; color: var(--muted); font-size: 21rpx; }.drone-suggestion-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }.drone-suggestion { display: flex; min-height: 78rpx; align-items: center; padding: 12rpx 14rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 22rpx; line-height: 1.35; transition: transform .16s ease, border-color .16s ease; }.drone-suggestion:active { transform: scale(.98); border-color: var(--accent); }.drone-composer { display: flex; gap: 12rpx; padding: 18rpx 22rpx 14rpx; }.drone-input { min-width: 0; flex: 1; height: 70rpx; padding: 0 16rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 24rpx; }.send-button.disabled { opacity: .55; }.drone-disclaimer { display: block; padding: 0 22rpx 20rpx; color: var(--muted); font-size: 20rpx; line-height: 1.55; }
@keyframes agentPulse { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2rpx); } }
.exam-meta { color: var(--muted); font-size: 22rpx; }.exam-question { display: block; margin: 16rpx 0 22rpx; color: var(--text); font-size: 30rpx; line-height: 1.5; }.answer-row { display: flex; align-items: center; gap: 14rpx; min-height: 78rpx; margin-bottom: 12rpx; padding: 14rpx; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 25rpx; }.answer-row.chosen { border-color: var(--accent); color: var(--text); background: rgba(25,207,160,.08); }.answer-row.correct { border-color: var(--accent); }.answer-row.wrong { border-color: #ee6b6b; }.answer-letter { display: flex; width: 36rpx; height: 36rpx; align-items: center; justify-content: center; border: 1rpx solid currentColor; border-radius: 50%; font-size: 21rpx; }.exam-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; }.text-button { color: var(--muted); font-size: 24rpx; }.primary-inline { color: var(--accent); font-size: 24rpx; }.answer-explain { display: block; margin-top: 18rpx; color: var(--muted); font-size: 23rpx; line-height: 1.55; }
.field-group { margin-bottom: 20rpx; }.field-label { display: block; margin-bottom: 10rpx; color: var(--text); font-size: 24rpx; }.form-input { height: 74rpx; padding: 0 16rpx; box-sizing: border-box; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 25rpx; }.form-actions, .account-actions { display: flex; gap: 14rpx; margin-top: 28rpx; }.primary-button, .secondary-button { flex: 1; display: flex; min-height: 72rpx; align-items: center; justify-content: center; padding: 0 14rpx; box-sizing: border-box; border-radius: 6px; font-size: 25rpx; transition: transform .16s ease; }.primary-button { background: var(--accent); color: var(--accent-ink); font-weight: 650; }.secondary-button { border: 1rpx solid var(--line); color: var(--text); }.identity-row { display: flex; align-items: center; justify-content: space-between; color: var(--text); font-size: 25rpx; }.identity-control { display: flex; overflow: hidden; border: 1rpx solid var(--line); border-radius: 6px; }.identity-control text { padding: 12rpx 16rpx; color: var(--muted); }.identity-control text.activeIdentity { background: rgba(25,207,160,.12); color: var(--accent); }
.permission-panel { margin-bottom: 24rpx; padding: 26rpx; border: 1rpx solid rgba(242,180,86,.45); border-radius: 8px; background: var(--surface-strong); }.permission-title { display: block; margin-top: 10rpx; color: var(--text); font-size: 30rpx; font-weight: 650; }.permission-note { display: block; margin: 10rpx 0 22rpx; color: var(--muted); font-size: 24rpx; line-height: 1.5; }.message-composer { position: sticky; bottom: 20rpx; z-index: 4; margin: 16rpx 0 26rpx; padding: 14rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 54rpx 20rpx; border: 1rpx dashed var(--line); border-radius: 8px; color: var(--muted); text-align: center; }.empty-icon { color: var(--accent); font-size: 60rpx; }.empty-title { color: var(--text); font-size: 28rpx; }.empty-note { font-size: 23rpx; }.empty-state .secondary-button { min-width: 180rpx; flex: 0; margin-top: 10rpx; }.demo-note { margin: 12rpx 4rpx 16rpx; color: var(--muted); font-size: 20rpx; line-height: 1.5; }
.carousel-panel { position: relative; min-height: 216rpx; overflow: hidden; margin: 0 0 24rpx; padding: 26rpx 30rpx 36rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface-strong); }
.carousel-image, .carousel-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }.carousel-image { opacity: .9; }.carousel-scrim { background: linear-gradient(90deg, rgba(4,20,34,.96) 0%, rgba(4,20,34,.78) 47%, rgba(4,20,34,.18) 100%); }
.carousel-copy { position: relative; z-index: 2; max-width: 430rpx; display: flex; flex-direction: column; align-items: flex-start; }
.carousel-kicker { color: var(--accent); font-size: 21rpx; }.carousel-title { margin-top: 8rpx; color: var(--text); font-size: 34rpx; font-weight: 700; }.carousel-note { margin-top: 10rpx; color: var(--muted); font-size: 23rpx; line-height: 1.5; }.carousel-action { margin-top: 16rpx; color: var(--accent); font-size: 23rpx; }
.carousel-controls { position: absolute; z-index: 2; left: 30rpx; bottom: 17rpx; display: flex; gap: 12rpx; }.carousel-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--line); transition: transform .16s ease, background .16s ease; }.carousel-dot.active { background: var(--accent); transform: scale(1.25); }
.video-card { position: relative; height: 270rpx; overflow: hidden; margin: 0 0 26rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); transition: transform .16s ease; }.video-card:active, .product-card:active { transform: scale(.98); }.video-cover { width: 100%; height: 100%; }.video-overlay { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 16rpx; padding: 22rpx; background: linear-gradient(180deg, transparent 35%, rgba(3,17,27,.84) 100%); }.video-play { display: flex; width: 58rpx; height: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-size: 23rpx; }.video-copy { min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }.video-title { color: #fff; font-size: 28rpx; font-weight: 700; }.video-note { color: rgba(255,255,255,.76); font-size: 21rpx; }
.market-products { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx; margin: 0 0 28rpx; }.product-card { min-width: 0; overflow: hidden; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); transition: transform .16s ease; }.product-image { display: block; width: 100%; height: 210rpx; background: var(--surface-strong); }.product-copy { display: flex; flex-direction: column; gap: 7rpx; padding: 16rpx; }.product-tag { align-self: flex-start; padding: 4rpx 8rpx; border-radius: 999px; background: rgba(25,207,160,.12); color: var(--accent); font-size: 18rpx; }.product-title { overflow: hidden; color: var(--text); font-size: 25rpx; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }.product-note { display: -webkit-box; overflow: hidden; color: var(--muted); font-size: 20rpx; line-height: 1.4; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.product-price { margin-top: 2rpx; color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 26rpx; font-weight: 700; }
.profile-overview { margin-bottom: 26rpx; border: 1rpx solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }.profile-identity { display: flex; align-items: center; gap: 18rpx; padding: 26rpx; }.profile-avatar { display: flex; width: 88rpx; height: 88rpx; flex: 0 0 88rpx; align-items: center; justify-content: center; border: 1rpx solid var(--accent); border-radius: 50%; background: var(--surface-strong); color: var(--accent); font-size: 34rpx; font-weight: 700; }.profile-copy { min-width: 0; flex: 1; }.profile-name { display: block; color: var(--text); font-size: 31rpx; font-weight: 700; }.profile-meta { display: block; overflow: hidden; margin-top: 8rpx; color: var(--muted); font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }
.profile-login { display: flex; flex-direction: column; gap: 14rpx; padding: 0 26rpx 26rpx; }.profile-login-title { color: var(--muted); font-size: 23rpx; }.profile-login-row { display: flex; gap: 12rpx; }.profile-login-row .primary-button, .profile-login-row .secondary-button { min-width: 0; }.profile-session { display: flex; align-items: center; justify-content: space-between; padding: 0 26rpx 22rpx; color: var(--muted); font-size: 21rpx; }.session-logout { padding: 10rpx 0 10rpx 20rpx; color: #f2b456; }
.profile-finance { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1rpx solid var(--line); }.finance-item { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 22rpx 8rpx; border-right: 1rpx solid var(--line); color: var(--muted); font-size: 21rpx; }.finance-item:last-child { border-right: 0; }.finance-value { max-width: 100%; overflow: hidden; color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.theme-panel { margin: 0 0 28rpx; }.theme-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }.theme-option { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 10rpx; padding: 16rpx 8rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 22rpx; transition: transform .16s ease, border-color .16s ease; }.theme-option.selected { border-color: var(--accent); color: var(--accent); }.theme-option:active { transform: scale(.98); }.theme-swatch { width: 50rpx; height: 50rpx; border: 2rpx solid rgba(255,255,255,.38); border-radius: 50%; }
.locale-panel { margin: 0 0 28rpx; }.locale-options { display: flex; flex-wrap: wrap; gap: 12rpx; }.locale-option { padding: 13rpx 18rpx; border: 1rpx solid var(--line); border-radius: 999px; background: var(--surface); color: var(--muted); font-size: 23rpx; transition: transform .16s ease, border-color .16s ease; }.locale-option.selected { border-color: var(--accent); color: var(--accent); background: rgba(25,207,160,.08); }.locale-option:active { transform: scale(.97); }
.social-feed { margin: 0 0 30rpx; }.feed-composer { display: flex; align-items: center; gap: 14rpx; margin-bottom: 18rpx; padding: 16rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); color: var(--muted); font-size: 23rpx; transition: transform .16s ease; }.feed-composer:active, .social-post:active { transform: scale(.995); }.feed-avatar { display: flex; width: 58rpx; height: 58rpx; flex: 0 0 58rpx; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #276c82); color: var(--accent-ink); font-size: 24rpx; font-weight: 700; }.feed-avatar.self { background: var(--surface-strong); border: 1rpx solid var(--accent); color: var(--accent); }.feed-compose-action { margin-left: auto; color: var(--accent); }.social-post { margin-bottom: 18rpx; overflow: hidden; padding: 20rpx; border: 1rpx solid var(--line); border-radius: 10rpx; background: var(--surface); transition: transform .16s ease; }.post-head { display: flex; align-items: center; gap: 12rpx; }.post-author { min-width: 0; flex: 1; }.post-author text:first-child { display: block; color: var(--text); font-size: 25rpx; font-weight: 650; }.post-author text:last-child { display: block; margin-top: 5rpx; color: var(--muted); font-size: 20rpx; }.post-more { padding: 8rpx; color: var(--muted); font-size: 30rpx; }.post-copy { display: block; margin: 16rpx 0; color: var(--text); font-size: 25rpx; line-height: 1.65; }.post-image { display: block; width: 100%; height: 310rpx; border-radius: 8rpx; background: var(--surface-strong); }.post-actions { display: flex; flex-wrap: wrap; gap: 20rpx; margin-top: 17rpx; color: var(--muted); font-size: 21rpx; }.post-actions .ai-reply { margin-left: auto; color: var(--accent); }.ai-comment { display: flex; gap: 10rpx; margin-top: 16rpx; padding: 13rpx; border-left: 4rpx solid var(--accent); border-radius: 0 6rpx 6rpx 0; background: rgba(25,207,160,.08); color: var(--muted); font-size: 22rpx; line-height: 1.5; }.ai-comment text:first-child { flex: 0 0 auto; color: var(--accent); }.community-comment { position: sticky; z-index: 4; bottom: 18rpx; display: flex; gap: 12rpx; padding: 13rpx; border: 1rpx solid var(--line); border-radius: 9rpx; background: var(--surface); }.community-comment input { min-width: 0; flex: 1; height: 66rpx; padding: 0 14rpx; border: 1rpx solid var(--line); border-radius: 6rpx; color: var(--text); font-size: 23rpx; }
.detail-sheet { padding-bottom: 40rpx; }.detail-status { display: inline-flex; margin: 0 0 16rpx; padding: 6rpx 12rpx; border: 1rpx solid var(--accent); border-radius: 999px; color: var(--accent); font-size: 21rpx; }.detail-copy { display: block; margin-bottom: 26rpx; color: var(--muted); font-size: 25rpx; line-height: 1.55; }
.overlay { position: fixed; z-index: 60; inset: 0; display: flex; align-items: flex-end; background: rgba(0, 0, 0, .55); }.sheet { width: 100%; padding: 28rpx; border: 1rpx solid var(--line); border-radius: 8px 8px 0 0; box-sizing: border-box; background: var(--surface); }.sheet-title { display: block; margin-bottom: 12rpx; color: var(--text); font-size: 30rpx; font-weight: 650; }.sheet-option { display: block; padding: 24rpx 0; border-top: 1rpx solid var(--line); color: var(--text); font-size: 28rpx; }.toast { position: fixed; z-index: 100; left: 50%; bottom: calc(130rpx + env(safe-area-inset-bottom)); max-width: 560rpx; padding: 16rpx 22rpx; transform: translateX(-50%); border-radius: 6px; background: var(--surface-strong); color: var(--text); font-size: 24rpx; text-align: center; }
@media (prefers-reduced-motion: reduce) { .tool-item, .data-card, .hero-action, .primary-button, .secondary-button, .drone-suggestion { transition: none; }.drone-thinking text { animation: none; opacity: .65; } }
</style>
