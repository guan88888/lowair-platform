import { request, toPageQuery } from '../../../utils/request'
import { API_BASE_URL, API_TIMEOUT_MS } from '../../../config/api'
import { getAccessToken } from '../../../utils/auth'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getCommunityPage } from '../mock/page-data'

const PAGE_META = { community: { title: '低空社区', active: 'community', root: true, kind: 'community' }, post: { title: '内容详情', kind: 'post' }, compose: { title: '发布内容', kind: 'compose', auth: true }, knowledge: { title: '低空知识', kind: 'knowledge' }, live: { title: '实时互动', kind: 'live' }, nearby: { title: '同城低空圈', kind: 'nearby' } }
export const toCommunityPageDto = (payload, pageKey) => toPageDto(payload, 'community', pageKey)
export const mapCommunityPageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'community', demoGetter: getCommunityPage, toDto: toCommunityPageDto, toUi: mapCommunityPageDto, pageMeta: PAGE_META })
export const getCommunityPageModel = pages.initial
export const loadCommunityPage = pages.load

function normalizePost(value = {}) {
  const post = value.post || value.item || value
  if (!post || typeof post !== 'object') return null
  const coverAssets = ['/static/images/lowair-community-flightlog-thumb.webp', '/static/images/lowair-work-inspection-thumb.webp', '/static/images/lowair-market-drone-thumb.webp', '/static/images/lowair-flight-service-thumb.webp']
  const index = Math.abs(Number(post.id) || String(post.id || '').length) % coverAssets.length
  const media = Array.isArray(post.media) && post.media.length ? post.media : [{ id: 'editorial-' + post.id, type: 'image', url: coverAssets[index], presentationOnly: true }]
  return {
    ...post,
    media,
    stats: { likes: Number(post.stats?.likes ?? post.likeCount ?? 0), comments: Number(post.stats?.comments ?? post.commentCount ?? 0), shares: Number(post.stats?.shares ?? post.shareCount ?? 0), ...(post.stats || {}) },
    // These capabilities are issued by the API. Never derive author or moderator
    // privileges from a client-side user id or an `owner` flag.
    permissions: post.permissions || value.permissions || {}
  }
}

function normalizeCursorPage(payload = {}) {
  const source = payload.data || payload
  const items = Array.isArray(source.items) ? source.items : (Array.isArray(source.results) ? source.results : [])
  const nextCursor = source.next_cursor ?? source.nextCursor ?? ''
  return {
    items: items.map(normalizePost).filter(Boolean),
    nextCursor,
    hasMore: Boolean(source.has_more ?? source.hasMore ?? nextCursor),
    total: Number(source.total ?? source.count ?? 0)
  }
}

function normalizeList(payload = {}) {
  const source = payload.data || payload
  return Array.isArray(source) ? source : (Array.isArray(source.items) ? source.items : (Array.isArray(source.results) ? source.results : []))
}

function normalizeReactionMutation(payload = {}) {
  const source = payload.data || payload
  return { post: normalizePost(source.post || source.updatedPost || source) }
}

function normalizeCommentMutation(payload = {}) {
  const source = payload.data || payload
  return {
    post: source.post || source.updatedPost ? normalizePost(source.post || source.updatedPost) : null,
    comment: source.comment || source.item || (source.id && source.content ? source : null)
  }
}

