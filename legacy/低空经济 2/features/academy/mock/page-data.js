// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const academyPageData = {
  "academy": {
    "title": "CAAC 学考",
    "active": "academy",
    "root": true,
    "kind": "academy",
    "hero": {
      "eyebrow": "普通用户基础资源免费",
      "title": "先看懂，再报名",
      "note": "机构、课程与学习记录在一个入口管理",
      "action": "AI 智能选课",
      "to": "/pages/academy/assistant",
      "image": "/static/images/lowair-academy-training.png"
    },
    "tabs": [
      "视距内",
      "超视距",
      "教员"
    ],
    "tools": [
      [
        "历年真题",
        "exam",
        "/pages/academy/exam?mode=practice"
      ],
      [
        "考点视频",
        "video",
        "/pages/academy/learning?mode=video"
      ],
      [
        "AI 实操",
        "simulator",
        "/pages/academy/learning?mode=simulator"
      ]
    ],
    "sections": [
      {
        "title": "附近认证机构",
        "action": "机构榜单",
        "to": "/pages/academy/institutions",
        "cards": [
          [
            "中航飞训中心",
            "超视距 · 小班实操 · 可试听",
            "培训资质已核验",
            "/pages/academy/institution-detail?id=school-01"
          ],
          [
            "北城无人机学院",
            "教练团队与办学成果可查",
            "过考率待接入",
            "/pages/academy/institution-detail?id=school-02"
          ]
        ]
      },
      {
        "title": "学习与补贴",
        "cards": [
          [
            "我的学习档案",
            "意向、报名、培训、考试、拿证",
            "进入查看",
            "/pages/academy/progress?tab=record"
          ],
          [
            "本地技能补贴",
            "查看政策来源和材料清单",
            "政策库演示",
            "/pages/academy/progress?tab=subsidy"
          ]
        ]
      }
    ]
  },
  "assistant": {
    "title": "航知 AI 助手",
    "active": "academy",
    "kind": "assistant",
    "hero": {
      "eyebrow": "对话式匹配",
      "title": "描述你的学习目标",
      "note": "学习、飞行与设备交易问题都可咨询；最多比较 4 家机构",
      "action": "重新开始",
      "to": ""
    },
    "chips": [
      "北京",
      "零基础",
      "超视距",
      "预算 1.2 万"
    ],
    "sections": [
      {
        "title": "匹配结果",
        "cards": [
          [
            "中航飞训中心",
            "匹配依据：距离、课程等级和试听安排",
            "推广",
            "/pages/academy/institution-detail?id=school-01"
          ],
          [
            "北城无人机学院",
            "匹配依据：零基础班与周末课",
            "资质已核验",
            "/pages/academy/institution-detail?id=school-02"
          ]
        ]
      }
    ]
  },
  "institutions": {
    "title": "培训机构",
    "active": "academy",
    "kind": "institutions",
    "tabs": [
      "推荐",
      "距离",
      "榜单",
      "地图",
      "对比"
    ],
    "tools": [
      [
        "筛选",
        "filter",
        ""
      ],
      [
        "选择城市",
        "city",
        ""
      ],
      [
        "试听预约",
        "calendar",
        "/pages/academy/visit?institutionId=school-01"
      ],
      [
        "最多对比 4 家",
        "compare",
        ""
      ]
    ],
    "sections": [
      {
        "title": "机构列表",
        "cards": [
          [
            "中航飞训中心",
            "超视距 · 距你 4.8 km · 周末班",
            "资质已核验",
            "/pages/academy/institution-detail?id=school-01"
          ],
          [
            "北城无人机学院",
            "视距内/超视距 · 小班实操",
            "推广",
            "/pages/academy/institution-detail?id=school-02"
          ],
          [
            "云翼职业培训学校",
            "教员课程 · 可预约试听",
            "过考率待接入",
            "/pages/academy/institution-detail?id=school-03"
          ]
        ]
      }
    ]
  },
  "institutionDetail": {
    "title": "机构详情",
    "active": "academy",
    "kind": "detail",
    "hero": {
      "eyebrow": "中航飞训中心",
      "title": "超视距飞手培训",
      "note": "资质、教练、课程与学员评价按数据状态展示",
      "action": "预约试听",
      "to": "/pages/academy/visit?institutionId=school-01&mode=booking",
      "image": "/static/images/lowair-institution-campus.png"
    },
    "metrics": [
      [
        "课程",
        "8"
      ],
      [
        "教练",
        "6"
      ],
      [
        "评价",
        "演示"
      ]
    ],
    "tabs": [
      "课程",
      "教练",
      "场地",
      "成果",
      "评价"
    ],
    "sections": [
      {
        "title": "推荐课程",
        "cards": [
          [
            "超视距基础班",
            "理论 + 实操 · 周末开班",
            "可预约试听",
            "/pages/academy/visit?institutionId=school-01&mode=booking"
          ],
          [
            "教员进阶班",
            "适合已持证飞手",
            "名额待确认",
            "/pages/academy/visit?institutionId=school-01&mode=booking"
          ]
        ]
      },
      {
        "title": "信任说明",
        "cards": [
          [
            "公开过考率",
            "待接入真实来源后展示",
            "待接入",
            ""
          ],
          [
            "平台内咨询",
            "联系方式由会话能力保护",
            "隐私保护",
            "/pages/messages/index?conversationId=school-01"
          ]
        ]
      }
    ]
  },
  "visit": {
    "title": "VR 看校与试听",
    "active": "academy",
    "kind": "visit",
    "hero": {
      "eyebrow": "训练场地",
      "title": "理论教室、实操场、模拟机",
      "note": "360 全景能力接入中，当前展示场地信息",
      "action": "预约试听",
      "to": ""
    },
    "tabs": [
      "理论教室",
      "实操训练场",
      "模拟机设备"
    ],
    "form": [
      "体验课日期",
      "可选时段",
      "到访人数",
      "联系人姓名",
      "联系电话"
    ],
    "sections": [
      {
        "title": "设施与值班",
        "cards": [
          [
            "实操训练场",
            "满足基础练习与安全讲解",
            "场地说明",
            ""
          ],
          [
            "试听预约",
            "预约成功后同步至消息中心",
            "可预约",
            "/pages/messages/index?category=academy"
          ]
        ]
      }
    ]
  },
  "learning": {
    "title": "CAAC 学习中心",
    "active": "academy",
    "kind": "learning",
    "tabs": [
      "证书科普",
      "考点视频",
      "法律法规",
      "AI 实操"
    ],
    "metrics": [
      [
        "今日学习",
        "25 分钟"
      ],
      [
        "本周计划",
        "3 项"
      ],
      [
        "错题",
        "12"
      ]
    ],
    "video": {
      "title": "起飞前风险判断",
      "note": "无人机预检与安全起飞要点 · 08:32",
      "image": "/static/images/lowair-learning-video.png"
    },
    "sections": [
      {
        "title": "学习内容",
        "cards": [
          [
            "报名与考试流程",
            "从意向到拿证的完整流程",
            "证书科普",
            ""
          ],
          [
            "空域申报基础",
            "法规来源与更新时间可查",
            "法律法规",
            ""
          ],
          [
            "起飞前风险判断",
            "选择操作后查看复盘",
            "AI 实操",
            ""
          ],
          [
            "超视距通信要点",
            "视频学习进度本地保存",
            "考点视频",
            ""
          ]
        ]
      },
      {
        "title": "继续练习",
        "cards": [
          [
            "开始刷题",
            "按等级选择练习题组",
            "真题练习",
            "/pages/academy/exam?mode=practice"
          ],
          [
            "模拟考试",
            "基于本次演示答题记录",
            "模拟考试",
            "/pages/academy/exam?mode=mock"
          ]
        ]
      }
    ]
  },
  "exam": {
    "title": "真题练习",
    "active": "academy",
    "kind": "exam",
    "sections": [
      {
        "title": "当前题目",
        "cards": [
          [
            "飞行前检查中，最先确认的事项是？",
            "A. 机身外观与电源状态  B. 立即起飞  C. 忽略气象",
            "单选题",
            ""
          ],
          [
            "答题说明",
            "练习模式提交后显示解析，模拟模式最后统一交卷",
            "演示题库",
            ""
          ]
        ]
      }
    ]
  },
  "progress": {
    "title": "学习与补贴",
    "active": "academy",
    "kind": "progress",
    "tabs": [
      "学习档案",
      "补贴查询"
    ],
    "sections": [
      {
        "title": "学习档案",
        "cards": [
          [
            "意向",
            "已完成课程目标选择",
            "完成",
            ""
          ],
          [
            "报名",
            "等待预约试听后确认",
            "待办",
            "/pages/academy/visit?institutionId=school-01"
          ],
          [
            "培训",
            "课时与签到将在真实接入后同步",
            "接入中",
            ""
          ],
          [
            "考试",
            "查看真题与模拟记录",
            "查看记录",
            "/pages/academy/exam?mode=review"
          ]
        ]
      },
      {
        "title": "技能补贴",
        "cards": [
          [
            "所在城市政策",
            "请核对官方来源、生效时间与办理窗口",
            "政策库演示",
            ""
          ],
          [
            "材料清单",
            "身份证明、证书、申请表等按政策勾选",
            "生成清单",
            ""
          ]
        ]
      }
    ]
  },
  "orgConsole": {
    "title": "机构工作台",
    "active": "academy",
    "kind": "console",
    "required": "institution",
    "metrics": [
      [
        "新增线索",
        "12"
      ],
      [
        "试听预约",
        "5"
      ],
      [
        "在训学员",
        "演示"
      ]
    ],
    "tabs": [
      "线索",
      "排课",
      "签到",
      "考试",
      "口碑"
    ],
    "sections": [
      {
        "title": "重点待办",
        "cards": [
          [
            "智能排课冲突",
            "教练与场地时间重叠，请确认",
            "待处理",
            ""
          ],
          [
            "试听预约",
            "新学员等待机构确认",
            "待联系",
            "/pages/messages/index?category=academy"
          ],
          [
            "口碑预警",
            "差评需要及时回复",
            "风险提示",
            ""
          ]
        ]
      },
      {
        "title": "经营入口",
        "cards": [
          [
            "机构主页预览",
            "更新对外资料前预览",
            "预览",
            "/pages/academy/institution-detail?id=school-01&preview=1"
          ],
          [
            "招生推广",
            "创建培训广告计划",
            "商业服务",
            "/pages/ad/index?biz=academy"
          ]
        ]
      }
    ]
  }
}

export function getAcademyPage(key, options = {}) {
  const page = cloneDemo(academyPageData[key] || academyPageData.academy)
  const institution = {
    'school-01': { name: '中航飞训中心', title: '超视距飞手培训', metrics: [['课程', '8'], ['教练', '6'], ['评价', '演示']] },
    'school-02': { name: '北城无人机学院', title: '周末小班实操培训', metrics: [['课程', '6'], ['教练', '4'], ['评价', '待接入']] },
    'school-03': { name: '云翼职业培训学校', title: '教员进阶培训', metrics: [['课程', '5'], ['教练', '3'], ['评价', '待接入']] }
  }[options.id || options.institutionId]
  if (key === 'institutionDetail' && institution) {
    page.hero.eyebrow = institution.name
    page.hero.title = institution.title
    page.metrics = institution.metrics
  }
  if (key === 'visit' && options.institutionId) page.hero.note = '预约对象：' + (institution?.name || options.institutionId) + ' · 预约信息仅用于本次试听安排'
  return page
}
