const mediaAssets = {
  homeCertification: {
    src: '/static/images/lowair-carousel-certification.png',
    alt: '城市上空正在飞行的行业无人机',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  homeWork: {
    src: '/static/images/lowair-carousel-work.png',
    alt: '山区输电线路上空的巡检无人机',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  homeMarket: {
    src: '/static/images/lowair-carousel-market.png',
    alt: '工作台上待检查的无人机和电池配件',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  flightService: {
    src: '/static/images/lowair-flight-service.png',
    alt: '无人机沿预定航线飞往起降点',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  academyTraining: {
    src: '/static/images/lowair-academy-training.png',
    alt: '教员在户外训练场指导无人机操作',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  institutionCampus: {
    src: '/static/images/lowair-institution-campus.png',
    alt: '无人机培训机构的户外起降场地',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  learningVideoDemo: {
    src: '/static/images/lowair-learning-video.png',
    alt: '教员在起降台上检查无人机的课程演示封面',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    demo: true,
    badge: '课程演示封面'
  },
  workInspection: {
    src: '/static/images/lowair-work-inspection.png',
    alt: '无人机正在山区输电线路旁执行巡检',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  marketUsedDrone: {
    src: '/static/images/lowair-used-drone-flight.png',
    alt: '无人机在开阔地带上空试飞',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  marketDrone: {
    src: '/static/images/lowair-market-drone.png',
    alt: '白色背景上展示的折叠无人机',
    width: 800,
    height: 800,
    ratio: '1 / 1'
  },
  marketAccessories: {
    src: '/static/images/lowair-market-accessories.png',
    alt: '白色背景上展示的无人机电池、桨叶和滤镜',
    width: 800,
    height: 800,
    ratio: '1 / 1'
  },
  communityFlightLog: {
    src: '/static/images/lowair-community-flightlog.png',
    alt: '无人机在山湖上空记录飞行航迹',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  aiAssistant: {
    src: '/static/images/lowair-flight-service.png',
    alt: '无人机沿数字航线飞往起降点',
    width: 1200,
    height: 800,
    ratio: '3 / 2'
  },
  loginPhoto: {
    src: '/static/images/online-drone-login.jpg',
    alt: '白色四旋翼无人机正在林地上空飞行',
    width: 1600,
    height: 1067,
    ratio: '1600 / 1067'
  }
}

export const MEDIA_ASSETS = Object.freeze(mediaAssets)

export function getMediaAsset(key) {
  const asset = MEDIA_ASSETS[key]
  if (!asset) throw new Error(`[media] Unknown asset key: ${key}`)
  return asset
}

export function reportMediaError(detail, hook) {
  const payload = {
    type: 'media-error',
    src: detail.src || '',
    alt: detail.alt || '',
    page: detail.page || '',
    at: new Date().toISOString()
  }
  if (typeof hook === 'function') hook(payload)
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[media] asset failed to load', payload)
  }
  return payload
}
