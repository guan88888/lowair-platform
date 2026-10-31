export const communitySeedPosts = [
  {
    id: 'post-01',
    author: { id: 'user-zhou', name: '周宁', avatar: '周' },
    owner: false,
    createdAt: '12 分钟前',
    topic: '山区运输',
    visibility: '公开',
    content: '山区物资运输结束后，我复盘了返航点、备降点和风速阈值。轨迹只保留区级范围，几个容易忽略的检查项放在评论区继续讨论。',
    media: [{ id: 'media-01', type: 'image', url: '/static/images/lowair-community-flightlog.png' }],
    stats: { likes: 86, comments: 14 },
    liked: false,
    saved: false,
    comments: [
      { id: 'comment-01', author: '陈屿', content: '返航点和备降点分开记录很有帮助，建议再补充失联后的处置顺序。', createdAt: '8 分钟前' }
    ],
    channels: ['推荐', '同城', '机型圈']
  },
  {
    id: 'post-02',
    author: { id: 'user-xu', name: '许飞', avatar: '许' },
    owner: false,
    createdAt: '1 小时前',
    topic: '超视距备考',
    visibility: '公开',
    content: '通信链路题可以按链路检查、冗余方案、返航设置三组来记。这里是个人复习笔记，法规条文仍应回到原始来源核对。',
    media: [{ id: 'media-02', type: 'image', url: '/static/images/lowair-academy-training.png' }],
    stats: { likes: 42, comments: 9 },
    liked: false,
    saved: false,
    comments: [],
    channels: ['推荐', '关注']
  },
  {
    id: 'post-03',
    author: { id: 'current-user', name: '林澈', avatar: '林' },
    owner: true,
    createdAt: '昨天 18:40',
    topic: '飞前检查',
    visibility: '关注可见',
    content: '把今天的飞前检查单重新整理了一遍。电池外观、气象、空域和返航高度都需要逐项确认，风险提示不能代替许可核验。',
    media: [{ id: 'media-03', type: 'image', url: '/static/images/lowair-flight-service.png' }],
    stats: { likes: 28, comments: 6 },
    liked: true,
    saved: true,
    comments: [],
    channels: ['推荐', '关注']
  },
  {
    id: 'post-04',
    author: { id: 'official-safety', name: '平台安全中心', avatar: '安', official: true },
    owner: false,
    createdAt: '昨天 14:10',
    topic: '信息核验',
    visibility: '公开',
    content: '网传风险区截图可能已经过期。飞行前请核对主管部门最新要求、空域状态和现场条件，社区内容不构成飞行许可。',
    media: [],
    stats: { likes: 116, comments: 21 },
    liked: false,
    saved: false,
    comments: [],
    channels: ['推荐', '官方']
  },
  {
    id: 'post-05',
    author: { id: 'user-tang', name: '唐越', avatar: '唐' },
    owner: false,
    createdAt: '2 天前',
    topic: '设备维护',
    visibility: '机型圈可见',
    content: '长期高湿环境作业后，云台接口和电池仓的检查频率需要提高。我的处理记录只针对当前机型，其他设备请以厂商手册为准。',
    media: [{ id: 'media-05', type: 'image', url: '/static/images/lowair-market-drone.png' }],
    stats: { likes: 33, comments: 11 },
    liked: false,
    saved: false,
    comments: [],
    channels: ['推荐', '机型圈']
  },
  {
    id: 'post-06',
    author: { id: 'user-he', name: '何沐', avatar: '何' },
    owner: false,
    createdAt: '3 天前',
    topic: '同城约飞',
    visibility: '同城可见',
    content: '本周末计划做一次基础构图练习，只共享朝阳区范围。集合点会在双方确认后通过私信发送，不在公开动态里展示精确位置。',
    media: [{ id: 'media-06', type: 'image', url: '/static/images/lowair-community-flightlog.png' }],
    stats: { likes: 19, comments: 7 },
    liked: false,
    saved: false,
    comments: [],
    channels: ['推荐', '同城']
  }
]

