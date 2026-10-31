import { cloneDemo } from '../../shared/utils/route-options'

const demoMeta = {
  demo: true,
  source: '平台演示数据集',
  updatedAt: '2026-07-30 18:00'
}

export const demoHomeModules = {
  carousel: {
    meta: { ...demoMeta, source: '平台运营演示数据' },
    items: [
      {
        id: 'certification',
        kicker: '主体核验',
        title: '认证信息集中查看',
        note: '机构、企业和飞手的状态以后端核验结果为准。',
        action: '查看认证说明',
        to: '/pages/profile/account',
        image: '/static/images/lowair-carousel-certification.png'
      },
      {
        id: 'work',
        kicker: '飞行作业',
        title: '按资质匹配作业任务',
        note: '接单前核对机型、空域、资质和现场交付要求。',
        action: '浏览任务',
        to: '/pages/work/index',
        image: '/static/images/lowair-carousel-work.png'
      },
      {
        id: 'market',
        kicker: '设备交易',
        title: '设备履历需要核验',
        note: '质检、序列号和维修记录以实际服务接入状态为准。',
        action: '查看设备',
        to: '/pages/market/index',
        image: '/static/images/lowair-carousel-market.png'
      }
    ]
  },
  summary: {
    meta: { ...demoMeta, source: '首页聚合演示数据' },
    items: [
      { key: 'tasks', label: '可接任务', value: '18', note: '公开任务演示集' },
      { key: 'institutions', label: '认证机构', value: '12', note: '核验状态演示' },
      { key: 'products', label: '在售设备', value: '36', note: '商品演示集' },
      { key: 'flight', label: '适飞参考', value: '谨慎', note: '非许可结论', to: '/pages/flight/index' }
    ]
  },
  entries: {
    meta: { ...demoMeta, source: '平台导航配置' },
    items: [
      { id: 'academy', label: '学考培训', short: '学', note: '课程与机构', to: '/pages/academy/index' },
      { id: 'work', label: '招聘任务', short: '工', note: '岗位与作业', to: '/pages/work/index' },
      { id: 'market', label: '设备交易', short: '贸', note: '设备与配件', to: '/pages/market/index' },
      { id: 'community', label: '行业社区', short: '社', note: '知识与交流', to: '/pages/community/index' }
    ]
  },
  tasks: {
    meta: { ...demoMeta, source: '任务中心演示数据' },
    title: '加急任务',
    action: '查看任务',
    to: '/pages/work/index',
    items: [
      { id: 'task-01', title: '电力线路巡检', note: '明日 08:30，需超视距资质', tag: '资金托管演示', to: '/pages/work/task-detail?id=task-01' },
      { id: 'task-02', title: '近郊农业植保', note: '公开抢单，作业边界待确认', tag: '加急演示', to: '/pages/work/task-detail?id=task-02' }
    ]
  },
  institutions: {
    meta: { ...demoMeta, source: '培训机构演示数据' },
    title: '附近认证机构',
    action: '机构榜单',
    to: '/pages/academy/institutions',
    items: [
      { id: 'school-01', title: '中航飞训中心', note: '超视距课程，可预约试听', tag: '资质演示', to: '/pages/academy/institution-detail?id=school-01' },
      { id: 'school-02', title: '京北飞行学院', note: '演示距离 6.2 km，小班实操', tag: '推广', to: '/pages/academy/institution-detail?id=school-02' }
    ]
  },
  devices: {
    meta: { ...demoMeta, source: '设备交易演示数据' },
    title: '平台严选设备',
    action: '进入交易',
    to: '/pages/market/index',
    items: [
      { id: 'device-01', title: 'Matrice 系列专业机', note: '质检报告与 SN 履历待接入', tag: '待核验', to: '/pages/market/product-detail?id=device-01' },
      { id: 'part-01', title: '专业电池与配件', note: '健康度报告随单展示', tag: '自提可验机', to: '/pages/market/product-detail?id=part-01' }
    ]
  },
  rumors: {
    meta: { ...demoMeta, source: '官方内容频道演示数据' },
    title: '官方辟谣',
    action: '查看全部',
    to: '/pages/community/knowledge?mode=official',
    items: [
      { id: 'notice-01', title: '“低空就能随时飞”不准确', note: '飞行仍需核对空域、临时管制与属地要求', tag: '官方标识演示', to: '/pages/community/knowledge?mode=official&id=notice-01' },
      { id: 'notice-02', title: '平台提示不能代替飞行许可', note: '许可状态只以主管部门渠道和审批结果为准', tag: '安全提示', to: '/pages/community/knowledge?mode=official&id=notice-02' }
    ]
  }
}

