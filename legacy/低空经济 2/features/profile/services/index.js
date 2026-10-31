import { normalizePage, request, toPageQuery } from '../../../utils/request'
import { isMockDataEnabled } from '../../../config/api'
import { createPageService, mapPageDtoToUi, toPageDto } from '../../shared/services/page-service'
import { getProfilePage as getDemoPage } from '../mock/page-data'
import { getDemoProfileOverview, getDemoWalletBills, getDemoWalletSummary } from '../mock/center-data'

const PAGE_META = { messages: { title: '消息中心', kind: 'messages', auth: true }, profile: { title: '我的', active: 'profile', root: true, kind: 'profile' }, account: { title: '身份与认证', kind: 'account', auth: true }, wallet: { title: '我的钱包', kind: 'wallet', auth: true } }
export const toProfilePageDto = (payload, pageKey) => toPageDto(payload, 'profile', pageKey)
export const mapProfilePageDto = (dto, source) => mapPageDtoToUi(dto, PAGE_META[dto.key], source)
const pages = createPageService({ domain: 'profile', demoGetter: getDemoPage, toDto: toProfilePageDto, toUi: mapProfilePageDto, pageMeta: PAGE_META })
export const getProfilePageModel = pages.initial
export const loadProfilePage = pages.load

export const getProfile = () => request({ url: '/profile', auth: true })
export const submitVerification = (type, data) => request({ url: '/profile/verifications/' + encodeURIComponent(type), method: 'POST', data, auth: true })
export const getWallet = () => request({ url: '/profile/wallet', auth: true })
export const listTransactions = async (query) => normalizePage(await request({ url: '/profile/wallet/transactions', query: toPageQuery(query), auth: true }))
export const listMessages = async (query) => normalizePage(await request({ url: '/messages', query: toPageQuery(query), auth: true }))
export const getConversation = (conversationId) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId), auth: true })
export const sendConversationMessage = (conversationId, data) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId) + '/messages', method: 'POST', data, auth: true })

export const getProfileOverview = (query = {}) => isMockDataEnabled()
  ? Promise.resolve(getDemoProfileOverview())
  : request({ url: '/profile/overview', query, auth: !query.public })

export const getWalletSummary = () => isMockDataEnabled()
  ? Promise.resolve(getDemoWalletSummary())
  : getWallet()

export const getWalletBills = async (query = {}) => {
  if (!isMockDataEnabled()) return listTransactions(query)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.max(1, Number(query.pageSize) || 10)
  const items = getDemoWalletBills().filter((item) => {
    const matchesType = !query.type || query.type === 'all' || item.type === query.type
    const matchesBiz = !query.bizType || query.bizType === 'all' || item.bizType === query.bizType
    const matchesStatus = !query.status || query.status === 'all' || item.status === query.status
    return matchesType && matchesBiz && matchesStatus
  })
  const offset = (page - 1) * pageSize
  return { items: items.slice(offset, offset + pageSize), page, pageSize, total: items.length, hasMore: offset + pageSize < items.length }
}

export const submitWalletAction = (action) => isMockDataEnabled()
  ? Promise.resolve({ accepted: false, action })
  : request({ url: '/profile/wallet/actions', method: 'POST', data: { action }, auth: true })
