<template>
  <academy-layout ref="layout" title="学习中心" :show-assistant="false">
    <view v-if="loading" class="learning-loading" aria-label="正在加载学习内容">
      <view class="learning-skeleton learning-skeleton--hero" />
      <view class="learning-skeleton-grid">
        <view class="learning-skeleton learning-skeleton--content" />
        <view class="learning-skeleton learning-skeleton--side" />
      </view>
    </view>

    <view v-else-if="error" class="learning-state">
      <view class="state-mark" aria-hidden="true">!</view>
      <text class="learning-state__title">学习内容加载失败</text>
      <text class="learning-state__note">{{ error }}</text>
      <view class="learning-button learning-button--primary" role="button" tabindex="0" @tap="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载</view>
    </view>

    <template v-else>
      <view class="learning-overview">
        <view class="overview-copy">
          <text class="overview-kicker">{{ learning.plan.focus || 'CAAC' }}学习计划</text>
          <text class="overview-title">从下一节开始，保持学习节奏</text>
          <text class="overview-note">每天完成一个小目标，课程进度与视频位置会自动保存。</text>

          <view v-if="recommendedLesson" class="next-lesson">
            <view class="next-lesson__copy">
              <text class="next-lesson__label">{{ lessonProgress(recommendedLesson.id) ? '继续上次学习' : '建议先学' }}</text>
              <text class="next-lesson__title">{{ recommendedLesson.title }}</text>
              <text class="next-lesson__meta">{{ recommendedLesson.chapter.title }} · {{ recommendedLesson.duration }} 分钟</text>
            </view>
            <view class="learning-button learning-button--primary" role="button" tabindex="0" @tap="openLesson(recommendedLesson, recommendedLesson.chapter)" @keyup.enter="openLesson(recommendedLesson, recommendedLesson.chapter)" @keyup.space.prevent="openLesson(recommendedLesson, recommendedLesson.chapter)">
              {{ lessonProgress(recommendedLesson.id) ? '继续学习' : '开始学习' }}
            </view>
          </view>

          <view v-else class="overview-empty">
            <text>当前课程已全部完成，可以前往题库巩固知识。</text>
            <text class="overview-link" role="button" tabindex="0" @tap="go('/pages/academy/exam?mode=practice')" @keyup.enter="go('/pages/academy/exam?mode=practice')">开始刷题</text>
          </view>
        </view>

        <view class="overview-progress" :aria-label="'总课程进度 ' + overallProgress + '%'">
          <view class="progress-ring" :style="{ '--progress': overallProgress }">
            <view class="progress-ring__inner">
              <text class="progress-ring__value">{{ overallProgress }}%</text>
              <text class="progress-ring__label">总进度</text>
            </view>
          </view>
          <view class="overview-stats">
            <view><text>{{ completedCount }}</text><text>已完成</text></view>
            <view><text>{{ totalStudyMinutes }}</text><text>已学分钟</text></view>
            <view><text>{{ learning.plan.dailyMinutes || 30 }}</text><text>每日目标</text></view>
          </view>
        </view>
      </view>

      <view class="learning-workspace">
        <view class="learning-primary">
          <view v-if="activeLesson" class="player-shell">
            <view class="player-head">
              <view class="player-head__copy">
                <text class="section-kicker">正在学习</text>
                <text class="player-title">{{ activeLesson.title }}</text>
                <text class="player-meta">{{ activeLesson.chapterTitle }} · {{ typeLabel(activeLesson.type) }} · {{ activeLesson.duration }} 分钟</text>
              </view>
              <text class="close-button" role="button" tabindex="0" aria-label="关闭播放器" @tap="closeLesson" @keyup.enter="closeLesson" @keyup.space.prevent="closeLesson">×</text>
            </view>

            <video v-if="activeLesson.videoUrl && !videoFailed" class="lesson-video" :src="activeLesson.videoUrl" controls :initial-time="lessonPosition(activeLesson.id)" @error="videoFailed = true" @timeupdate="handleTimeUpdate" @ended="completeLesson" />
            <view v-else class="lesson-fallback">
              <image v-if="!coverFailed" src="/static/images/lowair-learning-video.png" mode="aspectFill" alt="无人机课程训练画面" @error="coverFailed = true" />
              <view class="lesson-fallback__scrim" />
              <view class="lesson-fallback__content">
                <text class="fallback-type">{{ typeLabel(activeLesson.type) }}</text>
                <text class="fallback-title">{{ activeLesson.type === 'video' ? '课程媒体正在接入' : '图文与情景课程' }}</text>
                <text class="fallback-note">可先记录 5 分钟学习进度，稍后从这里继续。</text>
                <view class="learning-button learning-button--light" role="button" tabindex="0" @tap="advanceLesson" @keyup.enter="advanceLesson" @keyup.space.prevent="advanceLesson">记录 5 分钟</view>
              </view>
            </view>

            <view class="player-progress-row">
              <view class="linear-progress" :aria-label="'本节进度 ' + lessonProgress(activeLesson.id) + '%'">
                <view class="linear-progress__value" :style="{ width: lessonProgress(activeLesson.id) + '%' }" />
              </view>
              <text>{{ lessonProgress(activeLesson.id) }}%</text>
            </view>
            <view class="player-footer">
              <text class="source-note">来源：{{ activeLesson.source }}</text>
              <view class="player-actions">
                <view class="learning-button learning-button--secondary learning-button--small" role="button" tabindex="0" @tap="addWrongPractice" @keyup.enter="addWrongPractice">错题练习</view>
                <view class="learning-button learning-button--primary learning-button--small" role="button" tabindex="0" @tap="completeLesson" @keyup.enter="completeLesson">标记完成</view>
              </view>
            </view>
          </view>

          <view class="catalog-shell">
            <view class="catalog-head">
              <view>
                <text class="section-title">课程目录</text>
                <text class="section-note">{{ visibleLessonCount }} 节内容，选择课程即可开始</text>
              </view>
              <text class="catalog-count">{{ completedCount }}/{{ lessonCount }} 完成</text>
            </view>

            <scroll-view class="mode-tabs" scroll-x :show-scrollbar="false" role="tablist" aria-label="课程类型">
              <text v-for="item in modeTabs" :key="item.key" class="mode-tab" :class="{ 'mode-tab--active': activeMode === item.key }" role="tab" tabindex="0" :aria-selected="activeMode === item.key" @tap="selectMode(item.key)" @keyup.enter="selectMode(item.key)" @keyup.space.prevent="selectMode(item.key)">{{ item.label }}</text>
            </scroll-view>

            <view v-if="visibleChapters.length" class="chapter-list">
              <view v-for="chapter in visibleChapters" :key="chapter.id" class="chapter-block">
                <view class="chapter-head" role="button" tabindex="0" :aria-expanded="isChapterExpanded(chapter.id)" @tap="toggleChapter(chapter.id)" @keyup.enter="toggleChapter(chapter.id)" @keyup.space.prevent="toggleChapter(chapter.id)">
                  <view class="chapter-copy">
                    <text class="chapter-title">{{ chapter.title }}</text>
                    <text class="chapter-note">{{ chapter.note || '课程章节' }} · {{ chapter.lessons.length }} 节</text>
                  </view>
                  <view class="chapter-summary">
                    <text>{{ chapterProgress(chapter) }}%</text>
                    <text class="chapter-chevron" aria-hidden="true">{{ isChapterExpanded(chapter.id) ? '−' : '+' }}</text>
                  </view>
                </view>

                <view v-if="isChapterExpanded(chapter.id)" class="lesson-list">
                  <view v-for="(lesson, index) in chapter.lessons" :key="lesson.id" class="lesson-row" :class="{ 'lesson-row--active': activeLesson && activeLesson.id === lesson.id }" role="button" tabindex="0" @tap="openLesson(lesson, chapter)" @keyup.enter="openLesson(lesson, chapter)" @keyup.space.prevent="openLesson(lesson, chapter)">
                    <view class="lesson-index" :class="{ 'lesson-index--done': lessonProgress(lesson.id) >= 100 }" aria-hidden="true">{{ lessonProgress(lesson.id) >= 100 ? '✓' : index + 1 }}</view>
                    <view class="lesson-copy">
                      <text class="lesson-title">{{ lesson.title }}</text>
                      <text class="lesson-meta">{{ typeLabel(lesson.type) }} · {{ lesson.duration }} 分钟</text>
                    </view>
                    <view class="lesson-status">
                      <text>{{ lessonStatus(lesson.id) }}</text>
                      <view v-if="lessonProgress(lesson.id) > 0 && lessonProgress(lesson.id) < 100" class="lesson-mini-progress"><view :style="{ width: lessonProgress(lesson.id) + '%' }" /></view>
                    </view>
                    <text class="lesson-arrow" aria-hidden="true">›</text>
                  </view>
                </view>
              </view>
            </view>

            <view v-else class="catalog-empty">
              <text class="catalog-empty__title">暂无此类课程</text>
              <text class="catalog-empty__note">切换其他分类，或等待课程内容更新。</text>
            </view>
          </view>
        </view>

        <view class="learning-sidebar">
          <view class="side-panel plan-card">
            <view class="side-panel__head">
              <view>
                <text class="side-title">学习计划</text>
                <text class="side-note">控制每天的学习节奏</text>
              </view>
              <text class="text-button" role="button" tabindex="0" @tap="showPlan = !showPlan" @keyup.enter="showPlan = !showPlan">{{ showPlan ? '收起' : '调整' }}</text>
            </view>

            <view v-if="!showPlan" class="plan-summary">
              <view><text>每日时长</text><text>{{ learning.plan.dailyMinutes || 30 }} 分钟</text></view>
              <view><text>目标等级</text><text>{{ learning.plan.focus || '超视距' }}</text></view>
              <view><text>完成日期</text><text>{{ learning.plan.targetDate || '暂未设置' }}</text></view>
            </view>

            <view v-else class="plan-form">
              <view class="plan-field">
                <text class="plan-label">每日学习时间</text>
                <picker :range="dailyOptions" @change="planDraft.dailyMinutes = dailyOptions[Number($event.detail.value)]"><view class="plan-select">{{ planDraft.dailyMinutes }} 分钟 <text>⌄</text></view></picker>
              </view>
              <view class="plan-field">
                <text class="plan-label">目标等级</text>
                <picker :range="focusOptions" @change="planDraft.focus = focusOptions[Number($event.detail.value)]"><view class="plan-select">{{ planDraft.focus }} <text>⌄</text></view></picker>
              </view>
              <view class="plan-field">
                <text class="plan-label">计划完成日期</text>
                <picker mode="date" :value="planDraft.targetDate" @change="planDraft.targetDate = $event.detail.value"><view class="plan-select">{{ planDraft.targetDate || '选择日期' }} <text>⌄</text></view></picker>
              </view>
              <view class="learning-button learning-button--primary learning-button--full" role="button" tabindex="0" @tap="savePlan" @keyup.enter="savePlan">保存计划</view>
            </view>
          </view>

          <view class="side-panel practice-card">
            <view class="side-panel__head">
              <view>
                <text class="side-title">练习巩固</text>
                <text class="side-note">学完后立即检验掌握情况</text>
              </view>
            </view>
            <view class="practice-actions">
              <view class="practice-action" role="button" tabindex="0" @tap="go('/pages/academy/exam?mode=practice')" @keyup.enter="go('/pages/academy/exam?mode=practice')">
                <view class="practice-action__mark">练</view>
                <view><text>章节刷题</text><text>按题型随时练习</text></view>
                <text aria-hidden="true">›</text>
              </view>
              <view class="practice-action" role="button" tabindex="0" @tap="go('/pages/academy/exam?mode=mock')" @keyup.enter="go('/pages/academy/exam?mode=mock')">
                <view class="practice-action__mark">考</view>
                <view><text>模拟考试</text><text>按正式流程答题</text></view>
                <text aria-hidden="true">›</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>
  </academy-layout>