export const demoSearchCatalog = [
  { id: 'school-01', category: '机构', title: '中航飞训中心', note: '超视距课程，资质状态为演示', source: '机构演示数据', to: '/pages/academy/institution-detail?id=school-01' },
  { id: 'school-02', category: '机构', title: '京北飞行学院', note: '小班实操与预约试听', source: '机构演示数据', to: '/pages/academy/institution-detail?id=school-02' },
  { id: 'school-03', category: '机构', title: '华北无人机实训基地', note: '多旋翼基础与飞前检查', source: '机构演示数据', to: '/pages/academy/institution-detail?id=school-03' },
  { id: 'job-01', category: '岗位', title: '电力巡检飞手', note: '企业直招，要求 CAAC 超视距', source: '岗位演示数据', to: '/pages/work/job-detail?id=job-01' },
  { id: 'job-02', category: '岗位', title: '无人机测绘工程师', note: '负责航线设计与数据交付', source: '岗位演示数据', to: '/pages/work/job-detail?id=job-02' },
  { id: 'job-03', category: '岗位', title: '植保项目执行员', note: '旺季项目制，需核对作业经验', source: '岗位演示数据', to: '/pages/work/job-detail?id=job-03' },
  { id: 'task-01', category: '任务', title: '电力线路巡检', note: '明日 08:30，需超视距资质', source: '任务演示数据', to: '/pages/work/task-detail?id=task-01' },
  { id: 'task-02', category: '任务', title: '近郊植保作业', note: '临时任务，资金托管为演示', source: '任务演示数据', to: '/pages/work/task-detail?id=task-02' },
  { id: 'task-03', category: '任务', title: '园区正射测绘', note: '需提交航线与成果格式说明', source: '任务演示数据', to: '/pages/work/task-detail?id=task-03' },
  { id: 'device-01', category: '商品', title: 'Matrice 系列专业机', note: '二手无人机，质检与 SN 待核验', source: '商品演示数据', to: '/pages/market/product-detail?id=device-01' },
  { id: 'part-01', category: '商品', title: '专业智能飞行电池', note: '健康度报告随单展示', source: '商品演示数据', to: '/pages/market/product-detail?id=part-01' },
  { id: 'device-02', category: '商品', title: '便携航测无人机', note: '支持自提验机，履历待接入', source: '商品演示数据', to: '/pages/market/product-detail?id=device-02' },
  { id: 'content-01', category: '内容', title: '空域申报常见误区', note: '飞行提示不能代替主管部门许可', source: '内容演示数据', to: '/pages/community/knowledge?mode=official&id=notice-01' },
  { id: 'content-02', category: '内容', title: '超视距通信链路检查', note: '起飞前确认链路、返航点与安全冗余', source: '内容演示数据', to: '/pages/community/knowledge?id=content-02' },
  { id: 'content-03', category: '内容', title: '无人机电池鼓包处置', note: '停止充放电并按规范隔离处置', source: '内容演示数据', to: '/pages/community/knowledge?id=content-03' },
  { id: 'content-04', category: '内容', title: '植保任务现场清单', note: '核对边界、人员、气象和药剂要求', source: '内容演示数据', to: '/pages/community/knowledge?id=content-04' }
]

const flightByCity = {
  北京: { temperature: '28°C', windSpeed: '3.4 m/s', visibility: '9 km', condition: '多云', riskCount: 2 },
  天津: { temperature: '27°C', windSpeed: '4.1 m/s', visibility: '8 km', condition: '多云', riskCount: 2 },
  石家庄: { temperature: '30°C', windSpeed: '3.8 m/s', visibility: '7 km', condition: '晴间多云', riskCount: 1 },
  成都: { temperature: '26°C', windSpeed: '2.6 m/s', visibility: '6 km', condition: '阴', riskCount: 2 }
}

