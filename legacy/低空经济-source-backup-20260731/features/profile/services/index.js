import { normalizePage, request, toPageQuery } from '../../../utils/request'
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
export const listMessages = async (query) => normalizePage(await request({ url: '/messages', query: toPageQuery(query), auth: true }))
export const getConversation = (conversationId) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId), auth: true })
export const sendConversationMessage = (conversationId, data) => request({ url: '/messages/conversations/' + encodeURIComponent(conversationId) + '/messages', method: 'POST', data, auth: true })

export const getProfileOverview = (query = {}) => request({ url: '/profile/overview', query, auth: !query.public })

export const getWalletSummary = () => getWallet()

export const getWalletBills = async (query = {}) => {
  return listTransactions(query)
}

export const submitWalletAction = (action) => request({ url: '/profile/wallet/actions', method: 'POST', data: { action }, auth: true })
