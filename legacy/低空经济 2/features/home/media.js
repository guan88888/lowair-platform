import { getMediaAsset } from '../shared/media/media-registry'

export const homeMedia = Object.freeze({
  carousel: [
    getMediaAsset('homeCertification'),
    getMediaAsset('homeWork'),
    getMediaAsset('homeMarket')
  ],
  flight: getMediaAsset('flightService'),
  login: getMediaAsset('loginPhoto')
})
