export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '--'
  return typeof value === 'number' ? '¥ ' + value.toLocaleString('zh-CN') : String(value)
}

export function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false })
}
