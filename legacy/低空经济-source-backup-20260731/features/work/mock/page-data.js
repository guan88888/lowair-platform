// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const workPageData = {
  "work": {
    "title": "招聘与任务",
    "active": "work",
    "root": true,
    "kind": "work",
    "tabs": [
      "企业招聘",
      "临时任务"
    ],
    "hero": {
      "eyebrow": "当前身份：个人",
      "title": "岗位与作业机会",
      "note": "全职招聘与按项目交付的任务分开管理",
      "action": "发布需求",
      "to": "/pages/work/publish?type=task",
      "image": "/static/images/lowair-work-inspection.png"
    },
    "tools": [
      [
        "我的简历",
        "resume",
        "/pages/work/resume"
      ],
      [
        "发布需求",
        "publish",
        "/pages/work/publish?type=task"
      ],
      [
        "找人才",
        "talent",
        "/pages/work/talent"
      ]
    ],
    "sections": [
      {
        "title": "认证企业直招",
        "cards": [
          [
            "无人机巡检飞手",
            "北京 · 全职 · 需超视距资质",
            "企业认证",
            "/pages/work/job-detail?id=job-01"
          ],
          [
            "航拍项目执行",
            "可接受出差 · 机型能力可查",
            "企业认证",
            "/pages/work/job-detail?id=job-02"
          ]
        ]
      },
      {
        "title": "可抢单任务",
        "cards": [
          [
            "输电线路巡检",
            "明日 08:30 · 公开抢单",
            "资金托管演示",
            "/pages/work/task-detail?id=task-01"
          ],
          [
            "近郊农业植保",
            "可设置档期 · 加急 +20%",
            "加急",
            "/pages/work/task-detail?id=task-02"
          ]
        ]
      }
    ]
  },
  "jobDetail": {
    "title": "职位详情",
    "active": "work",
    "kind": "jobDetail",
    "hero": {
      "eyebrow": "认证企业直招",
      "title": "无人机巡检飞手",
      "note": "北京 · 全职 · 需超视距资质",
      "action": "立即投递",
      "to": "/pages/work/resume?returnJobId=job-01",
      "image": "/static/images/lowair-work-inspection.png"
    },
    "sections": [
      {
        "title": "岗位要求",
        "cards": [
          [
            "执照与机型",
            "超视距资质、行业机型能力",
            "必填要求",
            ""
          ],
          [
            "工作内容",
            "线路巡检、素材交付、现场安全协同",
            "岗位职责",
            ""
          ],
          [
            "企业信息",
            "营业执照状态由数据驱动展示",
            "企业认证",
            "/pages/work/talent?mode=company&id=company-01"
          ]
        ]
      },
      {
        "title": "投递状态",
        "cards": [
          [
            "投递前检查",
            "登录并建立简历后可提交",
            "需登录",
            "/pages/work/resume?returnJobId=job-01"
          ]
        ]
      }
    ]
  },
  "resume": {
    "title": "求职中心",
    "active": "work",
    "kind": "resume",
    "tabs": [
      "我的简历",
      "投递进度",
      "面试邀请"
    ],
    "form": [
      "求职意向",
      "CAAC 证书等级",
      "熟练机型",
      "项目经历",
      "附件简历"
    ],
    "sections": [
      {
        "title": "投递记录",
        "cards": [
          [
            "无人机巡检飞手",
            "待完善简历后投递",
            "待处理",
            "/pages/work/job-detail?id=job-01"
          ],
          [
            "航拍项目执行",
            "企业已查看",
            "演示状态",
            "/pages/work/job-detail?id=job-02"
          ]
        ]
      }
    ]
  },
  "talent": {
    "title": "企业招聘中心",
    "active": "work",
    "kind": "talent",
    "required": "enterprise",
    "tabs": [
      "在招职位",
      "候选人",
      "面试",
      "人才库"
    ],
    "sections": [
      {
        "title": "候选人",
        "cards": [
          [
            "林远航",
            "超视距资质 · 行业机型经验",
            "资料已脱敏",
            ""
          ],
          [
            "周宁",
            "航拍与巡检项目经历",
            "待沟通",
            ""
          ]
        ]
      },
      {
        "title": "招聘操作",
        "cards": [
          [
            "发布职位",
            "创建全职岗位并设置要求",
            "企业认证",
            "/pages/work/publish?type=job"
          ],
          [
            "招聘推广",
            "购买合规推广位",
            "广告服务",
            "/pages/ad/index?biz=recruitment"
          ]
        ]
      }
    ]
  },
  "publish": {
    "title": "发布职位与任务",
    "active": "work",
    "kind": "publish",
    "tabs": [
      "临时任务",
      "全职职位"
    ],
    "form": [
      "需求描述",
      "作业/岗位类型",
      "地点",
      "时间或到岗日期",
      "CAAC 证书等级",
      "所需机型",
      "预算或薪资",
      "交付标准"
    ],
    "sections": [
      {
        "title": "安全与发布设置",
        "cards": [
          [
            "AI 工单草稿",
            "系统仅协助提取字段，提交前请逐项确认",
            "演示 AI",
            ""
          ],
          [
            "加急与派单",
            "加急 +20%，可选公开抢单或智能派单",
            "可选",
            ""
          ],
          [
            "资金与沟通",
            "托管、保险、隐私号码按服务接入状态展示",
            "接入中",
            ""
          ]
        ]
      }
    ]
  },
  "taskDetail": {
    "title": "任务详情",
    "active": "work",
    "kind": "taskDetail",
    "hero": {
      "eyebrow": "公开抢单",
      "title": "输电线路巡检",
      "note": "明日 08:30 · 需超视距资质 · 位置已模糊化",
      "action": "报名抢单",
      "to": "/pages/profile/account?mode=caac",
      "image": "/static/images/lowair-work-inspection.png"
    },
    "metrics": [
      [
        "预算",
        "演示"
      ],
      [
        "报名者",
        "4"
      ],
      [
        "倒计时",
        "02:18:42"
      ]
    ],
    "sections": [
      {
        "title": "任务要求",
        "cards": [
          [
            "作业参数",
            "行业机型、预计时长、交付格式",
            "任务工单",
            ""
          ],
          [
            "安全状态",
            "发布方认证、资金托管、保险服务",
            "演示状态",
            ""
          ],
          [
            "发布方说明",
            "成交前使用平台内沟通和隐私号码",
            "隐私保护",
            "/pages/messages/index?conversationId=task-01"
          ]
        ]
      },
      {
        "title": "报名后流程",
        "cards": [
          [
            "选定飞手",
            "选择后进入合同、托管和交付流程",
            "履约",
            "/pages/work/fulfillment?orderId=order-task-01"
          ]
        ]
      }
    ]
  },
  "fulfillment": {
    "title": "任务履约",
    "active": "work",
    "kind": "fulfillment",
    "tabs": [
      "进度",
      "任务日历",
      "争议处理"
    ],
    "metrics": [
      [
        "首期款",
        "托管演示"
      ],
      [
        "中期确认",
        "待提交"
      ],
      [
        "尾款",
        "待验收"
      ]
    ],
    "sections": [
      {
        "title": "里程碑",
        "cards": [
          [
            "首期款",
            "合同确认后进入托管状态",
            "演示",
            ""
          ],
          [
            "作业执行",
            "上传素材与现场凭证",
            "进行中",
            ""
          ],
          [
            "中期素材确认",
            "发包方确认后继续履约",
            "待确认",
            ""
          ],
          [
            "尾款结算",
            "完成验收后结算至钱包",
            "待验收",
            "/pages/profile/wallet?tab=transactions"
          ]
        ]
      },
      {
        "title": "安全操作",
        "cards": [
          [
            "电子合同",
            "CA 签章能力接入中",
            "接入中",
            ""
          ],
          [
            "一键请假",
            "暂停未来派单，不影响进行中任务",
            "任务日历",
            ""
          ],
          [
            "SOS 与仲裁",
            "模拟连接客服、保险和举证流程",
            "高风险",
            ""
          ]
        ]
      }
    ]
  }
}

export function getWorkPage(key, options = {}) {
  const page = cloneDemo(workPageData[key] || workPageData.work)
  const job = {
    'job-01': ['无人机巡检飞手', '北京 · 全职 · 需超视距资质'],
    'job-02': ['航拍项目执行', '可接受出差 · 机型能力可查']
  }[options.id || options.returnJobId]
  const task = {
    'task-01': ['输电线路巡检', '明日 08:30 · 需超视距资质 · 位置已模糊化'],
    'task-02': ['近郊农业植保', '可设置档期 · 加急 +20% · 位置已模糊化']
  }[options.id]
  if (key === 'jobDetail' && job) { page.hero.title = job[0]; page.hero.note = job[1] }
  if (key === 'taskDetail' && task) { page.hero.title = task[0]; page.hero.note = task[1] }
  if (key === 'fulfillment' && options.orderId) page.orderId = options.orderId
  return page
}
