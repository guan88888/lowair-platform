import { request } from '../utils/request'

export const register = (data) => request({ url: '/auth/register', method: 'POST', data })
export const login = (data) => request({ url: '/auth/login', method: 'POST', data })
export const loginWithCode = (data) => request({ url: '/auth/login/code', method: 'POST', data })
export const requestLoginCode = (data) => request({ url: '/auth/login/code/request', method: 'POST', data })
export const getCurrentUser = () => request({ url: '/auth/me', auth: true })
export const refreshSession = (refreshToken) => request({ url: '/auth/refresh', method: 'POST', data: { refresh_token: refreshToken } })
export const logoutSession = () => request({ url: '/auth/logout', method: 'POST', auth: true })
export const requestPasswordReset = (data) => request({ url: '/auth/forgot-password/request', method: 'POST', data })
export const resetPassword = (data) => request({ url: '/auth/forgot-password/reset', method: 'POST', data })
