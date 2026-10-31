import { getMediaAsset } from '../shared/media/media-registry'

export const academyMedia = Object.freeze({
  hero: getMediaAsset('academyTraining'),
  institution: getMediaAsset('institutionCampus'),
  learningVideo: getMediaAsset('learningVideoDemo')
})
