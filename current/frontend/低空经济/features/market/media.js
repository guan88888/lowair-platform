import { getMediaAsset } from '../shared/media/media-registry'

export const marketMedia = Object.freeze({
  hero: getMediaAsset('marketUsedDrone'),
  drone: getMediaAsset('marketDrone'),
  accessories: getMediaAsset('marketAccessories')
})
