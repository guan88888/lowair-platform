const HOME_MODULE_KEYS = new Set(['carousel', 'summary', 'entries', 'tasks', 'institutions', 'devices', 'rumors'])
const SEARCH_CATEGORIES = new Set(['全部', '机构', '岗位', '任务', '商品', '内容'])
const SEARCH_SCOPES = new Set(['home', 'academy', 'work', 'market', 'community'])

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function stringValue(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value)
}

function normalizeRoute(value) {
  const route = stringValue(value).trim()
  return /^\/pages\/[A-Za-z0-9/_-]+(?:\?[^#]*)?$/.test(route) ? route : ''
}

export function normalizeSourceMeta(meta, fallbackSource = '平台业务服务') {
  const source = asObject(meta)
  const sourceName = stringValue(source.source || source.sourceName, fallbackSource).trim() || fallbackSource
  const updatedAt = stringValue(source.updatedAt || source.updated_at, '后端未提供').trim() || '后端未提供'
  return {
    source: sourceName,
    updatedAt,
    demo: Boolean(source.demo || /演示|demo|mock/i.test(sourceName))
  }
}

export function mapCityDirectoryResponse(payload, fallbackSource = '城市目录服务') {
  const source = asObject(payload)
  const meta = normalizeSourceMeta(source.meta, fallbackSource)
  const rawItems = Array.isArray(source.items) ? source.items : (Array.isArray(source.cities) ? source.cities : [])
  const items = rawItems.map((item) => {
    if (typeof item === 'string') return { id: item, name: item, label: item }
    const record = asObject(item)
    const name = stringValue(record.city || record.name || record.label || record.title).trim()
    return { ...record, id: stringValue(record.id || record.code || name), name, label: stringValue(record.label || name) }
  }).filter((item) => item.name)
  return { items, meta }
}

function mapHomeItem(item, key) {
  const source = asObject(item)
  const payload = asObject(source.payload)
  const title = stringValue(payload.title || source.title, '未命名内容')
  const category = stringValue(payload.category || source.category)
  const base = {
    ...source,
    ...payload,
    id: stringValue(source.id || payload.id || title),
    title,
    note: stringValue(payload.note ?? source.note),
    category,
    to: normalizeRoute(payload.to || source.to)
  }

  if (key === 'carousel') {
    return {
      ...base,
      kicker: stringValue(payload.kicker || category, '平台推荐'),
      action: stringValue(payload.action, '查看详情'),
      image: stringValue(payload.image || source.image)
    }
  }
  if (key === 'summary') {
    return {
      ...base,
      key: stringValue(payload.key || source.key || source.id || title),
      label: stringValue(payload.label || title),
      value: stringValue(payload.value ?? source.value ?? source.note, '-'),
      note: stringValue(payload.sourceNote || category, '平台聚合数据')
    }
  }
  if (key === 'entries') {
    return {
      ...base,
      label: stringValue(payload.label || title),
      short: stringValue(payload.short || title.slice(0, 1), '•'),
      note: stringValue(payload.note ?? source.note)
    }
  }
  return {
    ...base,
    tag: stringValue(payload.tag || category),
    action: stringValue(payload.action),
    label: stringValue(payload.label || title)
  }
}

export function mapHomeModuleResponse(payload, key) {
  if (!HOME_MODULE_KEYS.has(key)) throw new TypeError('Unsupported home module: ' + key)
  const source = asObject(payload)
  return {
    title: stringValue(source.title),
    action: stringValue(source.action),
    to: normalizeRoute(source.to),
    items: Array.isArray(source.items) ? source.items.map((item) => mapHomeItem(item, key)) : [],
    meta: normalizeSourceMeta(source.meta, '首页聚合服务')
  }
}

export function normalizeSearchQuery(query = {}) {
  const keyword = stringValue(query.keyword || query.q).trim().slice(0, 100)
  const category = SEARCH_CATEGORIES.has(query.category) ? query.category : '全部'
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || query.page_size) || 20))
  const scope = SEARCH_SCOPES.has(query.scope) ? query.scope : ''
  return { keyword, category, page, page_size: pageSize, ...(scope ? { scope } : {}) }
}

function categoryFromRoute(route) {
  if (route.includes('/academy/')) return '机构'
  if (route.includes('/work/job-')) return '岗位'
  if (route.includes('/work/task-')) return '任务'
  if (route.includes('/market/')) return '商品'
  return '内容'
}

export function mapSearchResponse(payload, query = {}) {
  const source = asObject(payload)
  const normalizedQuery = normalizeSearchQuery(query)
  const meta = normalizeSourceMeta(source.meta, '跨业务搜索服务')
  const items = (Array.isArray(source.items) ? source.items : []).map((item) => {
    const record = asObject(item)
    const payloadFields = asObject(record.payload)
    const to = normalizeRoute(payloadFields.to || record.to)
    const rawCategory = stringValue(payloadFields.category || record.category)
    return {
      ...record,
      ...payloadFields,
      id: stringValue(record.id || payloadFields.id),
      category: SEARCH_CATEGORIES.has(rawCategory) && rawCategory !== '全部' ? rawCategory : categoryFromRoute(to),
      title: stringValue(payloadFields.title || record.title, '未命名结果'),
      note: stringValue(payloadFields.note ?? record.note),
      source: stringValue(payloadFields.source || record.source || meta.source),
      to
    }
  })
  const page = Math.max(1, Number(source.page) || normalizedQuery.page)
  const pageSize = Math.max(1, Number(source.page_size || source.pageSize) || normalizedQuery.page_size)
  const total = Math.max(0, Number(source.total ?? source.count) || 0)
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: Boolean(source.has_more ?? source.hasMore ?? page * pageSize < total),
    meta
  }
}

