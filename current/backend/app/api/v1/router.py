from fastapi import APIRouter

from app.api.v1.endpoints import academy, assistant, auth, community, home, market, messages, operations, pages, profile, uploads, work

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(profile.router, prefix="/profile", tags=["个人资料"])
api_router.include_router(profile.admin_router, prefix="/admin", tags=["管理"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["上传"])
api_router.include_router(home.router, tags=["首页与飞行服务"])
api_router.include_router(academy.router, prefix="/academy", tags=["培训与学考"])
api_router.include_router(work.router, prefix="/work", tags=["就业与任务"])
api_router.include_router(market.router, prefix="/market", tags=["设备市场"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["AI 助手"])
api_router.include_router(pages.router, tags=["页面数据"])
api_router.include_router(community.router, prefix="/community", tags=["社区"])
api_router.include_router(messages.router, prefix="/messages", tags=["消息中心"])
api_router.include_router(operations.router, prefix="/operations", tags=["广告运营"])
