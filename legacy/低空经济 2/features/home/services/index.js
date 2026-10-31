import { request, toPageQuery } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import {
  demoFlightFields,
  demoHomeModules,
  demoMaintenance,
  demoSearchCatalog,
  getDemoFlightConditions,
  getHomePage as getDemoPage
} from '../mock/page-data'
import { cloneDemo } from '../../shared/utils/route-options'

const PAGE_META = { home: { title: '低空经济', active: 'home', root: true, kind: 'home' }, search: { title: '全局搜索', kind: 'search' }, flight: { title: '本地飞行服务', kind: 'flight' } }
export const toHomePageDto = (payload, pageKey) => toPageDto(payload, 'home', pageKey)
export const mapHomePageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'home', demoGetter: getDemoPage, toDto: toHomePageDto, toUi: mapHomePageDto, pageMeta: PAGE_META })
export const getHomePageModel = pages.initial
export const loadHomePage = pages.load

export const getDashboard = (query) => request({ url: '/home/dashboard', query })
export const searchAll = (query) => request({ url: '/search', query: toPageQuery(query) })
export const getFlightConditions = (query) => request({ url: '/flight/conditions', query })
export const getAirspaceNotices = (query) => request({ url: '/flight/airspace-notices', query: toPageQuery(query) })

export function loadHomeModule(key, query = {}) {
  if (isMockDataEnabled()) return Promise.resolve(cloneDemo(demoHomeModules[key] || { items: [], meta: null }))
  return request({ url: '/home/modules/' + encodeURIComponent(key), query })
}

export function searchGlobal(query = {}) {
  if (!isMockDataEnabled()) return request({ url: '/search', query: toPageQuery(query) })

  const keyword = String(query.keyword || '').trim().toLowerCase()
  const category = query.category || '全部'
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.max(1, Number(query.pageSize) || 20)
  const items = demoSearchCatalog.filter((item) => {
    const matchesCategory = category === '全部' || item.category === category
    const haystack = [item.title, item.note, item.category].join(' ').toLowerCase()
    return matchesCategory && (!keyword || haystack.includes(keyword))
  })
  const offset = (page - 1) * pageSize
  return {
    promise: Promise.resolve({
      items: cloneDemo(items.slice(offset, offset + pageSize)),
      total: items.length,
      meta: { demo: true, source: '平台搜索演示数据', updatedAt: '2026-07-30 18:00' }
    }),
    cancel() {}
  }
}

export function loadFlightConditions(city) {
  if (isMockDataEnabled()) return Promise.resolve(getDemoFlightConditions(city))
  return getFlightConditions({ city })
}

export function loadFlightFields(city) {
  if (isMockDataEnabled()) return Promise.resolve(cloneDemo({ ...demoFlightFields, city }))
  return request({ url: '/flight/fields', query: { city } })
}

export function loadMaintenanceServices(city) {
  if (isMockDataEnabled()) return Promise.resolve(cloneDemo({ ...demoMaintenance, city }))
  return request({ url: '/flight/maintenance-services', query: { city } })
}