export const listPosts = async (query = {}) => normalizeCursorPage(await request({ url: '/community/posts', query: toPageQuery(query) }))
export const getPost = async (id) => normalizePost(await request({ url: '/community/posts/' + encodeURIComponent(id) }))
export const validateCommunityContent = (data) => request({ url: '/community/content-validation', method: 'POST', data, auth: true })
export const createPost = async (data) => normalizePost(await request({ url: '/community/posts', method: 'POST', data, auth: true }))
export const updatePostReaction = async (id, reaction, active) => normalizeReactionMutation(await request({ url: '/community/posts/' + encodeURIComponent(id) + '/reactions', method: 'PUT', data: { type: reaction, active }, auth: true }))
export const createComment = async (id, data) => normalizeCommentMutation(await request({ url: '/community/posts/' + encodeURIComponent(id) + '/comments', method: 'POST', data, auth: true }))
export const sharePost = async (id) => normalizeReactionMutation(await request({ url: '/community/posts/' + encodeURIComponent(id) + '/shares', method: 'POST', data: {}, auth: true }))
export const reportContent = (data) => request({ url: '/community/reports', method: 'POST', data, auth: true })
export const listKnowledge = async (query) => normalizeList(await request({ url: '/community/knowledge', query: toPageQuery(query) })).map((item) => ({ ...item, verified: item.verified === true || item.trustStatus === 'verified', sourceStatus: item.sourceStatus || item.trustStatus || '来源状态待核验' }))
export const getKnowledgeItem = (id) => request({ url: '/community/knowledge/' + encodeURIComponent(id) })
export const listKnowledgeQuestions = async (id) => normalizeList(await request({ url: '/community/knowledge/' + encodeURIComponent(id) + '/questions' })).map((question) => ({ ...question, answers: Array.isArray(question.answers) ? question.answers : [] }))
export const createKnowledgeQuestion = (id, content) => request({ url: '/community/knowledge/' + encodeURIComponent(id) + '/questions', method: 'POST', data: { content }, auth: true })
export const createKnowledgeAnswer = (knowledgeId, questionId, content) => request({ url: '/community/knowledge/' + encodeURIComponent(knowledgeId) + '/questions/' + encodeURIComponent(questionId) + '/answers', method: 'POST', data: { content }, auth: true })
export const acceptKnowledgeAnswer = (knowledgeId, questionId, answerId) => request({ url: '/community/knowledge/' + encodeURIComponent(knowledgeId) + '/questions/' + encodeURIComponent(questionId) + '/answers/' + encodeURIComponent(answerId) + '/accept', method: 'POST', data: {}, auth: true })
export const listLiveRooms = async (query) => normalizeList(await request({ url: '/community/live-rooms', query: toPageQuery(query) })).map((room) => ({ ...room, comments: Array.isArray(room.comments) ? room.comments : [], viewers: Number(room.viewers || 0) }))
export const listNearbyPlaces = async (query) => normalizeList(await request({ url: '/community/nearby-places', query: toPageQuery(query) }))

export const getPostById = getPost
export const addPostComment = (id, content) => createComment(id, { content })
export const deletePost = (id) => request({ url: '/community/posts/' + encodeURIComponent(id), method: 'DELETE', auth: true })
export const reportCommunityTarget = (data) => reportContent(data)
export function uploadCommunityMedia(file, options = {}) {
  if (!file?.path) return Promise.reject(new Error('未找到待上传的本地媒体文件'))
  const token = getAccessToken()
  if (!token) return Promise.reject(new Error('请登录后上传媒体'))
  const uploadUrl = API_BASE_URL + '/community/media'
  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: uploadUrl,
      filePath: file.path,
      name: 'file',
      formData: { media_type: file.type || '', filename: file.name || '' },
      header: { Authorization: 'Bearer ' + token },
      timeout: API_TIMEOUT_MS,
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error('媒体上传失败（' + response.statusCode + '）'))
        try {
          const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          const result = body?.data ?? body
          if (!result?.id && !result?.url) throw new Error('上传响应缺少媒体标识')
          resolve(result)
        } catch (error) { reject(error.message ? error : new Error('无法识别上传响应')) }
      },
      fail(error) { reject(new Error(error?.errMsg || '媒体上传失败，请重试')) }
    })
    task.onProgressUpdate?.((progress) => options.onProgress?.(Math.max(0, Math.min(100, Number(progress.progress) || 0))))
  })
}
export const getCommunityAiSuggestion = (post) => request({ url: '/community/posts/' + encodeURIComponent(post.id) + '/ai-suggestion', method: 'POST', data: {}, auth: true })
export const addLiveComment = (roomId, content) => request({ url: '/community/live-rooms/' + encodeURIComponent(roomId) + '/comments', method: 'POST', data: { content }, auth: true })
export const setLiveReminder = (roomId, enabled) => request({ url: '/community/live-rooms/' + encodeURIComponent(roomId) + '/reminder', method: 'PUT', data: { enabled }, auth: true })
export const registerCommunityEvent = (eventId, enabled) => request({ url: '/community/events/' + encodeURIComponent(eventId) + '/registration', method: 'PUT', data: { enabled }, auth: true })
export const listNearby = async (query) => {
  const result = await request({ url: '/community/nearby', query })
  const source = result?.data || result || {}
  return {
    ...source,
    friends: Array.isArray(source.friends) ? source.friends : [],
    fields: Array.isArray(source.fields) ? source.fields : [],
    events: Array.isArray(source.events) ? source.events : [],
    // Map centre and markers must already be privacy-filtered by the service.
    mapCenter: source.mapCenter || null,
    mapMarkers: Array.isArray(source.mapMarkers) ? source.mapMarkers : []
  }
}
