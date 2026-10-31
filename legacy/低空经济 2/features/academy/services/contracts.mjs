export const ACTIVE_VISIT_STATUSES = ['pending', 'confirmed', 'rescheduled']

export function normalizePhone(value = '') {
  return String(value).replace(/\s+/g, '')
}

export function validateVisit(input = {}, now = new Date()) {
  const errors = {}
  const phone = normalizePhone(input.phone)
  if (!input.institutionId) errors.institutionId = '请选择培训机构'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) errors.date = '请选择有效日期'
  if (input.date) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(`${input.date}T00:00:00`)
    if (!Number.isNaN(target.getTime()) && target < today) errors.date = '预约日期不能早于今天'
  }
  if (!input.slot) errors.slot = '请选择到访时段'
  if (!String(input.name || '').trim()) errors.name = '请填写联系人姓名'
  if (!/^1\d{10}$/.test(phone)) errors.phone = '请填写 11 位中国大陆手机号'
  const partySize = Number(input.partySize)
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 6) errors.partySize = '到访人数须为 1-6 人'
  if (!input.consent) errors.consent = '请同意预约信息使用说明'
  return { valid: Object.keys(errors).length === 0, errors, value: { ...input, phone, partySize } }
}

export function isDuplicateVisit(visits = [], input = {}, ignoredId = '') {
  const phone = normalizePhone(input.phone)
  return visits.some((visit) => visit.id !== ignoredId
    && ACTIVE_VISIT_STATUSES.includes(visit.status)
    && visit.institutionId === input.institutionId
    && visit.date === input.date
    && visit.slot === input.slot
    && normalizePhone(visit.phone) === phone)
}

export function normalizeInstitutionQuery(query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(20, Math.max(1, Number(query.pageSize) || 4))
  const supportedSort = ['recommended', 'distance', 'rating', 'price']
  return {
    keyword: String(query.keyword || '').trim().toLowerCase(),
    city: String(query.city || ''),
    level: String(query.level || ''),
    schedule: String(query.schedule || ''),
    verifiedOnly: Boolean(query.verifiedOnly),
    sort: supportedSort.includes(query.sort) ? query.sort : 'recommended',
    page,
    pageSize
  }
}

export function paginate(items, page, pageSize) {
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * pageSize
  return { items: items.slice(start, start + pageSize), page: safePage, pageSize, total, pages, hasMore: safePage < pages }
}

export function canUseOrgConsole(auth = {}) {
  const roles = Array.isArray(auth.roles) ? auth.roles : []
  return Boolean(auth.loggedIn && (auth.institution || roles.some((role) => ['institution', 'institution_admin', 'institution_manager', 'instructor'].includes(role))))
}

export function canWriteOrg(auth = {}) {
  const roles = Array.isArray(auth.roles) ? auth.roles : []
  return Boolean(auth.loggedIn && auth.institution && (roles.length === 0 || roles.some((role) => ['institution', 'institution_admin', 'institution_manager'].includes(role))))
}
