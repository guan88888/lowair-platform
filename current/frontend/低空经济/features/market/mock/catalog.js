import { cloneDemo } from '../../shared/utils/route-options'

const DEMO_SOURCE = '演示目录样例'
const DEMO_TIME = '2026-07-30 10:00'

const pendingEvidence = (label, status = '待核验', source = DEMO_SOURCE, recordedAt = DEMO_TIME) => ({ label, status, source, recordedAt })

const products = [
  {
    id: 'device-01', category: 'drone', categoryLabel: '二手无人机', brand: 'DJI', model: 'Matrice 30T', title: 'Matrice 30T 行业套装',
    price: 36800, priceUnit: '', city: '北京', condition: '8.5 成新', stock: 1, delivery: ['shipping', 'pickup'],
    image: '/static/images/lowair-market-drone.png', images: ['/static/images/lowair-market-drone.png', '/static/images/lowair-used-drone-flight.png'],
    summary: '含遥控器、双电池与收纳箱，卖家声明用于电力巡检。', seller: { name: '行业设备寄售方', status: '认证状态以服务端为准', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('1581F5••••7K2', '待核验', '卖家提交'), inspection: pendingEvidence('报告待接入', '待核验'),
    blockchain: pendingEvidence('未返回链上字段', '接入中', '存证服务'), historyStatus: pendingEvidence('履历记录待比对', '待核验'),
    flightHours: '612 小时（卖家声明）', repairHistory: '2025-11 更换右后机臂（卖家声明）', crashHistory: '卖家声明无炸机，尚未核验',
    battery: { health: '86% / 84%（卖家上传）', cycles: '97 / 112 次（卖家上传）', status: '待核验' },
    configuration: ['RC Plus 遥控器', 'TB30 电池 2 块', 'BS30 充电箱', '原厂运输箱'],
    specs: [{ label: '最大起飞重量', value: '4.2 kg' }, { label: '防护等级', value: 'IP55（厂商规格）' }, { label: '热成像', value: '640 × 512' }, { label: '交付库存', value: '演示 1 台' }],
    deliveryNotes: ['北京朝阳可预约自提验机', '邮寄范围和运费由订单报价接口返回'], rentable: true
  },
  {
    id: 'device-02', category: 'drone', categoryLabel: '二手无人机', brand: 'Autel', model: 'EVO Max 4T', title: 'EVO Max 4T 巡检套装',
    price: 28600, city: '成都', condition: '9 成新', stock: 1, delivery: ['pickup'], image: '/static/images/lowair-used-drone-flight.png', images: ['/static/images/lowair-used-drone-flight.png'],
    summary: '可见光与热成像行业机，当前仅开放成都自提。', seller: { name: '成都设备发布者', status: '个人发布，认证规则由服务端判断', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('MAX4T••••29C', '卖家声明', '卖家提交'), inspection: pendingEvidence('未预约质检', '待核验'), blockchain: pendingEvidence('未返回链上字段', '接入中', '存证服务'), historyStatus: pendingEvidence('暂无平台履历', '未收录'),
    flightHours: '138 小时（卖家声明）', repairHistory: '卖家声明无维修，尚未核验', crashHistory: '卖家声明轻微桨叶剐蹭', battery: { health: '卖家未提供', cycles: '41 / 43 次（卖家上传）', status: '待补充' },
    configuration: ['行业遥控器', '智能电池 2 块', '充电器', '便携箱'], specs: [{ label: '相机组合', value: '广角 / 变焦 / 热成像' }, { label: '避障', value: '全向感知（厂商规格）' }, { label: '交付', value: '成都自提' }, { label: '库存', value: '演示 1 台' }], deliveryNotes: ['仅支持成都高新区预约自提'], rentable: false
  },
  {
    id: 'device-03', category: 'drone', categoryLabel: '二手无人机', brand: 'DJI', model: 'Mavic 3 Enterprise', title: 'Mavic 3E 测绘组合',
    price: 14200, city: '杭州', condition: '8 成新', stock: 2, delivery: ['shipping', 'pickup'], image: '/static/images/lowair-carousel-market.png', images: ['/static/images/lowair-carousel-market.png', '/static/images/lowair-market-drone.png'],
    summary: '含 RTK 模块，机身使用痕迹和配件明细见发布者说明。', seller: { name: '测绘工作室发布者', status: '企业状态待服务端返回', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('M3E••••8P9', '待核验', '卖家提交'), inspection: pendingEvidence('质检预约未完成', '处理中'), blockchain: pendingEvidence('未返回链上字段', '接入中', '存证服务'), historyStatus: pendingEvidence('激活时间来自卖家截图', '待核验'),
    flightHours: '329 小时（卖家声明）', repairHistory: '云台减震球更换（卖家声明）', crashHistory: '卖家声明无炸机，尚未核验', battery: { health: '88% / 87% / 83%（卖家上传）', cycles: '73 / 81 / 96 次', status: '待核验' },
    configuration: ['RC Pro Enterprise', 'RTK 模块', '电池 3 块', '充电管家'], specs: [{ label: '相机', value: '4/3 CMOS' }, { label: '测绘', value: '机械快门（厂商规格）' }, { label: 'RTK', value: '含模块' }, { label: '库存', value: '演示 2 台' }], deliveryNotes: ['杭州可自提', '邮寄报价由服务端计算'], rentable: false
  },
  {
    id: 'part-01', category: 'accessory', categoryLabel: '配件', brand: 'DJI', model: 'TB30', title: 'TB30 电池双块套装',
    price: 4680, city: '北京', condition: '正常使用痕迹', stock: 3, delivery: ['shipping', 'pickup'], image: '/static/images/lowair-market-accessories.png', images: ['/static/images/lowair-market-accessories.png'],
    summary: '适用于 Matrice 30 系列，健康度与循环次数来自卖家截图。', seller: { name: '行业设备寄售方', status: '认证状态以服务端为准', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('TB30••••31 / ••46', '待核验', '卖家提交'), inspection: pendingEvidence('电池检测报告待接入', '待核验'), blockchain: pendingEvidence('配件不提供链上字段', '不适用', '商品规则'), historyStatus: pendingEvidence('暂无平台履历', '未收录'),
    flightHours: '不适用', repairHistory: '卖家声明未维修', crashHistory: '不适用', battery: { health: '89% / 87%（卖家上传）', cycles: '82 / 91 次（卖家上传）', status: '待核验' },
    configuration: ['TB30 电池 2 块', '端子保护盖'], specs: [{ label: '适配机型', value: 'Matrice 30 系列' }, { label: '数量', value: '2 块' }, { label: '检测', value: '待接入' }, { label: '库存', value: '演示 3 套' }], deliveryNotes: ['支持邮寄或北京自提'], rentable: false
  },
  {
    id: 'part-02', category: 'accessory', categoryLabel: '配件', brand: 'DJI', model: 'Mavic 3E 配件包', title: 'Mavic 3E 桨叶与充电套件',
    price: 980, city: '深圳', condition: '未拆封与二手混合套装', stock: 5, delivery: ['shipping'], image: '/static/images/lowair-market-accessories.png', images: ['/static/images/lowair-market-accessories.png'],
    summary: '包含桨叶、充电管家与车充，具体成色按单件说明。', seller: { name: '深圳配件发布者', status: '认证状态以服务端为准', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('无整机 SN', '不适用', '商品规则'), inspection: pendingEvidence('未提供第三方检测', '待核验'), blockchain: pendingEvidence('未返回链上字段', '不适用', '商品规则'), historyStatus: pendingEvidence('暂无平台履历', '未收录'),
    flightHours: '不适用', repairHistory: '不适用', crashHistory: '不适用', battery: { health: '套装不含电池', cycles: '不适用', status: '不适用' },
    configuration: ['低噪桨叶 4 对', '充电管家', '65W 车充'], specs: [{ label: '适配机型', value: 'Mavic 3E / 3T' }, { label: '桨叶', value: '4 对' }, { label: '电池', value: '不含' }, { label: '库存', value: '演示 5 套' }], deliveryNotes: ['仅支持邮寄，运费由报价接口返回'], rentable: false
  },
  {
    id: 'rental-01', category: 'rental', categoryLabel: '租赁', brand: 'DJI', model: 'Matrice 30T', title: 'Matrice 30T 项目租赁',
    price: 520, priceUnit: '/日', city: '上海', condition: '租赁周转设备', stock: 2, delivery: ['shipping', 'pickup'], image: '/static/images/lowair-used-drone-flight.png', images: ['/static/images/lowair-used-drone-flight.png', '/static/images/lowair-market-drone.png'],
    summary: '适合短期巡检项目，库存与日期必须由租赁报价接口确认。', seller: { name: '设备租赁服务方', status: '经营主体状态以服务端为准', source: '卖家资料接口', recordedAt: DEMO_TIME },
    sn: pendingEvidence('下单锁机后返回脱敏 SN', '待分配', '租赁库存服务'), inspection: pendingEvidence('交付前报告由服务端返回', '待生成', '租赁质检服务'), blockchain: pendingEvidence('未返回链上字段', '接入中', '存证服务'), historyStatus: pendingEvidence('履历在设备分配后可查', '待分配', '租赁库存服务'),
    flightHours: '设备分配后返回', repairHistory: '设备分配后返回', crashHistory: '设备分配后返回', battery: { health: '交付前报告返回', cycles: '设备分配后返回', status: '待生成' },
    configuration: ['机身与行业遥控器', '电池 4 块', '充电箱', '运输箱'], specs: [{ label: '起租', value: '3 日' }, { label: '日租金', value: '演示 ¥ 520' }, { label: '可租库存', value: '演示 2 台' }, { label: '异地交付', value: '需报价' }], deliveryNotes: ['上海可自提', '异地配送以服务端报价为准'], rentable: true
  }
]

const rentalPlans = {
  'device-01': [
    { id: 'short-7', name: '短租 7 日', days: 7, rent: 4200, deposit: 12000, depositRule: '订单创建时冻结规则由支付/托管服务返回', ownership: '到期归还' },
    { id: 'long-3', name: '长租 3 个月', months: 3, rent: 4800, deposit: 10000, depositRule: '押金递减需服务端按履约状态计算', ownership: '到期归还，可申请续租或买断报价' },
    { id: 'own-12', name: '租满即送 12 个月', months: 12, rent: 3999, deposit: 8000, depositRule: '演示金额，实际冻结与递减规则待接口返回', ownership: '满 12 个月后的归属以服务端合同为准' }
  ],
  'rental-01': [
    { id: 'project-3', name: '项目短租', days: 3, rent: 1560, deposit: 18000, depositRule: '演示报价，不触发真实冻结', ownership: '到期归还' },
    { id: 'project-14', name: '项目两周', days: 14, rent: 6300, deposit: 15000, depositRule: '演示报价，不触发真实冻结', ownership: '到期归还' }
  ]
}

const deviceHistories = {
  '1581F5DEMO7K2': {
    productId: 'device-01', model: 'DJI Matrice 30T', maskedSn: '1581F5••••7K2', currentStatus: '样例记录，待后端核验',
    sn: pendingEvidence('1581F5••••7K2', '待核验', '卖家提交'),
    inspection: { label: '报告待接入', status: '待核验', source: '演示目录样例', recordedAt: DEMO_TIME, reportNo: '', method: '未返回', organization: '未返回', reportImage: '' },
    checks: [{ label: '机身', value: '卖家声明有正常划痕', status: '待核验' }, { label: '云台', value: '卖家声明功能正常', status: '待核验' }, { label: '电机', value: '未提供检测数据', status: '待补充' }, { label: '电池', value: '健康度截图待核验', status: '待核验' }, { label: '遥控器', value: '卖家声明功能正常', status: '待核验' }, { label: '配件', value: '清单待交付复核', status: '待核验' }],
    timeline: [{ time: '2024-04（卖家声明）', title: '首次激活', source: '卖家提交', status: '待核验' }, { time: '2025-11（卖家声明）', title: '更换右后机臂', source: '卖家提交', status: '待核验' }, { time: DEMO_TIME, title: '发布交易信息', source: DEMO_SOURCE, status: '演示' }],
    blockchain: pendingEvidence('未返回链名、交易哈希或区块高度', '接入中', '存证服务')
  }
}

const orders = [
  { id: 'DEMO-BUY-240731', productId: 'device-01', title: 'Matrice 30T 行业套装', tradeType: 'buy', tradeTypeLabel: '二手购买', status: 'pending_payment', statusLabel: '待付款', statusSource: '演示订单样例', updatedAt: DEMO_TIME, amount: 36960, image: '/static/images/lowair-market-drone.png', deliveryLabel: '北京自提', escrow: pendingEvidence('未创建托管指令', '待服务端返回', '支付/托管服务'), dispute: pendingEvidence('无售后申请', '以服务端为准', '订单服务') },
  { id: 'DEMO-INSPECT-240729', productId: 'device-03', title: 'Mavic 3E 测绘组合', tradeType: 'buy', tradeTypeLabel: '二手购买', status: 'inspection', statusLabel: '待验机', statusSource: '演示订单样例', updatedAt: '2026-07-29 16:20', amount: 14360, image: '/static/images/lowair-carousel-market.png', deliveryLabel: '杭州自提', escrow: pendingEvidence('托管字段未接入', '接入中', '支付/托管服务'), dispute: pendingEvidence('无售后申请', '以服务端为准', '订单服务') },
  { id: 'DEMO-LEASE-240725', productId: 'rental-01', title: 'Matrice 30T 项目租赁', tradeType: 'lease', tradeTypeLabel: '设备租赁', status: 'renting', statusLabel: '租赁中', statusSource: '演示订单样例', updatedAt: '2026-07-25 09:15', amount: 19560, image: '/static/images/lowair-used-drone-flight.png', deliveryLabel: '上海自提', rentalPeriod: '2026-07-25 至 2026-08-07（演示）', escrow: pendingEvidence('押金状态未接入', '接入中', '支付/托管服务'), dispute: pendingEvidence('无售后申请', '以服务端为准', '订单服务') },
  { id: 'DEMO-AFTERSALE-240718', productId: 'part-01', title: 'TB30 电池双块套装', tradeType: 'buy', tradeTypeLabel: '配件购买', status: 'dispute', statusLabel: '售后争议中', statusSource: '演示订单样例', updatedAt: '2026-07-28 14:40', amount: 4680, image: '/static/images/lowair-market-accessories.png', deliveryLabel: '邮寄', escrow: pendingEvidence('退款状态未接入', '接入中', '支付/托管服务'), dispute: pendingEvidence('等待服务端争议处理结果', '处理中', '订单售后服务', '2026-07-28 14:40') }
]

export function getDemoProducts() { return cloneDemo(products) }
export function getDemoProduct(id) { return cloneDemo(products.find((item) => item.id === id)) }
export function getDemoRentalPlans(id) { return cloneDemo(rentalPlans[id] || []) }
export function getDemoHistory(sn) { return cloneDemo(deviceHistories[String(sn || '').replace(/[^a-z0-9]/gi, '').toUpperCase()]) }
export function getDemoOrders() { return cloneDemo(orders) }
