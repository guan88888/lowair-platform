const OFFICIAL_LINKS = {
  rules: 'https://www.gov.cn/zhengce/content/202306/content_6888799.htm',
  uom: 'https://uom.caac.gov.cn/',
  weather: 'https://www.cma.gov.cn/'
}

const MODE_GUIDANCE = {
  '飞前检查': {
    focus: '先建立“不起飞”条件，再按机体、能源、定位、链路、空域气象、返航与备降点逐项确认。',
    steps: ['核对机型、载荷、固件与维护状态', '检查电池、桨叶、电机、定位与通信链路', '复核实时空域、气象、返航高度与备降点']
  },
  '任务方案': {
    focus: '把任务目标、作业区域、人员资质、航线、中止条件和交付标准组成可复核的执行方案。',
    steps: ['明确目标物、范围、精度与交付格式', '标注人员、建筑、电力设施与其他地面风险', '设定风速、能见度、电量、链路和空域变化的中止阈值']
  },
  '设备诊断': {
    focus: '先判断是否必须停飞，再按故障时序、告警信息、外观和日志缩小范围，不用冒险试飞代替检查。',
    steps: ['断电并保留告警截图、飞行日志和现场照片', '按电源、动力、定位、链路、载荷顺序做地面检查', '对照厂商手册和告警代码，需拆机时交由授权维修人员']
  },
  '学考答疑': {
    focus: '按概念、判断依据、常见误区和实际飞行对应关系讲解，涉及时效的内容以官方最新大纲和通知为准。',
    steps: ['先明确题目考查的法规或运行概念', '找出选项中违反风险控制顺序的表述', '回到最新考试大纲和官方材料核对时效性']
  }
}

const SCENARIOS = [
  {
    key: 'emergency',
    match: /伤人|受伤|坠机|炸机|撞击|起火|冒烟|燃烧|失控|飞丢/,
    assessment: '这类情况应先按紧急事件处置，不应继续任务或立即复飞。',
    boundary: '如有人员受伤、火情、涉及公共安全或航空安全，立即联系当地 120、119、110 或有管辖权的单位。先隔离现场、保护人员，不要为取回设备进入危险区，也不要仅依赖 AI 指挥现场处置。',
    specificSteps: ['立即停止操作并让人员远离旋翼、电池、燃烧物和可能的坠落路径', '在不增加风险的前提下断电，保留飞行记录、告警、现场时间和位置', '由现场负责人按应急预案联系救援、管理单位与监管部门']
  },
  {
    key: 'airspace',
    match: /空域|禁飞|限飞|报备|申报|管制|许可|批复|法规|合法/,
    assessment: '这是带有时效性和地域差异的空域或法规问题，只能在官方信息和实际批复基础上决策。',
    boundary: 'AI 不能确认某次飞行已获批、不能代替管制单位给出许可，也不能根据过期截图判定可飞。未拿到可核验的当次授权前，不要起飞。',
    specificSteps: ['在民航主管部门或当地管理单位的官方渠道核对实时空域和临时管制', '核对作业主体、飞手、设备、时间窗、区域、高度和任务性质是否与批复一致', '保留当次申请、批复和现场复核记录，发现冲突时停止作业']
  },
  {
    key: 'weather',
    match: /风速|阵风|大风|下雨|降雨|雨雪|大雾|能见度|气象|天气|雷电|温度/,
    assessment: '这是气象条件与设备限值的联合判断，应同时看预报、临近观测和起降点实测。',
    boundary: 'AI 不提供实时气象观测，也不能代替现场负责人判定可飞。当风速、阵风、降水、能见度或温度接近设备限值，或数据来源不一致时，应延期或取消。',
    specificSteps: ['取得作业时段的官方预报、雷达回波和临近警报', '在起降点测量平均风与阵风，并与飞行器和载荷手册限值比对', '将气象变化写入中止条件，预留提前返航和备降所需电量']
  },
  {
    key: 'battery',
    match: /鼓包|过热|发热|异味|电池|充电|低电量/,
    assessment: '电池外观、温度或充放电异常属于优先停用项，不应通过试飞验证。',
    boundary: '鼓包、漏液、异味、破损或异常升温的电池不得继续充放电或装机。若出现冒烟、起火或人员风险，转入紧急事件处置。',
    specificSteps: ['停止充放电，将电池放置到符合手册要求的耐火隔离区域', '记录型号、循环次数、电压差、温度和最近一次告警', '按厂商与当地废旧电池处理要求移交，不要投入生活垃圾']
  },
  {
    key: 'link',
    match: /失联|图传|遥控|信号|链路|断连|通信/,
    assessment: '链路不稳定时应先缩小作业范围，检查返航与失联逻辑，不应继续扩大距离。',
    boundary: '未确认返航点、失联动作、返航高度和备降点前不起飞；存在干扰或遮挡且无法消除时停止作业。',
    specificSteps: ['检查遥控器和飞行器电量、天线方向、频段与固件一致性', '复核返航点、返航高度、失联动作和低电量逻辑', '识别建筑遮挡、高压设施和强电磁环境，地面测试仍不稳定时停飞']
  },
  {
    key: 'device',
    match: /电机|桨叶|螺旋桨|动力|震动|异响|抖动|GPS|指南针|罗盘|定位|漂移|姿态|云台|相机|载荷|固件|维修/,
    assessment: '设备异常需要依据具体机型、告警代码和飞行日志定位，当前只能先划定停飞与地面检查范围。',
    boundary: '出现桨叶裂纹、机臂变形、电机卡滞、持续姿态或定位告警时不得起飞。需拆机或涉及飞控、电池内部时交由授权维修人员。',
    specificSteps: ['断电检查桨叶、电机、机臂、接插件和载荷固定', '记录异常发生在上电、起飞、悬停还是加速阶段', '导出告警与日志，按厂商故障树复核，不用连续试飞排障']
  },
  {
    key: 'exam',
    match: /考试|CAAC|执照|证书|题目|视距内|超视距|教员|学习/,
    assessment: '这是学考问题，可以用风险控制顺序帮助理解，但报考要求、大纲和时间以官方最新通知为准。',
    boundary: '本地演示回答不是官方题库或考试结果，不应记忆未经官方材料核对的数值、期限和程序。',
    specificSteps: ['说明目标等级和题目原文，保留所有选项', '区分法规时效性内容与稳定的飞行原理', '用官方大纲和材料核对后再形成记忆卡']
  }
]

