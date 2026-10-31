<template>
  <work-scaffold title="招聘与任务" root @city-change="setCity">
    <work-media-hero
      eyebrow="无人机职业与项目中心"
      title="让资质、机型与档期真正参与匹配"
      note="企业招聘、临时任务与履约状态均以服务端确认结果为准。"
      action-text="完善工作档案"
      @action="openResume"
    />

    <view class="work-entry-row">
      <view class="work-entry active" @tap="reload"><text>找工作</text><text>认证企业直招</text></view>
      <view class="work-entry" @tap="browseTasks"><text>接任务</text><text>查看可报名任务</text></view>
      <view class="work-entry" @tap="openTalent"><text>企业入口</text><text>招聘与候选人管理</text></view>
    </view>

    <view class="search-row">
      <input v-model="keyword" class="search-input" confirm-type="search" placeholder="搜索职位、企业或机型" @confirm="reload" />
      <view class="search-button" @tap="reload">搜索</view>
    </view>

    <view class="section">
      <view class="section-head"><text class="section-title">认证企业直招</text><text class="section-note">共 {{ total }} 条</text></view>
      <view v-if="loading" class="item-list"><view v-for="n in 3" :key="n" class="skeleton"></view></view>
      <view v-else-if="error" class="state-panel error"><text class="state-title">加载失败</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="reload">重试</view></view></view>
      <view v-else-if="!items.length" class="request-state"><text>暂无符合条件的职位</text><view class="button-row"><view class="button secondary" @tap="clearSearch">清空搜索</view></view></view>
      <view v-else class="item-list two-column">
        <view v-for="item in items" :key="item.id" class="item-card" @tap="openJob(item)">
          <image class="work-card-image" :src="cardImage" mode="aspectFill" aria-label="无人机行业作业现场"></image>
          <view class="work-card-body">
            <view class="card-head"><text class="card-title">{{ item.title }}</text><text class="price">{{ salary(item.salaryMin, item.salaryMax) }}</text></view>
            <text class="card-note">{{ item.companyName }} / {{ jobLocation(item) }}</text>
            <view class="meta-row"><text>{{ item.caac || 'CAAC 要求待补充' }}</text><text>{{ aircraftLabel(item.aircraft) }}</text><text class="tag" :class="tagTone(item)">{{ item.statusLabel || statusText(item.status) }}</text></view>
          </view>
        </view>
      </view>
      <view v-if="!loading && items.length" class="pagination" :class="{ disabled: !hasMore }" @tap="loadMore">{{ hasMore ? (loadingMore ? '加载中...' : '加载更多') : '已显示全部结果' }}</view>
    </view>
  </work-scaffold>
</template>

<script>
import WorkMediaHero from './WorkMediaHero.vue'
import WorkScaffold from './WorkScaffold.vue'
import { listJobs, listTasks } from '../services'
import { salary, statusText } from '../utils'
import { workMedia } from '../media'

export default {
  name: 'WorkPage',
  components: { WorkMediaHero, WorkScaffold },
  data() {
    return { cardImage: workMedia.inspection.src, keyword: '', city: '全部', items: [], page: 1, pageSize: 6, total: 0, hasMore: false, loading: true, loadingMore: false, error: '' }
  },
  created() { this.reload() },
  methods: {
    salary,
    statusText,
    aircraftLabel(value) { return Array.isArray(value) && value.length ? value.join('、') : '机型待补充' },
    jobLocation(item) { return [item.city, item.district].filter(Boolean).join('') || '地点待补充' },
    tagTone(item) { return item.status === 'recruiting' || item.status === 'published' ? 'success' : item.status === 'closed' ? 'danger' : '' },
    setCity(city) { this.city = city || '全部'; this.reload() },
    query(page) { return { city: this.city, keyword: this.keyword.trim(), page, pageSize: this.pageSize } },
    async reload() {
      this.loading = true
      this.error = ''
      this.page = 1
      try {
        const result = await listJobs(this.query(1))
        this.items = result.items
        this.total = result.total
        this.hasMore = result.hasMore
      } catch (error) {
        this.error = error.message || '职位列表暂时无法加载'
      } finally {
        this.loading = false
      }
    },
    async loadMore() {
      if (!this.hasMore || this.loadingMore) return
      this.loadingMore = true
      try {
        const next = this.page + 1
        const result = await listJobs(this.query(next))
        this.items.push(...result.items)
        this.page = next
        this.hasMore = result.hasMore
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败，请重试', icon: 'none' })
      } finally {
        this.loadingMore = false
      }
    },
    clearSearch() { this.keyword = ''; this.reload() },
    openJob(item) { uni.navigateTo({ url: '/pages/work/job-detail?id=' + encodeURIComponent(item.id) }) },
    openResume() { uni.navigateTo({ url: '/pages/work/resume' }) },
    openTalent() { uni.navigateTo({ url: '/pages/work/talent' }) },
    async browseTasks() {
      try {
        const result = await listTasks({ page: 1, pageSize: 6 })
        const tasks = result.items || []
        if (!tasks.length) throw new Error('暂无可查看的任务')
        uni.showActionSheet({
          itemList: tasks.map((item) => item.title + ' / ' + (item.city || '地点待补充')),
          success: ({ tapIndex }) => {
            const task = tasks[tapIndex]
            if (task) uni.navigateTo({ url: '/pages/work/task-detail?id=' + encodeURIComponent(task.id) })
          }
        })
      } catch (error) {
        uni.showToast({ title: error.message || '任务列表暂时无法加载', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
