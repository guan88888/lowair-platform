import { getMediaAsset } from '../shared/media/media-registry'

export const homeMedia = Object.freeze({
  carousel: [
    getMediaAsset('homeCertification'),
    getMediaAsset('homeWork'),
    getMediaAsset('homeMarket')
  ],
  flight: getMediaAsset('flightService'),
  loginDrone: getMediaAsset('loginDrone'),
  login: getMediaAsset('loginPhoto')
})