const REQUIRED_CONTEXT = {
  common: [
    { label: '具体机型与载荷', match: /大疆|DJI|Mavic|Phantom|Matrice|M30|M300|M350|翼龙|彩虹|型号|机型|载荷/i },
    { label: '所在城市和准确作业区域', match: /省|市|县|区|乡|镇|机场|公里|坐标|地址/ },
    { label: '计划日期、时段与飞行高度', match: /\d{1,4}[\-/.\u5e74]\d{1,2}|\d+\s*(?:米|m)|今天|明天|后天|点钟|时段/i }
  ],
  '飞前检查': [
    { label: '实测风速、能见度与降水', match: /风速|m\/s|米每秒|能见度|降雨|晴|阴|雨/i },
    { label: '电池健康、电量与循环次数', match: /电量|电池|循环|SOC|电压/i }
  ],
  '任务方案': [
    { label: '任务目标、范围和交付标准', match: /巡检|测绘|航拍|植保|运输|面积|精度|交付|建模|视频|照片/ },
    { label: '已获取的空域或现场授权', match: /已批|批复|授权|许可|已申报|报备完成/ }
  ],
  '设备诊断': [
    { label: '完整告警原文或代码', match: /告警|代码|error|warning|0x[\da-f]+/i },
    { label: '异常发生阶段与飞行日志', match: /上电|起飞|悬停|巡航|降落|日志|飞行记录/ }
  ],
  '学考答疑': [
    { label: '目标执照等级或考试模块', match: /视距内|超视距|教员|固定翼|多旋翼|法规|气象|飞行原理/ },
    { label: '题目原文和全部选项', match: /A[.\uff0e、]|B[.\uff0e、]|选项|题目是/ }
  ]
}

function cleanPrompt(prompt) {
  return String(prompt || '').replace(/\s+/g, ' ').trim().slice(0, 240)
}

function missingContext(prompt, mode) {
  return [...REQUIRED_CONTEXT.common, ...(REQUIRED_CONTEXT[mode] || [])]
    .filter((item) => !item.match.test(prompt))
    .map((item) => item.label)
    .slice(0, 5)
}

function buildSources(question, scenario, mode) {
  const sources = [{
    id: 'question',
    title: '本次问题原文',
    excerpt: `“${question}”`,
    kind: '用户输入'
  }]

  if (scenario.key === 'airspace' || mode === '任务方案') {
    sources.push({ id: 'rules', title: '《无人驾驶航空器飞行管理暂行条例》', kind: '官方规章入口', url: OFFICIAL_LINKS.rules })
    sources.push({ id: 'uom', title: '民用无人驾驶航空器综合管理平台', kind: '官方平台入口', url: OFFICIAL_LINKS.uom })
  }
  if (scenario.key === 'weather') {
    sources.push({ id: 'weather', title: '中国气象局', kind: '官方气象入口', url: OFFICIAL_LINKS.weather })
  }
  if (scenario.key === 'exam' || mode === '学考答疑') {
    sources.push({ id: 'uom', title: '民用无人驾驶航空器综合管理平台', kind: '官方平台入口', url: OFFICIAL_LINKS.uom })
  }

  sources.push({
    id: 'manual',
    title: '对应机型用户手册、安全指南与告警代码表',
    kind: '待用户提供机型后核对',
    pending: true
  })
  return sources
}

export function createDemoReply({ prompt, mode = '飞前检查' } = {}) {
  const question = cleanPrompt(prompt)
  const guidance = MODE_GUIDANCE[mode] || MODE_GUIDANCE['飞前检查']
  const scenario = SCENARIOS.find((item) => item.match.test(question)) || {
    key: 'general',
    assessment: `当前按“${mode}”处理。${guidance.focus}`,
    boundary: '这是未连接后端模型的本地演示分析，不知道实时空域、气象、设备状态或现场危险。任何与手册、官方信息或现场负责人冲突的建议都不应执行。',
    specificSteps: guidance.steps
  }
  const missing = missingContext(question, mode)
  const steps = scenario.specificSteps || guidance.steps

  const content = [
    `你问的是：“${question}”`,
    '',
    `演示判断：${scenario.assessment}`,
    '',
    '建议先做：',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `安全边界：${scenario.boundary}`,
    '',
    `缺失信息：${missing.length ? missing.join('、') : '已包含基本上下文，仍需在执行前核对实时空域、气象和设备手册' }。`,
    '',
    '把缺失项补充后，我可以继续把建议收敛成检查单或任务方案。'
  ].join('\n')

  return {
    content,
    mode,
    scenario: scenario.key,
    missing,
    sources: buildSources(question, scenario, mode)
  }
}

export { MODE_GUIDANCE }
