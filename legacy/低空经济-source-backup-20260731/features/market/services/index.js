import { normalizePage, request, toPageQuery } from '../../../utils/request'
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

function mapProductToCard(product = {}) {
  const images = Array.isArray(product.images) ? product.images : []
  const delivery = (product.delivery || []).map((item) => ({ 邮寄: 'shipping', 自提: 'pickup' }[item] || item))
  return {
    ...product,
    image: images[0] || '',
    categoryLabel: product.category || '设备商品',
    summary: product.summary || '设备信息待补充',
    condition: product.category === '配件' ? '配件状态待核验' : '成色待核验',
    delivery,
    inspection: { status: product.verification || '待核验' },
    historyStatus: { status: product.verification || '待核验' }
  }
}

function pendingEvidence(label, status = '待核验', source = 'market-service') {
  return { label, status, source, recordedAt: '' }
}

function mapProductToDetail(product = {}) {
  const card = mapProductToCard(product)
  const category = { 二手无人机: 'drone', 配件: 'accessory', 租赁: 'rental' }[product.category] || product.category || 'drone'
  const verification = product.verification || '待核验'
  return {
    ...card,
    category,
    images: card.images.length ? card.images : (card.image ? [card.image] : []),
    seller: { name: '平台卖家', status: '卖家认证状态以服务端为准', source: 'market-service', recordedAt: product.updatedAt || '' },
    sn: pendingEvidence(product.sn || 'SN 待服务端返回', verification, 'market-service'),
    inspection: pendingEvidence('质检报告待服务端返回', verification, 'inspection-service'),
    blockchain: pendingEvidence('未返回链上字段', '待接入', 'blockchain-service'),
    historyStatus: pendingEvidence('设备履历待服务端返回', verification, 'history-service'),
    flightHours: '服务端未返回',
    repairHistory: '服务端未返回',
    crashHistory: '服务端未返回',
    battery: { health: '服务端未返回', cycles: '服务端未返回', status: '待核验' },
    configuration: [],
    specs: [
      { label: '品牌', value: product.brand || '待补充' },
      { label: '型号', value: product.model || '待补充' },
      { label: '库存', value: String(product.stock ?? 0) }
    ],
    deliveryNotes: ['具体交付地址、运费和验机方式以订单接口返回为准'],
    rentable: category === 'rental'
  }
}

export const listProducts = async (query) => {
  const result = normalizePage(await request({ url: '/market/products', query: toPageQuery(query) }))
  return { ...result, items: result.items.map(mapProductToCard) }
}
export const getProduct = async (id) => mapProductToDetail(await request({ url: '/market/products/' + encodeURIComponent(id) }))
export const getDeviceHistory = (sn) => request({ url: '/market/devices/' + encodeURIComponent(sn) + '/history' })
export const getInspectionReport = (reportId) => request({ url: '/market/inspection-reports/' + encodeURIComponent(reportId) })
export const publishListing = (data) => request({ url: '/market/listings', method: 'POST', data, auth: true })
export const quoteLease = (id, data) => request({ url: '/market/products/' + encodeURIComponent(id) + '/lease-quote', method: 'POST', data, auth: true })
export const createOrder = (data) => request({ url: '/market/orders', method: 'POST', data, auth: true })
export const listOrders = async (query) => normalizePage(await request({ url: '/market/orders', query: toPageQuery(query), auth: true }))
export const getOrder = (orderId) => request({ url: '/market/orders/' + encodeURIComponent(orderId), auth: true })

export const marketService = {
  listProducts: (filters) => listProducts(filters),
  getProduct,
  getRentalPlans: (id) => request({ url: '/market/products/' + encodeURIComponent(id) + '/rental-plans' })
}

export const getMarketMode = () => 'live'
export const getMarketService = () => marketService
