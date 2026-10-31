// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const communityPageData = {
  "community": {
    "title": "低空社区",
    "active": "community",
    "root": true,
    "kind": "community",
    "tabs": [
      "推荐",
      "关注",
      "同城",
      "机型圈",
      "官方"
    ],
    "hero": {
      "eyebrow": "公开交流社区",
      "title": "经验、知识与同城连接",
      "note": "内容可按朋友圈与工作圈分组查看",
      "action": "发布内容",
      "to": "/pages/community/publish",
      "image": "/static/images/lowair-community-flightlog.png"
    },
    "tools": [
      [
        "飞行日志",
        "log",
        "/pages/community/publish?type=flight-log"
      ],
      [
        "百科问答",
        "knowledge",
        "/pages/community/knowledge"
      ],
      [
        "同城活动",
        "nearby",
        "/pages/community/nearby"
      ]
    ],
    "sections": [
      {
        "title": "官方辟谣",
        "action": "进入知识中心",
        "to": "/pages/community/knowledge?mode=official",
        "cards": [
          [
            "空域申报信息核验",
            "以权威机构发布内容和时间为准",
            "官方账号",
            "/pages/community/knowledge?mode=official&id=notice-01"
          ]
        ]
      },
      {
        "title": "社区动态",
        "cards": [
          [
            "一次山区物资运输复盘",
            "飞行日志 · 轨迹范围已做隐私处理",
            "飞行日志",
            "/pages/community/post-detail?id=post-01"
          ],
          [
            "超视距考试经验整理",
            "问答 · 记录出处和更新时间",
            "知识讨论",
            "/pages/community/post-detail?id=post-02"
          ]
        ]
      }
    ]
  },
  "post": {
    "title": "内容详情",
    "active": "community",
    "kind": "post",
    "hero": {
      "eyebrow": "飞行日志",
      "title": "一次山区物资运输复盘",
      "note": "轨迹、天气与设备信息均以授权公开范围展示",
      "action": "收藏内容",
      "to": "",
      "image": "/static/images/lowair-community-flightlog.png"
    },
    "sections": [
      {
        "title": "飞行数据",
        "cards": [
          [
            "轨迹与天气",
            "仅显示模糊化起降范围",
            "隐私保护",
            "/pages/community/nearby?mode=route&id=post-01"
          ],
          [
            "机型与时长",
            "用户授权后才展示对应字段",
            "日志数据",
            ""
          ]
        ]
      },
      {
        "title": "评论与关联",
        "cards": [
          [
            "相关设备",
            "查看设备测评或交易信息",
            "关联商品",
            "/pages/market/product-detail?id=device-01"
          ],
          [
            "作业招募",
            "标准任务需进入任务详情查看",
            "任务入口",
            "/pages/work/task-detail?id=task-01"
          ]
        ]
      }
    ]
  },
  "compose": {
    "title": "发布内容",
    "active": "community",
    "kind": "compose",
    "tabs": [
      "图文",
      "视频",
      "飞行日志",
      "作业招募"
    ],
    "form": [
      "标题",
      "正文",
      "图片或视频",
      "话题",
      "机型",
      "位置可见范围"
    ],
    "sections": [
      {
        "title": "发布设置",
        "cards": [
          [
            "圈层可见",
            "朋友圈、工作圈、同城圈或机型圈",
            "可见范围",
            ""
          ],
          [
            "飞行记录授权",
            "授权后生成轨迹、时长、天气和机型卡",
            "可选授权",
            ""
          ],
          [
            "作业招募",
            "需要标准化任务时转入 AI 发布任务",
            "转任务",
            "/pages/work/publish?type=task&source=community"
          ]
        ]
      }
    ]
  },
  "knowledge": {
    "title": "低空知识",
    "active": "community",
    "kind": "knowledge",
    "tabs": [
      "百科",
      "问答",
      "官方辟谣"
    ],
    "sections": [
      {
        "title": "百科词条",
        "cards": [
          [
            "超视距飞行",
            "定义、法规来源、编辑记录与审核状态",
            "百科",
            ""
          ],
          [
            "应急处置",
            "常见流程与权威资料链接",
            "百科",
            ""
          ]
        ]
      },
      {
        "title": "问答悬赏",
        "cards": [
          [
            "如何核验空域信息？",
            "回答被采纳后低空豆按规则结算",
            "低空豆悬赏",
            "/pages/profile/wallet?tab=beans"
          ],
          [
            "官方辟谣",
            "政策解读与来源链接",
            "官方账号",
            ""
          ]
        ]
      }
    ]
  },
  "live": {
    "title": "实时互动",
    "active": "community",
    "kind": "live",
    "tabs": [
      "语音房",
      "直播",
      "回放",
      "榜单"
    ],
    "sections": [
      {
        "title": "正在进行",
        "cards": [
          [
            "新手答疑语音房",
            "围绕 CAAC 学习与飞行安全交流",
            "语音房",
            ""
          ],
          [
            "炸机案例复盘直播",
            "仅在真实直播能力接入后开放",
            "直播接入中",
            ""
          ]
        ]
      },
      {
        "title": "本周榜单",
        "cards": [
          [
            "创作之星",
            "按公开规则统计",
            "演示数据",
            ""
          ],
          [
            "接单王",
            "按平台任务状态统计",
            "演示数据",
            ""
          ],
          [
            "答主",
            "按问答采纳规则统计",
            "演示数据",
            ""
          ]
        ]
      }
    ]
  },
  "nearby": {
    "title": "同城低空圈",
    "active": "community",
    "kind": "nearby",
    "tabs": [
      "附近飞友",
      "常用飞场",
      "活动赛事"
    ],
    "hero": {
      "eyebrow": "隐私优先",
      "title": "仅展示区或街道范围",
      "note": "精确位置必须由用户授权后才可分享",
      "action": "选择城市",
      "to": "",
      "image": "/static/images/lowair-community-flightlog.png"
    },
    "sections": [
      {
        "title": "附近飞友",
        "cards": [
          [
            "飞手 A",
            "航拍与巡检 · CAAC 状态由用户公开设置",
            "资料已脱敏",
            "/pages/profile/index?userId=user-01&public=1"
          ],
          [
            "飞手 B",
            "接受约飞邀请 · 位置模糊到街道",
            "可沟通",
            "/pages/messages/index?conversationId=user-02"
          ]
        ]
      },
      {
        "title": "活动赛事",
        "cards": [
          [
            "同城航拍赛",
            "报名、签到、投票与评审按角色开放",
            "活动报名",
            ""
          ],
          [
            "常用飞场",
            "适飞条件与禁飞风险请到飞行服务复核",
            "飞场信息",
            "/pages/flight/index"
          ]
        ]
      }
    ]
  }
}

export function getCommunityPage(key, options = {}) {
  const page = cloneDemo(communityPageData[key] || communityPageData.community)
  if (key === 'post' && options.id === 'post-02') {
    page.hero.eyebrow = '超视距备考'
    page.hero.title = '超视距考试经验整理'
    page.hero.note = '知识讨论 · 仅展示作者授权的内容与来源'
  }
  if (key === 'nearby' && options.mode === 'field') page.nearbyMode = 'field'
  return page
}
