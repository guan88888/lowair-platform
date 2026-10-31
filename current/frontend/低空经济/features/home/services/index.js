import { request, requestCancelable, toPageQuery } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import {
  demoFlightFields,
  demoHomeModules,
  demoMaintenance,
  demoSearchCatalog,
  getDemoFlightConditions,
  getHomePage
} from '../mock/page-data'
import {
  filterDemoSearch,
  mapCityDirectoryResponse,
  mapFlightConditionsResponse,
  mapFlightNoticeResponse,
  mapHomeModuleResponse,
  mapSearchResponse,
  mapServiceDirectory,
  normalizeSearchQuery
} from './contracts.mjs'

const PAGE_META = { home: { title: '低空经济', active: 'home', root: true, kind: 'home' }, search: { title: '全局搜索', kind: 'search' }, flight: { title: '本地飞行服务', kind: 'flight' } }
export const toHomePageDto = (payload, pageKey) => toPageDto(payload, 'home', pageKey)
export const mapHomePageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'home', demoGetter: getHomePage, toDto: toHomePageDto, toUi: mapHomePageDto, pageMeta: PAGE_META })
export const getHomePageModel = pages.initial
export const loadHomePage = pages.load

export const getDashboard = (query) => request({ url: '/home/dashboard', query })
export const searchAll = (query) => request({ url: '/search', query: toPageQuery(query) })
export const getFlightConditions = (query) => request({ url: '/flight/conditions', query })
export const getAirspaceNotices = (query) => request({ url: '/flight/airspace-notices', query: toPageQuery(query) })
export const geocodeAddress = (query) => request({ url: '/location/geocode', query })
export const getCityDirectory = (query) => request({ url: '/location/cities', query: toPageQuery(query) })
export const getAddressTips = (query) => request({ url: '/location/address-tips', query })
export const getReverseGeocode = (query) => request({ url: '/location/regeocode', query })
export const getSearchAiAssist = (data) => request({ url: '/search/ai-assist', method: 'POST', data })

function demoTask(value) {
  let canceled = false
  const promise = Promise.resolve().then(() => {
    if (canceled) {
      const error = new Error('请求已取消')
      error.canceled = true
      throw error
    }
    return value
  })
  return { promise, cancel() { canceled = true } }
}

function withMappedPromise(task, mapper) {
  return { ...task, promise: task.promise.then(mapper) }
}

async function appendFlightSummary(module, city) {
  if (module.items.some((item) => item.key === 'flight' || /飞行|适飞/.test(item.label))) return module
  try {
    const flight = await getFlightConditions({ city })
    const mapped = mapFlightConditionsResponse(flight, city)
    return {
      ...module,
      items: [
        ...module.items.slice(0, 3),
        {
          id: 'flight', key: 'flight', label: '飞行参考', value: mapped.status,
          note: `${mapped.city} · 更新 ${mapped.meta.updatedAt}`, to: '/pages/flight/index'
        }
      ]
    }
  } catch (error) {
    if (error.canceled) throw error
    return {
      ...module,
      items: [
        ...module.items.slice(0, 3),
        { id: 'flight', key: 'flight', label: '飞行参考', value: '待接入', note: '进入详情重新加载', to: '/pages/flight/index' }
      ]
    }
  }
}

export async function loadHomeModule(key, query = {}) {
  const payload = isMockDataEnabled()
    ? demoHomeModules[key]
    : await request({ url: '/home/modules/' + encodeURIComponent(key), query })
  const mapped = mapHomeModuleResponse(payload, key)
  return key === 'summary' && !isMockDataEnabled() ? appendFlightSummary(mapped, query.city) : mapped
}

export async function loadCityDirectory(query = {}) {
  if (isMockDataEnabled()) {
    return mapCityDirectoryResponse({
      cities: ['北京', '天津', '石家庄', '成都'],
      meta: { demo: true, source: '平台演示城市目录', updatedAt: '2026-07-30 18:00' }
    })
  }
  const payload = await getCityDirectory(query)
  const mapped = mapCityDirectoryResponse(payload, '城市行政区服务')
  return { ...mapped, page: Number(payload.page || query.page || 1), pageSize: Number(payload.page_size || query.pageSize || 20), total: Number(payload.total || mapped.items.length), hasMore: Boolean(payload.has_more) }
}

export function searchGlobal(query = {}) {
  const normalized = normalizeSearchQuery(query)
  if (isMockDataEnabled()) return demoTask(filterDemoSearch(demoSearchCatalog, normalized))
  // `scope` is a client navigation context. The current backend contract
  // exposes category filtering only, so do not send an unsupported filter.
  const requestQuery = { ...normalized }
  delete requestQuery.scope
  const task = requestCancelable({ url: '/search', query: requestQuery })
  return withMappedPromise(task, (payload) => mapSearchResponse(payload, normalized))
}

export async function assistSearch(query = {}) {
  const keyword = String(query.keyword || '').trim()
  if (!keyword) return null
  return getSearchAiAssist({ keyword, category: query.category || '全部' })
}

export async function resolveAddress(address, city = '') {
  return geocodeAddress({ address: String(address || '').trim(), city })
}

export async function searchAddressTips(query = {}) {
  const keyword = String(query.keyword || '').trim()
  if (!keyword) return { items: [], meta: {} }
  return getAddressTips({ ...query, keyword })
}

export const reverseGeocode = (query) => getReverseGeocode(query)

export async function loadFlightConditions(cityOrQuery) {
  const query = typeof cityOrQuery === 'string' ? { city: cityOrQuery } : { ...(cityOrQuery || {}) }
  const payload = isMockDataEnabled()
    ? getDemoFlightConditions(query.city)
    : await getFlightConditions(query)
  return mapFlightConditionsResponse(payload, query.city)
}

async function loadFlightNoticeEndpoint(loader, query, fallbackSource) {
  const payload = isMockDataEnabled()
    ? { items: [], meta: { demo: true, source: fallbackSource + '演示数据', updatedAt: '2026-07-30 18:00' } }
    : await loader(query)
  return mapFlightNoticeResponse(payload, fallbackSource)
}

export function loadFlightAirspace(query) {
  return loadFlightNoticeEndpoint(getAirspaceNotices, query, '空域与管制服务')
}

export function loadFlightWeather(query) {
  return loadFlightConditions(query)
}

export function loadNoFlyZones(query) {
  return Promise.resolve(mapFlightNoticeResponse({
    items: [], meta: { source: '后端未接入禁飞区服务', updatedAt: '后端未提供' },
    disclaimer: '禁飞区数据接口尚未接入。请通过主管部门渠道核验禁飞范围。'
  }, '禁飞区服务'))
}

export function loadTemporaryRestrictions(query) {
  return Promise.resolve(mapFlightNoticeResponse({
    items: [], meta: { source: '后端未接入临时管制服务', updatedAt: '后端未提供' },
    disclaimer: '临时管制数据接口尚未接入。请通过主管部门渠道核验实时通告。'
  }, '临时管制服务'))
}

export async function loadFlightFields(city) {
  const query = typeof city === 'string' ? { city } : { ...(city || {}) }
  const payload = isMockDataEnabled()
    ? demoFlightFields
    : await request({ url: '/flight/fields', query })
  return mapServiceDirectory(payload, '飞场目录服务')
}

export async function loadMaintenanceServices(city) {
  const query = typeof city === 'string' ? { city } : { ...(city || {}) }
  const payload = isMockDataEnabled()
    ? demoMaintenance
    : await request({ url: '/flight/maintenance-services', query })
  return mapServiceDirectory(payload, '维修服务目录')
}
