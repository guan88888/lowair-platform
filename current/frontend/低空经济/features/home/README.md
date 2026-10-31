# Home, search and flight feature

Routes: `pages/index/index`, `pages/search/index`, `pages/flight/index`.

Runtime uses the shared API client. Mock fixtures are available only when the
development-only `VITE_DATA_SOURCE=mock` and `VITE_ALLOW_MOCK=true` flags are
both set; every fixture carries an explicit `demo` source label.

## API contract

- `GET /home/modules/{key}?city=` where `key` is `carousel`, `summary`,
  `entries`, `tasks`, `institutions`, `devices`, or `rumors`. Response:
  `{ items: [{ id, title, note, to, category, payload }], meta: { source,
  updatedAt, demo? } }`. Carousel payload may contain `image`, `kicker`, and
  `action`; summary payload may contain `key`, `label`, and `value`.
- 城市选择使用 `GET /location/cities`。服务端优先代理高德行政区搜索；未配置 Web 服务 Key 时仅返回明确标注的主要城市目录，不伪造高德结果、地址联想或实时天气。
- H5 地图优先使用高德 Web JS API：在 `.env` 配置 `VITE_AMAP_JS_API_KEY`（以及需要时的 `VITE_AMAP_SECURITY_JS_CODE`）。未配置或高德脚本不可用时，页面自动使用 Leaflet + OpenStreetMap 真实地图；生产环境可通过 `VITE_MAP_TILE_URL` 和 `VITE_MAP_ATTRIBUTION` 切换到有服务保障的瓦片供应商。Web 服务 Key 只能配置为后端 `AMAP_WEB_SERVICE_KEY`。
  聚合其公开 `city` 字段；需新增权威 `GET /locations/cities` 后再替换。
- `GET /search?keyword=&category=&page=&page_size=`. Category is one of
  `全部`, `机构`, `岗位`, `任务`, `商品`, `内容`. Response:
  `{ items: [{ id, category, title, note, source?, to }], page, page_size,
  total, has_more, meta: { source, updatedAt?, demo? } }`.
- `POST /search/ai-assist` returns `{ intent, suggestions, model, source }`.
  It may expand keywords but never creates or reorders database results.
- `GET /location/geocode?address=&city=` resolves an address through the
  server-side Gaode adapter and returns city, adcode, coordinates and source metadata.
- `GET /flight/conditions?city=`. Response contains `city`, `status`,
  `statusTone`, `weather { temperature, windSpeed, visibility, condition,
  riskCount }`, `reasons`, `risks`, `checklist`, `disclaimer`, and source
  metadata. The endpoint must never represent the status as a flight permit.
- 当前气象字段由 `GET /flight/conditions?city=&adcode=` 提供。高德 Key
  未配置时后端明确返回 `未接入实时气象`，前端不会显示为实时数据。
- `GET /flight/fields?city=` and `GET /flight/maintenance-services?city=`.
  Response: `{ items: [{ id, title, note, category|tag, to, payload? }], meta }`.
- `GET /flight/airspace-notices?city=&page=&page_size=` is the current分页
  空域通告接口。
- 禁飞区与临时管制接口当前未接入，前端不会请求不存在的路径。需新增
  `GET /flight/no-fly-zones?city=&latitude=&longitude=&page=&page_size=` 和
  `GET /flight/temporary-restrictions?city=&latitude=&longitude=&page=&page_size=`；
  各项应包含稳定 id、title、level、source/provider、更新时间和生效窗口。

The backend still needs to provide authoritative weather/airspace provider
names and observation timestamps, per-risk update timestamps, stable detail
IDs/routes, and verification/opening status for fields and maintenance
providers. Missing timestamps are rendered as `后端未提供`; they are never
invented by the frontend.
