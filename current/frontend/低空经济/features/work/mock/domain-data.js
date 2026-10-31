export const jobs = [
  {
    id: 'job-01', title: '无人机巡检飞手', companyId: 'company-01', companyName: '华北智巡科技', city: '北京', district: '昌平区',
    salaryMin: 12000, salaryMax: 18000, employment: '全职', updatedAt: '2026-07-30 16:20', caac: '超视距', aircraft: ['M350 RTK', 'Matrice 30T'],
    experience: '3年以上', education: '大专', status: 'recruiting', verifiedCompany: true,
    responsibilities: ['执行输电线路与变电站巡检', '整理飞行记录、缺陷影像与点位数据', '配合现场负责人完成作业前安全检查'],
    requirements: ['持有效 CAAC 超视距驾驶员执照', '熟悉行业机型与双人作业流程', '可接受北京周边短期出差'],
    benefits: ['五险一金', '项目出差补贴', '年度复训支持'], environment: '户外作业为主，按项目执行安全与休息制度。',
    company: { verifiedLabel: '营业执照已核验', industry: '电力巡检服务', scale: '100-299人', address: '北京市昌平区（详细地址沟通后可见）', openJobs: 4 }
  },
  {
    id: 'job-02', title: '航拍项目执行', companyId: 'company-02', companyName: '山海影像工程', city: '杭州', district: '余杭区',
    salaryMin: 9000, salaryMax: 14000, employment: '全职', updatedAt: '2026-07-29 11:00', caac: '视距内', aircraft: ['Mavic 3E', 'Mavic 3 Pro'],
    experience: '1-3年', education: '不限', status: 'recruiting', verifiedCompany: true,
    responsibilities: ['完成园区、建筑与文旅项目航拍', '按脚本提交原始素材与飞行记录'],
    requirements: ['持有效 CAAC 视距内或以上执照', '具备基础构图与素材管理能力'],
    benefits: ['项目奖金', '设备使用培训'], environment: '城市与近郊项目为主，存在早晚光线窗口作业。',
    company: { verifiedLabel: '营业执照已核验', industry: '商业影像服务', scale: '20-99人', address: '杭州市余杭区（详细地址沟通后可见）', openJobs: 2 }
  },
  {
    id: 'job-03', title: '农业植保项目主管', companyId: 'company-03', companyName: '沃野低空服务', city: '成都', district: '新都区',
    salaryMin: 15000, salaryMax: 22000, employment: '全职', updatedAt: '2026-07-28 09:40', caac: '超视距', aircraft: ['T60', 'T50'],
    experience: '3年以上', education: '大专', status: 'recruiting', verifiedCompany: true,
    responsibilities: ['制定植保作业计划', '管理飞手与药剂安全流程', '复核亩数与作业记录'],
    requirements: ['持有效 CAAC 超视距驾驶员执照', '有两季以上植保项目经验'], benefits: ['旺季补贴', '异地住宿'],
    environment: '作业季节性明显，需适应县域驻场。', company: { verifiedLabel: '营业执照已核验', industry: '农业社会化服务', scale: '100-299人', address: '成都市新都区', openJobs: 3 }
  },
  {
    id: 'job-04', title: '无人机售后培训师', companyId: 'company-04', companyName: '云翼装备服务中心', city: '深圳', district: '宝安区',
    salaryMin: 10000, salaryMax: 16000, employment: '全职', updatedAt: '2026-07-26 14:10', caac: '视距内', aircraft: ['M350 RTK', 'T60'],
    experience: '1-3年', education: '大专', status: 'paused', verifiedCompany: true,
    responsibilities: ['开展交付培训与基础维护指导'], requirements: ['能独立授课并编制作业手册'], benefits: ['五险一金'], environment: '室内培训与客户现场交付结合。',
    company: { verifiedLabel: '营业执照已核验', industry: '无人机装备服务', scale: '20-99人', address: '深圳市宝安区', openJobs: 1 }
  },
  {
    id: 'job-05', title: '测绘内外业工程师', companyId: 'company-01', companyName: '华北智巡科技', city: '北京', district: '海淀区',
    salaryMin: 13000, salaryMax: 20000, employment: '全职', updatedAt: '2026-07-25 10:00', caac: '超视距', aircraft: ['M350 RTK'],
    experience: '3年以上', education: '本科', status: 'recruiting', verifiedCompany: true,
    responsibilities: ['执行航测与成果整理'], requirements: ['熟悉航测数据处理'], benefits: ['项目奖金'], environment: '内外业工作约各占一半。',
    company: { verifiedLabel: '营业执照已核验', industry: '电力巡检服务', scale: '100-299人', address: '北京市海淀区', openJobs: 4 }
  }
]

