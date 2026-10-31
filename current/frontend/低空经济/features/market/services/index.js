import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { API_BASE_URL, API_TIMEOUT_MS } from '../../../config/api'
import { getAccessToken } from '../../../utils/auth'
import { normalizeCatalogFilters, normalizeListingPayload, normalizePageResult } from './contracts'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getMarketPage } from '../mock/page-data'

const PAGE_META = {
  market: { title: '设备交易', active: 'market', root: true, kind: 'market' }, product: { title: '商品详情', kind: 'product' }, sell: { title: '出售设备', kind: 'sell', auth: true }, lease: { title: '租赁方案', kind: 'lease' }, history: { title: '设备履历', kind: 'history' }, order: { title: '我的交易', kind: 'order', auth: true }
}
export const toMarketPageDto = (payload, pageKey) => toPageDto(payload, 'market', pageKey)
export const mapMarketPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'market', demoGetter: getMarketPage, toDto: toMarketPageDto, toUi: mapMarketPageDto, pageMeta: PAGE_META })
export const getMarketPageModel = pages.initial
export const loadMarketPage = pages.load

const categoryMap = { drone: '二手无人机', new_drone: '全新整机', accessory: '配件', rental: '租赁', '二手无人机': '二手无人机', '全新整机': '全新整机', '配件': '配件', '租赁': '租赁' }
const categoryCodeMap = { '二手无人机': 'drone', '全新整机': 'new_drone', '配件': 'accessory', '租赁': 'rental' }
const deliveryMap = { 邮寄: 'shipping', 配送: 'shipping', shipping: 'shipping', 自提: 'pickup', pickup: 'pickup' }

function asEvidence(value, fallbackLabel, fallbackSource) {
  const record = typeof value === 'object' && value ? value : {}
  const scalar = typeof value === 'string' ? value : ''
  return {
    label: record.label || record.value || record.masked_sn || record.maskedSn || scalar || fallbackLabel,
    status: record.status || record.verification_status || '待核验',
    source: record.source || record.provider || fallbackSource,
    recordedAt: record.recorded_at || record.recordedAt || record.updated_at || ''
  }
}

function maskSerial(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  if (source.includes('•') || source.includes('*')) return source
  return source.length <= 6 ? '••••' : source.slice(0, 4) + '••••' + source.slice(-3)
}

function mapProductToCard(product = {}) {
  const images = Array.isArray(product.images) ? product.images : (product.image ? [product.image] : [])
  const delivery = (product.delivery || product.delivery_methods || []).map((item) => deliveryMap[item] || item).filter(Boolean)
  const categoryLabel = categoryMap[product.category_code || product.category] || '设备商品'
  return {
    ...product,
    id: product.id || product.product_id || product.listing_id,
    images,
    image: images[0] || '',
    category: categoryCodeMap[categoryLabel] || product.category || 'drone',
    categoryLabel,
    title: product.title || product.name || '商品信息待补充',
    price: Number(product.price ?? product.amount ?? 0),
    priceUnit: product.price_unit || product.priceUnit || '',
    city: product.city || product.delivery_city || '城市待服务端返回',
    stock: Number(product.stock ?? product.inventory ?? 0),
    summary: product.summary || '设备信息待补充',
    condition: product.condition || product.condition_label || (categoryLabel === '配件' ? '配件状态待核验' : '成色待核验'),
    delivery,
    inspection: asEvidence(product.inspection, '质检报告待服务端返回', 'inspection-service'),
    historyStatus: asEvidence(product.history || product.history_status, '设备履历待服务端返回', 'history-service')
  }
}

function pendingEvidence(label, status = '待核验', source = 'market-service') {
  return { label, status, source, recordedAt: '' }
}

function mapProductToDetail(product = {}) {
  const card = mapProductToCard(product)
  const category = card.category
  const verification = product.verification || product.verification_status || '待核验'
  return {
    ...card,
    category,
    images: card.images.length ? card.images : (card.image ? [card.image] : []),
    seller: { name: product.seller?.name || product.seller_name || '卖家待服务端返回', status: product.seller?.status || product.seller_status || '卖家认证状态以服务端为准', source: product.seller?.source || 'seller-service', recordedAt: product.seller?.recorded_at || product.updated_at || product.updatedAt || '' },
    sn: asEvidence(product.sn_info || (product.sn ? maskSerial(product.sn) : ''), 'SN 待服务端返回', 'market-service'),
    historyLookupKey: product.history_lookup_key || product.historyLookupKey || '',
    inspection: asEvidence(product.inspection, '质检报告待服务端返回', 'inspection-service'),
    blockchain: asEvidence(product.blockchain || product.blockchain_evidence, '未返回链上字段', 'blockchain-service'),
    historyStatus: asEvidence(product.history || product.history_status, '设备履历待服务端返回', 'history-service'),
    flightHours: product.flight_hours || product.flightHours || '服务端未返回',
    repairHistory: product.repair_history || product.repairHistory || '服务端未返回',
    crashHistory: product.crash_history || product.crashHistory || '服务端未返回',
    battery: { health: product.battery?.health || product.battery_health || '服务端未返回', cycles: product.battery?.cycles || product.battery_cycles || '服务端未返回', status: product.battery?.status || product.battery_status || '待核验' },
    configuration: Array.isArray(product.configuration) ? product.configuration : [],
    specs: [
      ...(Array.isArray(product.specs) ? product.specs : []),
      { label: '品牌', value: product.brand || '待补充' },
      { label: '型号', value: product.model || '待补充' },
      { label: '库存', value: String(card.stock) }
    ],
    deliveryNotes: ['具体交付地址、运费和验机方式以订单接口返回为准'],
    afterSalePolicy: product.after_sale_policy || product.afterSalePolicy || '',
    inspectionDelivery: product.inspection_delivery || product.inspectionDelivery || '',
    rentable: category === 'rental'
  }
}

