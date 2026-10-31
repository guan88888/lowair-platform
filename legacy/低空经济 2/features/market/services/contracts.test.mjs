import assert from 'node:assert/strict'
import test from 'node:test'
import { createLiveMarketApi, normalizeCatalogFilters, normalizePageResult } from './contracts.js'

test('catalog filters keep supported values and normalize paging', () => {
  assert.deepEqual(normalizeCatalogFilters({ keyword: '  Matrice ', category: 'drone', delivery: 'pickup', page: -3, pageSize: 99 }), {
    keyword: 'Matrice',
    category: 'drone',
    delivery: 'pickup',
    sort: 'recommended',
    page: 1,
    page_size: 40
  })
})

test('page results derive hasMore without inventing items', () => {
  assert.deepEqual(normalizePageResult({ items: [{ id: 'device-01' }], page: 1, page_size: 1, total: 2 }), {
    items: [{ id: 'device-01' }], page: 1, pageSize: 1, total: 2, hasMore: true
  })
})

test('live order endpoints require authentication and keep server actions explicit', async () => {
  const calls = []
  const api = createLiveMarketApi(async (options) => {
    calls.push(options)
    return { ok: true }
  })
  await api.createOrder({ productId: 'device-01' })
  await api.requestOrderAction('order/1', 'request_after_sale', { reason: '外观争议' })
  assert.deepEqual(calls, [
    { url: '/market/orders', method: 'POST', data: { productId: 'device-01' }, auth: true },
    { url: '/market/orders/order%2F1/actions', method: 'POST', data: { action: 'request_after_sale', reason: '外观争议' }, auth: true }
  ])
})

test('device history lookup sends the SN only as a query parameter', async () => {
  let call
  const api = createLiveMarketApi(async (options) => { call = options })
  await api.getDeviceHistory('SN DEMO 01')
  assert.deepEqual(call, { url: '/market/device-history', query: { sn: 'SN DEMO 01' } })
})
