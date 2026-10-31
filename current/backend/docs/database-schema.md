# 数据库结构

SQLAlchemy 模型位于 `app/models`，启动时通过 `Base.metadata.create_all` 幂等创建缺失表（不会删除或重置已有数据）。生产环境应使用 Alembic 管理字段迁移；`create_all` 只负责新增表。

| 领域 | 表 | 关键数据 |
| --- | --- | --- |
| 账户 | `users`, `auth_sessions`, `user_roles`, `user_profiles`, `verification_applications` | 账号、会话哈希、RBAC、认证审核 |
| 平台 | `media_assets`, `audit_logs`, `provider_webhook_events` | 私有媒体、审计、供应商回调幂等 |
| 首页/飞行 | `home_contents`, `flight_advisories` | 模块内容、风险和来源时间 |
| 学考 | `academy_institutions`, `academy_courses`, `academy_lessons`, `academy_visits`, `academy_learning_plans`, `academy_lesson_progress`, `academy_questions`, `academy_exam_sessions`, `academy_wrong_questions`, `academy_subsidy_policies`, `academy_schedules`, `academy_attendance` | 机构、课程、预约、学习、题库和档案 |
| 工作 | `work_companies`, `work_jobs`, `work_resumes`, `work_job_applications`, `work_interviews`, `work_tasks`, `work_task_bids`, `work_fulfillments`, `work_fulfillment_events` | 招聘、任务、履约状态机 |
| 交易 | `market_products`, `market_rental_plans`, `market_device_history_events`, `market_inspection_reports`, `market_orders`, `market_order_actions` | 商品、租赁、SN 履历、质检、订单 |
| 社区 | `community_topics`, `community_posts`, `community_post_media`, `community_reactions`, `community_comments`, `community_reports`, `community_knowledge_entries`, `community_knowledge_versions`, `community_live_rooms`, `community_live_comments`, `community_live_subscriptions`, `community_nearby_places`, `community_presences` | 内容审核、互动、直播、粗粒度地点 |
| 消息/资金 | `message_conversations`, `message_participants`, `messages`, `message_read_receipts`, `user_notifications`, `wallets`, `ledger_entries`, `favorites` | 站内消息、钱包只读账本和收藏 |
| 广告 | `ad_placements`, `ad_creatives`, `ad_campaigns` | 素材审核和计划状态 |

开发种子由 `scripts/seed.py` 提供稳定业务键，重复启动不会重复插入；生产环境请关闭 `SEED_DEMO_DATA`。
