import { getAuthState, hasApprovedPermission, safeInternalUrl } from './auth'

const verificationMode = { login: 'personal', caac: 'caac', enterprise: 'enterprise', institution: 'institution' }

// Domain pages use these stable keys instead of duplicating account checks.
export const OPERATION_REQUIREMENTS = Object.freeze({
  apply: 'login',
  bid: 'caac',
  publish: 'enterprise',
  purchase: 'login',
  advertising: 'enterprise',
  enterpriseConsole: 'enterprise',
  institutionConsole: 'institution'
})

export function currentReturnUrl() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current || !current.route) return '/pages/index/index'
  const options = current.options || current.$page?.options || {}
  const query = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    .join('&')
  return safeInternalUrl('/' + current.route + (query ? '?' + query : ''), '/pages/index/index')
}

export function guardedUrl(requirement, returnUrl = currentReturnUrl()) {
  const target = safeInternalUrl(returnUrl, '/pages/index/index')
  if (requirement === 'login') return '/pages/auth/index?mode=login&redirect=' + encodeURIComponent(target)
  const mode = verificationMode[requirement] || 'personal'
  return '/pages/profile/account?mode=' + mode + '&redirect=' + encodeURIComponent(target)
}

export function hasPermission(requirement, auth = getAuthState()) {
  return hasApprovedPermission(requirement, auth)
}

export function requirePermission(requirement, returnUrl) {
  if (hasPermission(requirement)) return true
  uni.navigateTo({ url: guardedUrl(requirement, returnUrl) })
  return false
}

export function requirementForOperation(operation) {
  return OPERATION_REQUIREMENTS[operation] || 'login'
}

export function requireOperation(operation, returnUrl) {
  return requirePermission(requirementForOperation(operation), returnUrl)
}
