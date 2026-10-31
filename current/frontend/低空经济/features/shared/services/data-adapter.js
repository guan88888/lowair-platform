import { ApiError } from '../../../utils/request'
import { canUseDemoCapability, isMockDataEnabled } from '../../../config/api'

export function createDataAdapter({ live, mock, capability = '' }) {
  if (typeof live !== 'function') throw new TypeError('live adapter must be a function')
  return async (...args) => {
    if (!isMockDataEnabled()) return live(...args)
    if (capability && !canUseDemoCapability(capability)) {
      throw new ApiError('该操作必须由服务端确认', { code: 'SERVER_CONFIRMATION_REQUIRED', kind: 'policy', retryable: false })
    }
    if (typeof mock !== 'function') {
      throw new ApiError('演示模式未提供此操作', { code: 'DEMO_ADAPTER_UNAVAILABLE', kind: 'policy', retryable: false })
    }
    const result = await mock(...args)
    return result && typeof result === 'object' ? { ...result, dataSource: 'mock', demo: true } : result
  }
}

export function assertResourceId(id, field = 'id') {
  const value = String(id || '').trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)) {
    throw new ApiError('缺少或无效的 ' + field, { code: 'INVALID_RESOURCE_ID', kind: 'validation', retryable: false })
  }
  return value
}