</template>

<script>
import AcademyLayout from './AcademyLayout.vue'
import { academyService } from '../services'
import { getAcademyRouteOptions } from '../utils/route-options'

export default {
  name: 'LearningPage',
  components: { AcademyLayout },
  data() {
    const options = getAcademyRouteOptions('learning')
    return {
      loading: true,
      error: '',
      mode: options.mode || 'guide',
      courseId: options.courseId,
      curriculum: [],
      learning: { progress: {}, videoPosition: {}, plan: { dailyMinutes: 30, targetDate: '', focus: '超视距' } },
      expanded: {},
      activeLesson: null,
      showPlan: false,
      planDraft: {},
      dailyOptions: [15, 20, 30, 45, 60],
      focusOptions: ['视距内', '超视距', '教员'],
      lastVideoSave: 0,
      videoFailed: false,
      coverFailed: false
    }
  },
  computed: {
    lessons() {
      return this.curriculum.flatMap((chapter) => (chapter.lessons || []).map((lesson) => ({
        ...lesson,
        chapter,
        videoUrl: lesson.videoUrl || lesson.resourceUrl || '',
        source: lesson.source || chapter.note || '课程内容'
      })))
    },
    lessonCount() { return this.lessons.length },
    completedCount() { return this.lessons.filter((lesson) => this.lessonProgress(lesson.id) >= 100).length },
    overallProgress() { return this.lessonCount ? Math.round(this.lessons.reduce((sum, lesson) => sum + this.lessonProgress(lesson.id), 0) / this.lessonCount) : 0 },
    totalStudyMinutes() { return Math.round(this.lessons.reduce((sum, lesson) => sum + Math.min(100, this.lessonProgress(lesson.id)) / 100 * Number(lesson.duration || 0), 0)) },
    modeTabs() { return [{ key: 'guide', label: '全部课程' }, { key: 'video', label: '考点视频' }, { key: 'law', label: '法律法规' }, { key: 'simulator', label: 'AI 实操' }] },
    activeMode() { return ['video', 'law', 'simulator'].includes(this.mode) ? this.mode : 'guide' },
    visibleChapters() {
      const matchers = {
        video: (lesson) => lesson.type === 'video',
        law: (lesson, chapter) => /法规|空域|申报|规则/.test(lesson.title + chapter.title),
        simulator: (lesson) => lesson.type === 'simulator',
        guide: () => true
      }
      const matcher = matchers[this.activeMode]
      return this.curriculum.map((chapter) => ({
        ...chapter,
        lessons: (chapter.lessons || []).filter((lesson) => matcher(lesson, chapter)).map((lesson) => ({
          ...lesson,
          chapter,
          videoUrl: lesson.videoUrl || lesson.resourceUrl || '',
          source: lesson.source || chapter.note || '课程内容'
        }))
      })).filter((chapter) => chapter.lessons.length)
    },
    visibleLessonCount() { return this.visibleChapters.reduce((total, chapter) => total + chapter.lessons.length, 0) },
    recommendedLesson() {
      const inProgress = this.lessons.find((lesson) => this.lessonProgress(lesson.id) > 0 && this.lessonProgress(lesson.id) < 100)
      return inProgress || this.lessons.find((lesson) => this.lessonProgress(lesson.id) < 100) || null
    }
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const [curriculum, learning] = await Promise.all([
          academyService.getCurriculum({ mode: this.mode, courseId: this.courseId }),
          academyService.getLearningState()
        ])
        this.curriculum = curriculum
        this.learning = {
          ...this.learning,
          ...learning,
          progress: learning.progress || {},
          videoPosition: learning.videoPosition || {},
          plan: learning.plan || this.learning.plan
        }
        this.planDraft = { ...this.learning.plan }
        const firstChapter = curriculum.find((chapter) => chapter.lessons && chapter.lessons.length)
        if (firstChapter) this.expanded = { [firstChapter.id]: true }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    lessonProgress(id) { return Number(this.learning.progress[id]) || 0 },
    lessonPosition(id) { return Number(this.learning.videoPosition[id]) || 0 },
    lessonStatus(id) {
      const progress = this.lessonProgress(id)
      if (progress >= 100) return '已完成'
      if (progress > 0) return progress + '%'
      return '开始'
    },
    chapterProgress(chapter) {
      if (!chapter.lessons.length) return 0
      return Math.round(chapter.lessons.reduce((sum, lesson) => sum + this.lessonProgress(lesson.id), 0) / chapter.lessons.length)
    },
    isChapterExpanded(id) { return this.expanded[id] !== false && (this.expanded[id] === true || Object.keys(this.expanded).length === 0) },
    selectMode(mode) {
      this.mode = mode
      this.activeLesson = null
      const first = this.visibleChapters[0]
      this.expanded = first ? { [first.id]: true } : {}
    },
    toggleChapter(id) { this.expanded = { ...this.expanded, [id]: !this.isChapterExpanded(id) } },
    openLesson(lesson, chapter) {
      this.videoFailed = false
      this.coverFailed = false
      this.activeLesson = {
        ...lesson,
        chapterTitle: chapter.title,
        videoUrl: lesson.videoUrl || lesson.resourceUrl || '',
        source: lesson.source || chapter.note || '课程内容'
      }
      this.$nextTick(() => this.$refs.layout.showToast(this.lessonProgress(lesson.id) ? `已恢复到 ${this.lessonProgress(lesson.id)}%` : '已开始本节课程'))
    },
    closeLesson() { this.activeLesson = null },
    typeLabel(type) { return { video: '视频', article: '图文', simulator: '情景模拟' }[type] || type },
    async advanceLesson() {
      const duration = Math.max(1, Number(this.activeLesson.duration) || 1)
      const progress = Math.min(95, this.lessonProgress(this.activeLesson.id) + Math.max(8, Math.round(500 / duration)))
      await this.persistLesson(progress, this.lessonPosition(this.activeLesson.id) + 300)
      this.$refs.layout.showToast('学习进度已保存')
    },
    async completeLesson() {
      if (!this.activeLesson) return
      await this.persistLesson(100, this.activeLesson.duration * 60)
      this.$refs.layout.showToast('本节已完成，学习档案已更新')
    },
    async persistLesson(progress, position) {
      await academyService.updateLessonProgress(this.activeLesson.id, progress, position)
      this.learning.progress[this.activeLesson.id] = progress
      this.learning.videoPosition[this.activeLesson.id] = position
    },
    handleTimeUpdate(event) {
      const now = Date.now()
      if (now - this.lastVideoSave < 5000 || !this.activeLesson) return
      this.lastVideoSave = now
      const current = Number(event.detail.currentTime) || 0
      const duration = Number(event.detail.duration) || this.activeLesson.duration * 60
      this.persistLesson(Math.min(99, Math.round(current / duration * 100)), current)
    },
    async savePlan() {
      try {
        this.learning.plan = await academyService.updateLearningPlan(this.planDraft)
        this.planDraft = { ...this.learning.plan }
        this.showPlan = false
        this.$refs.layout.showToast('学习计划已保存')
      } catch (error) {
        this.$refs.layout.showToast(error.message)
      }
    },
    addWrongPractice() { this.go('/pages/academy/exam?mode=practice&type=wrong') },
    go(url) { uni.navigateTo({ url }) }
  }
}
</script>

