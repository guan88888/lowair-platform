<template>
  <work-scaffold title="招聘与任务" root @city-change="setCity">
    <view class="identity-row">
      <text>当前身份：{{ identityLabel }}</text>
      <view class="identity-actions"><text class="link" @tap="openPersonalCenter">{{ auth.enterprise ? '企业招聘中心' : '我的简历与投递' }}</text><text class="link" @tap="openPublish">发布</text></view>
    </view>

    <view class="segment"><text class="segment-item" :class="{ active: mode === 'jobs' }" @tap="switchMode('jobs')">企业招聘</text><text class="segment-item" :class="{ active: mode === 'tasks' }" @tap="switchMode('tasks')">临时任务</text></view>
    <view class="search-row"><input v-model="keyword" class="search-input" confirm-type="search" :placeholder="mode === 'jobs' ? '搜索职位、企业或机型' : '搜索任务、城市或机型'" @confirm="reload" /><view class="search-button" @tap="reload">搜索</view></view>

    <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row">
      <text v-for="item in cities" :key="'city-' + item" class="filter-chip" :class="{ active: filters.city === item }" @tap="setFilter('city', item)">{{ item }}</text>
      <text v-for="item in caacOptions" :key="'caac-' + item" class="filter-chip" :class="{ active: filters.caac === item }" @tap="setFilter('caac', item)">{{ item === '全部' ? '全部资质' : item }}</text>
      <text v-for="item in aircraftOptions" :key="'aircraft-' + item" class="filter-chip" :class="{ active: filters.aircraft === item }" @tap="setFilter('aircraft', item)">{{ item === '全部' ? '全部机型' : item }}</text>
      <text v-if="mode === 'jobs'" v-for="item in salaryOptions" :key="'salary-' + item.value" class="filter-chip" :class="{ active: filters.salary === item.value }" @tap="setFilter('salary', item.value)">{{ item.label }}</text>
      <text v-if="mode === 'tasks'" class="filter-chip" :class="{ active: filters.urgent }" @tap="setFilter('urgent', !filters.urgent)">仅看加急</text>
      <text v-if="mode === 'tasks'" v-for="item in taskStatuses" :key="item.value" class="filter-chip" :class="{ active: filters.status === item.value }" @tap="setFilter('status', item.value)">{{ item.label }}</text>
    </view></scroll-view>

    <view v-if="mode === 'tasks'" class="safety-panel"><text class="state-title">任务安全能力</text><text class="state-copy">实名与 CAAC 由账号服务核验；托管、保险与隐私号码以每条任务的服务端状态为准。前端不承诺资金或保险成功。</text></view>

    <view class="section">
      <view class="section-head"><text class="section-title">{{ mode === 'jobs' ? '职位列表' : '任务列表' }}</text><text class="section-note">共 {{ total }} 条</text></view>
      <view v-if="loading" class="item-list"><view v-for="n in 3" :key="n" class="skeleton"></view></view>
      <view v-else-if="error" class="state-panel error"><text class="state-title">加载失败</text><text class="state-copy">{{ error }}</text><view class="button-row"><view class="button secondary" @tap="reload">重试</view></view></view>
      <view v-else-if="!items.length" class="request-state"><text>暂无符合条件的{{ mode === 'jobs' ? '职位' : '任务' }}</text><view class="button-row"><view class="button secondary" @tap="resetFilters">清空筛选</view></view></view>
      <view v-else class="item-list two-column">
        <view v-for="item in items" :key="item.id" class="item-card" @tap="openItem(item)">
          <view class="card-head"><text class="card-title">{{ item.title }}</text><text class="price">{{ mode === 'jobs' ? salary(item.salaryMin, item.salaryMax) : money(item.budget) }}</text></view>
          <text class="card-note">{{ mode === 'jobs' ? item.companyName + ' · ' + item.city + item.district : item.location + ' · ' + item.workAt }}</text>
          <view class="meta-row"><text>{{ item.caac }}</text><text>{{ mode === 'jobs' ? item.experience : item.aircraft }}</text><text class="tag" :class="tagTone(item)">{{ mode === 'jobs' ? statusText(item.status) : taskStatus(item.status) }}</text><text v-if="item.urgent" class="tag warning">加急</text></view>
          <view v-if="mode === 'tasks'" class="meta-row"><text>{{ item.applicants }} 人报名</text><text>{{ item.escrow.label }}</text></view>
        </view>
      </view>
      <view v-if="!loading && items.length" class="pagination" :class="{ disabled: !hasMore }" @tap="loadMore">{{ hasMore ? (loadingMore ? '加载中...' : '加载更多') : '已显示全部结果' }}</view>
    </view>
    <text class="demo-disclaimer">列表支持按城市、资质、机型、薪资或预算、日期与状态向工作域 API 分页查询；当前未开启实时 API 时使用可回写演示数据。</text>
  </work-scaffold>