export function filterDemoSearch(items, query = {}) {
  const normalized = normalizeSearchQuery(query)
  const needle = normalized.keyword.toLocaleLowerCase()
  const matches = items.filter((item) => {
    const sameCategory = normalized.category === '全部' || item.category === normalized.category
    const haystack = [item.title, item.note, item.category].join(' ').toLocaleLowerCase()
    return sameCategory && (!needle || haystack.includes(needle))
  })
  const offset = (normalized.page - 1) * normalized.page_size
  return mapSearchResponse({
    items: matches.slice(offset, offset + normalized.page_size),
    page: normalized.page,
    page_size: normalized.page_size,
    total: matches.length,
    has_more: offset + normalized.page_size < matches.length,
    meta: { demo: true, source: '平台演示搜索目录', updatedAt: '2026-07-30 18:00' }
  }, normalized)
}

export function buildSearchRoute(query = {}) {
  const normalized = normalizeSearchQuery(query)
  const params = []
  if (normalized.keyword) params.push('q=' + encodeURIComponent(normalized.keyword))
  if (normalized.category !== '全部') params.push('category=' + encodeURIComponent(normalized.category))
  if (normalized.scope) params.push('scope=' + encodeURIComponent(normalized.scope))
  return '/pages/search/index' + (params.length ? '?' + params.join('&') : '')
}

export function mapFlightConditionsResponse(payload, requestedCity = '') {
  const source = asObject(payload)
  const weather = asObject(source.weather)
  const meta = normalizeSourceMeta(source.meta, '飞行条件服务')
  return {
    available: Boolean(source.city || source.status || Object.keys(weather).length || (Array.isArray(source.reasons) && source.reasons.length)),
    city: stringValue(source.city || requestedCity, '未选择城市'),
    status: stringValue(source.status, '状态待确认'),
    statusTone: stringValue(source.statusTone || source.status_tone, 'caution'),
    weather: {
      temperature: stringValue(weather.temperature, '--'),
      windSpeed: stringValue(weather.windSpeed || weather.wind_speed, '--'),
      visibility: stringValue(weather.visibility, '--'),
      condition: stringValue(weather.condition, '实时气象待接入'),
      riskCount: Number(weather.riskCount ?? weather.risk_count ?? 0)
    },
    reasons: Array.isArray(source.reasons) ? source.reasons.map((item) => stringValue(item)).filter(Boolean) : [],
    risks: (Array.isArray(source.risks) ? source.risks : []).map((item) => ({
      ...item,
      id: stringValue(item.id || item.title),
      level: stringValue(item.level, '待核对'),
      title: stringValue(item.title, '风险提示'),
      note: stringValue(item.note),
      source: stringValue(item.source, meta.source),
      updatedAt: stringValue(item.updatedAt || item.updated_at, meta.updatedAt)
    })),
    checklist: (Array.isArray(source.checklist) ? source.checklist : []).map((item) => ({
      id: stringValue(item.id || item.title),
      title: stringValue(item.title, '检查项'),
      note: stringValue(item.note)
    })),
    disclaimer: stringValue(source.disclaimer, '本页信息不构成空域许可、适航证明或现场放飞结论。'),
    meta
  }
}

function mapFlightNotice(item, meta) {
  const record = asObject(item)
  return {
    id: stringValue(record.id || record.noticeId || record.title),
    title: stringValue(record.title || record.name, '空域提示'),
    level: stringValue(record.level || record.riskLevel, '待核对'),
    note: stringValue(record.note || record.description),
    source: stringValue(record.source || record.provider, meta.source),
    updatedAt: stringValue(record.updatedAt || record.updated_at || record.observedAt || record.observed_at, meta.updatedAt),
    effectiveFrom: stringValue(record.effectiveFrom || record.effective_from),
    effectiveTo: stringValue(record.effectiveTo || record.effective_to),
    geometry: record.geometry || record.location || null
  }
}

export function mapFlightNoticeResponse(payload, fallbackSource = '空域服务') {
  const source = asObject(payload)
  const meta = normalizeSourceMeta(source.meta, fallbackSource)
  const rawItems = Array.isArray(source.items) ? source.items : (Array.isArray(source.notices) ? source.notices : (Array.isArray(source.zones) ? source.zones : []))
  return {
    items: rawItems.map((item) => mapFlightNotice(item, meta)),
    meta,
    disclaimer: stringValue(source.disclaimer, '空域提示仅作信息参考，不代表获得飞行许可或现场放飞批准。')
  }
}

export function mapServiceDirectory(payload, fallbackSource) {
  const source = asObject(payload)
  const meta = normalizeSourceMeta(source.meta, fallbackSource)
  return {
    items: (Array.isArray(source.items) ? source.items : []).map((item) => {
      const record = asObject(item)
      const payloadFields = asObject(record.payload)
      return {
        ...record,
        ...payloadFields,
        id: stringValue(record.id || payloadFields.id || record.title),
        title: stringValue(payloadFields.title || record.title, '未命名服务'),
        note: stringValue(payloadFields.note ?? record.note),
        tag: stringValue(payloadFields.tag || record.tag || record.category, '状态待核对'),
        to: normalizeRoute(payloadFields.to || record.to)
      }
    }),
    meta
  }
}
