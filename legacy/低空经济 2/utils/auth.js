const AUTH_STATE_KEY = 'lowair-auth-state'
const LEGACY_AUTH_STATE_KEY = 'lowair-demo-auth'
const ACCESS_TOKEN_KEY = 'lowair-access-token'
const REFRESH_TOKEN_KEY = 'lowair-refresh-token'

export const VERIFICATION_TYPES = ['personal', 'caac', 'enterprise', 'institution']
export const VERIFICATION_STATUSES = ['not_submitted', 'pending', 'approved', 'rejected', 'expired']

const EMPTY_VERIFICATION = Object.freeze({
  personal: 'not_submitted',
  caac: 'not_submitted',
  enterprise: 'not_submitted',
  institution: 'not_submitted'
})

const DEFAULT_AUTH = Object.freeze({
  loggedIn: false,
  guest: false,
  role: 'guest',
  roles: [],
  verified: false,
  caac: false,
  enterprise: false,
  institution: false,
  identity: 'guest',
  verification: EMPTY_VERIFICATION,
  verificationDetails: {}
})

const ROLE_ALIASES = {
  personal: 'pilot',
  individual: 'pilot',
  user: 'pilot',
  pilot: 'pilot',
  flyer: 'pilot',
  enterprise: 'enterprise',
  company: 'enterprise',
  employer: 'enterprise',
  institution: 'institution',
  training_institution: 'institution',
  training_organization: 'institution',
  school: 'institution',
  guest: 'guest'
}

function emptyAuth() {
  return { ...DEFAULT_AUTH, roles: [], verification: { ...EMPTY_VERIFICATION }, verificationDetails: {} }
}

function canonicalRole(value) {
  const source = typeof value === 'object' && value ? (value.code || value.name || value.slug) : value
  const key = String(source || '').trim().toLowerCase()
  return ROLE_ALIASES[key] || ''
}

function normalizeRoles(user = {}) {
  const source = user.roles || user.rbac?.roles || user.account_roles || user.role || user.account_type
  const list = Array.isArray(source) ? source : (source ? [source] : [])
  return [...new Set(list.map(canonicalRole).filter((role) => role && role !== 'guest'))]
}

export function normalizeVerificationStatus(value) {
  const source = typeof value === 'object' && value
    ? (value.status || value.review_status || value.verification_status || value.state)
    : value
  const key = String(source ?? '').trim().toLowerCase()
  if (value === true || ['approved', 'verified', 'passed', 'active'].includes(key)) return 'approved'
  if (['pending', 'reviewing', 'under_review', 'submitted', 'processing'].includes(key)) return 'pending'
  if (['rejected', 'declined', 'failed'].includes(key)) return 'rejected'
  if (['expired', 'invalid'].includes(key)) return 'expired'
  return 'not_submitted'
}

function verificationRecord(value, type) {
  const record = typeof value === 'object' && value ? value : {}
  return {
    type,
    status: normalizeVerificationStatus(value),
    rejectionReason: record.rejection_reason || record.reject_reason || record.review_comment || record.reason || '',
    submittedAt: record.submitted_at || record.created_at || '',
    reviewedAt: record.reviewed_at || record.updated_at || '',
    expiresAt: record.expires_at || record.valid_until || '',
    applicationId: record.application_id || record.id || ''
  }
}

function verificationSource(user = {}, records) {
  const source = user.verification || user.verifications || user.verification_statuses || {}
  const result = { ...source }
  if (Array.isArray(records)) {
    records.forEach((record) => {
      const type = record?.type || record?.verification_type || record?.subject_type
      if (VERIFICATION_TYPES.includes(type)) result[type] = record
    })
  } else if (records && typeof records === 'object') {
    Object.assign(result, records)
  }
  return result
}

function normalizeVerification(user = {}, records) {
  const source = verificationSource(user, records)
  const values = {
    personal: source.personal ?? user.personal_verification ?? user.personal_verification_status ?? user.verified,
    caac: source.caac ?? user.caac_verification ?? user.caac_verification_status ?? user.caac,
    enterprise: source.enterprise ?? user.enterprise_verification ?? user.enterprise_verification_status ?? user.enterprise,
    institution: source.institution ?? user.institution_verification ?? user.institution_verification_status ?? user.institution
  }
  const details = Object.fromEntries(VERIFICATION_TYPES.map((type) => [type, verificationRecord(values[type], type)]))
  return {
    statuses: Object.fromEntries(VERIFICATION_TYPES.map((type) => [type, details[type].status])),
    details
  }
}

export function normalizeAuthState(user = {}, options = {}) {
  if (options.guest) return { ...emptyAuth(), guest: true }
  const loggedIn = options.loggedIn !== false
  if (!loggedIn) return emptyAuth()

  const roles = normalizeRoles(user)
  const { statuses: verification, details: verificationDetails } = normalizeVerification(user, options.verifications)
  const activeRole = canonicalRole(user.active_role || user.identity || user.current_role)
  const role = activeRole || roles[0] || 'pilot'
  return {
    ...emptyAuth(),
    loggedIn: true,
    userId: user.id || user.user_id || user.uuid,
    phone: user.phone || user.mobile,
    nickname: user.nickname || user.display_name || user.name,
    role,
    roles,
    identity: role,
    verification,
    verificationDetails,
    verified: verification.personal === 'approved',
    caac: verification.caac === 'approved',
    enterprise: roles.includes('enterprise') && verification.enterprise === 'approved',
    institution: roles.includes('institution') && verification.institution === 'approved'
  }
}

