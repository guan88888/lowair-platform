// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const operationsPageData = {
  "ad": {
    "title": "广告服务",
    "active": "home",
    "kind": "ad",
    "required": "enterprise",
    "tabs": [
      "广告位",
      "投放规则",
      "已有计划"
    ],
    "sections": [
      {
        "title": "广告资源",
        "cards": [
          [
            "首页本地推荐",
            "适合本地商户和行业服务商",
            "广告位",
            "/pages/ad/campaign?mode=create&biz=general"
          ],
          [
            "培训榜单推广",
            "机构招生内容必须明确推广标识",
            "培训推广",
            "/pages/ad/campaign?mode=create&biz=academy"
          ],
          [
            "招聘精准曝光",
            "认证企业可推广职位信息",
            "招聘推广",
            "/pages/ad/campaign?mode=create&biz=recruitment"
          ]
        ]
      },
      {
        "title": "投放边界",
        "cards": [
          [
            "素材审核",
            "提交后先进入审核中状态",
            "审核规则",
            ""
          ],
          [
            "计费与数据",
            "未确定项目显示方案确认中",
            "演示数据",
            "/pages/ad/campaign?mode=dashboard"
          ]
        ]
      }
    ]
  },
  "campaign": {
    "title": "广告计划",
    "active": "home",
    "kind": "campaign",
    "required": "enterprise",
    "tabs": [
      "创建计划",
      "投放看板"
    ],
    "form": [
      "推广目标",
      "广告位",
      "落地页",
      "图片或视频素材",
      "地域与行业定向",
      "预算",
      "投放排期",
      "联系人"
    ],
    "sections": [
      {
        "title": "计划状态",
        "cards": [
          [
            "培训试听推广",
            "素材待审核，未直接投放",
            "审核中",
            ""
          ],
          [
            "招聘职位推广",
            "统计口径与演示数据说明",
            "投放中",
            ""
          ]
        ]
      }
    ]
  }
}

export function getOperationsPage(key, options = {}) {
  const page = cloneDemo(operationsPageData[key] || operationsPageData.ad)
  if (key === 'campaign' && options.mode === 'dashboard') page.initialTab = '投放看板'
  return page
}
