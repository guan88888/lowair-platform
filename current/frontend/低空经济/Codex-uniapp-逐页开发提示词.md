# 天穹智航 App - Codex uni-app 逐页开发提示词

使用顺序：先把 Prompt 0 发送给 Codex，让它建立全局设计令牌、共享壳层、权限和 mock/service 基础；再从第 1 页开始，每次只发送一个页面 Prompt，并要求 Codex 完成实现与编译检查后再进入下一页；37 页完成后发送“最终联调 Prompt”。不要一次性要求 Codex 同时生成全部页面，否则容易出现路由、样式和状态不一致。

## Prompt 0：全局开发基线，必须最先执行

你正在维护现有项目 `<LOCAL_PROJECT_PATH>`。请先检查现有 `pages.json`、`manifest.json`、`App.vue`、`uni.scss`、组件和依赖，再在现有代码上增量开发，不覆盖用户已有改动。项目使用 Vue 3 + uni-app，面向 App、H5 和微信小程序；优先使用 uni-app 内置能力与当前已安装依赖，不为简单图标或动效引入大型库。所有业务数据先走独立 mock/service 层，页面不得散落硬编码数据，后续应能无痛替换真实 API。

设计判断：这是面向低空行业 B 端机构、企业和 C 端学员、飞手、买卖用户的强信任双边平台，不是营销落地页。视觉应专业、克制、信息密度较高，同时保留少量交易活力。设计参数固定为 `DESIGN_VARIANCE: 4`、`MOTION_INTENSITY: 4`、`VISUAL_DENSITY: 7`。

### 全局设计系统

- 主题锁定为深色，不在单个区块突然切成浅色。页面背景 `#061A2B`，一级表面 `#0B263A`，二级表面 `#102F45`，边框 `#1D4256`，主文字 `#EDF7F8`，次文字 `#91A8B5`。
- 唯一主强调色为青绿 `#19CFA0`，按下态 `#12B98C`；橙黄 `#F2B456` 仅表示风险或待处理，珊瑚红 `#EE6B6B` 仅表示错误、取消和 SOS，不把状态色当装饰。
- 卡片圆角统一 8px，输入框和普通按钮 6px，状态标签才允许胶囊形。禁止霓虹外发光、紫蓝渐变、玻璃拟态堆叠、大面积渐变文字和纯黑纯白。
- 页面左右安全边距 32rpx，区块间距 32rpx，卡片内边距 24rpx，元素间距使用 8/12/16/24rpx 阶梯。页面标题 36rpx，区块标题 30rpx，正文 28rpx，辅助文字 24rpx，核心数字 40-48rpx。
- 数字、金额、任务编号、SN 码使用等宽数字样式；按钮文字必须单行且对比度达标。列表优先使用分组、留白和单条分隔线，不给每一行同时加上下边框。
- 无人机、训练场、设备商品和飞行作业必须使用真实或后续可替换的位图资源，并提前锁定 `aspect-ratio`，禁止用矩形 div 假装产品图或地图。没有素材时使用带明确文件名的本地占位图，不请求不稳定的远程图。

### 全局壳层与导航

- 创建共享 `AppPageShell`、`AppHeader`、`AppTabBar`，所有业务页都通过同一壳层渲染顶部安全区和底部安全区。页面内容底部必须预留 Tab Bar 高度，不能被遮挡。
- 所有页面在 `pages.json` 使用 `navigationStyle: custom`，由 `AppHeader` 统一处理状态栏安全区、返回按钮和标题；禁止同时出现原生导航栏与自定义 Header。若微信小程序主包体积接近限制，再把非根页面迁入 `subPackages`，迁移时必须一次性更新全部跳转路径。
- 不同时渲染另一套原生 Tab Bar。自绘 Tab Bar 在每个页面的内容、顺序、图标、尺寸和颜色完全一致，只允许当前项高亮不同。
- 固定 5 项：`首页` + House 图标 + `/pages/index/index`；`学考` + GraduationCap 图标 + `/pages/academy/index`；`工作` + Briefcase 图标 + `/pages/work/index`；`交易` + ShoppingBag 图标 + `/pages/market/index`；`社区` + Users 图标 + `/pages/community/index`。
- Tab Bar 背景 `#071A2A`，上边框 `#183A4D`，未选中 `#71899A`，选中 `#19CFA0`，图标 44rpx，文字 22rpx。根页面切换统一使用 `uni.reLaunch`，详情页使用 `uni.navigateTo`，提交成功进入结果态使用 `uni.redirectTo`，禁止混用不存在的路由。
- 每页顶部右侧固定提供铃铛和头像两个图标按钮。铃铛进入 `/pages/messages/index`，头像进入 `/pages/profile/index`。图标只用当前项目已有图标库；若没有，优先接入 `uni-icons` 或准备同一笔画风格的本地 PNG，不手绘 SVG path，不混用多个图标家族。
- 所属高亮规则：培训、搜索、飞行服务、广告页高亮对应业务项，其中培训高亮 `academy`，广告和通用搜索高亮 `home`；招聘与任务页高亮 `work`；交易页高亮 `market`；社区页高亮 `community`；消息和个人页不改变 Tab 内容，可不高亮或保持进入前模块，但全项目选一种规则并固定。

### 交互、状态与安全

- 所有卡片和按钮按下时仅做 `scale(0.98)` 或下移 1px，时长 120-180ms；页面切换、抽屉和弹层使用透明度与位移，不动画宽高。高风险确认可调用一次 `uni.vibrateShort`，普通浏览不震动。遵守 `prefers-reduced-motion`。
- 每个列表都实现与最终布局一致的骨架屏、空状态、错误状态和重试按钮；表单标签放在输入框上方，错误文字放下方，不用 placeholder 代替标签。所有交互元素有明确按下态、禁用态和焦点态。
- 访客可浏览。收藏、评论、报名、投递等动作需要登录；发布任务和交易需要实名；接特定任务需匹配 CAAC 等级；发布全职岗位、搜索人才、广告投放、机构经营需要企业或培训机构认证。未满足时跳 `/pages/profile/account?returnUrl=...`，不要只弹一句提示后中断。
- 同一账号支持个人和企业身份切换。身份切换只改变业务视图与权限，不清空账号数据；企业资料、个人简历和钱包数据必须隔离显示。
- `已实名`、`企业认证`、`CAAC 已核验`、`资金托管`、`CA 签章`、`平台质检`、`SN 已存证` 等标签必须由数据状态驱动。未接真实服务时明确显示 `演示数据`、`待核验` 或 `接入中`，不得用装饰标签冒充真实资质、银行存管或区块链上链。
- 所有资金、通过率、信用分、曝光转化等数字来自 mock/service 字段并标明演示环境，不在模板里发明精确业绩。支付、提现、签章、保险、开票、上链在前端原型中只模拟状态流转，不调用真实外部服务。
- 创建统一的 Toast、确认弹窗、网络错误、权限拒绝和登录拦截逻辑。定位被拒绝时允许手动选城市；相机、相册、麦克风、飞行记录权限都要提供拒绝后的降级路径。
- 完成每页后同步更新 `pages.json`，检查路由真实存在，运行项目现有 lint/build 命令；若项目没有测试脚本，至少完成 H5 编译并检查控制台无报错。不得为了通过构建删除现有功能。

---

## 第 1 页 Prompt：首页

在现有 Vue 3 uni-app 项目中实现首页，路由 `/pages/index/index`，顶部标题为“天穹智航”，`AppTabBar activeKey="home"`。本页目标是第一屏同时传达“懂行业、能履约、资金与资质可核验”，不要做成宣传落地页。

页面详细布局：顶部安全区自定义 Header，左侧为可点击城市和定位图标，中间标题，右侧铃铛与头像；下方是全局搜索框；首屏使用真实无人机作业主视觉，叠加简洁的本地天气、风速、适飞状态与禁飞提示；随后用 2x2 核心入口展示“学考培训、招聘任务、设备交易、行业社区”；再放“今日供需”紧凑数据看板、加急任务横向列表、附近认证机构、平台严选设备、官方辟谣和一个明确标注“广告”的商业位。长列表只展示 2-3 条并提供“查看全部”。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；背景 `#071A2A`，未选中 `#71899A`，选中首页为 `#19CFA0`，图标和顺序不得变化。

样式与交互：页面背景 `#061A2B`，第一屏主视觉不使用彩色外发光；天气与安全状态用真实语义色。卡片按下缩放到 0.98；搜索框点击后进入搜索页；数据加载时显示对应骨架；无定位时显示手动选城。主视觉高度和 2x2 入口尺寸固定，异步数据不能造成布局跳动。

