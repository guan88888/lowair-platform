// Compatibility registry. Business demo data is owned by features/<domain>/mock/page-data.js.
import { homePageData } from '../features/home/mock/page-data'
import { academyPageData } from '../features/academy/mock/page-data'
import { workPageData } from '../features/work/mock/page-data'
import { marketPageData } from '../features/market/mock/page-data'
import { communityPageData } from '../features/community/mock/page-data'
import { profilePageData } from '../features/profile/mock/page-data'
import { assistantPageData } from '../features/assistant/mock/page-data'
import { operationsPageData } from '../features/operations/mock/page-data'

export const pageData = Object.freeze({
  ...homePageData,
  ...academyPageData,
  ...workPageData,
  ...marketPageData,
  ...communityPageData,
  ...profilePageData,
  ...assistantPageData,
  ...operationsPageData
})

export function getPage(key) {
  return pageData[key] || pageData.home
}
