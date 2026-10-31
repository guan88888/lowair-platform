const environment = import.meta.env || {}

function normalizeBaseUrl(value) {
  const fallback = 'http://127.0.0.1:8000/api/v1'
  const configured = String(value || fallback).trim().replace(/\/+$/, '')
  // H5 may be left running in HBuilder after `.env` changes. When the page is
  // opened on this same computer, never keep calling a stale LAN address;
  // route it to the local FastAPI instance instead. On a phone/device the
  // configured LAN address is preserved for cross-device debugging.
  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try {
      const target = new URL(configured)
      if (target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') return fallback
    } catch (_) {
      return fallback
    }
  }
  return configured
}

function normalizeTimeout(value) {
  const timeout = Number(value)
  return Number.isFinite(timeout) && timeout >= 1000 && timeout <= 120000 ? timeout : 15000
}

export const API_BASE_URL = normalizeBaseUrl(environment.VITE_API_BASE_URL)
export const API_TIMEOUT_MS = normalizeTimeout(environment.VITE_API_TIMEOUT_MS)
export const API_LOG_LEVEL = environment.VITE_API_LOG_LEVEL || (environment.DEV ? 'error' : 'silent')

// API is the only runtime source.  Mock fixtures remain available to unit
// tests, but are never silently used when the backend is unavailable.
const requestedDataSource = environment.VITE_DATA_SOURCE || 'api'
export const DATA_SOURCE = requestedDataSource === 'mock' && environment.VITE_ALLOW_MOCK === 'true' ? 'mock' : 'api'

export function isMockDataEnabled() {
  return !environment.PROD && DATA_SOURCE === 'mock'
}

export function isLiveApiEnabled() {
  return DATA_SOURCE === 'api'
}

// The AI assistant can opt into the protected backend proxy during local UI
// work without turning every business page from mock data to API data.
export function isLiveAssistantEnabled() {
  return isLiveApiEnabled() || environment.VITE_ASSISTANT_LIVE === 'true'
}

export const HIGH_RISK_CAPABILITIES = Object.freeze({
  authentication: 'server',
  funds: 'server',
  signature: 'server',
  inspection: 'server',
  blockchain: 'server'
})
