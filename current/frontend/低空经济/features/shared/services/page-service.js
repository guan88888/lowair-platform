import { ApiError, request } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'

const PAGE_ARRAY_FIELDS = ['tabs', 'metrics', 'tools', 'products', 'suggestions', 'form', 'chips', 'carousel', 'sections', 'questions']

export function toPageDto(payload, domain, pageKey) {
  const source = payload?.page && typeof payload.page === 'object' ? payload.page : payload
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new ApiError('页面数据格式不正确', { code: 'INVALID_PAGE_DTO', kind: 'contract', retryable: false })
  }
  return { ...source, domain: source.domain || domain, key: source.key || pageKey }
}

export function mapPageDtoToUi(dto, meta = {}, dataSource = 'api') {
  const page = {
    title: String(dto.title || meta.title || '业务页面'),
    active: dto.active || meta.active || '',
    root: Boolean(dto.root ?? meta.root),
    kind: String(dto.kind || meta.kind || dto.key || 'page'),
    required: dto.required || meta.required,
    dataSource,
    updatedAt: dto.updated_at || dto.updatedAt || null
  }
  for (const field of PAGE_ARRAY_FIELDS) {
    if (Array.isArray(dto[field])) page[field] = dto[field]
  }
  for (const field of ['hero', 'video', 'flightDisclaimer', 'initialTab', 'conversationId', 'orderId', 'productId', 'searchScope', 'nearbyMode']) {
    if (dto[field] !== undefined) page[field] = dto[field]
  }
  return page
}

export function createPageService({ domain, demoGetter, toDto, toUi, pageMeta }) {
  const initial = (pageKey, options = {}) => {
    return mapPageDtoToUi({ key: pageKey }, pageMeta[pageKey], isMockDataEnabled() ? 'mock' : 'api')
  }

  const load = async (pageKey, options = {}) => {
    if (isMockDataEnabled()) {
      const demo = typeof demoGetter === 'function' ? demoGetter(pageKey, options) : null
      if (!demo) throw new ApiError('当前页面没有可用的演示数据', { code: 'DEMO_DATA_NOT_FOUND', kind: 'not_found', retryable: false })
      return toUi(toDto(demo, pageKey), 'mock')
    }
    // A live response owns every business value. Do not merge local fixtures
    // into it: that is how different detail IDs end up showing one fake record.
    const payload = await request({ url: '/' + domain + '/pages/' + pageKey, query: options })
    return toUi(toDto(payload, pageKey), 'api')
  }

  return { initial, load }
}