</template>

<script>
import { getAuthState } from '../../../utils/auth'
import WorkScaffold from './WorkScaffold.vue'
import { listJobs, listTasks } from '../services'
import { money, salary, statusText } from '../utils'

export default {
  name: 'WorkPage', components: { WorkScaffold },
  data() { return { auth: getAuthState(), mode: 'jobs', keyword: '', filters: { city: '全部', caac: '全部', aircraft: '全部', salary: '', status: 'open', urgent: false }, cities: ['全部', '北京', '杭州', '成都', '深圳'], caacOptions: ['全部', '视距内', '超视距'], aircraftOptions: ['全部', 'M350 RTK', 'Matrice 30T', 'Mavic 3E', 'T60'], salaryOptions: [{ label: '全部薪资', value: '' }, { label: '10k+', value: 10000 }, { label: '15k+', value: 15000 }], taskStatuses: [{ label: '可报名', value: 'open' }, { label: '已指派', value: 'assigned' }, { label: '已关闭', value: 'closed' }, { label: '审核中', value: 'reviewing' }], items: [], page: 1, pageSize: 4, total: 0, hasMore: false, loading: true, loadingMore: false, error: '' } },
  computed: { identityLabel() { return this.auth.enterprise && this.auth.identity === 'enterprise' ? '认证企业' : this.auth.loggedIn ? '个人' : '访客' } },
  created() { this.reload() },
  methods: {
    money, salary, statusText,
    taskStatus(value) { return ({ open: '可报名', assigned: '已指派', closed: '已关闭', reviewing: '审核中' })[value] || value },
    tagTone(item) { return item.status === 'open' || item.status === 'recruiting' ? 'success' : item.status === 'closed' ? 'danger' : '' },
    switchMode(mode) { if (this.mode === mode) return; this.mode = mode; this.filters.status = mode === 'tasks' ? 'open' : ''; this.reload() },
    setFilter(key, value) { this.filters[key] = value; this.reload() },
    setCity(city) { this.filters.city = city; this.reload() },
    resetFilters() { this.filters = { city: '全部', caac: '全部', aircraft: '全部', salary: '', status: this.mode === 'tasks' ? 'open' : '', urgent: false }; this.keyword = ''; this.reload() },
    query(page) { return { ...this.filters, keyword: this.keyword.trim(), page, pageSize: this.pageSize } },
    async reload() { this.loading = true; this.error = ''; this.page = 1; try { const result = await (this.mode === 'jobs' ? listJobs(this.query(1)) : listTasks(this.query(1))); this.items = result.items; this.total = result.total; this.hasMore = result.hasMore } catch (error) { this.error = error.message } finally { this.loading = false } },
    async loadMore() { if (!this.hasMore || this.loadingMore) return; this.loadingMore = true; try { const next = this.page + 1; const result = await (this.mode === 'jobs' ? listJobs(this.query(next)) : listTasks(this.query(next))); this.items.push(...result.items); this.page = next; this.hasMore = result.hasMore } catch (error) { uni.showToast({ title: error.message, icon: 'none' }) } finally { this.loadingMore = false } },
    openItem(item) { uni.navigateTo({ url: this.mode === 'jobs' ? '/pages/work/job-detail?id=' + item.id : '/pages/work/task-detail?id=' + item.id }) },
    openPersonalCenter() { uni.navigateTo({ url: this.auth.enterprise ? '/pages/work/talent' : '/pages/work/resume' }) },
    openPublish() { uni.navigateTo({ url: '/pages/work/publish?type=' + (this.auth.enterprise ? 'job' : 'task') }) }
  }
}
</script>

<style scoped src="../styles/work-page.css"></style>