function persistAuth(auth) {
  uni.setStorageSync(AUTH_STATE_KEY, auth)
  // Other feature windows still read this compatibility key while their migrations are in progress.
  uni.setStorageSync(LEGACY_AUTH_STATE_KEY, auth)
  uni.setStorageSync('lowair-entry-complete', true)
  if (typeof uni.$emit === 'function') uni.$emit('lowair-auth-changed', auth)
  return auth
}

function sessionTokens(session = {}) {
  return {
    accessToken: session.access_token || session.accessToken || session.token,
    refreshToken: session.refresh_token || session.refreshToken,
    expiresAt: session.expires_at || session.expiresAt || ''
  }
}

export function saveSessionTokens(session, options = {}) {
  const tokens = sessionTokens(session)
  if (!tokens.accessToken) throw new Error('登录响应缺少访问令牌')
  uni.setStorageSync(ACCESS_TOKEN_KEY, tokens.accessToken)
  if (tokens.refreshToken) uni.setStorageSync(REFRESH_TOKEN_KEY, tokens.refreshToken)
  else if (!options.preserveRefreshToken) uni.removeStorageSync(REFRESH_TOKEN_KEY)
  if (tokens.expiresAt) uni.setStorageSync('lowair-token-expires-at', tokens.expiresAt)
  return tokens
}

export function saveSession(session) {
  saveSessionTokens(session)
  const user = session.user || session.profile || session.account || {}
  return persistAuth(normalizeAuthState(user, { verifications: session.verifications }))
}

export function getAccessToken() {
  return uni.getStorageSync(ACCESS_TOKEN_KEY) || ''
}

export function getRefreshToken() {
  return uni.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

export function getAuthState() {
  const saved = uni.getStorageSync(AUTH_STATE_KEY) || uni.getStorageSync(LEGACY_AUTH_STATE_KEY)
  if (saved?.guest) return { ...emptyAuth(), ...saved, roles: [], verification: { ...EMPTY_VERIFICATION }, verificationDetails: {} }
  if (!saved || !getAccessToken()) return emptyAuth()
  return {
    ...emptyAuth(),
    ...saved,
    loggedIn: true,
    guest: false,
    roles: Array.isArray(saved.roles) ? saved.roles : [],
    verification: { ...EMPTY_VERIFICATION, ...(saved.verification || {}) },
    verificationDetails: { ...(saved.verificationDetails || {}) }
  }
}

export function setGuestSession() {
  clearTokenStorage()
  return persistAuth({ ...emptyAuth(), guest: true })
}

export function applyCurrentUser(user, verifications) {
  const auth = normalizeAuthState(user, { verifications })
  uni.setStorageSync('lowair-user', user)
  return persistAuth(auth)
}

function clearTokenStorage() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  uni.removeStorageSync('lowair-token-expires-at')
  uni.removeStorageSync('lowair-user')
}

export function clearSession() {
  clearTokenStorage()
  uni.removeStorageSync(AUTH_STATE_KEY)
  uni.removeStorageSync(LEGACY_AUTH_STATE_KEY)
  uni.removeStorageSync('lowair-entry-complete')
  const auth = emptyAuth()
  if (typeof uni.$emit === 'function') uni.$emit('lowair-auth-changed', auth)
  return auth
}

export function hasApprovedPermission(requirement, auth = getAuthState()) {
  if (requirement === 'login') return Boolean(auth.loggedIn)
  if (requirement === 'personal') return auth.verification.personal === 'approved'
  return Boolean(auth[requirement])
}

export function safeInternalUrl(value, fallback = '') {
  if (!value || typeof value !== 'string' || value.length > 1600) return fallback
  let decoded = value
  try { decoded = decodeURIComponent(value) } catch (error) { decoded = value }
  if (!/^\/pages\/[a-z0-9-]+\/[a-z0-9-]+(?:\?[^#]*)?$/i.test(decoded)) return fallback
  return decoded
}

export function previousPageUrl(fallback = '') {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const previous = pages[pages.length - 2]
  if (!previous?.route) return fallback
  const options = previous.options || previous.$page?.options || {}
  const query = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    .join('&')
  return safeInternalUrl('/' + previous.route + (query ? '?' + query : ''), fallback)
}

export function resolveReturnUrl(options = {}, fallback = '') {
  return safeInternalUrl(options.returnUrl || options.redirect || '', previousPageUrl(fallback))
}

export async function restoreSession(fetchCurrentUser) {
  const cached = getAuthState()
  if (!getAccessToken()) return cached
  if (typeof fetchCurrentUser !== 'function') return cached
  const user = await fetchCurrentUser()
  return applyCurrentUser(user.user || user.profile || user, user.verifications)
}

export { AUTH_STATE_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY }
