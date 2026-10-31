<template>
  <app-page-shell title="我的钱包" active="profile" :theme="theme" :locale="locale" @annotate="showToast">
    <view class="wallet-page">
      <view v-if="summaryLoading" class="wallet-skeleton" aria-label="正在加载钱包">
        <view class="skeleton skeleton-balance"></view>
        <view class="skeleton-grid"><view v-for="index in 4" :key="index" class="skeleton skeleton-asset"></view></view>
      </view>
      <error-state v-else-if="summaryError" :message="summaryError" @retry="loadAll" />

      <template v-else-if="summary">
        <view class="source-banner" :class="'source-' + summary.dataMode">
          <view><text class="source-title">{{ summary.dataMode === 'live' ? '钱包服务数据' : '演示钱包，不代表真实资金' }}</text><text class="source-note">{{ summary.source }} · 更新于 {{ formatDate(summary.updatedAt) }}</text></view>
          <text class="refresh-action" @tap="refresh">刷新</text>
        </view>

        <view class="balance-overview">
          <view class="balance-heading"><text>账户余额</text><text class="visibility-toggle" @tap="amountVisible = !amountVisible">{{ amountVisible ? '隐藏金额' : '显示金额' }}</text></view>
          <text class="balance-value">{{ displayMoney(summary.assets.balance.value) }}</text>
          <text class="asset-source">来源：{{ summary.assets.balance.source }} · {{ statusText(summary.assets.balance.status) }}</text>
        </view>

        <view class="asset-grid">
          <view v-for="key in ['available', 'frozen', 'escrow']" :key="key" class="asset-item">
            <text class="asset-label">{{ summary.assets[key].label }}</text>
            <text class="asset-value">{{ displayMoney(summary.assets[key].value) }}</text>
            <text class="asset-source">{{ summary.assets[key].source }} · {{ statusText(summary.assets[key].status) }}</text>
          </view>
        </view>
        <text class="escrow-note">托管和冻结金额不计入可提现余额。所有金额以钱包、订单和托管服务对账结果为准。</text>

        <view class="wallet-actions">
          <view class="action-button primary-action" @tap="requestAction('recharge')">充值说明</view>
          <view class="action-button" @tap="requestAction('withdraw')">提现申请</view>
          <view class="action-button" @tap="requestAction('refund')">退款进度</view>
        </view>

        <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
          <view class="tabs"><text v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: selectedTab === tab.key }" @tap="selectTab(tab.key)">{{ tab.label }}</text></view>
        </scroll-view>

        <view v-if="selectedTab === 'overview'" class="capability-section">
          <view class="section-heading"><text>资金能力与状态来源</text><text>前端不记账</text></view>
          <view v-for="item in summary.capabilities" :key="item.key" class="capability-row">
            <view class="capability-copy"><text class="row-title">{{ item.label }}</text><text class="row-note">{{ item.note }}</text><text class="row-source">来源：{{ item.source }}</text></view>
            <text class="status-tag" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
          </view>
        </view>

        <view v-else-if="selectedTab === 'escrow'" class="capability-section">
          <view class="section-heading"><text>托管与关联能力</text><text>订单状态为准</text></view>
          <view v-for="item in escrowCapabilities" :key="item.key" class="capability-row">
            <view class="capability-copy"><text class="row-title">{{ item.label }}</text><text class="row-note">{{ item.note }}</text><text class="row-source">来源：{{ item.source }}</text></view>
            <text class="status-tag" :class="'status-' + item.status">{{ statusText(item.status) }}</text>
          </view>
        </view>

        <view v-else-if="selectedTab === 'transactions'" class="bill-section">
          <view class="filter-group">
            <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><text v-for="option in typeFilters" :key="option.key" class="filter-chip" :class="{ active: filters.type === option.key }" @tap="setFilter('type', option.key)">{{ option.label }}</text></view></scroll-view>
            <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><text v-for="option in bizFilters" :key="option.key" class="filter-chip" :class="{ active: filters.bizType === option.key }" @tap="setFilter('bizType', option.key)">{{ option.label }}</text></view></scroll-view>
            <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false"><view class="filter-row"><text v-for="option in statusFilters" :key="option.key" class="filter-chip" :class="{ active: filters.status === option.key }" @tap="setFilter('status', option.key)">{{ option.label }}</text></view></scroll-view>
          </view>

          <view v-if="billLoading && !bills.length" class="bill-loading"><view v-for="index in 3" :key="index" class="skeleton skeleton-bill"></view></view>
          <error-state v-else-if="billError && !bills.length" :message="billError" @retry="loadBills(true)" />
          <empty-state v-else-if="!bills.length" title="暂无匹配账单" note="调整类型、业务或状态筛选后重试。" />
          <view v-else class="bill-list">
            <view v-for="bill in bills" :key="bill.id" class="bill-row" @tap="go(bill.to)">
              <view class="bill-main"><text class="row-title">{{ bill.title }}</text><text class="row-note">{{ formatDate(bill.occurredAt) }} · {{ bizText(bill.bizType) }}</text><text class="row-source">来源：{{ bill.source }} · 编号 {{ bill.traceNo }}</text></view>
              <view class="bill-side"><text class="bill-amount" :class="{ income: bill.direction === 'in' }">{{ bill.displayAmount || signedMoney(bill) }}</text><text class="status-tag" :class="'status-' + bill.status">{{ statusText(bill.status) }}</text><text class="source-state">{{ statusText(bill.sourceStatus) }}</text></view>
            </view>
            <view v-if="billError" class="inline-error"><text>{{ billError }}</text><text @tap="loadBills(false)">重试</text></view>
            <view v-if="billPage.hasMore" class="load-more" :class="{ disabled: billLoading }" @tap="loadBills(false)">{{ billLoading ? '正在加载...' : '加载更多' }}</view>
          </view>
        </view>

        <view v-else-if="selectedTab === 'invoice'" class="bill-section">
          <view class="section-heading"><text>发票明细</text><text>财税服务数据</text></view>
          <view v-if="invoiceLoading && !invoices.length" class="bill-loading"><view v-for="index in 3" :key="index" class="skeleton skeleton-bill"></view></view>
          <error-state v-else-if="invoiceError && !invoices.length" :message="invoiceError" @retry="loadInvoices(true)" />
          <empty-state v-else-if="!invoices.length" title="暂无发票记录" note="发票申请、开具和红冲状态由财税服务返回。" />
          <view v-else class="bill-list">
            <view v-for="invoice in invoices" :key="invoice.id" class="bill-row">
              <view class="bill-main"><text class="row-title">{{ invoice.title }}</text><text class="row-note">{{ invoice.number ? '发票号 ' + invoice.number : '发票编号待接入' }} · {{ formatDate(invoice.updatedAt) }}</text><text class="row-source">来源：{{ invoice.source }} · {{ invoice.amount ? displayMoney(invoice.amount) : '金额待接入' }}</text></view>
              <view class="bill-side"><text class="status-tag" :class="'status-' + invoice.status">{{ statusText(invoice.status) }}</text><text class="source-state">{{ statusText(invoice.sourceStatus) }}</text></view>
            </view>
            <view v-if="invoiceError" class="inline-error"><text>{{ invoiceError }}</text><text @tap="loadInvoices(false)">重试</text></view>
            <view v-if="invoicePage.hasMore" class="load-more" :class="{ disabled: invoiceLoading }" @tap="loadInvoices(false)">{{ invoiceLoading ? '正在加载...' : '加载更多' }}</view>
          </view>
        </view>

        <view v-else class="placeholder-section">
          <text>低空豆规则与明细</text>
          <text>低空豆余额、冻结和结算须由社区业务服务返回，当前不在前端生成记录。</text>
          <view class="secondary-link" @tap="go('/pages/messages/index?category=system')">联系平台客服</view>
        </view>
      </template>

      <confirm-dialog :visible="Boolean(pendingAction)" :title="confirmTitle" :message="confirmMessage" @cancel="pendingAction = ''" @confirm="confirmWalletAction" />
      <view v-if="toast" class="toast" aria-live="polite">{{ toast }}</view>
    </view>
  </app-page-shell>
