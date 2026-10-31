import assert from 'node:assert/strict'
import test from 'node:test'
import { createLiveMarketApi, normalizeCatalogFilters, normalizeListingPayload, normalizePageResult } from './contracts.js'
import { availableOrderActions, orderStages, orderStatusLabel } from './order-state.js'

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

test('Chinese catalogue categories and listing payloads normalize to API values', () => {
  assert.equal(normalizeCatalogFilters({ category: '二手无人机' }).category, 'drone')
  assert.deepEqual(normalizeListingPayload({
    category: '租赁', brand: ' DJI ', model: ' M30T ', sn: 'SN-1', price: '520', city: ' 上海 ',
    delivery: ['pickup', 'unsupported'], configuration: ['电池', ''], photos: ['asset-1'], inspectionAppointment: true
  }), {
    category: 'rental', brand: 'DJI', model: 'M30T', sn: 'SN-1', configuration: ['电池'], price: 520,
    city: '上海', delivery: ['pickup'], photos: ['asset-1'], inspection_appointment: true
  })
})

test('order stages preserve server status and never invent a payment state', () => {
  assert.equal(orderStatusLabel({ status: 'pending_inspection' }), '待验机')
  assert.deepEqual(orderStages({ logistics_status: '运输中', refund_status: '退款处理中' }), [
    { label: '支付 / 托管', value: '等待服务端返回' }, { label: '物流 / 交付', value: '运输中' },
    { label: '验机', value: '等待服务端返回' }, { label: '归还', value: '不适用 / 等待服务端返回' },
    { label: '售后 / 争议', value: '无服务端状态' }, { label: '退款', value: '退款处理中' }
  ])
  assert.deepEqual(availableOrderActions({ available_actions: [{ code: 'request_after_sale', label: '申请售后' }] }), [{ code: 'request_after_sale', label: '申请售后' }])
})
