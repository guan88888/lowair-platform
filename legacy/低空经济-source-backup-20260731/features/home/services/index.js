import { request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'

const PAGE_META = { home: { title: '低空经济', active: 'home', root: true, kind: 'home' }, search: { title: '全局搜索', kind: 'search' }, flight: { title: '本地飞行服务', kind: 'flight' } }
export const toHomePageDto = (payload, pageKey) => toPageDto(payload, 'home', pageKey)
export const mapHomePageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'home', toDto: toHomePageDto, toUi: mapHomePageDto, pageMeta: PAGE_META })
export const getHomePageModel = pages.initial
export const loadHomePage = pages.load

export const getDashboard = (query) => request({ url: '/home/dashboard', query })
export const searchAll = (query) => request({ url: '/search', query: toPageQuery(query) })
export const getFlightConditions = (query) => request({ url: '/flight/conditions', query })
export const getAirspaceNotices = (query) => request({ url: '/flight/airspace-notices', query: toPageQuery(query) })

export function loadHomeModule(key, query = {}) {
  return request({ url: '/home/modules/' + encodeURIComponent(key), query }).then((result) => ({
    ...result,
    items: (result.items || []).map((item) => {
      const payload = item.payload || {}
      return {
        ...item,
        ...payload,
        label: payload.label || item.title,
        value: payload.value || (key === 'summary' ? item.note : ''),
        short: payload.short || item.title.slice(0, 1),
        kicker: payload.kicker || item.category,
        action: payload.action || '查看详情',
        tag: payload.tag || item.category
      }
    })
  }))
}

export function searchGlobal(query = {}) {
  return request({ url: '/search', query: toPageQuery(query) })
}

export function loadFlightConditions(city) {
  return getFlightConditions({ city })
}

export function loadFlightFields(city) {
  return request({ url: '/flight/fields', query: { city } })
}

export function loadMaintenanceServices(city) {
  return request({ url: '/flight/maintenance-services', query: { city } })
}