页面跳转规则：搜索框跳 `/pages/search/index`；天气或禁飞提示跳 `/pages/flight/index`；学考培训跳 `/pages/academy/index`；招聘任务跳 `/pages/work/index`；设备交易跳 `/pages/market/index`；行业社区跳 `/pages/community/index`；任务卡跳 `/pages/work/task-detail?id=...`；机构卡跳 `/pages/academy/institution-detail?id=...`；商品卡跳 `/pages/market/product-detail?id=...`；辟谣内容跳 `/pages/community/knowledge?mode=official&id=...`；广告位跳 `/pages/ad/index`；铃铛与头像按全局规则跳转。

---

## 第 2 页 Prompt：全局搜索

在现有 Vue 3 uni-app 项目中实现全局搜索页，路由 `/pages/search/index`，顶部标题为“全局搜索”，Tab Bar 高亮首页。

页面详细布局：顶部为返回按钮、自动聚焦搜索框和清空按钮；下方使用分段控件切换“全部、机构、岗位、任务、商品、内容”；未输入时展示本地搜索历史、热门行业词和最近浏览；输入后展示按类型分组的结果，每组有数量、筛选入口和最多 3 条预览；单一类型模式显示完整列表、排序筛选条和加载更多。结果卡使用各业务真实字段，不把不同业务强塞进同一种卡片。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；统一色值与尺寸，当前高亮首页。

样式与交互：输入防抖 300ms，显示搜索中骨架；支持键盘搜索、清除历史确认、筛选抽屉、无结果推荐相近关键词；卡片按下缩放 0.98。搜索历史只存本机并提供一键清除，敏感搜索词不上传。顶部和结果区不能被键盘或 Tab Bar 遮挡。

页面跳转规则：机构结果跳 `/pages/academy/institution-detail?id=...`；岗位跳 `/pages/work/job-detail?id=...`；任务跳 `/pages/work/task-detail?id=...`；商品跳 `/pages/market/product-detail?id=...`；帖子跳 `/pages/community/post-detail?id=...`；百科或问答跳 `/pages/community/knowledge?id=...`；筛选后的“查看全部”仍留在本页并切换对应分段；返回按钮优先 `navigateBack`，无页面栈则跳首页。

---

## 第 3 页 Prompt：本地飞行服务

在现有 Vue 3 uni-app 项目中实现本地飞行服务页，路由 `/pages/flight/index`，顶部标题为“本地飞行服务”，Tab Bar 高亮首页。

页面详细布局：顶部城市选择与更新时间；适飞状态总览卡显示天气、风速、能见度、降水和风险等级；地图区域展示禁飞区、临时管制区、常用飞场、周边景点、维修和自提服务点，地图下方用图例明确区分；随后是“起飞前检查”可勾选清单、当地法规摘要、企业航线申请说明和附近服务列表。明确提示公开航线原则上由企业主体申请并绑定对应飞手 CAAC 资质，不提供个人一键申报假入口。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮首页，其他颜色与顺序完全一致。

样式与交互：地图预留稳定 16:10 比例；点击图层开关即时显示或隐藏点位，点击点位弹出底部详情抽屉；定位拒绝后出现城市手选和重新授权，不显示空白地图；风险状态使用橙黄或红色，普通地点不用状态色。检查清单保存在本地当天记录，次日自动重置。

页面跳转规则：常用飞场或附近飞友跳 `/pages/community/nearby?mode=field&id=...`；培训机构点位跳 `/pages/academy/institution-detail?id=...`；维修、自提点可跳 `/pages/market/index?entry=service`，若 Tab 根页不能接 query，则写入全局 `pendingTabContext` 后切换；航线材料说明在本页抽屉展示，企业认证入口跳 `/pages/profile/account?mode=enterprise`；有进行中任务时 SOS 跳 `/pages/work/fulfillment?mode=sos&orderId=...`。

---

## 第 4 页 Prompt：学考首页

在现有 Vue 3 uni-app 项目中实现学考首页，路由 `/pages/academy/index`，顶部标题为“CAAC 学考”，`AppTabBar activeKey="academy"`。

页面详细布局：顶部搜索“课程、机构、证书等级”；第一屏为 AI 智能选课主操作区，提供城市、零基础、预算、证书等级等快捷条件；随后是“证书等级”分段区域，覆盖视距内、超视距、教员；学习工具入口包含证书科普、历年真题、考点视频、法律法规、AI 实操，明确普通用户使用基础学习资源免费；下面展示附近认证机构、推荐榜、优惠试听、补贴政策提醒和“我的学习档案”。底部放机构入驻入口，但与普通学员内容清楚分层。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；选中学考为 `#19CFA0`，其余 `#71899A`。

样式与交互：AI 选课区使用青绿主按钮但不做霓虹效果；机构卡必须展示认证状态、距离、适用等级、价格区间、评价量和过考率数据来源；未接真实过考率时显示“待接入”，不能填假数字。横向入口可滑动但必须有明确露出，不隐藏关键功能。

页面跳转规则：AI 选课跳 `/pages/academy/assistant`；搜索跳 `/pages/search/index?scope=academy`；证书科普、视频、法规、AI 实操分别跳 `/pages/academy/learning?mode=guide|video|law|simulator`；真题跳 `/pages/academy/exam?mode=practice`；机构卡和榜单分别跳 `/pages/academy/institution-detail?id=...`、`/pages/academy/institutions`；试听卡跳 `/pages/academy/visit?institutionId=...`；补贴和学习档案跳 `/pages/academy/progress?tab=subsidy|record`；机构入驻跳 `/pages/profile/account?mode=institution`。

---

## 第 5 页 Prompt：AI 智能选课

在现有 Vue 3 uni-app 项目中实现 AI 智能选课页，路由 `/pages/academy/assistant`，顶部标题为“智能选课”，Tab Bar 高亮学考。

页面详细布局：顶部显示当前城市与“重新开始”；主体是自然语言对话区，首屏给出可点击示例，如“北京，零基础，预算约 1.2 万，想考超视距”；输入框上方显示系统已提取的城市、基础、目标等级、预算、时间等可编辑条件；AI 返回匹配解释和机构结果卡；底部固定输入区同时支持文字、语音入口和发送按钮；选中机构后出现最多 4 家的对比托盘。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮学考，内容、图标、顺序和颜色不得变化。

样式与交互：消息气泡保持紧凑，不做聊天娱乐化表情；发送后显示与回复形状一致的骨架；条件缺失时 AI 只追问一个最关键问题；条件标签可点按编辑；对比超过 4 家时用明确 Toast 提示。AI 结果必须显示“匹配依据”，不得把赞助机构伪装成自然排序，赞助项需标“推广”。

页面跳转规则：结果卡跳 `/pages/academy/institution-detail?id=...`；“加入对比”将 ID 写入选课状态；对比托盘跳 `/pages/academy/institutions?mode=compare&ids=...`；“预约试听”跳 `/pages/academy/visit?institutionId=...`；城市修改调用统一城市选择器；未登录时允许试用对话，保存方案或预约时跳 `/pages/profile/account?returnUrl=...`。

---

## 第 6 页 Prompt：培训机构榜单与对比

在现有 Vue 3 uni-app 项目中实现培训机构榜单页，路由 `/pages/academy/institutions`，顶部标题为“培训机构”，Tab Bar 高亮学考。通过 `mode=list|map|compare` 支持列表、地图和最多 4 家机构对比。

页面详细布局：顶部为搜索和城市；分段控件切换“推荐、距离、榜单、地图”；筛选抽屉包含证书等级、价格区间、开课时间、距离、试听和认证；列表卡展示资质、课程、距离、教练平均教龄、评价量、过考率来源和推广标识；底部对比托盘显示已选机构。对比模式按价格、距离、公开过考率、教练资历、评价量、场地、试听政策分组，不使用横向进度条伪造优劣。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮学考。

样式与交互：列表和地图切换保持筛选状态；地图点位点击弹出机构摘要；排序条件固定在视口顶部但不遮 Header；对比表在小屏上横向滚动并冻结维度列，最多 4 列；被赞助置顶的机构必须明确标注“推广”，不能影响用户选择的自然排序说明。

