import { getMediaAsset } from '../shared/media/media-registry'

export const communityMedia = Object.freeze({
  flightLog: getMediaAsset('communityFlightLog'),
  liveDemoCover: Object.freeze({
    ...getMediaAsset('communityFlightLog'),
    demo: true,
    badge: '互动演示封面（无实时流）'
  }),
  scheduledDemoCover: Object.freeze({
    ...getMediaAsset('learningVideoDemo'),
    badge: '课程演示封面（无实时流）'
  })
})
