const environment = import.meta.env || {}

function normalizeBaseUrl(value) {
  const fallback = 'http://127.0.0.1:8000/api/v1'
  return String(value || fallback).trim().replace(/\/+$/, '')
}

function normalizeTimeout(value) {
  const timeout = Number(value)
  return Number.isFinite(timeout) && timeout >= 1000 && timeout <= 120000 ? timeout : 15000
}

export const API_BASE_URL = normalizeBaseUrl(environment.VITE_API_BASE_URL)
export const API_TIMEOUT_MS = normalizeTimeout(environment.VITE_API_TIMEOUT_MS)
export const API_LOG_LEVEL = environment.VITE_API_LOG_LEVEL || (environment.DEV ? 'error' : 'silent')

const requestedDataSource = environment.VITE_DATA_SOURCE || (environment.VITE_USE_LIVE_API === 'true' ? 'api' : 'mock')
export const DATA_SOURCE = environment.PROD ? 'api' : (requestedDataSource === 'api' ? 'api' : 'mock')

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
