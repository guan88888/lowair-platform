import { isMockDataEnabled } from '../../../config/api'
import { ApiError, request } from '../../../utils/request'

const PAGE_ARRAY_FIELDS = ['tabs', 'metrics', 'tools', 'products', 'suggestions', 'form', 'chips', 'carousel', 'sections']

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
    if (isMockDataEnabled()) return toUi(toDto(demoGetter(pageKey, options), pageKey), 'mock')
    return mapPageDtoToUi({ key: pageKey }, pageMeta[pageKey], 'api')
  }

  const load = async (pageKey, options = {}) => {
    if (isMockDataEnabled()) return initial(pageKey, options)
    const payload = await request({ url: '/' + domain + '/pages/' + pageKey, query: options, auth: Boolean(pageMeta[pageKey]?.auth) })
    return toUi(toDto(payload, pageKey), 'api')
  }

  return { initial, load }
}
