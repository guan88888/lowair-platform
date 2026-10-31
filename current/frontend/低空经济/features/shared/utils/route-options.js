import { isLiveApiEnabled, isMockDataEnabled } from '../../../config/api.js'

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const SN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/

export class RouteValidationError extends Error {
  constructor(message, field, value) {
    super(message)
    this.name = 'RouteValidationError'
    this.code = 'INVALID_ROUTE_PARAMETER'
    this.field = field
    this.value = value
  }
}

const enumField = (values, required = false) => ({ type: 'enum', values, required })
const idField = (required = false) => ({ type: 'id', required })
const snField = (required = false) => ({ type: 'sn', required })
const textField = (required = false) => ({ type: 'text', required })

const ROUTE_SCHEMAS = Object.freeze({
  'home.search': { q: textField(), keyword: textField(), category: enumField(['全部', '机构', '岗位', '任务', '商品', '内容']), scope: enumField(['home', 'academy', 'work', 'market', 'community']) },
  'home.flight': { layer: enumField(['service']), city: textField(), adcode: textField() },
  'academy.institutions': { mode: enumField(['compare']) },
  'academy.institutionDetail': { id: idField(true), preview: enumField(['1']) },
  'academy.visit': { institutionId: idField(true), mode: enumField(['booking']) },
  'academy.learning': { mode: enumField(['video', 'simulator']) },
  'academy.exam': { mode: enumField(['practice', 'mock', 'review']) },
  'academy.progress': { tab: enumField(['record', 'subsidy']) },
  'work.jobDetail': { id: idField(true) },
  'work.resume': { returnJobId: idField() },
  'work.talent': { mode: enumField(['company']), id: idField() },
  'work.publish': { type: enumField(['job', 'task']), source: enumField(['community']) },
  'work.taskDetail': { id: idField(true) },
  'work.fulfillment': { orderId: idField(true) },
  'market.product': { id: idField(true) },
  'market.sell': { mode: enumField(['inspection']), sn: snField() },
  'market.lease': { id: idField(true) },
  'market.history': { sn: snField(true) },
  'market.order': { mode: enumField(['list', 'checkout', 'detail'], true), id: idField(), orderId: idField(), tradeType: enumField(['buy', 'lease']) },
  'market.repair': { tab: enumField(['providers', 'bookings']) },
  'community.post': { id: idField(true) },
  'community.compose': { type: enumField(['flight-log']) },
  'community.knowledge': { mode: enumField(['official', 'question']), id: idField() },
  'community.nearby': { mode: enumField(['field', 'route']), id: idField() },
  'profile.profile': { userId: idField(), public: enumField(['1']) },
  'profile.account': { mode: enumField(['personal', 'caac', 'enterprise', 'institution']), redirect: { type: 'redirect' } },
  'profile.wallet': { tab: enumField(['funds', 'escrow', 'beans', 'transactions', 'invoices']) },
  'profile.messages': { conversationId: idField(), category: enumField(['academy', 'market', 'work', 'community', 'system']) },
  'assistant.droneAgent': { conversationId: idField() },
  'operations.ad': { biz: enumField(['academy', 'recruitment', 'general']) },
  'operations.campaign': { mode: enumField(['create', 'dashboard']), biz: enumField(['academy', 'recruitment', 'general']) }
})

const PAGE_ROUTE_KEYS = Object.freeze({
  'pages/search/index': ['home', 'search'],
  'pages/flight/index': ['home', 'flight'],
  'pages/academy/institutions': ['academy', 'institutions'],
  'pages/academy/institution-detail': ['academy', 'institutionDetail'],
  'pages/academy/visit': ['academy', 'visit'],
  'pages/academy/learning': ['academy', 'learning'],
  'pages/academy/exam': ['academy', 'exam'],
  'pages/academy/progress': ['academy', 'progress'],
  'pages/work/job-detail': ['work', 'jobDetail'],
  'pages/work/resume': ['work', 'resume'],
  'pages/work/talent': ['work', 'talent'],
  'pages/work/publish': ['work', 'publish'],
  'pages/work/task-detail': ['work', 'taskDetail'],
  'pages/work/fulfillment': ['work', 'fulfillment'],
  'pages/market/product-detail': ['market', 'product'],
  'pages/market/sell': ['market', 'sell'],
  'pages/market/lease': ['market', 'lease'],
  'pages/market/device-history': ['market', 'history'],
  'pages/market/order': ['market', 'order'],
  'pages/market/repair': ['market', 'repair'],
  'pages/community/post-detail': ['community', 'post'],
  'pages/community/publish': ['community', 'compose'],
  'pages/community/knowledge': ['community', 'knowledge'],
  'pages/community/nearby': ['community', 'nearby'],
  'pages/profile/index': ['profile', 'profile'],
  'pages/profile/account': ['profile', 'account'],
  'pages/profile/wallet': ['profile', 'wallet'],
  'pages/messages/index': ['profile', 'messages'],
  'pages/assistant/index': ['assistant', 'droneAgent'],
  'pages/ad/index': ['operations', 'ad'],
  'pages/ad/campaign': ['operations', 'campaign']
})