<style scoped>
.learning-loading { display: flex; flex-direction: column; gap: 24rpx; }
.learning-skeleton { border-radius: 14rpx; background: linear-gradient(90deg, var(--surface) 25%, var(--surface-strong) 50%, var(--surface) 75%); background-size: 200% 100%; animation: learning-shimmer 1.2s infinite; }
.learning-skeleton--hero { min-height: 390rpx; }
.learning-skeleton-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20rpx; }
.learning-skeleton--content { min-height: 560rpx; }
.learning-skeleton--side { min-height: 260rpx; }
.learning-state { display: flex; min-height: 520rpx; flex-direction: column; align-items: center; justify-content: center; padding: 48rpx 24rpx; text-align: center; }
.state-mark { display: flex; width: 72rpx; height: 72rpx; align-items: center; justify-content: center; margin-bottom: 22rpx; border: 1rpx solid var(--academy-danger); border-radius: 50%; color: var(--academy-danger); font-size: 34rpx; font-weight: 700; }
.learning-state__title { color: var(--text); font-size: 30rpx; font-weight: 720; }
.learning-state__note { max-width: 520rpx; margin: 10rpx 0 24rpx; color: var(--muted); font-size: 22rpx; }
.learning-overview { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 30rpx; overflow: hidden; margin-bottom: 26rpx; padding: 30rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }
.learning-overview::after { content: ''; position: absolute; right: -120rpx; top: -180rpx; width: 420rpx; height: 420rpx; border: 1rpx solid var(--line); border-radius: 50%; opacity: .45; pointer-events: none; }
.overview-copy, .overview-progress { position: relative; z-index: 1; }
.overview-copy { min-width: 0; }
.overview-kicker, .section-kicker { display: block; color: var(--accent); font-size: 20rpx; font-weight: 720; }
.overview-title { display: block; max-width: 610rpx; margin-top: 8rpx; color: var(--text); font-size: 40rpx; font-weight: 780; line-height: 1.22; }
.overview-note { display: block; max-width: 620rpx; margin-top: 10rpx; color: var(--muted); font-size: 23rpx; }
.next-lesson { display: flex; flex-direction: column; align-items: flex-start; gap: 18rpx; margin-top: 28rpx; padding-top: 22rpx; border-top: 1rpx solid var(--line); }
.next-lesson__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4rpx; }
.next-lesson__label { color: var(--muted); font-size: 19rpx; }
.next-lesson__title { overflow: hidden; color: var(--text); font-size: 27rpx; font-weight: 720; text-overflow: ellipsis; white-space: nowrap; }
.next-lesson__meta { color: var(--muted); font-size: 20rpx; }
.overview-empty { display: flex; align-items: center; gap: 16rpx; margin-top: 28rpx; color: var(--muted); font-size: 22rpx; }
.overview-link { color: var(--accent); font-weight: 680; }
.overview-progress { display: flex; align-items: center; justify-content: space-between; gap: 24rpx; }
.progress-ring { --progress: 0; display: flex; width: 180rpx; height: 180rpx; flex: 0 0 180rpx; align-items: center; justify-content: center; border-radius: 50%; background: conic-gradient(var(--accent) calc(var(--progress) * 1%), var(--surface-strong) 0); }
.progress-ring__inner { display: flex; width: 146rpx; height: 146rpx; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: var(--surface); }
.progress-ring__value { color: var(--text); font-size: 36rpx; font-weight: 780; font-variant-numeric: tabular-nums; }
.progress-ring__label { color: var(--muted); font-size: 18rpx; }
.overview-stats { display: grid; min-width: 0; flex: 1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.overview-stats view { display: flex; min-width: 0; flex-direction: column; gap: 4rpx; padding: 8rpx 16rpx; border-left: 1rpx solid var(--line); }
.overview-stats text:first-child { color: var(--text); font-size: 29rpx; font-weight: 740; font-variant-numeric: tabular-nums; }
.overview-stats text:last-child { color: var(--muted); font-size: 18rpx; white-space: nowrap; }
.learning-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22rpx; }
.learning-primary, .learning-sidebar { display: flex; min-width: 0; flex-direction: column; gap: 22rpx; }
.catalog-shell, .player-shell, .side-panel { border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--surface); }
.catalog-shell { overflow: hidden; }
.catalog-head, .player-head, .side-panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.catalog-head { padding: 24rpx 24rpx 16rpx; }
.section-title, .side-title { display: block; color: var(--text); font-size: 29rpx; font-weight: 740; }
.section-note, .side-note { display: block; margin-top: 4rpx; color: var(--muted); font-size: 20rpx; }
.catalog-count { flex: 0 0 auto; color: var(--muted); font-size: 20rpx; font-variant-numeric: tabular-nums; }
.mode-tabs { width: 100%; padding: 0 24rpx 16rpx; white-space: nowrap; }
.mode-tab { display: inline-flex; min-height: 58rpx; align-items: center; margin-right: 10rpx; padding: 0 20rpx; border: 1rpx solid var(--line); border-radius: 8rpx; color: var(--muted); font-size: 21rpx; white-space: nowrap; }
.mode-tab--active { border-color: var(--accent); background: var(--surface-strong); color: var(--accent); font-weight: 680; }
.chapter-list { border-top: 1rpx solid var(--line); }
.chapter-block + .chapter-block { border-top: 1rpx solid var(--line); }
.chapter-head { display: flex; min-height: 112rpx; align-items: center; justify-content: space-between; gap: 20rpx; padding: 20rpx 24rpx; background: var(--surface-strong); }
.chapter-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4rpx; }
.chapter-title { overflow: hidden; color: var(--text); font-size: 25rpx; font-weight: 710; text-overflow: ellipsis; white-space: nowrap; }
.chapter-note { overflow: hidden; color: var(--muted); font-size: 19rpx; text-overflow: ellipsis; white-space: nowrap; }
.chapter-summary { display: flex; flex: 0 0 auto; align-items: center; gap: 16rpx; color: var(--muted); font-size: 20rpx; }
.chapter-chevron { display: flex; width: 44rpx; height: 44rpx; align-items: center; justify-content: center; color: var(--text); font-size: 28rpx; }
.lesson-list { padding: 0 24rpx; }
.lesson-row { display: grid; min-height: 102rpx; grid-template-columns: 52rpx minmax(0, 1fr) auto 24rpx; align-items: center; gap: 14rpx; padding: 16rpx 0; }
.lesson-row + .lesson-row { border-top: 1rpx solid var(--line); }
.lesson-row--active { background: var(--surface-strong); }
.lesson-index { display: flex; width: 44rpx; height: 44rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 8rpx; color: var(--muted); font-size: 19rpx; font-weight: 680; }
.lesson-index--done { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
.lesson-copy { display: flex; min-width: 0; flex-direction: column; gap: 4rpx; }
.lesson-title { overflow: hidden; color: var(--text); font-size: 24rpx; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.lesson-meta { color: var(--muted); font-size: 19rpx; }
.lesson-status { display: flex; width: 82rpx; flex-direction: column; align-items: flex-end; gap: 8rpx; color: var(--accent); font-size: 19rpx; font-variant-numeric: tabular-nums; }
.lesson-mini-progress { width: 76rpx; height: 4rpx; overflow: hidden; border-radius: 4rpx; background: var(--surface-strong); }
.lesson-mini-progress view { height: 100%; border-radius: inherit; background: var(--accent); }
.lesson-arrow { color: var(--muted); font-size: 30rpx; }
.catalog-empty { display: flex; min-height: 220rpx; flex-direction: column; align-items: center; justify-content: center; padding: 30rpx; border-top: 1rpx solid var(--line); text-align: center; }
.catalog-empty__title { color: var(--text); font-size: 25rpx; font-weight: 690; }
.catalog-empty__note { margin-top: 6rpx; color: var(--muted); font-size: 20rpx; }
.player-shell { padding: 24rpx; }
.player-head { margin-bottom: 18rpx; }
.player-head__copy { display: flex; min-width: 0; flex-direction: column; gap: 4rpx; }
.player-title { overflow: hidden; color: var(--text); font-size: 29rpx; font-weight: 740; text-overflow: ellipsis; white-space: nowrap; }
.player-meta { color: var(--muted); font-size: 20rpx; }
.close-button { display: flex; width: 56rpx; height: 56rpx; flex: 0 0 56rpx; align-items: center; justify-content: center; color: var(--muted); font-size: 36rpx; }
.lesson-video, .lesson-fallback { width: 100%; height: 350rpx; border-radius: 10rpx; }
.lesson-fallback { position: relative; overflow: hidden; background: #071d2e; }
.lesson-fallback image { width: 100%; height: 100%; }
.lesson-fallback__scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3, 18, 29, .92), rgba(3, 18, 29, .48)); }
.lesson-fallback__content { position: absolute; inset: 0; display: flex; max-width: 520rpx; flex-direction: column; align-items: flex-start; justify-content: center; padding: 30rpx; }
.fallback-type { color: #75e6c7; font-size: 19rpx; font-weight: 700; }
.fallback-title { margin-top: 6rpx; color: #edf7f8; font-size: 30rpx; font-weight: 740; }
.fallback-note { margin: 8rpx 0 20rpx; color: #bfd0d8; font-size: 20rpx; }
.player-progress-row { display: grid; grid-template-columns: minmax(0, 1fr) 72rpx; align-items: center; gap: 14rpx; margin-top: 20rpx; color: var(--muted); font-size: 19rpx; text-align: right; }
.linear-progress { height: 8rpx; overflow: hidden; border-radius: 8rpx; background: var(--surface-strong); }
.linear-progress__value { height: 100%; border-radius: inherit; background: var(--accent); transition: width .25s ease; }
.player-footer { display: flex; flex-direction: column; align-items: flex-start; gap: 16rpx; margin-top: 16rpx; }
.source-note { min-width: 0; color: var(--muted); font-size: 19rpx; }
.player-actions { display: flex; flex-wrap: wrap; gap: 10rpx; }
.side-panel { padding: 22rpx; }
.text-button { color: var(--accent); font-size: 21rpx; }
.plan-summary { display: flex; flex-direction: column; margin-top: 18rpx; }
.plan-summary view { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 12rpx 0; color: var(--muted); font-size: 20rpx; }
.plan-summary text:last-child { color: var(--text); font-weight: 650; text-align: right; }
.plan-form { margin-top: 20rpx; }
.plan-field { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 16rpx; }
.plan-label { color: var(--text); font-size: 20rpx; font-weight: 650; }
.plan-select { display: flex; min-height: 68rpx; align-items: center; justify-content: space-between; gap: 12rpx; padding: 0 16rpx; border: 1rpx solid var(--line); border-radius: 8rpx; background: var(--surface-strong); color: var(--text); font-size: 21rpx; }
.practice-actions { display: flex; flex-direction: column; margin-top: 12rpx; }
.practice-action { display: grid; min-height: 96rpx; grid-template-columns: 54rpx minmax(0, 1fr) 20rpx; align-items: center; gap: 12rpx; padding: 14rpx 0; }
.practice-action + .practice-action { border-top: 1rpx solid var(--line); }
.practice-action__mark { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border-radius: 8rpx; background: var(--surface-strong); color: var(--accent); font-size: 20rpx; font-weight: 720; }
.practice-action > view:nth-child(2) { display: flex; min-width: 0; flex-direction: column; gap: 3rpx; }
.practice-action > view:nth-child(2) text:first-child { color: var(--text); font-size: 22rpx; font-weight: 680; }
.practice-action > view:nth-child(2) text:last-child { color: var(--muted); font-size: 18rpx; }
.practice-action > text { color: var(--muted); font-size: 28rpx; }
.learning-button { display: inline-flex; min-height: 66rpx; align-items: center; justify-content: center; padding: 0 24rpx; border: 1rpx solid var(--accent); border-radius: 8rpx; font-size: 22rpx; font-weight: 700; white-space: nowrap; transition: transform .15s ease, opacity .15s ease; }
.learning-button:active { transform: scale(.98); }
.learning-button--primary { background: var(--accent); color: var(--accent-ink); }
.learning-button--secondary { background: transparent; color: var(--accent); }
.learning-button--light { border-color: #edf7f8; background: #edf7f8; color: #082235; }
.learning-button--small { min-height: 56rpx; padding: 0 18rpx; font-size: 20rpx; }
.learning-button--full { width: 100%; }
.lesson-row:focus-visible, .chapter-head:focus-visible, .mode-tab:focus-visible, .learning-button:focus-visible, .text-button:focus-visible, .practice-action:focus-visible, .close-button:focus-visible, .overview-link:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: -3px; }
@keyframes learning-shimmer { to { background-position: -200% 0; } }
@media (min-width: 560px) {
  .next-lesson { flex-direction: row; align-items: center; justify-content: space-between; }
  .player-footer { flex-direction: row; align-items: center; justify-content: space-between; }
}
@media (min-width: 768px) {
  .learning-overview { grid-template-columns: minmax(0, 1.5fr) minmax(330px, .8fr); align-items: center; padding: 34rpx; }
  .learning-workspace { grid-template-columns: minmax(0, 1fr) 300px; align-items: start; }
  .learning-sidebar { position: sticky; top: 20rpx; }
  .learning-skeleton-grid { grid-template-columns: minmax(0, 1fr) 300px; }
}
@media (max-width: 480px) {
  .learning-overview { padding: 24rpx; }
  .overview-title { font-size: 34rpx; }
  .overview-progress { align-items: stretch; }
  .progress-ring { width: 150rpx; height: 150rpx; flex-basis: 150rpx; }
  .progress-ring__inner { width: 122rpx; height: 122rpx; }
  .progress-ring__value { font-size: 30rpx; }
  .overview-stats { grid-template-columns: 1fr; }
  .overview-stats view { flex-direction: row; align-items: baseline; justify-content: space-between; padding: 4rpx 0 4rpx 14rpx; }
  .overview-stats text:first-child { font-size: 25rpx; }
  .lesson-row { grid-template-columns: 48rpx minmax(0, 1fr) auto; }
  .lesson-status { width: 70rpx; }
  .lesson-arrow { display: none; }
  .lesson-video, .lesson-fallback { height: 300rpx; }
  .fallback-note { max-width: 440rpx; }
}
@media (prefers-reduced-motion: reduce) {
  .learning-skeleton { animation: none; }
  .linear-progress__value, .learning-button { transition: none; }
}
</style>
