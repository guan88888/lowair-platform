# 低空经济 API 清单

前端统一使用 `VITE_API_BASE_URL`（默认 `http://127.0.0.1:8000/api/v1`）。除标注“游客”外均要求 Bearer access token；所有写操作由服务端状态机和资源归属校验决定，前端不得本地改写成功状态。

## 认证与权限

- `POST /auth/register`：手机号、昵称、密码注册；返回 access/refresh token 与用户角色。
- `POST /auth/login`：登录并创建服务端会话。
- `POST /auth/refresh`、`POST /auth/logout`：轮换刷新令牌、撤销当前会话。
- `GET /auth/me`：恢复当前会话及游客/飞手/企业/机构角色与认证状态。
- `POST /auth/forgot-password/request`、`POST /auth/forgot-password/reset`：找回密码（开发环境才返回 `dev_code`）。
- `GET /profile/verifications`、`POST /profile/verifications/{personal|caac|enterprise|institution}`：提交/查询认证材料；审核只能由管理员执行。

## 首页、搜索与飞行

- `GET /home/dashboard`、`GET /home/modules/{carousel|summary|entries|tasks|institutions|devices|rumors}`：首页轮播、指标、入口、任务、机构、设备和辟谣内容。
- `GET /search?keyword=&category=&page=&page_size=`：跨机构、岗位、任务、商品、社区内容搜索。
- `GET /flight/conditions?city=`：气象/风险整理，返回来源、更新时间、免责声明，不是放飞许可。
- `GET /flight/airspace-notices`、`GET /flight/fields`、`GET /flight/maintenance-services`：空域通告、飞场和维修入口。

## 学考与机构

机构、课程、试听预约、学习进度、学习计划、题库目录、考试会话/草稿/答题/交卷、学习档案和补贴分别由 `/academy/institutions`、`/academy/courses`、`/academy/visits`、`/academy/learning/*`、`/academy/question-bank/catalog`、`/academy/exams/*`、`/academy/records/me`、`/academy/policies/subsidies` 提供。机构工作台为 `/academy/org/console` 与 `/academy/org/actions`，仅机构认证成员可写。

## 招聘、任务与履约

`GET /work/jobs`、`GET /work/tasks` 及其 `/{id}` 详情支持筛选分页；`/work/resume`、`/work/jobs/{id}/applications`、`/work/tasks/{id}/bids`、`/work/interviews` 提供求职闭环；企业中心使用 `/work/company/*`；任务履约使用 `/work/fulfillments/{id}` 及 milestones、deliveries、acceptance、disputes、pause、sos 子路径。投递要求登录，抢单要求 CAAC，企业写操作要求企业认证。

## 设备交易

`GET /market/products`、`GET /market/products/{id}`、`GET /market/products/{id}/rental-plans`：二手无人机、配件、租赁商品及不同详情；`/market/devices/{sn}/history`、`/market/inspection-reports/{id}`：脱敏 SN、履历和质检来源；`POST /market/listings`：认证卖家挂牌；`POST /market/orders/quote`、`POST /market/orders`、`GET /market/orders`、`GET /market/orders/{id}`、`POST /market/orders/{id}/actions`：报价、下单、订单状态机和售后。支付、押金、质检、链上状态均以服务端返回为准。

## 社区、知识库与位置

`GET/POST/DELETE /community/posts`、`PUT /community/posts/{id}/reactions`、`POST /community/posts/{id}/comments`、`POST /community/reports`：帖子、互动、评论、举报；`/community/knowledge`：官方/法规/用户知识；`/community/live-rooms` 与评论接口：直播预告、回放和互动；`GET /community/nearby-places`、`GET /community/nearby`：仅在授权后使用城市或粗粒度定位；媒体通过 `/uploads` 和 `/community/media` 受保护访问。

## AI、消息、钱包与运营

- AI：`POST/GET /assistant/conversations`、`POST /assistant/conversations/{id}/messages`，密钥仅后端持有；未配置模型返回明确 503。
- 消息：`GET /messages`、会话创建/详情/发消息、通知已读、`/messages/unread-count`；电话号码等敏感信息由服务端脱敏。
- 钱包：`GET /profile/wallet`、`/profile/wallet/transactions`、`/profile/wallet/actions`；资金只读或受理，未接入支付时为 pending/sandbox。
- 广告：`/operations/ad-placements`、`/operations/creatives`、`/operations/campaigns` 及 analytics/billing/actions；企业或机构认证后可管理，审核状态不能由前端伪造。

## 统一响应约定

分页字段为 `items/page/page_size/total/has_more`；错误为 `{error:{code,message,request_id}}`。详情必须校验 URL `id`/`sn`/`orderId`/`conversationId`，缺失或不存在返回 4xx，不得默默返回同一条演示记录。
