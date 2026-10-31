import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { API_BASE_URL } from '../../../config/api'
import { getAccessToken } from '../../../utils/auth'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getProfilePage } from '../mock/page-data'

const PAGE_META = { messages: { title: '消息中心', kind: 'messages', auth: true }, profile: { title: '我的', active: 'profile', root: true, kind: 'profile' }, account: { title: '身份与认证', kind: 'account', auth: true }, wallet: { title: '我的钱包', kind: 'wallet', auth: true } }
export const toProfilePageDto = (payload, pageKey) => toPageDto(payload, 'profile', pageKey)
export const mapProfilePageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'profile', demoGetter: getProfilePage, toDto: toProfilePageDto, toUi: mapProfilePageDto, pageMeta: PAGE_META })
export const getProfilePageModel = pages.initial
export const loadProfilePage = pages.load

export const getProfile = () => request({ url: '/profile', auth: true })
export const submitVerification = (type, data) => request({ url: '/profile/verifications/' + encodeURIComponent(type), method: 'POST', data, auth: true })
export const getWallet = () => request({ url: '/profile/wallet', auth: true })
export const listTransactions = async (query) => normalizePage(await request({ url: '/profile/wallet/transactions', query: toPageQuery(query), auth: true }))
export const listMessages = async (query) => {
  const payload = await request({ url: '/messages', query: toPageQuery(query), auth: true })
  return {
    ...normalizePage(payload),
    unread_total: payload.unread_total ?? payload.unreadTotal,
    unread_by_category: payload.unread_by_category ?? payload.unreadByCategory
  }
}
export const getConversation = (conversationId) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId), auth: true })
export const sendConversationMessage = (conversationId, data) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId) + '/messages', method: 'POST', data, auth: true })
export const markConversationRead = (conversationId, messageId) => request({
  url: '/messages/conversations/' + encodeURIComponent(conversationId) + '/read',
  method: 'POST',
  data: messageId ? { message_id: messageId } : {},
  auth: true
})
export const deleteConversation = (conversationId) => request({
  url: '/messages/conversations/' + encodeURIComponent(conversationId),
  method: 'DELETE',
  auth: true
})
export const clearConversations = (category) => request({
  url: '/messages/conversations',
  method: 'DELETE',
  query: category && category !== 'all' ? { category } : {},
  auth: true
})

export const uploadConversationImage = (conversationId, filePath) => {
  return new Promise((resolve, reject) => {
    const token = getAccessToken()
    const url = '/messages/conversations/' + encodeURIComponent(conversationId) + '/media'
    const task = uni.uploadFile({
      url: API_BASE_URL + url,
      filePath,
      name: 'file',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error('图片发送失败，请稍后重试'))
          return
        }
        try { resolve(JSON.parse(response.data || '{}')) } catch (error) { reject(new Error('图片发送响应格式无效')) }
      },
      fail(error) { reject(new Error(error.errMsg || '图片发送失败，请检查网络')) }
    })
    if (!task) reject(new Error('图片上传未启动'))
  })
}

export const getProfileOverview = (query = {}) => request({ url: '/profile/overview', query, auth: !query.public })
export const getCartSummary = () => request({ url: '/market/cart', auth: true })

export const getWalletSummary = () => getWallet()

export const getWalletBills = async (query = {}) => {
  return listTransactions(query)
}

export const getWalletInvoices = async (query = {}) => {
  return normalizePage(await request({ url: '/profile/wallet/invoices', query: toPageQuery(query), auth: true }))
}

export const submitWalletAction = (action) => request({ url: '/profile/wallet/actions', method: 'POST', data: { action }, auth: true })
