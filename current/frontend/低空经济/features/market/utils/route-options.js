import { getRouteOptions } from '../../shared/utils/route-options'

// Market routes accept server-defined values that may be introduced before the
// shared route schema is updated. Read raw values here while keeping all data
// requests scoped to the market feature.
export function getMarketRouteOptions() {
  return getRouteOptions({ validate: false })
}
