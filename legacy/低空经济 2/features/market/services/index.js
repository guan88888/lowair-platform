import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getMarketPage as getDemoPage } from '../mock/page-data'
import { getDemoProduct, getDemoProducts, getDemoRentalPlans } from '../mock/catalog'
import { normalizeCatalogFilters, normalizePageResult } from './contracts'

const PAGE_META = {
  market: { title: '设备交易', active: 'market', root: true, kind: 'market' }, product: { title: '商品详情', kind: 'product' }, sell: { title: '出售设备', kind: 'sell', auth: true }, lease: { title: '租赁方案', kind: 'lease' }, history: { title: '设备履历', kind: 'history' }, order: { title: '我的交易', kind: 'order', auth: true }
}
export const toMarketPageDto = (payload, pageKey) => toPageDto(payload, 'market', pageKey)
export const mapMarketPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'market', demoGetter: getDemoPage, toDto: toMarketPageDto, toUi: mapMarketPageDto, pageMeta: PAGE_META })
export const getMarketPageModel = pages.initial
export const loadMarketPage = pages.load

export const listProducts = async (query) => normalizePage(await request({ url: '/market/products', query: toPageQuery(query) }))
export const getProduct = (id) => request({ url: '/market/products/' + encodeURIComponent(id) })
export const getDeviceHistory = (sn) => request({ url: '/market/devices/' + encodeURIComponent(sn) + '/history' })
export const getInspectionReport = (reportId) => request({ url: '/market/inspection-reports/' + encodeURIComponent(reportId) })
export const publishListing = (data) => request({ url: '/market/listings', method: 'POST', data, auth: true })
export const quoteLease = (id, data) => request({ url: '/market/products/' + encodeURIComponent(id) + '/lease-quote', method: 'POST', data, auth: true })
export const createOrder = (data) => request({ url: '/market/orders', method: 'POST', data, auth: true })
export const listOrders = async (query) => normalizePage(await request({ url: '/market/orders', query: toPageQuery(query), auth: true }))
export const getOrder = (orderId) => request({ url: '/market/orders/' + encodeURIComponent(orderId), auth: true })

function filterDemoProducts(filters = {}) {
  const query = normalizeCatalogFilters(filters)
  const keyword = String(query.keyword || '').toLowerCase()
  let products = getDemoProducts().filter((item) => {
    const matchesKeyword = !keyword || [item.title, item.brand, item.model, item.summary].join(' ').toLowerCase().includes(keyword)
    const matchesCategory = !query.category || item.category === query.category
    const matchesBrand = !query.brand || item.brand === query.brand
    const matchesCity = !query.city || item.city === query.city
    const matchesDelivery = !query.delivery || (item.delivery || []).includes(query.delivery)
    return matchesKeyword && matchesCategory && matchesBrand && matchesCity && matchesDelivery
  })
  if (query.sort === 'price_asc') products.sort((a, b) => a.price - b.price)
  if (query.sort === 'price_desc') products.sort((a, b) => b.price - a.price)
  const total = products.length
  const offset = (query.page - 1) * query.page_size
  return normalizePageResult({ items: products.slice(offset, offset + query.page_size), page: query.page, page_size: query.page_size, total })
}

const demoMarketService = {
  listProducts: async (filters) => filterDemoProducts(filters),
  getProduct: async (id) => {
    const product = getDemoProduct(id)
    if (!product) throw new Error('未找到该商品')
    return product
  },
  getRentalPlans: async (id) => getDemoRentalPlans(id)
}

const liveMarketService = {
  listProducts: (filters) => listProducts(filters),
  getProduct,
  getRentalPlans: (id) => request({ url: '/market/products/' + encodeURIComponent(id) + '/rental-plans' })
}

export const getMarketMode = () => isMockDataEnabled() ? 'demo' : 'live'
export const getMarketService = () => isMockDataEnabled() ? demoMarketService : liveMarketService
