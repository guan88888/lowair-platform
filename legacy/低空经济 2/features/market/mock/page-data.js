// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const marketPageData = {
  "market": {
    "title": "设备交易",
    "active": "market",
    "root": true,
    "kind": "market",
    "tabs": [
      "推荐设备",
      "二手无人机",
      "配件",
      "租赁"
    ],
    "hero": {
      "eyebrow": "担保交易演示",
      "title": "买、租、卖无人机",
      "note": "质检、SN 与服务保障均以实际接入状态为准",
      "action": "查看交易记录",
      "to": "/pages/market/order?mode=list",
      "image": "/static/images/lowair-used-drone-flight.png"
    },
    "metrics": [
      [
        "二手无人机",
        "126"
      ],
      [
        "在售配件",
        "328"
      ],
      [
        "交易订单",
        "24"
      ]
    ],
    "tools": [
      [
        "二手无人机",
        "market",
        "/pages/market/product-detail?id=device-01"
      ],
      [
        "无人机配件",
        "accessory",
        "/pages/market/product-detail?id=part-01"
      ],
      [
        "租赁方案",
        "lease",
        "/pages/market/lease?id=device-01"
      ]
    ],
    "products": [
      {
        "title": "Matrice 专业机",
        "note": "二手无人机 · 已完成外观检查",
        "price": "¥ 12,800",
        "tag": "严选待核验",
        "category": "二手无人机",
        "image": "/static/images/lowair-market-drone.png",
        "to": "/pages/market/product-detail?id=device-01"
      },
      {
        "title": "长续航电池套装",
        "note": "无人机配件 · 电池健康度报告随单展示",
        "price": "¥ 1,280",
        "tag": "配件",
        "category": "配件",
        "image": "/static/images/lowair-market-accessories.png",
        "to": "/pages/market/product-detail?id=part-01"
      },
      {
        "title": "行业巡检机",
        "note": "二手无人机 · 飞行状态与履历待核验",
        "price": "¥ 9,600",
        "tag": "二手设备",
        "category": "二手无人机",
        "image": "/static/images/lowair-used-drone-flight.png",
        "to": "/pages/market/product-detail?id=device-02"
      },
      {
        "title": "Matrice 月租方案",
        "note": "含验机与保障选择 · 支持项目短租",
        "price": "¥ 1,999/月",
        "tag": "租赁",
        "category": "租赁",
        "image": "/static/images/lowair-used-drone-flight.png",
        "to": "/pages/market/lease?id=device-01"
      }
    ],
    "sections": [
      {
        "title": "二手无人机",
        "action": "查看全部",
        "to": "/pages/market/product-detail?id=device-01",
        "cards": [
          [
            "Matrice 专业机",
            "二手无人机，可查检验与履历",
            "平台严选待核验",
            "/pages/market/product-detail?id=device-01"
          ],
          [
            "行业巡检机",
            "续航与配套服务信息以实际登记为准",
            "待核验",
            "/pages/market/product-detail?id=device-02"
          ]
        ]
      },
      {
        "title": "无人机配件",
        "action": "查看全部",
        "to": "/pages/market/product-detail?id=part-01",
        "cards": [
          [
            "长续航电池套装",
            "配件健康度报告随单展示",
            "报告待核验",
            "/pages/market/product-detail?id=part-01"
          ],
          [
            "桨叶与充电套件",
            "适配型号与使用状态请以详情页为准",
            "配件",
            "/pages/market/product-detail?id=part-02"
          ]
        ]
      },
      {
        "title": "设备租赁",
        "action": "租赁方案",
        "to": "/pages/market/lease?id=device-01",
        "cards": [
          [
            "项目短租",
            "按日或按项目约定取还机与保障方案",
            "租赁",
            "/pages/market/lease?id=device-01"
          ]
        ]
      },
      {
        "title": "设备服务",
        "cards": [
          [
            "设备履历查询",
            "输入 SN 或扫描报告二维码查看设备状态",
            "质检与 SN",
            "/pages/market/device-history?sn=SN-DEMO-01"
          ]
        ]
      }
    ]
  },
  "product": {
    "title": "商品详情",
    "active": "market",
    "kind": "product",
    "hero": {
      "eyebrow": "二手设备飞行状态",
      "title": "Matrice 专业机",
      "note": "成色、质检、SN 与维修记录以报告为准",
      "action": "查看设备履历",
      "to": "/pages/market/device-history?sn=SN-DEMO-01",
      "image": "/static/images/lowair-used-drone-flight.png"
    },
    "metrics": [
      [
        "成色",
        "9 成新"
      ],
      [
        "自提",
        "可选"
      ],
      [
        "报告",
        "待核验"
      ]
    ],
    "sections": [
      {
        "title": "规格与保障",
        "cards": [
          [
            "设备规格",
            "机型、飞行时长、配件清单",
            "商品参数",
            ""
          ],
          [
            "检验说明",
            "机身、云台、电机、电池分项说明",
            "质检报告",
            "/pages/market/device-history?sn=SN-DEMO-01"
          ],
          [
            "交付方式",
            "配送或线下验机后平台内付款",
            "担保交易",
            ""
          ]
        ]
      },
      {
        "title": "购买操作",
        "cards": [
          [
            "立即购买",
            "实名后进入确认交易",
            "购买",
            "/pages/market/order?mode=checkout&id=device-01&tradeType=buy"
          ],
          [
            "立即租赁",
            "选择租期与保障方案",
            "租赁",
            "/pages/market/lease?id=device-01"
          ]
        ]
      }
    ]
  },
  "sell": {
    "title": "设备出售",
    "active": "market",
    "kind": "sell",
    "tabs": [
      "卖旧换新",
      "云寄售",
      "发布闲置"
    ],
    "form": [
      "品牌型号",
      "SN 码",
      "购买时间",
      "成色与损伤",
      "维修/炸机历史",
      "配件清单",
      "所在地"
    ],
    "sections": [
      {
        "title": "拍摄与估价",
        "cards": [
          [
            "拍摄清单",
            "机身、底部、云台、电机和电池仓",
            "上传材料",
            ""
          ],
          [
            "AI 估价",
            "识别结果仅为演示，需用户确认",
            "演示识别",
            ""
          ],
          [
            "寄检服务",
            "顺丰寄检或一线城市上门验机按实际能力开通",
            "待接入",
            ""
          ]
        ]
      }
    ]
  },
  "lease": {
    "title": "租赁方案",
    "active": "market",
    "kind": "lease",
    "tabs": [
      "短租",
      "长租",
      "租满即送"
    ],
    "metrics": [
      [
        "月租",
        "演示"
      ],
      [
        "押金",
        "递减"
      ],
      [
        "归属",
        "12 个月"
      ]
    ],
    "sections": [
      {
        "title": "方案说明",
        "cards": [
          [
            "短租",
            "适合短期项目，按订单约定归还",
            "可选方案",
            ""
          ],
          [
            "长租",
            "展示租期、押金与续租规则",
            "可选方案",
            ""
          ],
          [
            "租满即送",
            "满 12 个月后设备归属按合同执行",
            "长期方案",
            "/pages/market/order?mode=checkout&id=device-01&tradeType=lease"
          ]
        ]
      },
      {
        "title": "保障与验机",
        "cards": [
          [
            "第三方延保",
            "覆盖范围依赖服务接入状态",
            "接入中",
            ""
          ],
          [
            "验机与自提",
            "可在授权点验机后平台内交易",
            "线下服务",
            "/pages/flight/index?layer=service"
          ]
        ]
      }
    ]
  },
  "history": {
    "title": "设备履历",
    "active": "market",
    "kind": "history",
    "form": [
      "设备 SN 码"
    ],
    "sections": [
      {
        "title": "SN-DEMO-01",
        "cards": [
          [
            "平台认证报告",
            "报告编号、质检方式、防伪二维码",
            "待核验",
            ""
          ],
          [
            "生命周期",
            "首次激活、维修、质检、过户记录",
            "履历时间轴",
            ""
          ],
          [
            "区块链存证",
            "有真实链上字段时展示哈希和区块信息",
            "接入中",
            ""
          ]
        ]
      },
      {
        "title": "关联服务",
        "cards": [
          [
            "查看商品",
            "返回关联在售设备",
            "商品详情",
            "/pages/market/product-detail?id=device-01"
          ],
          [
            "申请质检",
            "复用出售流程提交设备信息",
            "服务申请",
            "/pages/market/sell?mode=inspection&sn=SN-DEMO-01"
          ]
        ]
      }
    ]
  },
  "order": {
    "title": "我的交易",
    "active": "market",
    "kind": "order",
    "tabs": [
      "订单列表",
      "确认交易",
      "订单详情"
    ],
    "form": [
      "收货地址或自提点",
      "验机方式",
      "保障选择",
      "低空豆抵扣"
    ],
    "sections": [
      {
        "title": "订单状态",
        "cards": [
          [
            "二手设备担保交易",
            "待确认验机方式",
            "待处理",
            "/pages/market/product-detail?id=device-01"
          ],
          [
            "寄售结算",
            "平台拍摄与上架进度",
            "演示状态",
            ""
          ],
          [
            "租赁订单",
            "当前租期、押金与还机规则",
            "履约中",
            "/pages/market/lease?id=device-01"
          ]
        ]
      },
      {
        "title": "资金与售后",
        "cards": [
          [
            "托管资金",
            "支付、退款、先行赔付按实际能力展示",
            "演示",
            "/pages/profile/wallet?tab=transactions"
          ],
          [
            "联系客服",
            "订单问题通过平台内会话处理",
            "会话",
            "/pages/messages/index?category=market"
          ]
        ]
      }
    ]
  }
}

export function getMarketPage(key, options = {}) {
  const page = cloneDemo(marketPageData[key] || marketPageData.market)
  const product = {
    'device-01': ['Matrice 专业机', '二手无人机 · 成色、质检、SN 与维修记录以报告为准', '9 成新'],
    'device-02': ['行业巡检机', '二手无人机 · 飞行状态与履历待核验', '8 成新'],
    'part-01': ['长续航电池套装', '无人机配件 · 健康度报告随单展示', '报告待核验'],
    'part-02': ['桨叶与充电套件', '无人机配件 · 适配型号以详情为准', '配件']
  }[options.id]
  if (key === 'product' && product) {
    page.hero.title = product[0]
    page.hero.note = product[1]
    page.metrics[0][1] = product[2]
    page.productId = options.id
  }
  if (key === 'history' && options.sn) page.sections[0].title = options.sn
  if (key === 'order' && options.orderId) page.orderId = options.orderId
  return page
}