页面跳转规则：机构卡或地图摘要跳 `/pages/academy/institution-detail?id=...`；试听按钮跳 `/pages/academy/visit?institutionId=...`；加入对比留在本页更新托盘；对比项删除只更新本地状态；对比表中的“查看详情”跳对应机构详情；无定位时打开城市选择，不强制退出页面。

---

## 第 7 页 Prompt：培训机构详情

在现有 Vue 3 uni-app 项目中实现培训机构详情页，路由 `/pages/academy/institution-detail?id=...`，顶部标题为“机构详情”，Tab Bar 高亮学考。

页面详细布局：顶部真实场地图片轮播；机构名称、企业/培训资质核验状态、距离、地址和联系方式保护状态；核心决策区显示课程价格区间、公开过考率及数据更新时间、教练平均教龄、学员评价量；下方用页面内 Tab 展示“课程、教练、场地、成果、评价”；课程卡列明证书等级、课时、开班日与退款规则；教练卡显示可核验资历；评价区区分已报名学员评价；底部固定“加入对比、咨询、预约试听”操作栏。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；选中学考，色值不变。

样式与交互：资质和过考率不是装饰标签，点击可查看来源说明；图片区域保留固定比例；页面内 Tab 滚动吸顶但不能覆盖全局 Header；咨询先提示平台内沟通与隐私保护；所有课程展开、评价筛选和收藏都提供即时反馈。数据缺失显示“机构暂未提供”，不显示 0 分误导用户。

页面跳转规则：场地全景或“VR 看校”跳 `/pages/academy/visit?institutionId=...&mode=vr`；预约试听跳 `/pages/academy/visit?institutionId=...&mode=booking`；加入对比跳 `/pages/academy/institutions?mode=compare&ids=...` 或写入全局对比状态后留页；咨询创建会话并跳 `/pages/messages/index?conversationId=...`；课程学习内容预览跳 `/pages/academy/learning?courseId=...`；分享直达时无返回栈则回学考首页。

---

## 第 8 页 Prompt：VR 看校与试听预约

在现有 Vue 3 uni-app 项目中实现 VR 看校与试听预约页，路由 `/pages/academy/visit?institutionId=...&mode=vr|booking`，顶部标题根据模式显示“VR 看校”或“预约试听”，Tab Bar 高亮学考。

页面详细布局：VR 模式顶部为真实 360 度全景或可替换的训练场大图，设置“理论教室、实操场、模拟机设备”三个场景切换和少量热点说明；下方展示设施清单与教练值班。预约模式展示体验课信息、日期横滑、可选时段、到访人数、联系人表单、隐私说明和确认摘要；成功后在同页显示预约编号、时间、地点及加入日历按钮。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮学考。

样式与交互：全景未接入时显示高质量场地图片和“全景接入中”，禁止用 CSS 伪造 3D 房间；热点点击打开底部抽屉；日期与时段有选中、满员、禁用状态；表单标签在输入上方，手机号做格式校验；提交中禁用重复点击。预约成功可触发一次轻震反馈。

页面跳转规则：场景切换留在本页；“立即预约”切换到 booking 模式；成功后“查看机构”跳 `/pages/academy/institution-detail?id=...`，“查看消息”跳 `/pages/messages/index?category=academy`；需要登录时跳 `/pages/profile/account?returnUrl=...`；取消返回机构详情。

---

## 第 9 页 Prompt：CAAC 学习中心

在现有 Vue 3 uni-app 项目中实现 CAAC 学习中心，路由 `/pages/academy/learning?mode=guide|video|law|simulator`，顶部标题为“CAAC 学习中心”，Tab Bar 高亮学考。

页面详细布局：顶部证书等级切换“视距内、超视距、教员”；显示个人学习进度和今日计划；核心内容用页面内 Tab 呈现“证书科普、考点视频、法律法规、AI 实操”。科普页用流程图解释报名、培训、考试、拿证；视频页按知识点分组并显示时长和进度；法规页提供搜索、发布机关、生效时间和收藏；AI 实操页提供任务场景、操作选择、仪表信息和复盘面板，不尝试做未经验证的真实飞控模拟器。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；选中学考，其他项保持统一。

样式与交互：学习内容使用清晰章节而非一串同形卡片；视频封面固定 16:9；法规正文保证字号和行高；实操选择只动画状态变化，结果解释错误原因和正确流程。进度仅在登录后保存；访客关闭页面前提示登录可同步记录。所有内容来源显示更新时间，过期法规标记失效。

页面跳转规则：顶部“开始刷题”跳 `/pages/academy/exam?mode=practice&level=...`；“模拟考试”跳 `/pages/academy/exam?mode=mock&level=...`；学习档案跳 `/pages/academy/progress?tab=record`；补贴提示跳 `/pages/academy/progress?tab=subsidy`；课程或机构推荐跳 `/pages/academy/institution-detail?id=...`；法规外链需先显示来源确认，再使用平台支持的安全打开方式。

---

## 第 10 页 Prompt：真题练习与模拟考试

在现有 Vue 3 uni-app 项目中实现真题练习与模拟考试页，路由 `/pages/academy/exam?mode=practice|mock&level=...`，顶部标题根据模式显示“真题练习”或“模拟考试”，Tab Bar 高亮学考。

页面详细布局：顶部固定考试进度、剩余时间或练习模式标签；中部单题卡显示题干、图片位、单选/多选选项；底部操作为收藏、上一题、下一题和答题卡；模拟考试提供提交确认；结果态展示正确率、用时、知识点分布、错题列表和基于当前答题记录的通过风险说明；练习模式答题后立即显示解析、法规依据和相关视频。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮学考。考试进行中点击 Tab 前弹出离开确认，Tab 内容和样式本身不得改变。

样式与交互：答题卡尺寸固定，长题干可自然滚动，不挤压操作区；选项具有默认、选中、正确、错误和禁用状态；计时器不造成整页频繁重渲染；结果中的预测必须写明“基于本次演示答题记录”，不冒充官方通过率。支持断点恢复、交卷失败重试和无题库空状态。

页面跳转规则：答题卡在本页弹层打开；解析中的视频跳 `/pages/academy/learning?mode=video&topicId=...`；结果页“重练错题”留在本页重建题组；“返回学习中心”跳 `/pages/academy/learning`；“查看学习档案”跳 `/pages/academy/progress?tab=record`。

---

## 第 11 页 Prompt：学习档案与补贴查询

在现有 Vue 3 uni-app 项目中实现学习档案与补贴查询页，路由 `/pages/academy/progress?tab=record|subsidy`，顶部标题为“学习与补贴”，Tab Bar 高亮学考。

页面详细布局：顶部用分段控件切换“学习档案”和“补贴查询”。档案页展示“意向、报名、培训、考试、拿证”五阶段时间轴，课程与机构信息、已完成课时、签到记录、真题与模拟考概览、待办事项和学习报告生成入口；补贴页先选择城市、证书等级和就业状态，再显示政策来源、生效时间、适用条件、补贴范围、办理窗口与材料清单，可勾选已准备材料并生成清单摘要。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮学考，样式不变。

样式与交互：时间轴用状态和文本表达进度，不使用填充式进度条制造成绩感；政策卡必须有来源和更新时间，已失效政策降级显示；材料清单勾选状态本地持久化。没有报名课程时展示“去找机构”，没有匹配政策时提供修改城市和查看通用说明，不展示空白页。

页面跳转规则：机构名称跳 `/pages/academy/institution-detail?id=...`；课时内容跳 `/pages/academy/learning?courseId=...`；考试记录跳 `/pages/academy/exam?mode=review&recordId=...`；“去找机构”跳 `/pages/academy/institutions`；生成学习报告在本页预览并支持平台能力允许的保存或分享；补贴申请只展示材料与官方渠道，不伪造平台代理提交。

---

## 第 12 页 Prompt：培训机构工作台

在现有 Vue 3 uni-app 项目中实现培训机构工作台，路由 `/pages/academy/org-console`，顶部标题为“机构工作台”，Tab Bar 高亮学考。只有已认证培训机构可进入，其他身份进入认证引导。

页面详细布局：顶部显示机构名称、认证状态、当前校区和切换入口；经营概览用紧凑数据区展示新增线索、待跟进、试听预约、在训学员和口碑风险；主体按“线索、排课、签到、考试、口碑”分区。线索池支持高/中/低意向和负责人筛选；智能排课根据教练、场地和时间自动提示冲突；签到展示人脸签到接入状态和课时扣减；考试区展示代报名材料状态；口碑区展示差评预警与待回复评价；底部提供机构主页预览和招生推广入口。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮学考。