</template>

<script>
import AppPageShell from '../../../components/AppPageShell.vue'
import ConfirmDialog from '../../shared/components/ConfirmDialog.vue'
import EmptyState from '../../shared/components/EmptyState.vue'
import ErrorState from '../../shared/components/ErrorState.vue'
import { formatCurrency, formatDateTime } from '../../shared/utils/formatters'
import { getRouteOptions } from '../../shared/utils/route-options'
import { getWalletBills, getWalletInvoices, getWalletSummary, submitWalletAction } from '../services'

export default {
  name: 'WalletPage',
  components: { AppPageShell, ConfirmDialog, EmptyState, ErrorState },
  data() {
    return {
      summary: null,
      summaryLoading: true,
      summaryError: '',
      bills: [],
      billLoading: false,
      billError: '',
      billPage: { page: 0, hasMore: false },
      invoices: [],
      invoiceLoading: false,
      invoiceError: '',
      invoicePage: { page: 0, hasMore: false },
      amountVisible: true,
      selectedTab: 'overview',
      pendingAction: '',
      toast: '',
      toastTimer: null,
      theme: uni.getStorageSync('lowair-demo-theme') || 'ocean',
      locale: uni.getStorageSync('lowair-demo-locale') || 'zh',
      tabs: [
        { key: 'overview', label: '资金' },
        { key: 'escrow', label: '托管' },
        { key: 'beans', label: '低空豆' },
        { key: 'transactions', label: '流水' },
        { key: 'invoice', label: '发票' }
      ],
      filters: { type: 'all', bizType: 'all', status: 'all' },
      typeFilters: [
        { key: 'all', label: '全部类型' }, { key: 'payment', label: '支付' }, { key: 'escrow', label: '托管' }, { key: 'refund', label: '退款' }, { key: 'withdraw', label: '提现' }, { key: 'recharge', label: '充值' }, { key: 'beans', label: '低空豆' }
      ],
      bizFilters: [
        { key: 'all', label: '全部业务' }, { key: 'work', label: '工作' }, { key: 'market', label: '交易' }, { key: 'academy', label: '学考' }, { key: 'community', label: '社区' }, { key: 'ad', label: '广告' }
      ],
      statusFilters: [
        { key: 'all', label: '全部状态' }, { key: 'confirmed', label: '已确认' }, { key: 'processing', label: '处理中' }, { key: 'pending', label: '待处理' }, { key: 'failed', label: '失败' }
      ]
    }
  },
  computed: {
    escrowCapabilities() {
      return (this.summary?.capabilities || []).filter((item) => ['escrow', 'signature', 'inspection', 'evidence'].includes(item.key))
    },
    confirmTitle() {
      return { recharge: '查看充值能力', withdraw: '确认提交提现申请', refund: '查看退款进度' }[this.pendingAction] || '确认操作'
    },
    confirmMessage() {
      if (this.pendingAction === 'withdraw') return '提现不会在前端直接扣减余额。提交后需等待钱包、身份和风控服务受理。'
      if (this.pendingAction === 'recharge') return '充值需进入合规支付渠道，前端不会保存银行卡或支付凭据。'
      return '退款由原订单发起，到账结果以订单和支付渠道回传为准。'
    }
  },
  mounted() {
    const options = getRouteOptions()
    const aliases = { balance: 'overview', funds: 'overview', invoices: 'invoice' }
    this.selectedTab = this.tabs.some((item) => item.key === options.tab) ? options.tab : (aliases[options.tab] || 'overview')
    this.loadAll()
  },
  beforeUnmount() {
    if (this.toastTimer) clearTimeout(this.toastTimer)
  },
  methods: {
    async loadAll() {
      this.summaryLoading = true
      this.summaryError = ''
      try {
        this.summary = await getWalletSummary()
        if (this.selectedTab === 'transactions') await this.loadBills(true)
        if (this.selectedTab === 'invoice') await this.loadInvoices(true)
      } catch (error) {
        this.summaryError = error.message || '钱包加载失败，请稍后重试'
      } finally {
        this.summaryLoading = false
      }
    },
    async loadBills(reset = false) {
      if (this.billLoading || (!reset && !this.billPage.hasMore && this.billPage.page > 0)) return
      this.billLoading = true
      this.billError = ''
      const nextPage = reset ? 1 : this.billPage.page + 1
      if (reset) this.bills = []
      try {
        const result = await getWalletBills({ ...this.filters, page: nextPage, pageSize: 10 })
        this.bills = reset ? result.items : [...this.bills, ...result.items]
        this.billPage = { page: result.page, hasMore: result.hasMore, total: result.total }
      } catch (error) {
        this.billError = error.message || '账单加载失败，请稍后重试'
      } finally {
        this.billLoading = false
      }
    },
    async loadInvoices(reset = false) {
      if (this.invoiceLoading || (!reset && !this.invoicePage.hasMore && this.invoicePage.page > 0)) return
      this.invoiceLoading = true
      this.invoiceError = ''
      const nextPage = reset ? 1 : this.invoicePage.page + 1
      if (reset) this.invoices = []
      try {
        const result = await getWalletInvoices({ page: nextPage, pageSize: 10 })
        const items = result.items.map(normalizeInvoice)
        this.invoices = reset ? items : [...this.invoices, ...items]
        this.invoicePage = { page: result.page, hasMore: result.hasMore, total: result.total }
      } catch (error) {
        this.invoiceError = error.message || '发票明细加载失败，请稍后重试'
      } finally {
        this.invoiceLoading = false
      }
    },
    async refresh() {
      await this.loadAll()
      if (!this.summaryError) this.showToast('钱包数据已刷新')
    },
    selectTab(key) {
      this.selectedTab = key
      if (key === 'transactions' && !this.billPage.page) this.loadBills(true)
      if (key === 'invoice' && !this.invoicePage.page) this.loadInvoices(true)
    },
    setFilter(key, value) {
      this.filters[key] = value
      this.loadBills(true)
    },
    requestAction(type) {
      this.pendingAction = type
    },
    async confirmWalletAction() {
      const type = this.pendingAction
      this.pendingAction = ''
      try {
        const result = await submitWalletAction(type)
        if (!result.accepted) {
          this.showToast('当前能力待接入，未产生任何资金变化')
          return
        }
        this.showToast('申请已由服务端受理，请等待状态更新')
        await this.loadAll()
      } catch (error) {
        this.showToast(error.message || '申请提交失败，请稍后重试')
      }
    },
    displayMoney(value) { return this.amountVisible ? formatCurrency(value) : '¥ ****' },
    signedMoney(bill) {
      if (!this.amountVisible) return '¥ ****'
      const value = formatCurrency(Math.abs(Number(bill.amount || 0)))
      return (bill.direction === 'in' ? '+' : '-') + value
    },
    formatDate(value) { return formatDateTime(value) },
    statusText(status) {
      return { confirmed: '已确认', approved: '已确认', processing: '处理中', pending: '待处理', unavailable: '待接入', unverified: '待接入', demo: '演示', failed: '失败' }[status] || '待接入'
    },
    bizText(type) { return { work: '工作', market: '交易', academy: '学考', community: '社区', ad: '广告' }[type] || '平台业务' },
    go(url) { if (url) uni.navigateTo({ url }) },
    showToast(text) {
      this.toast = text
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast = '' }, 2000)
    }
  }
}

