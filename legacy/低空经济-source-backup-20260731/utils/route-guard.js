import { getAuthState } from './auth'

const verificationMode = { login: 'personal', caac: 'caac', enterprise: 'enterprise', institution: 'institution' }

export function currentReturnUrl() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current || !current.route) return '/pages/index/index'
  const options = current.options || current.$page?.options || {}
  const query = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    .join('&')
  return '/' + current.route + (query ? '?' + query : '')
}

export function guardedUrl(requirement, returnUrl = currentReturnUrl()) {
  if (requirement === 'login') return '/pages/auth/index?mode=login&redirect=' + encodeURIComponent(returnUrl)
  const mode = verificationMode[requirement] || 'personal'
  return '/pages/profile/account?mode=' + mode + '&redirect=' + encodeURIComponent(returnUrl)
}

export function hasPermission(requirement, auth = getAuthState()) {
  if (requirement === 'login') return Boolean(auth.loggedIn)
  return Boolean(auth[requirement])
}

export function requirePermission(requirement, returnUrl) {
  if (hasPermission(requirement)) return true
  uni.navigateTo({ url: guardedUrl(requirement, returnUrl) })
  return false
}