样式与交互：本页信息密度高但不套多层卡片，使用区块、分组和单条分隔线；数据均来自 mock/service 并标“演示数据”；线索拖动改意向前二次确认，排课冲突使用橙黄语义提示，差评使用红色但不把所有待办都染红。提供骨架、无学员、无排课、接口失败状态。

页面跳转规则：未认证跳 `/pages/profile/account?mode=institution&returnUrl=...`；机构主页预览跳 `/pages/academy/institution-detail?id=...&preview=1`；预约和线索消息跳 `/pages/messages/index?category=academy`；招生推广跳 `/pages/ad/index?biz=academy`；课程学习内容跳 `/pages/academy/learning?courseId=...`；排课、签到和口碑详情使用本页抽屉处理，首版不创建没有实现的空路由。

---

## 第 13 页 Prompt：工作首页

在现有 Vue 3 uni-app 项目中实现工作首页，路由 `/pages/work/index`，顶部标题为“招聘与任务”，`AppTabBar activeKey="work"`。本页必须清晰区分劳动岗位和按项目交付的临时任务。

页面详细布局：顶部显示当前个人/企业身份切换、搜索、消息与头像；主分段控件切换“企业招聘”和“临时任务”。招聘模式展示职位类别、城市、薪资、经验、CAAC 等级筛选，推荐职位和认证企业直招列表；任务模式展示附近、推荐、加急、可抢单筛选，任务卡包含作业类型、地点、时间、预算、证书等级、托管状态和抢单倒计时；顶部或右下角提供明确的“发布”按钮；安全说明区展示实名、资金托管、隐私号码与保险的真实接入状态。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮工作为 `#19CFA0`。

样式与交互：分段切换保留各自滚动位置和筛选条件；职位和任务使用不同卡片字段，不混为一种；加急任务可用橙黄标签但不发光；发布按钮按当前身份打开发布类型菜单。定位拒绝时按手选城市排序。列表支持下拉刷新、分页、骨架、空结果和重试。

页面跳转规则：搜索跳 `/pages/search/index?scope=work`；职位卡跳 `/pages/work/job-detail?id=...`；任务卡跳 `/pages/work/task-detail?id=...`；个人身份“我的简历/投递”跳 `/pages/work/resume`；企业身份“找人才/发布招聘”跳 `/pages/work/talent`；发布临时任务跳 `/pages/work/publish?type=task`；企业发布职位跳 `/pages/work/publish?type=job`；未满足认证时跳 `/pages/profile/account?returnUrl=...`。

---

## 第 14 页 Prompt：职位详情

在现有 Vue 3 uni-app 项目中实现职位详情页，路由 `/pages/work/job-detail?id=...`，顶部标题为“职位详情”，Tab Bar 高亮工作。

页面详细布局：顶部显示职位名称、薪资范围、地点、全职/兼职、更新时间和企业认证标签；随后是执照等级、机型能力、经验、学历等关键要求；职位描述按岗位职责、任职条件、福利与作业环境分组；企业摘要展示营业执照核验状态、行业、规模、地址和在招职位；底部固定“收藏、平台内沟通、立即投递”操作栏。已投递用户在顶部显示投递状态和面试提醒。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮工作。

样式与交互：职位信息使用层级和留白，不把每段放进卡片；认证状态点击可查看说明；展开全文、收藏和投递都有按下反馈；薪资、职责和 CAAC 要求缺失时显示“企业未填写”，不擅自补齐。投递按钮提交中禁用，成功后切换为“已投递”，防止重复投递。

页面跳转规则：立即投递先检查登录和简历，未建简历跳 `/pages/work/resume?returnJobId=...`，已有简历则弹确认并提交；“查看投递”跳 `/pages/work/resume?tab=applications`；企业摘要进入 `/pages/work/talent?mode=company&id=...` 的公开只读模式；沟通跳 `/pages/messages/index?conversationId=...`；认证不足或职位下架时给出明确状态并返回工作首页。

---

## 第 15 页 Prompt：简历与投递中心

在现有 Vue 3 uni-app 项目中实现简历与投递中心，路由 `/pages/work/resume?tab=resume|applications|interviews`，顶部标题为“求职中心”，Tab Bar 高亮工作，仅显示当前个人身份的数据。

页面详细布局：顶部为个人身份与简历公开状态；分段切换“我的简历、投递进度、面试邀请”。简历页依次编辑求职意向、基本信息、CAAC 证书、熟练机型、项目经历、教育与附件，展示完整度但不用夸张进度条；投递页按已投递、已查看、邀面、已结束筛选；面试页展示时间、方式、联系人保护状态和接受/改期/拒绝操作。支持上传现有简历并生成预览，但字段仍可编辑。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮工作。

样式与交互：表单标签上置、分段保存，离开未保存时确认；证书只显示用户提交与平台核验两种独立状态；投递状态用文本和图标，不将企业“已查看”解释为录用；附件上传有进度、失败重试和大小限制；空投递状态提供“去找职位”。

页面跳转规则：职位记录跳 `/pages/work/job-detail?id=...`；“去找职位”跳 `/pages/work/index` 并将上下文设为招聘；CAAC 核验跳 `/pages/profile/account?mode=caac`；面试消息跳 `/pages/messages/index?category=interview`；从职位详情携带 `returnJobId` 进入时，简历保存成功后返回该职位继续投递。

---

## 第 16 页 Prompt：企业人才与招聘中心

在现有 Vue 3 uni-app 项目中实现企业人才与招聘中心，路由 `/pages/work/talent?mode=console|company&id=...`，顶部标题在经营模式为“企业招聘中心”，公开模式为“企业主页”，Tab Bar 高亮工作。经营模式仅认证企业可进入。

页面详细布局：经营模式顶部显示企业认证和招聘概览；分段切换“在招职位、候选人、面试、人才库”。职位区支持新建、编辑、暂停和推广；候选人区按投递状态筛选并展示证书、机型、经验与匹配依据；人才库支持城市、证书等级、机型和可到岗时间筛选；面试区显示待确认日程。公开模式只展示企业资质摘要、简介、地址、在招职位和平台内沟通，不暴露经营数据。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮工作。

样式与交互：候选人信息遵守隐私最小化，未建立沟通前隐藏手机号；筛选和排序保留状态；职位暂停和拒绝候选人需确认；人才匹配原因来自字段规则，不能伪装成已接入成熟 AI；推广位明确标注商业属性。经营数据均标演示环境。

页面跳转规则：未认证企业跳 `/pages/profile/account?mode=enterprise&returnUrl=...`；发布职位跳 `/pages/work/publish?type=job`；职位预览跳 `/pages/work/job-detail?id=...`；候选人详情在本页抽屉展示，发面试邀请后跳 `/pages/messages/index?category=interview`；职位推广跳 `/pages/ad/index?biz=recruitment`；公开页职位卡跳职位详情。

---

## 第 17 页 Prompt：AI 发布职位与任务

在现有 Vue 3 uni-app 项目中实现 AI 发布页，路由 `/pages/work/publish?type=job|task`，顶部标题根据类型显示“发布职位”或“发布任务”，Tab Bar 高亮工作。全职职位只允许认证企业发布；临时任务允许实名个人或认证企业发布。

页面详细布局：顶部类型分段与权限状态；主体用自然语言输入需求，提供语音入口和场景示例；AI 解析后形成可编辑标准工单。职位字段包括职位名称、用工类型、地点、薪资、经验、CAAC 等级、机型、职责和福利；任务字段包括作业类型、地点、时间、所需机型、证书等级、预估时长、预算、交付格式和验收标准；任务附加设置包含加急 `+20%`、保险、公开抢单或智能派单、隐私号码和资金托管说明；底部显示预览与提交。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮工作。编辑未保存内容时点击 Tab 需先确认。

样式与交互：AI 每次只追问一个关键缺失字段；解析结果的每个字段可直接修改，并明确 AI 仅提供草稿；预算与时间冲突即时校验；加急费用展示计算依据，不隐藏额外费用；提交前展示完整确认摘要、服务接入状态和风险提示。草稿自动本地保存，上传失败可重试。

页面跳转规则：认证不足跳 `/pages/profile/account?returnUrl=...`；职位发布成功 `redirectTo` `/pages/work/job-detail?id=...&owner=1`；任务发布成功 `redirectTo` `/pages/work/task-detail?id=...&owner=1`；取消返回工作首页；发布后消息提醒进入 `/pages/messages/index?category=work`；保险、托管和 CA 签章未真实接入时只展示“接入中”，不得跳虚假支付页。

