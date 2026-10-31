# 天穹智航后端

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

应用启动时会自动创建 `my_app_dkjj` 数据库及 `users` 表。接口文档地址：
`http://127.0.0.1:8000/docs`。

完整 OpenAPI JSON 位于 `http://127.0.0.1:8000/openapi.json`。首次部署旧数据库时，按
[`migrations/README.md`](migrations/README.md) 应用迁移；本地演示数据可用
`python scripts/seed.py` 生成。容器启动：`docker compose up --build`。

前端 H5 在同一台电脑调试时可以直接访问 `127.0.0.1`。使用 HBuilder 真机调试时，
请在前端项目创建 `.env`，参考 `.env.example` 把接口地址改为这台电脑的局域网 IP。

开发模式下，忘记密码接口会在响应的 `dev_code` 字段返回验证码。上线前请配置短信服务，关闭 `DEBUG` 并修改 `SECRET_KEY`。

## Security and integration contract

认证接口提供短期访问令牌与轮换刷新令牌：`/auth/register`、`/auth/login`、
`/auth/refresh`、`/auth/logout`、`/auth/me` 和找回密码接口。刷新令牌只以哈希形式保存在
服务端；登出、密码重置和账号停用会使会话失效。登录、注册和重置受进程内限流保护，生产
环境还应在 API 网关配置按 IP/手机号的持久化限流。

上传为私有安全代理：服务端检查 MIME 魔数、大小、基础恶意样本和归属。生产部署必须在该
代理前后接入网关/反病毒扫描，并将未通过扫描的媒体保持为非 `available`。对象存储签名
尚未配置时不会下发伪造 URL。电话、精确位置、证件材料、SN 和
审计记录仅向资源所有者或显式授权的管理员暴露，公开资料不会包含电话。

钱包、托管、CA、质检、链上存证和支付回调均以 `pending` / `unconfigured` / `sandbox`
状态表示，未接入供应商前不会改变余额或伪造完成。AI 文字会话只经 `/assistant` 后端代理
并持久化；未配置文字模型返回 `503`，图像生成不得作为文字会话模型。

### 配置低空 AI 文本模型

后端支持 OpenAI 兼容的聊天接口。将服务根地址或完整的聊天接口地址放入服务器本地
环境变量 `MODEL_PROVIDER_URL`，并将模型名设置为 `deepseek-v4-flash`。模型凭证仅保留在
部署环境中，不能写进前端 `.env`、源码或提交记录。前端仅需设置
`VITE_ASSISTANT_LIVE=true`，它始终通过本应用的 `/api/v1/assistant` 会话接口访问模型。

首页地址和城市天气通过服务器端高德 Web 服务适配器访问。仅在后端本地环境设置
`AMAP_WEB_SERVICE_KEY`；未配置或供应商失败时，接口保留平台空域提示并明确返回非实时状态。
`POST /search/ai-assist` 只生成检索意图和相关词，实际搜索结果仍来自数据库。

## 前端 API 对照

前端请求前缀为 `/api/v1`。各页面服务对应的后端域如下：

| 前端服务 | 后端前缀 | 主要能力 |
| --- | --- | --- |
| 登录注册 | `/auth` | 注册、登录、刷新令牌、会话注销、当前用户、找回与重置密码 |
| 首页、搜索、飞行服务 | `/home`、`/search`、`/flight` | 首页内容、跨域检索、风险提示与空域通告 |
| 培训学考 | `/academy` | 机构、预约、学习、考试、机构工作台 |
| 就业任务 | `/work` | 职位、任务、投递、面试、履约 |
| 设备市场 | `/market` | 商品、购物车、履历、质检、租赁、维修预约、订单状态机 |
| 社区 | `/community` | 内容审核、媒体、知识库、直播、同城查询 |
| AI 助手 | `/assistant` | 用户隔离的会话；未配置模型时返回明确 `503` |
| 个人中心、钱包 | `/profile` | 认证、公开资料、收藏、资金受理与账本查询 |
| 消息中心 | `/messages` | 业务会话、通知、未读和受权媒体 |
| 广告运营 | `/operations` | 素材、计划、审核状态、分析与账单读模型 |

页面服务还可调用 `GET /{domain}/pages/{pageKey}` 获取各页面的服务端元数据。真实支付、模型、气象/空域和广告投放供应商未配置时，接口会返回 `pending` 或 `unavailable`，不会伪造成功结果。
