const clone = (value) => JSON.parse(JSON.stringify(value))

export const demoProfileOverview = {
  dataMode: 'demo',
  source: '前端演示数据',
  updatedAt: '2026-07-30T09:30:00+08:00',
  user: {
    id: 'demo-user',
    nickname: '低空用户',
    avatar: '',
    phone: '138****5207',
    bio: '无人机行业从业者，资料以服务端返回为准。'
  },
  roles: [
    { key: 'personal', label: '个人用户', active: true, source: '演示数据', status: 'demo' },
    { key: 'pilot', label: '飞手', active: false, source: '演示数据', status: 'pending' }
  ],
  verifications: [
    { key: 'personal', label: '个人实名', status: 'pending', source: '演示数据', updatedAt: '' },
    { key: 'caac', label: 'CAAC 证书', status: 'unverified', source: '演示数据', updatedAt: '' },
    { key: 'enterprise', label: '企业认证', status: 'unverified', source: '演示数据', updatedAt: '' }
  ],
  aggregates: {
    learning: { label: '学习记录', value: 3, unit: '项', source: '演示数据', status: 'demo' },
    work: { label: '工作记录', value: 2, unit: '项', source: '演示数据', status: 'demo' },
    trade: { label: '交易记录', value: 1, unit: '项', source: '演示数据', status: 'demo' },
    favorites: { label: '收藏', value: 6, unit: '项', source: '演示数据', status: 'demo' }
  },
  credit: {
    label: '信用摘要',
    summary: '暂无可核验信用结论',
    source: '信用服务待接入',
    status: 'pending',
    factors: ['实名与资质核验', '履约及争议记录', '交易和社区行为']
  }
}

export const demoWalletSummary = {
  dataMode: 'demo',
  source: '前端演示数据',
  updatedAt: '2026-07-30T09:30:00+08:00',
  currency: 'CNY',
  assets: {
    balance: { label: '账户余额', value: 1688.5, source: '演示账本', status: 'demo' },
    available: { label: '可用余额', value: 1288.5, source: '演示账本', status: 'demo' },
    frozen: { label: '冻结金额', value: 120, source: '演示账本', status: 'demo' },
    escrow: { label: '托管资金', value: 280, source: '演示托管记录', status: 'demo' }
  },
  capabilities: [
    { key: 'recharge', label: '充值', note: '需由支付渠道返回受理和到账状态，前端不保存支付凭据。', source: '支付渠道', status: 'unavailable' },
    { key: 'withdraw', label: '提现', note: '需完成身份、账户和风控校验，以服务端可提现额度为准。', source: '钱包与风控服务', status: 'unavailable' },
    { key: 'refund', label: '退款', note: '由原订单状态机发起，退款原路及到账时间由支付渠道确认。', source: '订单与支付服务', status: 'pending' },
    { key: 'escrow', label: '资金托管', note: '托管、冻结和放款均以同一订单及托管服务状态为准。', source: '托管服务沙箱', status: 'demo' },
    { key: 'signature', label: 'CA 签章', note: '合同签署结果必须由签章服务回传。', source: '签章服务待接入', status: 'unavailable' },
    { key: 'inspection', label: '平台质检', note: '质检报告须包含机构、报告编号和核验时间。', source: '质检服务待接入', status: 'unavailable' },
    { key: 'evidence', label: '存证', note: '存证编号和链上状态只能由存证服务返回。', source: '存证服务待接入', status: 'unavailable' }
  ]
}

export const demoWalletBills = [
  {
    id: 'bill-demo-01',
    title: '任务首期款托管',
    amount: -280,
    direction: 'out',
    type: 'escrow',
    bizType: 'work',
    bizId: 'order-task-01',
    status: 'processing',
    occurredAt: '2026-07-29T14:22:00+08:00',
    traceNo: 'DEMO-ESC-0729-01',
    source: '演示托管记录',
    sourceStatus: 'demo',
    to: '/pages/work/fulfillment?orderId=order-task-01'
  },
  {
    id: 'bill-demo-02',
    title: '课程预约退款',
    amount: 399,
    direction: 'in',
    type: 'refund',
    bizType: 'academy',
    bizId: 'visit-demo-01',
    status: 'pending',
    occurredAt: '2026-07-27T11:08:00+08:00',
    traceNo: 'DEMO-REF-0727-01',
    source: '演示退款记录',
    sourceStatus: 'demo',
    to: '/pages/academy/progress?tab=record'
  },
  {
    id: 'bill-demo-03',
    title: '设备交易退款完成',
    amount: 1580,
    direction: 'in',
    type: 'refund',
    bizType: 'market',
    bizId: 'market-01',
    status: 'confirmed',
    occurredAt: '2026-07-18T16:40:00+08:00',
    traceNo: 'DEMO-REF-0718-03',
    source: '演示订单记录',
    sourceStatus: 'demo',
    to: '/pages/market/order?mode=detail&orderId=market-01'
  },
  {
    id: 'bill-demo-04',
    title: '低空豆悬赏冻结',
    amount: 0,
    displayAmount: '120 低空豆',
    direction: 'out',
    type: 'beans',
    bizType: 'community',
    bizId: 'question-demo-01',
    status: 'processing',
    occurredAt: '2026-07-12T09:15:00+08:00',
    traceNo: 'DEMO-BEAN-0712-01',
    source: '演示低空豆记录',
    sourceStatus: 'demo',
    to: '/pages/community/knowledge?mode=question&id=question-demo-01'
  }
]