---

## 第 18 页 Prompt：任务详情与抢单

在现有 Vue 3 uni-app 项目中实现任务详情页，路由 `/pages/work/task-detail?id=...`，顶部标题为“任务详情”，Tab Bar 高亮工作。

页面详细布局：顶部展示作业类型、加急状态、预算、地点范围、作业时间、报名倒计时和任务状态；关键信息区列出所需机型、CAAC 等级、预计时长、交付物、验收标准；地图只显示保护后的大致位置；安全区展示发布方实名/企业认证、资金托管、保险、隐私号码状态；下方是发布方信用摘要、报名飞手数量和任务说明。普通飞手底部显示“收藏、咨询、报名抢单”，发布方视角显示报名者列表和选择操作。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮工作。

样式与交互：倒计时只更新局部文本；加急使用橙黄，不做闪烁；未匹配 CAAC 等级时禁用报名并给出核验入口；报名时确认档期、报价和交付承诺；发布方查看报名者使用底部抽屉，展示信用依据而非单一分数。已关闭或已指派任务显示不可操作状态。

页面跳转规则：报名资格不足跳 `/pages/profile/account?mode=caac&returnUrl=...`；沟通跳 `/pages/messages/index?conversationId=...` 并显示隐私号码保护；报名成功仍留本页更新状态；发布方选定飞手后跳 `/pages/work/fulfillment?orderId=...`；飞手被选中后从消息跳同一履约页；地图相关飞场跳 `/pages/flight/index`；分享直达无返回栈时回工作首页。

---

## 第 19 页 Prompt：任务履约、安全与结算

在现有 Vue 3 uni-app 项目中实现任务履约中心，路由 `/pages/work/fulfillment?orderId=...&mode=progress|calendar|sos|dispute`，顶部标题为“任务履约”，Tab Bar 高亮工作。页面根据发包方和飞手身份显示不同可操作按钮。

页面详细布局：顶部任务编号、当前状态和双方认证摘要；核心用“首期款、作业执行、中期素材确认、尾款”里程碑时间轴；下方依次是资金托管状态、电子合同与 CA 签章状态、交付文件上传/验收、发票与税务、未来 7 天任务日历、隐私通话入口。右下固定但避开 Tab Bar 的 SOS 圆形图标；争议模式展示问题类型、证据上传、对方说明、平台仲裁状态和资深飞手仲裁说明。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮工作。SOS 图标不能遮挡任何 Tab 项。

样式与交互：里程碑状态用完成、当前、待开始表达，不用装饰进度条；放款、验收、取消和 SOS 都需要确认，高风险动作轻震一次；文件上传有进度与失败重试；日历冲突以橙黄提示并支持“一键请假”暂停派单；SOS 先显示当前位置与任务信息确认，再模拟连接客服和保险。所有资金与签章状态在原型中标“演示”。

页面跳转规则：合同、证据、发票在本页抽屉或预览层处理；隐私通话跳 `/pages/messages/index?conversationId=...&mode=protected-call`；任务原文跳 `/pages/work/task-detail?id=...`；结算完成后跳 `/pages/profile/wallet?tab=transactions`；系统通知跳 `/pages/messages/index?category=task`；无进行中订单进入本页时展示任务列表入口并跳工作首页。

---

## 第 20 页 Prompt：交易首页

在现有 Vue 3 uni-app 项目中实现交易首页，路由 `/pages/market/index`，顶部标题为“设备交易”，`AppTabBar activeKey="market"`。只做无人机整机、遥控器、电池、螺旋桨、外观定制等低空设备，不扩展为泛手机数码商城。

页面详细布局：顶部搜索和城市；主频道切换“全新、二手、租赁、配件、定制”；首屏展示平台严选、质检报告、担保交易和 7 天退货的真实接入状态；分类入口后是推荐商品流、附近可自提设备、配件健康报告专题和维修/自提服务入口；显眼但克制地提供“卖旧换新/云寄售”按钮。商品卡显示真实图片、品牌型号、新旧/租赁类型、价格、所在地、质检与 SN 履历状态。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮交易为 `#19CFA0`。

样式与交互：频道切换保留筛选和滚动位置；商品图固定比例，价格信息层级明确；平台严选和质检标签仅在数据为真时出现，未接入显示“待核验”；二手、租赁和配件卡用不同辅助字段但保持整体网格一致。支持骨架、筛选抽屉、空结果、分页和下拉刷新。

页面跳转规则：搜索跳 `/pages/search/index?scope=market`；商品卡跳 `/pages/market/product-detail?id=...`；卖旧换新或云寄售跳 `/pages/market/sell?mode=trade-in|consign`；租赁频道的方案说明跳 `/pages/market/lease?id=...`；服务点入口跳 `/pages/flight/index?layer=service`；低空豆余额入口跳 `/pages/profile/wallet?tab=beans`；铃铛与头像按全局规则。

---

## 第 21 页 Prompt：商品详情

在现有 Vue 3 uni-app 项目中实现商品详情页，路由 `/pages/market/product-detail?id=...`，顶部标题为“商品详情”，Tab Bar 高亮交易。页面同时适配全新、二手、租赁和配件商品，但根据类型显示不同字段。

页面详细布局：顶部真实商品图轮播；价格、类型、成色、所在地、交付方式和库存；信任摘要显示平台严选、卖家实名/企业认证、质检报告、SN 履历、配件健康度和退货政策；核心规格按机型、飞行时长、电池循环、维修记录、配件清单分组；随后是卖家摘要、图文描述、服务保障、附近自提点与评价；底部固定“收藏、咨询、立即购买/立即租赁”。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮交易。

样式与交互：图片区域预留固定比例；商品类型决定 CTA 文案和字段，不显示无意义空字段；SN 只展示脱敏摘要；风险提示使用橙黄，错误或下架使用红色；规格使用 2 列分组或重点数值块，避免十几行上下双边框表格。收藏、图片预览、规格选择和自提方式切换有即时反馈。

页面跳转规则：“查看质检/设备履历”跳 `/pages/market/device-history?sn=...`，无报告时按钮禁用并说明原因；租赁方案跳 `/pages/market/lease?id=...`；立即购买或租赁跳 `/pages/market/order?mode=checkout&id=...&tradeType=buy|lease`；咨询跳 `/pages/messages/index?conversationId=...`；卖家自己的商品显示“管理商品”并跳 `/pages/market/sell?mode=edit&id=...`。

---

## 第 22 页 Prompt：AI 估价、卖旧换新与云寄售

在现有 Vue 3 uni-app 项目中实现设备出售页，路由 `/pages/market/sell?mode=trade-in|consign|listing|edit`，顶部标题根据模式显示“卖旧换新”“云寄售”或“发布闲置”，Tab Bar 高亮交易。进入交易前要求个人实名，经营性商家要求企业认证。

页面详细布局：顶部模式分段和服务差异说明；分步骤采集品牌型号、SN 码、购买时间、成色、炸机/维修历史、配件与所在地；拍摄区按机身正面、底部、云台、电机、电池仓提供清晰取景清单；AI 分析结果标出疑似损伤并要求用户逐项确认；估价摘要显示区间、影响因素和“以平台质检为准”；卖旧换新可选择目标新机，云寄售展示寄仓、平台拍摄、上架、成交和结算流程，普通发布展示价格与交付方式。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮交易。未完成草稿时点击 Tab 弹出保存确认。

样式与交互：拍摄位使用固定比例和清晰示例图，支持相机拒绝后的相册上传；上传有压缩、进度和失败重试；AI 估损明确标“演示识别”并允许用户纠正；SN 重复或格式异常即时提示；费用、佣金和预计结算必须在提交前完整展示。草稿自动保存，提交中防重复。

页面跳转规则：实名不足跳 `/pages/profile/account?mode=identity&returnUrl=...`；选择目标新机跳 `/pages/market/index` 并保存当前草稿；查看已有履历跳 `/pages/market/device-history?sn=...`；提交成功 `redirectTo` `/pages/market/order?mode=detail&orderId=...`；取消返回交易首页；需要寄检时在成功态展示寄送指引，不跳不存在的物流页。

---

## 第 23 页 Prompt：租赁与租满即送

在现有 Vue 3 uni-app 项目中实现租赁方案页，路由 `/pages/market/lease?id=...`，顶部标题为“租赁方案”，Tab Bar 高亮交易。