function normalizeInvoice(item = {}) {
  return {
    id: item.id || item.invoice_id || item.number || Math.random().toString(36).slice(2),
    title: item.title || item.type_label || item.invoice_type || '电子发票',
    number: item.number || item.invoice_no || '',
    amount: Number(item.amount ?? item.total_amount ?? 0) || 0,
    updatedAt: item.updated_at || item.updatedAt || item.created_at || '',
    source: item.source || '财税服务',
    sourceStatus: item.source_status || item.sourceStatus || 'confirmed',
    status: item.status || item.state || 'pending'
  }
}
</script>

<style scoped>
.wallet-page { min-height: 100%; padding: 24rpx 24rpx 48rpx; color: var(--text); }.source-banner { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 18rpx 20rpx; border: 1rpx solid rgba(242,180,86,.45); border-radius: 8px; background: var(--surface-strong); }.source-banner.source-live { border-color: var(--line); }.source-title, .source-note { display: block; }.source-title { font-size: 24rpx; font-weight: 650; }.source-note { margin-top: 5rpx; color: var(--muted); font-size: 19rpx; line-height: 1.45; }.refresh-action, .visibility-toggle { flex: none; color: var(--accent); font-size: 22rpx; }.balance-overview { padding: 34rpx 4rpx 28rpx; border-bottom: 1rpx solid var(--line); }.balance-heading { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 23rpx; }.balance-value { display: block; margin-top: 10rpx; font-size: 52rpx; font-weight: 750; letter-spacing: -.02em; }.asset-source, .row-source { display: block; margin-top: 7rpx; color: var(--muted); font-size: 18rpx; line-height: 1.4; }.asset-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rpx; margin-top: 20rpx; overflow: hidden; border: 1rpx solid var(--line); border-radius: 7px; background: var(--line); }.asset-item { min-width: 0; padding: 20rpx 15rpx; background: var(--surface); }.asset-label, .asset-value { display: block; }.asset-label { color: var(--muted); font-size: 20rpx; }.asset-value { margin-top: 8rpx; overflow: hidden; font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.escrow-note { display: block; margin-top: 12rpx; color: var(--muted); font-size: 20rpx; line-height: 1.5; }.wallet-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12rpx; margin-top: 22rpx; }.action-button { display: flex; min-width: 0; height: 68rpx; align-items: center; justify-content: center; border: 1rpx solid var(--line); border-radius: 6px; color: var(--text); font-size: 22rpx; }.action-button:active { transform: scale(.98); }.primary-action { border-color: var(--accent); color: var(--accent); }.tab-scroll { margin-top: 28rpx; white-space: nowrap; }.tabs { display: inline-flex; min-width: 100%; border-bottom: 1rpx solid var(--line); }.tab { display: inline-flex; min-width: 118rpx; height: 70rpx; align-items: center; justify-content: center; color: var(--muted); font-size: 23rpx; }.tab.active { border-bottom: 3rpx solid var(--accent); color: var(--text); font-weight: 650; }.capability-section, .bill-section, .placeholder-section { margin-top: 20rpx; padding: 22rpx; border: 1rpx solid var(--line); border-radius: 8px; background: var(--surface); }.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; padding-bottom: 14rpx; color: var(--text); font-size: 26rpx; font-weight: 700; }.section-heading text:last-child { color: var(--muted); font-size: 19rpx; font-weight: 400; }.capability-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; padding: 19rpx 0; border-bottom: 1rpx solid var(--line); }.capability-row:last-child { border-bottom: 0; }.capability-copy { min-width: 0; flex: 1; }.row-title, .row-note { display: block; }.row-title { font-size: 24rpx; }.row-note { margin-top: 6rpx; color: var(--muted); font-size: 20rpx; line-height: 1.5; }.status-tag { flex: none; padding: 6rpx 10rpx; border: 1rpx solid var(--line); border-radius: 4px; color: var(--muted); font-size: 18rpx; }.status-confirmed, .status-approved { border-color: rgba(25,207,160,.45); color: var(--accent); }.status-processing, .status-pending { border-color: rgba(242,180,86,.45); color: #f2b456; }.status-demo { color: #8fb8ce; }.filter-group { display: flex; flex-direction: column; gap: 10rpx; padding-bottom: 18rpx; }.filter-scroll { white-space: nowrap; }.filter-row { display: inline-flex; gap: 10rpx; }.filter-chip { display: inline-flex; height: 54rpx; align-items: center; padding: 0 18rpx; border: 1rpx solid var(--line); border-radius: 5px; color: var(--muted); font-size: 20rpx; }.filter-chip.active { border-color: var(--accent); color: var(--accent); }.bill-row { display: flex; align-items: flex-start; gap: 18rpx; padding: 22rpx 0; border-bottom: 1rpx solid var(--line); }.bill-row:last-child { border-bottom: 0; }.bill-main { min-width: 0; flex: 1; }.bill-side { display: flex; flex: none; flex-direction: column; align-items: flex-end; gap: 8rpx; }.bill-amount { color: var(--text); font-size: 24rpx; font-weight: 700; }.bill-amount.income { color: var(--accent); }.source-state { color: var(--muted); font-size: 17rpx; }.load-more { padding: 24rpx 10rpx 4rpx; color: var(--accent); font-size: 22rpx; text-align: center; }.load-more.disabled { opacity: .55; }.inline-error { display: flex; justify-content: space-between; gap: 18rpx; margin-top: 16rpx; padding: 16rpx; border-radius: 5px; background: var(--surface-strong); color: #f2b456; font-size: 20rpx; }.placeholder-section { display: flex; flex-direction: column; gap: 12rpx; color: var(--muted); font-size: 22rpx; line-height: 1.55; }.placeholder-section > text:first-child { color: var(--text); font-size: 27rpx; font-weight: 700; }.secondary-link { align-self: flex-start; margin-top: 8rpx; color: var(--accent); }.wallet-skeleton, .bill-loading { display: flex; flex-direction: column; gap: 14rpx; }.skeleton { border-radius: 6px; background: var(--surface-strong); opacity: .72; }.skeleton-balance { height: 188rpx; }.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }.skeleton-asset { height: 126rpx; }.skeleton-bill { height: 118rpx; }.toast { position: fixed; z-index: 80; left: 50%; bottom: calc(140rpx + env(safe-area-inset-bottom)); max-width: 620rpx; transform: translateX(-50%); padding: 16rpx 24rpx; border: 1rpx solid var(--line); border-radius: 6px; background: var(--header-bg); color: var(--text); font-size: 23rpx; text-align: center; }
@media (max-width: 380px) { .wallet-page { padding-right: 18rpx; padding-left: 18rpx; }.asset-grid { grid-template-columns: 1fr; }.wallet-actions { grid-template-columns: 1fr; }.bill-row { flex-direction: column; }.bill-side { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; } }
@media (prefers-reduced-motion: reduce) { .action-button { transition: none; } }
</style>