export function getDemoFlightConditions(city = '北京') {
  const weather = flightByCity[city] || flightByCity.北京
  return cloneDemo({
    meta: { demo: true, source: '演示气象与风险数据，未接实时站点或主管部门', updatedAt: '2026-07-30 18:00' },
    city,
    status: '演示评估：谨慎',
    statusTone: 'caution',
    weather,
    reasons: [
      `演示风速 ${weather.windSpeed}，仍需现场测风并核对机型限制`,
      `演示能见度 ${weather.visibility}，未包含降水、云底高和局地阵风实时观测`,
      `发现 ${weather.riskCount} 条演示风险提示，未连接空域审批或临时管制数据`
    ],
    risks: [
      { id: 'risk-01', level: '高', title: '机场净空保护提示', note: '演示范围，不代表当前边界或审批状态', source: '演示风险区' },
      { id: 'risk-02', level: '中', title: '临时活动区域提示', note: '起飞前需通过属地官方渠道重新核对', source: '演示风险区' }
    ],
    checklist: [
      { id: 'airspace', title: '空域与临时管制', note: '查询官方渠道并保存有效许可或报备结果' },
      { id: 'weather', title: '气象与现场测风', note: '核对阵风、降水、能见度和机型限制' },
      { id: 'aircraft', title: '机体、电池与桨叶', note: '确认无破损、鼓包、松动和异常告警' },
      { id: 'route', title: '航线、返航与备降', note: '设置返航点并确认人员和地面风险' }
    ],
    disclaimer: '本页只用于整理飞前核查信息，不构成空域许可、适航证明或现场放飞结论。请以主管部门许可、设备手册、实时气象和现场负责人判断为准。'
  })
}

export const demoFlightFields = {
  meta: { ...demoMeta, source: '飞场演示目录，未使用精确定位' },
  items: [
    { id: 'field-01', title: '城市近郊飞行交流点', note: '演示距离 8.4 km，开放状态待核对', tag: '非许可场地', to: '/pages/community/nearby?mode=field&id=field-01' },
    { id: 'field-02', title: '无人机训练场地', note: '需提前联系并核对当日空域安排', tag: '预约演示', to: '/pages/community/nearby?mode=field&id=field-02' }
  ]
}

export const demoMaintenance = {
  meta: { ...demoMeta, source: '维修服务演示目录' },
  items: [
    { id: 'service-01', title: '机体与云台检测', note: '支持到店初检，服务能力以后端商家状态为准', tag: '服务演示', to: '/pages/market/index?mode=service&id=service-01' },
    { id: 'service-02', title: '电池健康度检测', note: '异常电池请停止使用并按规范隔离', tag: '安全优先', to: '/pages/market/index?mode=service&id=service-02' }
  ]
}

export const homePageData = {
  home: {
    title: '低空经济',
    active: 'home',
    root: true,
    kind: 'home',
    carousel: demoHomeModules.carousel.items,
    metrics: demoHomeModules.summary.items.slice(0, 3).map((item) => [item.label, item.value]),
    tools: demoHomeModules.entries.items.map((item) => [item.label, item.id, item.to]),
    sections: [demoHomeModules.tasks, demoHomeModules.institutions, demoHomeModules.devices, demoHomeModules.rumors].map((section) => ({
      title: section.title,
      action: section.action,
      to: section.to,
      cards: section.items.map((item) => [item.title, item.note, item.tag, item.to])
    }))
  },
  search: {
    title: '全局搜索',
    active: 'home',
    kind: 'search',
    tabs: ['全部', '机构', '岗位', '任务', '商品', '内容'],
    sections: [{
      title: '搜索结果',
      cards: demoSearchCatalog.map((item) => [item.title, item.note, item.category, item.to])
    }]
  },
  flight: {
    title: '本地飞行服务',
    active: 'home',
    city: true,
    kind: 'flight',
    hero: {
      eyebrow: '飞行前检查',
      title: '本地适飞状态',
      note: '数据演示，请以主管部门许可、实时气象和现场条件为准',
      action: '切换城市',
      to: '',
      image: '/static/images/lowair-flight-service.png'
    },
    metrics: [['风速', '3.4 m/s'], ['能见度', '9 km'], ['风险区', '2']],
    tools: [
      ['风险与管制', 'flight', ''],
      ['常用飞场', 'field', '/pages/community/nearby?mode=field'],
      ['维修自提', 'service', '/pages/market/index?mode=service'],
      ['飞行规则', 'rule', '/pages/academy/learning?mode=law']
    ],
    sections: [
      {
        title: '起飞前检查',
        cards: [
          ['空域与临时管制', '查询官方渠道并保存有效许可或报备结果', '必查', ''],
          ['气象与现场测风', '核对阵风、降水、能见度和机型限制', '必查', ''],
          ['机体、电池与桨叶', '确认无破损、鼓包、松动和异常告警', '待确认', ''],
          ['航线、返航与备降', '设置返航点并确认人员和地面风险', '待确认', '']
        ]
      },
      {
        title: '飞场与维修服务',
        cards: [
          ...demoFlightFields.items.map((item) => [item.title, item.note, item.tag, item.to]),
          ...demoMaintenance.items.map((item) => [item.title, item.note, item.tag, item.to])
        ]
      }
    ]
  }
}

export function getHomePage(key) {
  return cloneDemo(homePageData[key] || homePageData.home)
}