页面详细布局：顶部商品摘要和设备状态；方案区按短租、长租、租满即送展示租期、月租、初始押金、押金递减规则、总成本和到期归属；租满即送明确展示满 12 个月后设备归属；下方是可选第三方延保与意外保障、使用限制、提前退租、续租、买断、验机和赔付规则；底部为日期选择、配送/自提、费用确认和“确认租赁”。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮交易。

样式与交互：不同方案用非等宽重点布局或分段控件，不做三张完全相同的营销卡；押金变化用月份明细和数字表达，不用装饰性进度条；选择日期后实时校验库存和费用；保障未接真实服务时显示“接入中”且不可勾选；费用变化有短暂高亮但不跳动布局。

页面跳转规则：商品摘要跳 `/pages/market/product-detail?id=...`；设备履历跳 `/pages/market/device-history?sn=...`；确认租赁跳 `/pages/market/order?mode=checkout&id=...&tradeType=lease&planId=...`；实名不足跳 `/pages/profile/account?returnUrl=...`；取消返回商品详情。

---

## 第 24 页 Prompt：质检报告与 SN 设备履历

在现有 Vue 3 uni-app 项目中实现质检和设备履历页，路由 `/pages/market/device-history?sn=...`，顶部标题为“设备履历”，Tab Bar 高亮交易。

页面详细布局：顶部提供扫码或输入 SN 查询；查询成功后展示品牌型号、脱敏 SN、当前状态和平台认证报告编号；质检摘要按机身、云台、电机、电池、遥控和配件分组；报告区域展示顺丰寄检或一线城市上门验机的服务方式、质检机构、日期、防伪二维码和报告原件预览；设备生命周期用时间轴展示首次激活、炸机申报、维修、质检、过户记录；区块链存证区只在有真实字段时展示链名、交易哈希、区块高度和核验时间，否则显示“存证能力接入中”。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮交易。

样式与交互：SN 和哈希支持复制但默认脱敏；二维码必须来自数据资源，不生成无效防伪码；时间轴用状态说明，不因“无事故记录”展示虚假安全结论；查询失败区分格式错误、未收录、网络失败；报告图片可缩放预览，所有可核验字段带来源说明。

页面跳转规则：关联在售商品跳 `/pages/market/product-detail?id=...`；购买或租赁跳对应商品详情后继续；质检服务申请可跳 `/pages/market/sell?mode=inspection&sn=...` 并复用发布流程；附近维修、自提点跳 `/pages/flight/index?layer=service`；无返回栈时回交易首页。

---

## 第 25 页 Prompt：交易确认与订单履约

在现有 Vue 3 uni-app 项目中实现统一交易订单页，路由 `/pages/market/order?mode=list|checkout|detail&orderId=...&id=...`，顶部标题根据模式显示“我的交易”“确认交易”或“订单详情”，Tab Bar 高亮交易。

页面详细布局：列表模式按全部、待付款、验机中、履约中、售后筛选购买、出售、寄售和租赁订单；确认模式依次显示商品摘要、收货地址或自提点、寄检/验机方式、配送、延保选择、低空豆抵扣、费用明细、资金托管与退货规则、同意条款和提交按钮；详情模式显示订单编号、当前状态时间轴、托管资金、寄检报告、物流/自提、确认收货、租赁周期、售后和平台客服。不同交易类型使用各自状态机：全新购买、二手担保、租赁、寄售结算不可混成一个状态列表。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮交易。确认页点击其他 Tab 前先提示未提交信息将丢失。

样式与交互：费用明细可展开，默认直接展示总价与关键费用；支付按钮显示“演示提交”并只模拟成功/失败/取消；提交中禁用重复点击；验机、确认收货、申请售后均需确认；订单状态变化有局部动画，失败保留用户填写内容。低空豆不能抵扣超出规则的金额。平台严选的 7 天退货、先行赔付和 AI 异常交易巡检均由服务状态驱动，未接真实能力时显示“接入中”。

页面跳转规则：商品摘要跳 `/pages/market/product-detail?id=...`；质检报告跳 `/pages/market/device-history?sn=...`；低空豆跳 `/pages/profile/wallet?tab=beans`；提交成功在本页切换 detail 模式或 `redirectTo` 对应订单；联系卖家/客服跳 `/pages/messages/index?conversationId=...`；交易完成后查看流水跳 `/pages/profile/wallet?tab=transactions`。

---

## 第 26 页 Prompt：社区首页

在现有 Vue 3 uni-app 项目中实现社区首页，路由 `/pages/community/index`，顶部标题为“低空社区”，`AppTabBar activeKey="community"`。

页面详细布局：顶部搜索、消息与头像；内容圈层切换“朋友圈、工作圈”，随后用分段控件切换“推荐、关注、同城、机型圈、官方”；首屏放一条官方辟谣或法规更新，不与普通帖子混排；信息流支持飞行日志、图文、视频、设备测评、驾校评价和作业招募等卡片；穿插当前语音房、直播预告、创作/接单/答主榜和附近活动，但每种只露出少量内容；右下角提供圆形发布图标按钮，不能挡住 Tab Bar。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮社区为 `#19CFA0`。

样式与交互：不同内容类型有稳定但不完全相同的媒体比例；视频不自动有声播放；圈层切换明确影响可见内容；官方内容使用认证标识但不做彩色边框装饰；点赞、收藏、关注即时更新并有失败回滚；下拉刷新、分页、骨架、空关注和内容审核状态完整。

页面跳转规则：搜索跳 `/pages/search/index?scope=community`；帖子卡跳 `/pages/community/post-detail?id=...`；官方辟谣或问答跳 `/pages/community/knowledge?mode=official|question&id=...`；语音房/直播跳 `/pages/community/live?id=...&type=voice|live`；榜单跳 `/pages/community/live?mode=ranking`；同城活动或飞友跳 `/pages/community/nearby`；发布按钮跳 `/pages/community/publish`；作业招募卡跳 `/pages/work/task-detail?id=...`。

---

## 第 27 页 Prompt：帖子详情

在现有 Vue 3 uni-app 项目中实现帖子详情页，路由 `/pages/community/post-detail?id=...`，顶部标题为“内容详情”，Tab Bar 高亮社区。

页面详细布局：顶部作者头像、名称、个人/企业/官方身份、认证状态、发布时间与关注；主体显示标题、图文或视频、正文和话题；飞行日志类型增加轨迹地图、飞行时长、起降次数、天气和机型数据卡；设备测评可关联商品；作业招募显示跳转任务的摘要；下方是点赞、收藏、分享、举报、按热度/时间排序的评论与相关推荐；底部固定评论输入和快捷互动。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮社区。

样式与交互：长正文保证阅读行高；图片支持预览，视频保留尺寸避免布局跳动；飞行轨迹只显示用户授权公开的范围；评论发布使用乐观更新但失败回滚；删除、举报和屏蔽均确认；审核中、已删除、不可见内容有独立状态。用户身份标签由认证数据驱动。

页面跳转规则：作者头像跳 `/pages/profile/index?userId=...&public=1`；轨迹地图跳 `/pages/community/nearby?mode=route&id=...`；关联商品跳 `/pages/market/product-detail?id=...`；作业招募跳 `/pages/work/task-detail?id=...`；话题跳 `/pages/community/knowledge?mode=topic&id=...`；未登录评论或收藏跳 `/pages/profile/account?returnUrl=...`；分享直达无返回栈时回社区首页。

---

## 第 28 页 Prompt：发布内容与飞行日志

在现有 Vue 3 uni-app 项目中实现社区发布页，路由 `/pages/community/publish?type=post|video|flight-log|recruit`，顶部标题为“发布内容”，Tab Bar 高亮社区。

页面详细布局：顶部选择内容类型；普通图文包含标题、正文、图片/视频、话题、机型与地点；飞行日志先请求用户授权读取飞行记录，再选择一次飞行，自动生成轨迹、时长、起降次数、天气和机型卡，用户补充感想；作业招募只采集简要意图并引导转标准任务发布；底部设置发布到朋友圈/工作圈/同城圈/机型圈、谁可见、位置模糊级别、预览和发布。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮社区。存在未保存草稿时点击 Tab 需确认保存或放弃。

样式与交互：媒体上传有数量、大小、进度、失败重试和删除；飞行记录权限拒绝后允许发布普通帖子，不反复弹权限；自动卡片所有字段可选择隐藏但原始数据不可篡改为错误值；位置默认模糊到区域，不公开精确起降点；发布前显示社区规范和审核状态，草稿自动保存。

