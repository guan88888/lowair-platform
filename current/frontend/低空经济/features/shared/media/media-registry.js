const assetPackSource = 'Existing project asset pack'
const demoOnlyLicense = 'Demo only; provenance and production authorization required'

const mediaAssets = {
  homeCertification: {
    src: '/static/images/lowair-carousel-certification.png',
    thumbnailSrc: '/static/images/lowair-carousel-certification-thumb.webp',
    alt: '城市上空正在飞行的行业无人机',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['home-carousel'],
    licenseStatus: demoOnlyLicense
  },
  homeWork: {
    src: '/static/images/lowair-carousel-work.png',
    thumbnailSrc: '/static/images/lowair-carousel-work-thumb.webp',
    alt: '山区输电线路上空的巡检无人机',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['home-carousel'],
    licenseStatus: demoOnlyLicense
  },
  homeMarket: {
    src: '/static/images/lowair-carousel-market.png',
    thumbnailSrc: '/static/images/lowair-carousel-market-thumb.webp',
    alt: '工作台上待检查的无人机和电池配件',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['home-carousel', 'market-listing'],
    licenseStatus: demoOnlyLicense
  },
  flightService: {
    src: '/static/images/lowair-flight-service.png',
    thumbnailSrc: '/static/images/lowair-flight-service-thumb.webp',
    alt: '无人机沿预定航线飞往起降点',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['flight-service', 'ai-assistant', 'community-demo-cover'],
    licenseStatus: demoOnlyLicense
  },
  academyTraining: {
    src: '/static/images/lowair-academy-training.png',
    thumbnailSrc: '/static/images/lowair-academy-training-thumb.webp',
    alt: '教员在户外训练场指导无人机操作',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['academy-home', 'community-post'],
    licenseStatus: demoOnlyLicense
  },
  institutionCampus: {
    src: '/static/images/lowair-institution-campus.png',
    thumbnailSrc: '/static/images/lowair-institution-campus-thumb.webp',
    alt: '无人机培训机构的户外起降场地',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['academy-institution'],
    licenseStatus: demoOnlyLicense
  },
  learningVideoDemo: {
    src: '/static/images/lowair-learning-video.png',
    thumbnailSrc: '/static/images/lowair-learning-video-thumb.webp',
    alt: '教员在起降台上检查无人机的课程演示封面',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    demo: true,
    badge: '课程演示封面',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['academy-learning', 'community-video-demo'],
    licenseStatus: demoOnlyLicense
  },
  workInspection: {
    src: '/static/images/lowair-work-inspection.png',
    thumbnailSrc: '/static/images/lowair-work-inspection-thumb.webp',
    alt: '无人机正在山区输电线路旁执行巡检',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['work-task', 'work-job', 'operations-creative'],
    licenseStatus: demoOnlyLicense
  },
  marketUsedDrone: {
    src: '/static/images/lowair-used-drone-flight.png',
    thumbnailSrc: '/static/images/lowair-used-drone-flight-thumb.webp',
    alt: '无人机在开阔地带上空试飞',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['market-product', 'market-lease'],
    licenseStatus: demoOnlyLicense
  },
  marketDrone: {
    src: '/static/images/lowair-market-drone.png',
    thumbnailSrc: '/static/images/lowair-market-drone-thumb.webp',
    alt: '白色背景上展示的折叠无人机',
    width: 800,
    height: 800,
    ratio: '1 / 1',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['market-product', 'operations-creative', 'community-post'],
    licenseStatus: demoOnlyLicense
  },
  marketAccessories: {
    src: '/static/images/lowair-market-accessories.png',
    thumbnailSrc: '/static/images/lowair-market-accessories-thumb.webp',
    alt: '白色背景上展示的无人机电池、桨叶和滤镜',
    width: 800,
    height: 800,
    ratio: '1 / 1',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['market-accessories'],
    licenseStatus: demoOnlyLicense
  },
  communityFlightLog: {
    src: '/static/images/lowair-community-flightlog.png',
    thumbnailSrc: '/static/images/lowair-community-flightlog-thumb.webp',
    alt: '无人机在山湖上空记录飞行航迹',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['community-post', 'community-video-demo'],
    licenseStatus: demoOnlyLicense
  },
  aiAssistant: {
    src: '/static/images/lowair-flight-service.png',
    thumbnailSrc: '/static/images/lowair-flight-service-thumb.webp',
    alt: '无人机沿数字航线飞往起降点',
    width: 1200,
    height: 800,
    ratio: '3 / 2',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['ai-assistant'],
    licenseStatus: demoOnlyLicense
  },
  loginDrone: {
    src: '/static/images/lowair-login-drone.png',
    thumbnailSrc: '/static/images/lowair-login-drone-thumb.webp',
    alt: '深色背景中的折叠式无人机登录插图',
    width: 800,
    height: 800,
    ratio: '1 / 1',
    source: assetPackSource,
    sourceDate: '2026-08-01',
    usage: ['reserved-login'],
    licenseStatus: demoOnlyLicense
  },
  loginPhoto: {
    src: '/static/images/online-drone-login.jpg',
    alt: '白色四旋翼无人机正在林地上空飞行',
    width: 1600,
    height: 1067,
    ratio: '1600 / 1067',
    source: 'Existing repository asset',
    sourceDate: '2026-08-01',
    usage: ['entry', 'auth', 'flight'],
    licenseStatus: demoOnlyLicense
  }
}

export const MEDIA_ASSETS = Object.freeze(mediaAssets)

export function getMediaAsset(key) {
  const asset = MEDIA_ASSETS[key]
  if (!asset) throw new Error(`[media] Unknown asset key: ${key}`)
  return asset
}

export function getMediaAssetBySrc(src) {
  return Object.values(MEDIA_ASSETS).find((asset) => asset.src === src) || null
}

export function getPreviewUrls(src, extraUrls = []) {
  const urls = [src, ...extraUrls].filter(Boolean)
  return [...new Set(urls)]
}

let mediaErrorReporter = null

export function setMediaErrorReporter(reporter) {
  mediaErrorReporter = typeof reporter === 'function' ? reporter : null
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
  if (mediaErrorReporter) mediaErrorReporter(payload)
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[media] asset failed to load', payload)
  }
  return payload
}
