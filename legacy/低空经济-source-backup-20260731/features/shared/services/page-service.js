import { ApiError, request } from '../../../utils/request'

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
    return mapPageDtoToUi({ key: pageKey }, pageMeta[pageKey], 'api')
  }

  const load = async (pageKey, options = {}) => {
    // Page read models only describe the screen and its public status labels.
    // Authentication is enforced by each protected action endpoint and the
    // route guard, so guests can still see login/verification entry buttons.
    const payload = await request({ url: '/' + domain + '/pages/' + pageKey, query: options })
    const dto = toDto(payload, pageKey)
    // The API owns live records, while the domain template owns structural
    // controls that older page endpoints may not include yet. Only fill
    // missing fields so API-provided content always wins.
    const template = typeof demoGetter === 'function' ? demoGetter(pageKey, options) : null
    const merged = template && typeof template === 'object' ? { ...template, ...dto } : dto
    for (const field of PAGE_ARRAY_FIELDS) {
      if ((merged[field] === undefined || merged[field] === null || (Array.isArray(merged[field]) && !merged[field].length)) && Array.isArray(template?.[field])) merged[field] = template[field]
    }
    return toUi(merged, 'api')
  }

  return { initial, load }
}