export const mapMarketProductDetail = mapProductToDetail

export const listProducts = async (query) => {
  const result = normalizePageResult(await request({ url: '/market/products', query: normalizeCatalogFilters(query) }))
  return { ...result, items: result.items.map(mapProductToCard) }
}
export const getProduct = async (id) => {
  const product = await request({ url: '/market/products/' + encodeURIComponent(id) })
  const mapped = mapProductToDetail(product)
  const returnedId = String(mapped.id || '')
  if (!returnedId || returnedId !== String(id)) throw new Error('商品详情与请求编号不一致，请刷新后重试')
  return mapped
}
export const getDeviceHistory = (sn) => request({ url: '/market/device-history', query: { sn } })
export const getInspectionReport = (reportId) => request({ url: '/market/inspection-reports/' + encodeURIComponent(reportId) })
export function uploadListingMedia(filePath, options = {}) {
  if (!filePath) return Promise.reject(new Error('未找到待上传的媒体文件'))
  const token = getAccessToken()
  if (!token) return Promise.reject(new Error('请登录后上传媒体'))
  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: API_BASE_URL + '/market/listings/media', filePath, name: 'file', timeout: API_TIMEOUT_MS,
      header: { Authorization: 'Bearer ' + token },
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error('媒体上传失败（' + response.statusCode + '）'))
        try {
          const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          const result = body?.data ?? body
          if (!result?.id && !result?.url) throw new Error('上传响应缺少媒体标识')
          resolve(result)
        } catch (error) { reject(error.message ? error : new Error('无法识别上传响应')) }
      },
      fail(error) { reject(new Error(error?.errMsg || '媒体上传失败，请重试')) }
    })
    task?.onProgressUpdate?.((progress) => options.onProgress?.(Math.max(0, Math.min(100, Number(progress.progress) || 0))))
  })
}
export const publishListing = (data) => request({ url: '/market/listings', method: 'POST', data: normalizeListingPayload(data), auth: true })
export const quoteLease = (id, data) => request({ url: '/market/products/' + encodeURIComponent(id) + '/lease-quote', method: 'POST', data, auth: true })
export const createOrder = (data) => request({ url: '/market/orders', method: 'POST', data, auth: true })
export const listOrders = async (query) => normalizePage(await request({ url: '/market/orders', query: toPageQuery(query), auth: true }))
export const getOrder = (orderId) => request({ url: '/market/orders/' + encodeURIComponent(orderId), auth: true })
function mapCartItem(item = {}) {
  return { ...item, product: mapProductToCard(item.product || {}) }
}

export const listCart = async () => {
  const result = await request({ url: '/market/cart', auth: true })
  return { ...result, items: (result.items || []).map(mapCartItem) }
}
export const updateCartItem = async (productId, quantity = 1) => mapCartItem(await request({ url: '/market/cart/items', method: 'PUT', data: { productId, quantity }, auth: true }))
export const removeCartItem = (itemId) => request({ url: '/market/cart/items/' + encodeURIComponent(itemId), method: 'DELETE', auth: true })
export const listRepairProviders = async (query = {}) => normalizePage(await request({ url: '/market/repair/providers', query: toPageQuery(query) }))
export const getRepairProvider = (id) => request({ url: '/market/repair/providers/' + encodeURIComponent(id) })
export const createRepairBooking = (data) => request({ url: '/market/repair/bookings', method: 'POST', data, auth: true })
export const listRepairBookings = async (query = {}) => normalizePage(await request({ url: '/market/repair/bookings', query: toPageQuery(query), auth: true }))

export const marketService = {
  listProducts: (filters) => listProducts(filters),
  getProduct,
  getDeviceHistory: (sn) => getDeviceHistory(sn),
  getRentalPlans: async (id) => {
    const result = await request({ url: '/market/products/' + encodeURIComponent(id) + '/rental-plans' })
    return Array.isArray(result) ? result : (result.items || result.plans || [])
  },
  quoteOrder: (data) => request({ url: '/market/orders/quote', method: 'POST', data, auth: true }),
  createOrder: (data) => createOrder(data),
  listOrders: (query) => listOrders(query),
  getOrder: (id) => getOrder(id),
  listCart,
  updateCartItem,
  removeCartItem,
  listRepairProviders,
  getRepairProvider,
  createRepairBooking,
  listRepairBookings,
  publishListing: (data) => publishListing(data),
  getSellerEligibility: () => request({ url: '/market/seller-eligibility', auth: true }),
  uploadListingMedia,
  estimateListing: (data) => request({ url: '/market/listings/estimate', method: 'POST', data, auth: true }),
  getListingProgress: (id) => request({ url: '/market/listings/' + encodeURIComponent(id) + '/progress', auth: true }),
  requestOrderAction: (id, action, data = {}) => request({ url: '/market/orders/' + encodeURIComponent(id) + '/actions', method: 'POST', data: { action, ...data }, auth: true })
}

export const getMarketMode = () => 'live'
export const getMarketService = () => marketService