export const demoMessageInbox = {
  dataMode: 'demo',
  source: '前端演示数据',
  unreadTotal: 4,
  updatedAt: '2026-07-30T09:30:00+08:00',
  items: [
    {
      id: 'notice-demo-01',
      itemType: 'notice',
      category: 'academy',
      title: '试听预约已受理',
      summary: '中航飞训中心已收到预约，请留意后续确认消息。',
      source: '学考预约服务',
      sourceStatus: 'demo',
      businessStatus: 'processing',
      risk: 'normal',
      unread: true,
      time: '2026-07-30T09:20:00+08:00',
      to: '/pages/academy/visit?institutionId=school-01'
    },
    {
      id: 'conversation-demo-01',
      itemType: 'conversation',
      conversationId: 'conversation-demo-01',
      category: 'work',
      title: '任务沟通',
      summary: '交付文件已收到，请在平台内确认验收意见。',
      source: '站内会话服务',
      sourceStatus: 'demo',
      businessStatus: 'processing',
      risk: 'normal',
      unread: true,
      unreadCount: 2,
      time: '2026-07-30T08:46:00+08:00'
    },
    {
      id: 'notice-demo-02',
      itemType: 'notice',
      category: 'market',
      title: '退款申请处理中',
      summary: '退款已提交支付渠道，到账时间以渠道结果为准。',
      source: '订单与支付服务',
      sourceStatus: 'demo',
      businessStatus: 'pending',
      risk: 'normal',
      unread: true,
      time: '2026-07-29T17:12:00+08:00',
      to: '/pages/market/order?mode=detail&orderId=market-01'
    },
    {
      id: 'conversation-demo-02',
      itemType: 'conversation',
      conversationId: 'conversation-demo-02',
      category: 'community',
      title: '社区互动',
      summary: '有人回复了你的超视距法规问答。',
      source: '社区消息服务',
      sourceStatus: 'demo',
      businessStatus: 'confirmed',
      risk: 'normal',
      unread: false,
      unreadCount: 0,
      time: '2026-07-28T20:35:00+08:00'
    },
    {
      id: 'notice-demo-03',
      itemType: 'notice',
      category: 'system',
      title: '请核验账号安全设置',
      summary: '平台不会索取短信验证码、支付密码或 API Key。',
      source: '平台安全中心',
      sourceStatus: 'demo',
      businessStatus: 'pending',
      risk: 'high',
      unread: true,
      time: '2026-07-28T10:10:00+08:00'
    }
  ]
}

export const demoConversations = {
  'conversation-demo-01': {
    id: 'conversation-demo-01',
    title: '任务沟通',
    category: 'work',
    closed: false,
    restricted: false,
    counterparty: {
      name: '华北巡检项目组',
      phoneMasked: '138****1042',
      verificationLabel: '企业认证待后端核验',
      verificationStatus: 'demo',
      source: '演示会话资料'
    },
    scene: {
      label: '输电线路巡检任务',
      bizType: 'work',
      bizId: 'order-task-01',
      source: '演示任务关联',
      status: 'demo',
      to: '/pages/work/fulfillment?orderId=order-task-01'
    },
    privacy: {
      protectedPhone: true,
      phoneServiceStatus: 'unavailable',
      note: '仅在服务端授权后展示隐私号码。请勿交换支付凭据或绕开平台交易。'
    },
    messages: [
      { id: 'msg-demo-01', type: 'text', sender: 'other', content: '交付文件已收到，请在平台内确认验收意见。', sentAt: '2026-07-30T08:45:00+08:00', deliveryStatus: 'read', sourceStatus: 'demo' },
      { id: 'msg-demo-02', type: 'image', sender: 'other', content: '', imageUrl: '/static/logo.png', sentAt: '2026-07-30T08:46:00+08:00', deliveryStatus: 'read', sourceStatus: 'demo' }
    ]
  },
  'conversation-demo-02': {
    id: 'conversation-demo-02',
    title: '社区互动',
    category: 'community',
    closed: false,
    restricted: false,
    counterparty: {
      name: '飞友交流会',
      phoneMasked: '未授权展示',
      verificationLabel: '社区用户',
      verificationStatus: 'demo',
      source: '演示会话资料'
    },
    scene: {
      label: '超视距法规问答',
      bizType: 'community',
      bizId: 'post-01',
      source: '演示内容关联',
      status: 'demo',
      to: '/pages/community/post-detail?id=post-01'
    },
    privacy: {
      protectedPhone: true,
      phoneServiceStatus: 'unavailable',
      note: '对方联系方式未授权展示，请通过平台内消息沟通。'
    },
    messages: [
      { id: 'msg-demo-03', type: 'text', sender: 'other', content: '我补充了法规原文链接，请以主管部门最新通知为准。', sentAt: '2026-07-28T20:35:00+08:00', deliveryStatus: 'read', sourceStatus: 'demo' }
    ]
  }
}

export function getDemoProfileOverview() {
  return clone(demoProfileOverview)
}

export function getDemoWalletSummary() {
  return clone(demoWalletSummary)
}

export function getDemoWalletBills() {
  return clone(demoWalletBills)
}

export function getDemoMessageInbox() {
  return clone(demoMessageInbox)
}

export function getDemoConversation(id) {
  return clone(demoConversations[id] || null)
}