export const knowledgeSeed = [
  {
    id: 'knowledge-01',
    title: '民用无人驾驶航空器运行安全管理规则',
    summary: '法规原文索引，展示发布机关、文号、生效时间和原文入口。',
    sourceType: 'regulation',
    sourceName: '主管部门法规原文',
    sourceStatus: '原文待后端接入',
    updatedAt: '以原文页面为准',
    verified: true
  },
  {
    id: 'knowledge-02',
    title: '空域信息核验说明',
    summary: '平台安全中心整理核验步骤，不替代主管部门审批或飞行许可。',
    sourceType: 'official',
    sourceName: '平台安全中心',
    sourceStatus: '官方账号发布',
    updatedAt: '2026-07-28',
    verified: true
  },
  {
    id: 'knowledge-03',
    title: '超视距通信链路检查清单',
    summary: '社区用户依据个人训练经历整理，已补充手册引用，等待专业审核。',
    sourceType: 'user',
    sourceName: '用户许飞',
    sourceStatus: '用户整理，待核验',
    updatedAt: '2026-07-27',
    verified: false
  },
  {
    id: 'knowledge-04',
    title: '电池鼓包后的隔离与处置',
    summary: '来自设备厂商公开手册的摘要，具体型号以对应版本手册为准。',
    sourceType: 'official',
    sourceName: '厂商公开资料',
    sourceStatus: '来源已记录',
    updatedAt: '2026-07-24',
    verified: true
  },
  {
    id: 'knowledge-05',
    title: '城市航拍构图经验',
    summary: '用户经验内容，不包含空域判断或许可结论。',
    sourceType: 'user',
    sourceName: '用户何沐',
    sourceStatus: '用户经验',
    updatedAt: '2026-07-20',
    verified: false
  }
]

export const liveRoomSeed = [
  {
    id: 'live-01',
    state: 'live',
    title: '飞前风险识别答疑',
    host: '平台安全中心',
    schedule: '正在直播',
    cover: '/static/images/lowair-flight-service.png',
    viewers: 328,
    comments: [
      { id: 'live-comment-01', author: '唐越', content: '风险区提示和审批状态应该分别在哪里核对？' }
    ]
  },
  {
    id: 'live-02',
    state: 'scheduled',
    title: '超视距备考公开课',
    host: '北辰飞行教研组',
    schedule: '8 月 2 日 19:30',
    cover: '/static/images/lowair-learning-video.png',
    viewers: 0,
    comments: []
  },
  {
    id: 'live-03',
    state: 'replay',
    title: '山地返航与备降复盘',
    host: '周宁',
    schedule: '回放 36 分钟',
    cover: '/static/images/lowair-community-flightlog.png',
    viewers: 864,
    comments: []
  }
]

export const nearbySeed = {
  friends: [
    { id: 'nearby-user-01', name: '陈屿', area: '朝阳区', specialty: '航拍与巡检', distance: '同区活跃', exact: false },
    { id: 'nearby-user-02', name: '唐越', area: '海淀区', specialty: '设备维护', distance: '同城', exact: false },
    { id: 'nearby-user-03', name: '何沐', area: '通州区', specialty: '影像创作', distance: '同城', exact: false }
  ],
  fields: [
    { id: 'field-01', name: '北辰飞行交流场', area: '顺义区', risk: 'review', source: '用户提交，待运营核验', note: '开放时间和现场要求需向场地方确认。' },
    { id: 'field-02', name: '河西模型活动点', area: '通州区', risk: 'unknown', source: '社区用户记录', note: '未接入实时空域与场地许可数据。' },
    { id: 'field-03', name: '临河训练点', area: '大兴区', risk: 'restricted', source: '风险提示待复核', note: '当前存在风险提示，请停止将此地点作为起飞依据。' }
  ],
  events: [
    { id: 'event-01', name: '同城安全交流会', area: '朝阳区', schedule: '8 月 3 日 14:00', status: '报名中' },
    { id: 'event-02', name: '基础航拍构图练习', area: '海淀区', schedule: '时间待确认', status: '意向征集' }
  ]
}
