export function resourceState(error, value) {
  if (error) return 'error'
  if (value === undefined || value === null || (Array.isArray(value) && !value.length)) return 'empty'
  return 'ready'
}

export function normalizePageResult(result) {
  return {
    items: Array.isArray(result?.items) ? result.items : [],
    page: Number(result?.page || 1),
    pageSize: Number(result?.page_size || result?.pageSize || 20),
    total: Number(result?.total || 0),
    hasMore: Boolean(result?.has_more ?? result?.hasMore)
  }
}
