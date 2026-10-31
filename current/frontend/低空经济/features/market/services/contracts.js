const PRODUCT_CATEGORIES = new Set(['drone', 'new_drone', 'accessory', 'rental'])
const DELIVERY_TYPES = new Set(['shipping', 'pickup'])
const CATEGORY_ALIASES = { '二手无人机': 'drone', '无人机': 'drone', '全新整机': 'new_drone', '新机': 'new_drone', '配件': 'accessory', '租赁': 'rental' }

function compact(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== '' && value !== undefined && value !== null))
}

export function normalizeCatalogFilters(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const pageSize = Math.min(40, Math.max(1, Number(filters.pageSize) || 6))
  return compact({
    keyword: String(filters.keyword || '').trim(),
    category: PRODUCT_CATEGORIES.has(filters.category) ? filters.category : (CATEGORY_ALIASES[filters.category] || ''),
    brand: String(filters.brand || '').trim(),
    model: String(filters.model || '').trim(),
    price_range: String(filters.priceRange || '').trim(),
    city: String(filters.city || '').trim(),
    delivery: DELIVERY_TYPES.has(filters.delivery) ? filters.delivery : '',
    verification: String(filters.verification || '').trim(),
    sort: String(filters.sort || 'recommended'),
    page,
    page_size: pageSize
  })
}

export function normalizePageResult(result = {}) {
  const items = Array.isArray(result.items) ? result.items : []
  const page = Math.max(1, Number(result.page) || 1)
  const pageSize = Math.max(1, Number(result.page_size ?? result.pageSize) || 6)
  const total = Math.max(0, Number(result.total) || 0)
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: Boolean(result.has_more ?? result.hasMore ?? page * pageSize < total)
  }
}

export function normalizeListingPayload(payload = {}) {
  const category = PRODUCT_CATEGORIES.has(payload.category) ? payload.category : (CATEGORY_ALIASES[payload.category] || '')
  const delivery = Array.isArray(payload.delivery) ? payload.delivery.filter((item) => DELIVERY_TYPES.has(item)) : []
  return compact({
    category,
    brand: String(payload.brand || '').trim(),
    model: String(payload.model || '').trim(),
    sn: String(payload.sn || '').trim(),
    configuration: Array.isArray(payload.configuration) ? payload.configuration.filter(Boolean) : [],
    price: Number(payload.price) || 0,
    price_unit: String(payload.priceUnit || '').trim(),
    city: String(payload.city || '').trim(),
    delivery,
    description: String(payload.description || '').trim(),
    photos: Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : [],
    inspection_appointment: Boolean(payload.inspectionAppointment)
  })
}

export function createLiveMarketApi(transport) {
  if (typeof transport !== 'function') throw new TypeError('market transport must be a function')
  return {
    listProducts(filters) {
      return transport({ url: '/market/products', query: normalizeCatalogFilters(filters) })
    },
    getProduct(id) {
      return transport({ url: `/market/products/${encodeURIComponent(id)}` })
    },
    getRentalPlans(id) {
      return transport({ url: `/market/products/${encodeURIComponent(id)}/rental-plans` })
    },
    getDeviceHistory(sn) {
      return transport({ url: '/market/device-history', query: { sn } })
    },
    getSellerEligibility() {
      return transport({ url: '/market/seller-eligibility', auth: true })
    },
    requestUpload(payload) {
      return transport({ url: '/market/uploads/presign', method: 'POST', data: payload, auth: true })
    },
    createListing(payload) {
      return transport({ url: '/market/listings', method: 'POST', data: payload, auth: true })
    },
    quoteOrder(payload) {
      return transport({ url: '/market/orders/quote', method: 'POST', data: payload, auth: true })
    },
    createOrder(payload) {
      return transport({ url: '/market/orders', method: 'POST', data: payload, auth: true })
    },
    listOrders(filters = {}) {
      return transport({ url: '/market/orders', query: compact({ status: filters.status, page: filters.page || 1, page_size: filters.pageSize || 6 }), auth: true })
    },
    getOrder(id) {
      return transport({ url: `/market/orders/${encodeURIComponent(id)}`, auth: true })
    },
    requestOrderAction(id, action, payload = {}) {
      return transport({ url: `/market/orders/${encodeURIComponent(id)}/actions`, method: 'POST', data: { action, ...payload }, auth: true })
    }
  }
}

export function hasAccessToken() {
  return Boolean(uni.getStorageSync('lowair-access-token'))
}
