import { request } from '../utils/request'

export const register = (data) => request({ url: '/auth/register', method: 'POST', data })
export const login = (data) => request({ url: '/auth/login', method: 'POST', data })
export const getCurrentUser = () => request({ url: '/auth/me', auth: true })
export const requestPasswordReset = (data) => request({ url: '/auth/forgot-password/request', method: 'POST', data })
export const resetPassword = (data) => request({ url: '/auth/forgot-password/reset', method: 'POST', data })