export const tasks = [
  {
    id: 'task-01', title: '输电线路巡检', city: '北京', location: '昌平区北部约 12 公里范围', workAt: '2026-08-01 08:30',
    deadline: '2026-08-01 07:30', budget: 3200, caac: '超视距', aircraft: 'M350 RTK', duration: '约 6 小时', urgent: true, status: 'open', applicants: 4,
    delivery: '原始照片、缺陷标注表、飞行记录', acceptance: '覆盖工单点位，影像清晰且编号对应，不包含无关个人信息。', description: '按平台工单完成 18 个杆塔点位巡检，现场由发布方安全员协调。',
    publisher: { name: '华北智巡科技', verified: '企业认证已核验', credit: '近 12 个月按约完成记录可查' },
    escrow: { status: 'provider_pending', label: '待服务端确认托管' }, insurance: { status: 'not_connected', label: '保险能力接入中' }, privacyPhone: { status: 'available', label: '隐私号码可用' }
  },
  {
    id: 'task-02', title: '近郊农业植保', city: '成都', location: '新都区东部作业区', workAt: '2026-08-03 06:00', deadline: '2026-08-02 18:00',
    budget: 4600, caac: '视距内', aircraft: 'T60', duration: '约 8 小时', urgent: true, status: 'open', applicants: 7,
    delivery: '作业亩数记录、航迹、现场照片', acceptance: '完成确认地块并提交可核验航迹与药剂使用记录。', description: '发布方提供地块边界和补给点，飞手需自带适配机型。',
    publisher: { name: '沃野低空服务', verified: '企业认证已核验', credit: '历史任务无待处理争议' },
    escrow: { status: 'provider_pending', label: '待服务端确认托管' }, insurance: { status: 'quote_pending', label: '保险询价中' }, privacyPhone: { status: 'available', label: '隐私号码可用' }
  },
  {
    id: 'task-03', title: '园区正射影像采集', city: '杭州', location: '余杭区产业园周边', workAt: '2026-08-06 09:00', deadline: '2026-08-05 17:00',
    budget: 2800, caac: '视距内', aircraft: 'Mavic 3E', duration: '约 4 小时', urgent: false, status: 'open', applicants: 3,
    delivery: '原始影像、POS 数据、正射成果', acceptance: '地面分辨率与重叠率达到工单参数。', description: '园区约 1.8 平方公里，具体边界在报名后按权限提供。',
    publisher: { name: '山海影像工程', verified: '企业认证已核验', credit: '近 12 个月按约完成记录可查' },
    escrow: { status: 'provider_pending', label: '待服务端确认托管' }, insurance: { status: 'not_connected', label: '保险能力接入中' }, privacyPhone: { status: 'available', label: '隐私号码可用' }
  },
  {
    id: 'task-04', title: '厂区热成像复检', city: '深圳', location: '宝安区工业园', workAt: '2026-08-08 20:00', deadline: '2026-08-07 18:00',
    budget: 3600, caac: '超视距', aircraft: 'Matrice 30T', duration: '约 5 小时', urgent: false, status: 'assigned', applicants: 5,
    delivery: '热成像素材与异常点清单', acceptance: '按指定路线完成复检并保留原始测温数据。', description: '夜间窗口作业，任务已指派。',
    publisher: { name: '南湾设施管理', verified: '企业认证已核验', credit: '历史任务无待处理争议' },
    escrow: { status: 'held', label: '服务端返回已托管（演示）' }, insurance: { status: 'not_connected', label: '保险能力接入中' }, privacyPhone: { status: 'available', label: '隐私号码可用' }
  },
  {
    id: 'task-05', title: '文旅宣传素材补拍', city: '杭州', location: '临安区景区周边', workAt: '2026-08-10 15:30', deadline: '2026-08-09 18:00',
    budget: 1900, caac: '视距内', aircraft: 'Mavic 3 Pro', duration: '约 3 小时', urgent: false, status: 'closed', applicants: 8,
    delivery: '4K 原始素材与精选片段', acceptance: '按镜头清单完成并确保素材可正常读取。', description: '天气窗口不满足，发布方已关闭。',
    publisher: { name: '山海影像工程', verified: '企业认证已核验', credit: '近 12 个月按约完成记录可查' },
    escrow: { status: 'not_created', label: '未创建托管' }, insurance: { status: 'not_connected', label: '保险能力接入中' }, privacyPhone: { status: 'available', label: '隐私号码可用' }
  }
]

export const resume = {
  id: 'resume-01', visibility: 'private', intention: '无人机巡检飞手', name: '林远航', city: '北京', phone: '138****7621',
  caacLevel: '超视距', certificateNumber: '用户已提交，待平台核验', certificateVerified: false, aircraft: 'M350 RTK、Matrice 30T',
  experience: '参与电力线路巡检与园区建模项目，负责飞行执行、素材整理和作业记录。', education: '大专，无人机应用技术',
  attachments: [{ id: 'attachment-01', name: '林远航-项目经历.pdf', size: '1.8 MB', status: 'uploaded' }], updatedAt: '2026-07-29 18:10'
}

export const applications = [
  { id: 'application-01', jobId: 'job-02', jobTitle: '航拍项目执行', companyName: '山海影像工程', status: 'viewed', statusLabel: '企业已查看', appliedAt: '2026-07-27 10:20', withdrawable: true },
  { id: 'application-02', jobId: 'job-03', jobTitle: '农业植保项目主管', companyName: '沃野低空服务', status: 'interview', statusLabel: '已邀请面试', appliedAt: '2026-07-25 09:10', withdrawable: false }
]