页面跳转规则：选择飞行轨迹在本页抽屉完成；作业招募点击“生成标准任务”跳 `/pages/work/publish?type=task&source=community` 并传入草稿；发布成功 `redirectTo` `/pages/community/post-detail?id=...&owner=1`；未登录跳 `/pages/profile/account?returnUrl=...`；取消返回社区首页。

---

## 第 29 页 Prompt：百科、问答与官方辟谣

在现有 Vue 3 uni-app 项目中实现知识中心，路由 `/pages/community/knowledge?mode=encyclopedia|question|official|topic&id=...`，顶部标题为“低空知识”，Tab Bar 高亮社区。

页面详细布局：顶部全局知识搜索；分段切换“百科、问答、官方辟谣”。百科列表按空域申报、飞行规则、应急处置、机型技术分类，词条详情显示摘要、正文、来源、更新时间、编辑记录和申请编辑；问答页展示待解决、热门、有悬赏，详情模式显示问题、回答、采纳状态和追加回答；官方页集中展示权威账号辟谣、政策解读和来源链接；底部根据模式显示“编辑词条、提问、回答”。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮社区。

样式与交互：长列表按分类和搜索组织，不做一条到底；百科用户编辑提交后显示“待官方审核”，不直接覆盖已发布内容；悬赏低空豆在提问前显示冻结规则；回答采纳前确认，采纳后更新钱包状态；官方内容必须显示发布主体和原始来源。无搜索结果时提供相近词和提问入口。

页面跳转规则：相关法规跳 `/pages/academy/learning?mode=law&topicId=...`；悬赏余额跳 `/pages/profile/wallet?tab=beans`；回答者头像跳 `/pages/profile/index?userId=...&public=1`；相关任务跳 `/pages/work/task-detail?id=...`；提问、编辑、回答均在本页表单层完成；审核或采纳消息跳 `/pages/messages/index?category=community`。

---

## 第 30 页 Prompt：语音房、直播与创作者榜

在现有 Vue 3 uni-app 项目中实现实时互动页，路由 `/pages/community/live?id=...&type=voice|live&mode=list|room|ranking`，顶部标题根据状态显示“实时互动”或具体房间名，Tab Bar 高亮社区。

页面详细布局：列表模式分为正在进行的语音房、直播预告、精彩回放和周/月榜；榜单只设置创作之星、接单王、答主三个有业务依据的分类。房间模式顶部显示主题、主持人和房间状态；语音房展示发言席、听众、举手、静音、离开和举报；直播模式展示真实视频容器、主播信息、评论、关注和回放标记；底部为控制区和简洁消息流。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮社区。进入房间后仍保留同一 Tab Bar，但控制区必须位于 Tab Bar 上方且不重叠。

样式与交互：麦克风或相机权限拒绝后仍可以听众身份进入；房间音频状态用真实语义图标，不用跳动光圈装饰；创建房间需要登录与实名，直播权限需要平台认证；连接中、重连、主播离开、房间结束和回放不可用都有明确状态。榜单数字来自演示数据并标明周期和口径。

页面跳转规则：列表卡进入本页 room 模式；主持人或榜单用户跳 `/pages/profile/index?userId=...&public=1`；直播关联帖子跳 `/pages/community/post-detail?id=...`；技术话题跳 `/pages/community/knowledge?id=...`；房间结束返回本页列表模式；举报在本页弹层提交，结果消息进入 `/pages/messages/index?category=system`。

---

## 第 31 页 Prompt：同城飞友、飞场与活动赛事

在现有 Vue 3 uni-app 项目中实现同城页，路由 `/pages/community/nearby?mode=people|field|event|route&id=...`，顶部标题为“同城低空圈”，Tab Bar 高亮社区。

页面详细布局：顶部城市和隐私范围说明；地图与列表切换；页面内分段为“附近飞友、常用飞场、活动赛事”。飞友只显示到区/街道的模糊距离、机型、擅长方向、CAAC 核验与是否接受约飞；飞场显示适飞提示、禁飞风险、设施和近期活动；赛事列表显示报名时间、地点、赛制和主办方认证。活动详情模式包含报名、签到码、作品提交、大众投票、评委评分、结果与活动报告。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮社区。

样式与交互：默认不显示任何人的精确常驻位置；地图点位做聚合，点击后打开底部抽屉；约飞邀请需对方同意后才能建立会话；签到只在活动时间和区域内可用；投票防重复并显示规则，评委评分只对授权角色开放。定位拒绝后可手选城市并使用列表模式。

页面跳转规则：飞友头像跳 `/pages/profile/index?userId=...&public=1`；约飞沟通跳 `/pages/messages/index?conversationId=...`；飞场安全详情跳 `/pages/flight/index?locationId=...`；活动关联帖子跳 `/pages/community/post-detail?id=...`；报名、签到、投票和评分在本页状态中完成；作业活动需要标准任务时跳 `/pages/work/publish?type=task&source=event`。

---

## 第 32 页 Prompt：企业广告服务

在现有 Vue 3 uni-app 项目中实现广告服务页，路由 `/pages/ad/index?biz=general|academy|recruitment|market`，顶部标题为“广告服务”，Tab Bar 高亮首页。仅认证企业、培训机构或商家可创建广告，普通用户可查看服务说明但不能提交。

页面详细布局：顶部显示当前企业身份和认证状态；广告位按首页、本地推荐、培训榜单、招聘曝光、交易推荐分组，展示位置预览、适用目标、计费方式接入状态和素材规格；随后是地域、行业和人群定向能力说明，已有广告计划摘要、审核规则、禁止内容、费用与退款说明；底部提供“创建广告计划”和“查看投放数据”。不要用虚构客户 logo、曝光量或转化率做案例背书。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；当前高亮首页，内容、图标和颜色保持一致。

样式与交互：广告位预览使用真实页面缩略图或明确占位资源，不用 div 假造整页截图；套餐不做三张完全相同的价格卡，按业务位置分组对比；商业推荐统一显示“广告/推广”；企业未认证时主按钮变为“完成企业认证”。计费未定的项目显示“方案确认中”，不擅自标价。

页面跳转规则：创建计划跳 `/pages/ad/campaign?mode=create&biz=...`；查看已有计划跳 `/pages/ad/campaign?mode=dashboard`；企业认证跳 `/pages/profile/account?mode=enterprise&returnUrl=...`；广告位预览按位置跳首页、学考、工作或交易根页，并通过全局预览上下文高亮示意；余额不足提示跳 `/pages/profile/wallet?tab=balance`。

---

## 第 33 页 Prompt：广告计划创建与投放看板

在现有 Vue 3 uni-app 项目中实现广告计划页，路由 `/pages/ad/campaign?mode=create|dashboard&id=...`，顶部标题根据模式显示“创建广告计划”或“投放看板”，Tab Bar 高亮首页。

页面详细布局：创建模式采用单页分组表单，不做冗长向导。依次填写推广目标、广告位、落地页、图片/视频素材、地域与行业定向、预算、排期、联系人；右侧或下方提供与目标页面比例一致的实时预览；提交前展示费用摘要、审核规则和状态流。看板模式包含计划列表、审核中/投放中/已暂停/已结束筛选，详情展示预算消耗、曝光、点击、咨询或线索，并明确统计口径与演示数据标识。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；高亮首页。未保存表单切换 Tab 前确认。

样式与交互：素材上传校验尺寸、格式和大小；预算与日期即时校验；预览不允许文字溢出；提交后进入“审核中”而非直接投放；数据看板使用数字、趋势和紧凑图形，不用装饰性满轨进度条；暂停、恢复和删除计划需确认，失败回滚状态。

页面跳转规则：未认证跳 `/pages/profile/account?mode=enterprise&returnUrl=...`；落地页可选择机构详情、职位详情、商品详情或企业主页，并跳对应选择器抽屉；提交前余额不足跳 `/pages/profile/wallet?tab=balance`；提交成功切换 dashboard 模式；广告审核消息跳 `/pages/messages/index?category=ad`；页面预览跳对应业务页并带 `previewCampaignId`。

---

## 第 34 页 Prompt：消息与平台内会话

在现有 Vue 3 uni-app 项目中实现消息中心，路由 `/pages/messages/index?category=all|work|academy|market|community|system|ad&conversationId=...`，顶部标题为“消息中心”。本页仍渲染完全相同的 5 项 Tab Bar，可采用不高亮任何项的统一规则。

