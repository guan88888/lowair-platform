import { getMediaAsset } from '../shared/media/media-registry'

export const communityMedia = Object.freeze({
  flightLog: getMediaAsset('communityFlightLog'),
  liveDemoCover: Object.freeze({
    ...getMediaAsset('communityFlightLog'),
    demo: true,
    badge: '互动功能演示封面'
  })
})
