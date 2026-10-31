import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getCommunityPage } from '../mock/page-data'

const PAGE_META = { community: { title: '低空社区', active: 'community', root: true, kind: 'community' }, post: { title: '内容详情', kind: 'post' }, compose: { title: '发布内容', kind: 'compose', auth: true }, knowledge: { title: '低空知识', kind: 'knowledge' }, live: { title: '实时互动', kind: 'live' }, nearby: { title: '同城低空圈', kind: 'nearby' } }
export const toCommunityPageDto = (payload, pageKey) => toPageDto(payload, 'community', pageKey)
export const mapCommunityPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'community', demoGetter: getCommunityPage, toDto: toCommunityPageDto, toUi: mapCommunityPageDto, pageMeta: PAGE_META })
export const getCommunityPageModel = pages.initial
export const loadCommunityPage = pages.load

export const listPosts = async (query) => normalizePage(await request({ url: '/community/posts', query: toPageQuery(query) }))
export const getPost = (id) => request({ url: '/community/posts/' + encodeURIComponent(id) })
export const createPost = (data) => request({ url: '/community/posts', method: 'POST', data, auth: true })
export const updatePostReaction = (id, data) => request({ url: '/community/posts/' + encodeURIComponent(id) + '/reactions', method: 'PUT', data, auth: true })
export const createComment = (id, data) => request({ url: '/community/posts/' + encodeURIComponent(id) + '/comments', method: 'POST', data, auth: true })
export const reportContent = (data) => request({ url: '/community/reports', method: 'POST', data, auth: true })
export const listKnowledge = async (query) => normalizePage(await request({ url: '/community/knowledge', query: toPageQuery(query) }))
export const listLiveRooms = async (query) => normalizePage(await request({ url: '/community/live-rooms', query: toPageQuery(query) }))
export const listNearbyPlaces = async (query) => normalizePage(await request({ url: '/community/nearby-places', query: toPageQuery(query) }))

export const getPostById = getPost
export const addPostComment = (id, content) => createComment(id, { content })
export const deletePost = (id) => request({ url: '/community/posts/' + encodeURIComponent(id), method: 'DELETE', auth: true })
export const reportCommunityTarget = (data) => reportContent(data)
export const uploadCommunityMedia = (file, options = {}) => request({
  url: '/community/media', method: 'POST', data: { file, type: file?.type || '', name: file?.name || '' }, auth: true
}).then((result) => {
  options.onProgress?.(100)
  return result
})
export const getCommunityAiSuggestion = (post) => request({ url: '/community/posts/' + encodeURIComponent(post.id) + '/ai-suggestion', method: 'POST', data: {}, auth: true })
export const addLiveComment = (roomId, content) => request({ url: '/community/live-rooms/' + encodeURIComponent(roomId) + '/comments', method: 'POST', data: { content }, auth: true })
export const listNearby = (query) => request({ url: '/community/nearby', query })