export const interviews = [
  { id: 'interview-01', applicationId: 'application-02', jobTitle: '农业植保项目主管', companyName: '沃野低空服务', at: '2026-08-02 14:00', method: '平台视频面试', contact: '联系人信息受平台保护', status: 'pending', statusLabel: '待确认' }
]

export const company = {
  id: 'company-01', name: '华北智巡科技', verified: true, verifiedLabel: '企业认证已核验', industry: '电力巡检服务', scale: '100-299人',
  address: '北京市昌平区（详细地址沟通后可见）', intro: '提供电力、新能源与工业园区的无人机巡检服务。', hiringSummary: { openJobs: 4, newCandidates: 6, interviews: 2 }
}

export const candidates = [
  { id: 'candidate-01', applicationId: 'candidate-app-01', maskedName: '林**', maskedPhone: '未建立沟通，手机号不可见', city: '北京', caac: '超视距', aircraft: 'M350 RTK', experience: '3年巡检经验', availability: '一周内', status: 'new', statusLabel: '新投递', matchReasons: ['CAAC 等级符合', '机型经历符合'] },
  { id: 'candidate-02', applicationId: 'candidate-app-02', maskedName: '周**', maskedPhone: '138****1906', city: '北京', caac: '超视距', aircraft: 'Matrice 30T', experience: '4年行业经验', availability: '两周内', status: 'contacted', statusLabel: '已建立沟通', matchReasons: ['城市符合', '行业经历符合'] },
  { id: 'candidate-03', applicationId: 'candidate-app-03', maskedName: '许**', maskedPhone: '未建立沟通，手机号不可见', city: '天津', caac: '视距内', aircraft: 'Mavic 3E', experience: '2年航拍经验', availability: '随时', status: 'interview', statusLabel: '面试中', matchReasons: ['可到岗时间符合'] }
]

export const companyInterviews = [
  { id: 'company-interview-01', candidateName: '周**', jobTitle: '无人机巡检飞手', at: '2026-08-01 16:00', method: '平台视频', status: 'pending', statusLabel: '待候选人确认' }
]

export const fulfillmentOrders = [
  {
    id: 'order-task-01', taskId: 'task-01', taskTitle: '输电线路巡检', role: 'pilot', status: 'in_progress', statusLabel: '作业执行中',
    parties: { client: '华北智巡科技（企业已核验）', pilot: '林**（实名与 CAAC 状态由服务端返回）' },
    milestones: [
      { key: 'deposit', title: '首期款', status: 'complete', note: '服务端返回托管确认时间：2026-07-31 10:20' },
      { key: 'execution', title: '作业执行', status: 'current', note: '按工单执行并上传交付物' },
      { key: 'mid_review', title: '中期素材确认', status: 'pending', note: '等待交付物提交' },
      { key: 'final', title: '尾款', status: 'pending', note: '验收后由服务端推进结算' }
    ],
    escrow: { source: 'server', demo: true, deposit: '已托管（演示服务端状态）', middle: '待交付', final: '待验收', releasable: false },
    contract: { source: 'server', demo: true, status: 'signing_pending', label: 'CA 签章服务待双方完成', signed: false },
    insurance: { source: 'server', status: 'not_connected', label: '保险能力接入中' },
    deliveries: [], dispute: null,
    calendar: [{ date: '08-01', label: '线路巡检', conflict: false }, { date: '08-03', label: '个人档期冲突', conflict: true }, { date: '08-06', label: '可接单', conflict: false }]
  },
  {
    id: 'order-task-02', taskId: 'task-02', taskTitle: '近郊农业植保', role: 'client', status: 'review_pending', statusLabel: '待发包方验收',
    parties: { client: '沃野低空服务（企业已核验）', pilot: '周**（实名与 CAAC 状态由服务端返回）' },
    milestones: [
      { key: 'deposit', title: '首期款', status: 'complete', note: '服务端返回已托管' },
      { key: 'execution', title: '作业执行', status: 'complete', note: '飞手已提交交付物' },
      { key: 'mid_review', title: '中期素材确认', status: 'current', note: '等待发包方验收' },
      { key: 'final', title: '尾款', status: 'pending', note: '验收结论回写后由服务端处理' }
    ],
    escrow: { source: 'server', demo: true, deposit: '已托管（演示服务端状态）', middle: '托管中', final: '待验收', releasable: false },
    contract: { source: 'server', demo: true, status: 'signed', label: '服务端返回已签署（演示）', signed: true },
    insurance: { source: 'server', status: 'quote_pending', label: '保险询价中' },
    deliveries: [{ id: 'delivery-01', name: '植保作业记录.zip', status: 'submitted', statusLabel: '待验收', submittedAt: '2026-07-31 09:00' }], dispute: null,
    calendar: [{ date: '08-02', label: '验收截止', conflict: false }, { date: '08-05', label: '可接单', conflict: false }]
  }
]

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