页面详细布局：无 conversationId 时，顶部显示未读总数和全部已读；分类分段为工作、学考、交易、互动、系统；消息列表区分业务通知和会话，显示来源、摘要、时间、未读、风险级别和业务状态。带 conversationId 时进入同页会话模式，顶部显示对方认证与场景摘要；聊天区支持文本、图片、文件和订单/任务卡片；任务和招聘场景显示隐私号码保护、禁止线下绕单提示与举报入口。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；背景、图标、顺序、尺寸和颜色与所有页面一致。本页默认无高亮，若全局选择“保持来源模块高亮”，必须由路由状态统一控制。

样式与交互：消息列表支持左滑已读/删除但删除需可撤销；高风险系统消息使用语义色且不过度渲染；会话发送使用乐观更新与失败重发；文件上传显示进度；隐私电话入口只在服务状态可用时启用。空消息、断网、会话已关闭、对方受限都有明确状态。

页面跳转规则：消息通过 `bizType + bizId` 分发，课程预约跳 `/pages/academy/visit?institutionId=...`，职位跳 `/pages/work/job-detail?id=...`，任务跳 `/pages/work/task-detail?id=...` 或 `/pages/work/fulfillment?orderId=...`，商品订单跳 `/pages/market/order?mode=detail&orderId=...`，社区互动跳 `/pages/community/post-detail?id=...`，广告审核跳 `/pages/ad/campaign?mode=dashboard&id=...`；头像跳 `/pages/profile/index?userId=...&public=1`。

---

## 第 35 页 Prompt：个人中心与公开主页

在现有 Vue 3 uni-app 项目中实现个人中心，路由 `/pages/profile/index?userId=...&public=0|1`，顶部标题在本人模式为“我的”，公开模式为用户名称。本页仍使用完全相同的 5 项 Tab Bar，可不高亮任何项。

页面详细布局：本人模式顶部显示头像、昵称、当前个人/企业身份切换、实名/CAAC/企业认证状态、信用摘要和编辑入口；资产摘要展示可用余额、托管中、低空豆；快捷业务区按“学习与报名、简历与投递、发布与接单、买卖与租赁、帖子问答活动”分组；企业身份额外显示招聘中心、机构工作台、广告服务；下方是收藏、消息、客服、隐私和退出。公开模式只显示经用户授权的简介、技能机型、认证、信用依据、内容和评价，不显示资产、订单、手机号或精确位置。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；内容、顺序、图标与颜色不变，本页不增加“我的”第六项。

样式与交互：身份切换使用明确分段控件并展示切换后可用功能；信用摘要可展开查看构成，不给一个无解释分数；快捷业务不要全部做成相同圆角卡片，使用图标网格加分组列表；公开主页遵守隐私开关。退出登录需确认，游客态显示登录和注册入口但仍可返回浏览。

页面跳转规则：登录、编辑、认证和身份切换跳 `/pages/profile/account`；钱包跳 `/pages/profile/wallet`；学习档案跳 `/pages/academy/progress?tab=record`；求职中心跳 `/pages/work/resume`；我的任务跳 `/pages/work/index` 或有进行中订单时跳 `/pages/work/fulfillment?orderId=...`；我的交易跳 `/pages/market/order?mode=list`；内容跳对应帖子详情；招聘中心跳 `/pages/work/talent`；机构工作台跳 `/pages/academy/org-console`；广告跳 `/pages/ad/index`；客服跳 `/pages/messages/index?category=system`。

---

## 第 36 页 Prompt：登录、身份切换与认证中心

在现有 Vue 3 uni-app 项目中实现统一账号中心，路由 `/pages/profile/account?mode=login|identity|caac|enterprise|institution&returnUrl=...`，顶部标题根据模式显示“登录”“身份与认证”或具体认证名称。本页仍渲染统一 5 项 Tab Bar，可不高亮任何项。

页面详细布局：登录模式支持手机号、验证码、用户协议与隐私政策，保留后续第三方登录插槽；认证总览显示个人实名、CAAC 证书、企业营业执照、培训机构资质四类独立状态；个人实名采集法定必要字段并提供人脸核验接入状态；CAAC 采集证书等级、编号、有效期和照片；企业采集企业名称、统一社会信用代码、营业执照、法人/经办人和对公验证状态；机构模式增加办学资质、校区与联系人。顶部提供个人/企业身份切换，但未认证企业切换后只能看到认证引导。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；颜色、图标、文字和顺序完全一致。

样式与交互：表单严格标签上置、分段保存、敏感字段脱敏回显；上传有示例、进度、失败和重新提交；审核状态包含未提交、审核中、已通过、被驳回、已过期，驳回必须显示原因；隐私授权按用途单独说明，不默认勾选；验证码有倒计时和防重复请求。人脸、对公打款或证书接口未接入时明确显示“接入中”，不模拟通过。

页面跳转规则：登录或认证成功后优先返回校验过的 `returnUrl`，否则返回个人中心；企业通过后可跳 `/pages/work/talent`，机构通过后跳 `/pages/academy/org-console`；CAAC 通过后返回原任务详情；协议和隐私在本页可滚动弹层展示，不跳空页面；退出认证流程时保留草稿并返回个人中心。

---

## 第 37 页 Prompt：钱包、托管资金与低空豆

在现有 Vue 3 uni-app 项目中实现钱包页，路由 `/pages/profile/wallet?tab=overview|escrow|beans|transactions|invoice`，顶部标题为“我的钱包”。本页仍渲染统一 5 项 Tab Bar，可不高亮任何项。

页面详细布局：顶部资产摘要分开显示可用余额、托管中、待结算和低空豆，不把托管资金计入可提现；分段切换“资金、托管、低空豆、流水、发票”。托管页按任务和交易显示冻结、分期待放款与争议状态；低空豆页展示获得、消费、悬赏冻结和兑换规则；流水支持时间、类型、业务筛选；发票页展示任务代开、交易和广告发票申请状态。充值、提现和支付均标明演示环境与真实能力接入状态。

底部导航栏：固定为首页 House、学考 GraduationCap、工作 Briefcase、交易 ShoppingBag、社区 Users；保持同一背景、色值、图标、尺寸和顺序。

样式与交互：金额默认可见并提供眼睛图标切换隐藏；资产用数字层级而非夸张卡片；每笔流水显示业务来源、状态和可追踪编号；筛选保留状态；提现或兑换需确认并校验余额；演示支付只改变 mock 状态并显示“演示”，不得调用真实扣款。无流水、网络失败和对账中有独立状态。

页面跳转规则：任务托管流水跳 `/pages/work/fulfillment?orderId=...`；交易流水跳 `/pages/market/order?mode=detail&orderId=...`；课程记录跳 `/pages/academy/progress?tab=record`；广告费用跳 `/pages/ad/campaign?mode=dashboard&id=...`；低空豆悬赏跳 `/pages/community/knowledge?mode=question&id=...`；客服与账单异常跳 `/pages/messages/index?category=system`；身份信息不完整时跳 `/pages/profile/account?mode=identity&returnUrl=...`。

---

## 最终联调 Prompt：所有页面完成后执行

请对以上页面做一次全项目联调，不新增业务范围。逐项检查：所有 `pages.json` 路由真实存在；每页顶部标题正确；每页 `AppTabBar` 的 5 项内容、顺序、图标、颜色和安全区完全一致；所属模块高亮正确；所有跳转目标存在且参数名一致；返回栈为空时有根页兜底；页面底部内容不被 Tab Bar 遮挡；表单键盘弹出不遮挡提交按钮；列表具备骨架、空、错误和重试；登录、实名、CAAC、企业、机构权限守卫按规则工作；个人/企业切换后数据视图隔离；所有支付、托管、保险、签章、过考率、信用、广告数据、质检和区块链状态在未接真实服务时明确标注演示或接入中。

检查设计一致性：全项目只使用既定深蓝底和青绿主强调色；橙黄、红色只表达语义；卡片 8px、控件 6px、状态标签胶囊形的规则一致；无紫蓝渐变、外发光、假 3D、手绘 SVG、远程坏图、嵌套卡片和大段营销文案；图标只来自同一图标家族；按钮文字不换行；中文长文本、最长企业名、最大金额、空数据和小屏设备都不溢出。

最后运行项目已有的 lint、测试和构建命令。若没有自动化测试，至少编译 H5，并手动验证首页、学考选课、职位投递、任务发布到履约、商品到订单、帖子发布、企业广告、身份切换 8 条主流程。修复控制台错误和明显布局问题后，输出新增/修改文件清单、测试结果和仍需后端接入的能力列表。
