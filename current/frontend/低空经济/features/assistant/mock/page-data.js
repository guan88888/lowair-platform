// This domain owns its demo page data. Replace through its service adapter when the API is available.
import { cloneDemo } from '../../shared/utils/route-options'
export const assistantPageData = {
  "droneAgent": {
    "title": "低空 AI 助手",
    "active": "home",
    "kind": "droneAgent",
    "hero": {
      "eyebrow": "无人机行业智能体",
      "title": "把飞行问题说清楚",
      "note": "从飞前准备到设备处置，按场景给出可执行建议",
      "image": "/static/images/lowair-flight-service.png"
    },
    "tabs": [
      "飞前检查",
      "任务方案",
      "设备诊断",
      "学考答疑"
    ],
    "suggestions": [
      "帮我做一次起飞前检查",
      "规划一套电力巡检任务",
      "无人机电池鼓包怎么办",
      "讲解超视距考试重点"
    ],
    "sections": []
  }
}

export function getAssistantPage(key) {
  return cloneDemo(assistantPageData[key] || assistantPageData.droneAgent)
}
