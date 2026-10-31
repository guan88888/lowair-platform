import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSearchRoute,
  filterDemoSearch,
  mapCityDirectoryResponse,
  mapFlightConditionsResponse,
  mapFlightNoticeResponse,
  mapHomeModuleResponse,
  mapSearchResponse,
  mapServiceDirectory,
  normalizeSearchQuery
} from '../services/contracts.mjs'

test('home modules map backend payload fields without losing source metadata', () => {
  const result = mapHomeModuleResponse({
    items: [{ id: 1, title: '飞行任务', note: '12', category: '平台实时统计', to: '/pages/work/index', payload: {} }],
    meta: { source: 'content-service', updatedAt: '2026-07-31T15:52:26' }
  }, 'summary')
  assert.deepEqual(result.items[0], {
    id: '1', title: '飞行任务', note: '平台实时统计', category: '平台实时统计', to: '/pages/work/index', payload: {},
    key: '1', label: '飞行任务', value: '12'
  })
  assert.equal(result.meta.source, 'content-service')
  assert.equal(result.meta.demo, false)
})

test('search query and URL retain supported public parameters', () => {
  assert.deepEqual(normalizeSearchQuery({ q: '  无人机 ', category: '商品', page: -2, pageSize: 500 }), {
    keyword: '无人机', category: '商品', page: 1, page_size: 100
  })
  assert.equal(buildSearchRoute({ keyword: '无人机 巡检', category: '任务' }), '/pages/search/index?q=%E6%97%A0%E4%BA%BA%E6%9C%BA%20%E5%B7%A1%E6%A3%80&category=%E4%BB%BB%E5%8A%A1')
  assert.equal(buildSearchRoute({ keyword: '巡检', scope: 'work' }), '/pages/search/index?q=%E5%B7%A1%E6%A3%80&scope=work')
})

test('search response maps backend pagination and derives domain category from routes', () => {
  const result = mapSearchResponse({
    items: [{ id: 9, title: '设备入口', category: '常用入口', to: '/pages/market/index' }],
    page: 2, page_size: 5, total: 11, has_more: true, meta: { source: 'cross-domain' }
  }, { keyword: '设备', page: 2, pageSize: 5 })
  assert.equal(result.items[0].category, '商品')
  assert.equal(result.items[0].source, 'cross-domain')
  assert.equal(result.hasMore, true)
  assert.equal(result.meta.updatedAt, '后端未提供')
})

test('demo search filters category and paginates before mapping', () => {
  const result = filterDemoSearch([
    { id: 'a', category: '任务', title: '电力巡检', note: '', to: '/pages/work/task-detail?id=a' },
    { id: 'b', category: '岗位', title: '巡检飞手', note: '', to: '/pages/work/job-detail?id=b' }
  ], { keyword: '巡检', category: '任务', page: 1, pageSize: 1 })
  assert.equal(result.total, 1)
  assert.equal(result.items[0].id, 'a')
  assert.equal(result.meta.demo, true)
})

test('flight and service DTOs keep disclaimers, source time and status tags', () => {
  const conditions = mapFlightConditionsResponse({
    city: '北京', status: '需现场复核', weather: { windSpeed: '--', riskCount: 1 },
    disclaimer: '不构成放飞结论', meta: { source: 'flight-service', updatedAt: '2026-08-01T01:00:00Z' }
  }, '北京')
  assert.equal(conditions.disclaimer, '不构成放飞结论')
  assert.equal(conditions.weather.visibility, '--')
  assert.equal(conditions.meta.updatedAt, '2026-08-01T01:00:00Z')

  const directory = mapServiceDirectory({ items: [{ id: 1, title: '训练场', category: '待核对', to: '/pages/community/nearby?mode=field&id=1' }] }, '飞场服务')
  assert.equal(directory.items[0].tag, '待核对')
  assert.equal(directory.meta.updatedAt, '后端未提供')
})

test('city directory accepts backend city aliases and preserves source metadata', () => {
  const result = mapCityDirectoryResponse({ cities: [{ code: '1101', city: '北京' }, '成都'], meta: { source: 'geo-service', updatedAt: '2026-08-01T02:00:00Z' } })
  assert.deepEqual(result.items.map((item) => item.name), ['北京', '成都'])
  assert.equal(result.items[0].id, '1101')
  assert.equal(result.meta.source, 'geo-service')
})

test('flight notice DTOs retain authority, timestamps and effective windows', () => {
  const result = mapFlightNoticeResponse({
    zones: [{ id: 'zone-1', name: '机场净空区', level: '高', provider: '民航局', observed_at: '2026-08-01T01:00:00Z', effective_from: '2026-08-01T00:00:00Z' }],
    meta: { source: 'airspace-api', updatedAt: '2026-08-01T01:00:00Z' }
  }, '空域服务')
  assert.equal(result.items[0].title, '机场净空区')
  assert.equal(result.items[0].source, '民航局')
  assert.equal(result.items[0].updatedAt, '2026-08-01T01:00:00Z')
  assert.equal(result.items[0].effectiveFrom, '2026-08-01T00:00:00Z')
})
