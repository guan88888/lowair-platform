// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const profilePageData = {
  "messages": {
    "title": "消息中心",
    "active": "",
    "kind": "messages",
    "tabs": [
      "全部",
      "工作",
      "学考",
      "交易",
      "互动",
      "系统"
    ],
    "sections": [
      {
        "title": "业务通知",
        "cards": [
          [
            "试听预约确认",
            "中航飞训中心已收到预约",
            "学考",
            "/pages/academy/visit?institutionId=school-01"
          ],
          [
            "任务报名状态",
            "输电线路巡检等待发布方选择",
            "工作",
            "/pages/work/task-detail?id=task-01"
          ],
          [
            "交易订单提醒",
            "验机方式需要确认",
            "交易",
            "/pages/market/order?mode=detail&orderId=market-01"
          ]
        ]
      },
      {
        "title": "平台内会话",
        "cards": [
          [
            "任务沟通",
            "隐私号码和绕单提示由服务状态控制",
            "会话",
            "/pages/work/fulfillment?orderId=order-task-01"
          ]
        ]
      }
    ]
  },
  "profile": {
    "title": "我的",
    "active": "profile",
    "root": true,
    "kind": "profile",
    "metrics": [
      [
        "可用余额",
        "演示"
      ],
      [
        "托管中",
        "演示"
      ],
      [
        "低空豆",
        "0"
      ]
    ],
    "tools": [
      [
        "身份与认证",
        "identity",
        "/pages/profile/account"
      ],
      [
        "我的钱包",
        "wallet",
        "/pages/profile/wallet"
      ],
      [
        "我的学习",
        "academy",
        "/pages/academy/progress?tab=record"
      ],
      [
        "求职中心",
        "resume",
        "/pages/work/resume"
      ],
      [
        "我的交易",
        "order",
        "/pages/market/order?mode=list"
      ],
      [
        "消息中心",
        "message",
        "/pages/messages/index"
      ]
    ],
    "sections": [
      {
        "title": "个人与企业业务",
        "cards": [
          [
            "招聘中心",
            "认证企业可管理岗位和候选人",
            "企业权限",
            "/pages/work/talent"
          ],
          [
            "机构工作台",
            "认证培训机构可管理招生与排课",
            "机构权限",
            "/pages/academy/org-console"
          ],
          [
            "广告服务",
            "认证主体可创建广告计划",
            "企业权限",
            "/pages/ad/index"
          ]
        ]
      }
    ]
  },
  "account": {
    "title": "身份与认证",
    "active": "profile",
    "kind": "account",
    "tabs": [
      "个人实名",
      "CAAC 证书",
      "企业认证",
      "机构资质"
    ],
    "form": [
      "手机号",
      "验证码",
      "姓名或主体名称",
      "证件/证书编号",
      "资质材料上传"
    ],
    "sections": [
      {
        "title": "认证状态",
        "cards": [
          [
            "个人实名",
            "未提交或待审核时不可进行需要实名的交易",
            "未认证",
            ""
          ],
          [
            "CAAC 证书",
            "提交等级、编号、有效期和照片",
            "待核验",
            ""
          ],
          [
            "企业认证",
            "营业执照和对公验证能力按实际接入展示",
            "未认证",
            ""
          ],
          [
            "机构资质",
            "办学资质、校区和联系人",
            "未认证",
            ""
          ]
        ]
      }
    ]
  },
  "wallet": {
    "title": "我的钱包",
    "active": "profile",
    "kind": "wallet",
    "tabs": [
      "资金",
      "托管",
      "低空豆",
      "流水",
      "发票"
    ],
    "metrics": [
      [
        "可用余额",
        "演示"
      ],
      [
        "托管中",
        "演示"
      ],
      [
        "低空豆",
        "0"
      ]
    ],
    "sections": [
      {
        "title": "资金与托管",
        "cards": [
          [
            "付款记录",
            "购买、租赁与任务结算流水",
            "查看记录",
            "/pages/profile/wallet?tab=transactions"
          ],
          [
            "任务托管",
            "首期款、中期确认、尾款按履约状态显示",
            "演示",
            "/pages/work/fulfillment?orderId=order-task-01"
          ],
          [
            "交易订单",
            "购买、租赁、寄售不可共用同一状态机",
            "订单流水",
            "/pages/market/order?mode=list"
          ]
        ]
      },
      {
        "title": "低空豆与发票",
        "cards": [
          [
            "低空豆悬赏",
            "问答采纳后按规则结算",
            "低空豆",
            "/pages/community/knowledge?mode=question"
          ],
          [
            "广告费用",
            "广告计划数据和费用状态分开管理",
            "广告",
            "/pages/ad/campaign?mode=dashboard"
          ]
        ]
      }
    ]
  }
}

export function getProfilePage(key, options = {}) {
  const page = cloneDemo(profilePageData[key] || profilePageData.profile)
  if (key === 'wallet' && options.tab) page.initialTab = options.tab
  if (key === 'messages' && options.conversationId) page.conversationId = options.conversationId
  return page
}