const MOCK_IDS = Object.freeze({
  'academy.institutionDetail.id': ['school-01', 'school-02', 'school-03'],
  'academy.visit.institutionId': ['school-01', 'school-02', 'school-03'],
  'work.jobDetail.id': ['job-01', 'job-02'],
  'work.resume.returnJobId': ['job-01', 'job-02'],
  'work.taskDetail.id': ['task-01', 'task-02', 'task-new'],
  'work.fulfillment.orderId': ['order-task-01'],
  'market.product.id': ['device-01', 'device-02', 'part-01', 'part-02'],
  'market.lease.id': ['device-01', 'device-02'],
  'market.order.id': ['device-01', 'device-02', 'part-01', 'part-02'],
  'market.order.orderId': ['market-01'],
  'community.post.id': ['post-01', 'post-02', 'post-new'],
  'community.knowledge.id': ['notice-01'],
  'community.nearby.id': ['post-01'],
  'profile.profile.userId': ['user-01'],
  'profile.messages.conversationId': ['school-01', 'task-01', 'user-02']
})

function scalar(value, field) {
  if (Array.isArray(value)) throw new RouteValidationError('参数 ' + field + ' 只能出现一次', field, value)
  if (value === undefined || value === null || value === '') return ''
  return String(value).trim()
}

function validateField(routeKey, field, rawValue, rule) {
  const value = scalar(rawValue, field)
  if (!value) {
    if (rule.required) throw new RouteValidationError('缺少必需参数：' + field, field, value)
    return undefined
  }
  if (rule.type === 'enum' && !rule.values.includes(value)) {
    throw new RouteValidationError('参数 ' + field + ' 不支持值“' + value + '”', field, value)
  }
  if (rule.type === 'id' && !ID_PATTERN.test(value)) {
    throw new RouteValidationError('参数 ' + field + ' 格式不正确', field, value)
  }
  if (rule.type === 'sn' && !SN_PATTERN.test(value)) {
    throw new RouteValidationError('设备序列号格式不正确', field, value)
  }
  if (rule.type === 'redirect' && !/^\/pages\/[A-Za-z0-9/_-]+(?:\?[^#]*)?$/.test(value)) {
    throw new RouteValidationError('返回地址不在应用路由范围内', field, value)
  }
  const mockValues = MOCK_IDS[routeKey + '.' + field]
  if (isMockDataEnabled() && mockValues && !mockValues.includes(value)) {
    throw new RouteValidationError('演示数据中不存在 ' + field + '=“' + value + '”', field, value)
  }
  return value
}

function validateRelations(routeKey, options) {
  if (routeKey === 'market.order') {
    if (options.mode === 'detail' && !options.orderId) throw new RouteValidationError('订单详情缺少 orderId', 'orderId', '')
    if (options.mode === 'checkout' && (!options.id || !options.tradeType)) throw new RouteValidationError('结算页需要 id 和 tradeType', 'id', options.id)
    if (options.mode === 'list' && (options.id || options.orderId || options.tradeType)) throw new RouteValidationError('订单列表不接受详情参数', 'mode', options.mode)
  }
  if (routeKey === 'work.talent' && options.mode === 'company' && !options.id) throw new RouteValidationError('企业详情缺少 id', 'id', '')
  if (routeKey === 'community.knowledge' && options.id && options.mode !== 'official') throw new RouteValidationError('知识内容 id 仅支持官方内容模式', 'id', options.id)
  if (routeKey === 'community.nearby' && options.mode === 'route' && !options.id) throw new RouteValidationError('路线模式缺少 id', 'id', '')
}

export function parseRouteOptions(domain, pageKey, rawOptions = {}) {
  const routeKey = domain + '.' + pageKey
  const schema = ROUTE_SCHEMAS[routeKey] || {}
  const options = {}
  for (const [field, rule] of Object.entries(schema)) {
    const value = validateField(routeKey, field, rawOptions[field], rule)
    if (value !== undefined) options[field] = value
  }
  validateRelations(routeKey, options)
  return Object.freeze(options)
}

function currentRoutePath(current) {
  const route = String(current?.route || '').replace(/^\//, '').replace(/\.vue$/, '')
  if (route) return route
  if (typeof window === 'undefined') return ''
  const hash = window.location?.hash || ''
  return hash.replace(/^#?\/?/, '').split('?')[0].replace(/\.html$/, '')
}

export function getRouteOptions({ validate = true } = {}) {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const options = { ...(current?.options || current?.$page?.options || {}) }
  // In H5, a nested feature component can mount before uni-app copies the
  // hash query onto the thin route page. Read the same query from the URL so
  // detail screens never lose their id and remain stuck in a loading state.
  if (typeof window !== 'undefined' && window.location?.hash.includes('?')) {
    const query = window.location.hash.split('?')[1]?.split('#')[0] || ''
    new URLSearchParams(query).forEach((value, key) => {
      if (options[key] === undefined) options[key] = value
    })
  }
  if (!validate) return options
  const routeKey = PAGE_ROUTE_KEYS[currentRoutePath(current)]
  if (!routeKey) return options
  return parseRouteOptions(routeKey[0], routeKey[1], options)
}

export function resolveRouteOptions(domain, pageKey) {
  try {
    return { options: parseRouteOptions(domain, pageKey, getRouteOptions()), error: null }
  } catch (error) {
    return { options: Object.freeze({}), error }
  }
}

export function createRouteErrorPage(error) {
  return Object.freeze({
    title: '页面参数错误',
    active: '',
    root: false,
    kind: 'routeError',
    sections: [{
      title: '无法打开此页面',
      cards: [['路由参数无效', error?.message || '请检查页面链接后重试', '参数错误', '']]
    }]
  })
}

export function cloneDemo(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export { isLiveApiEnabled, isMockDataEnabled }
