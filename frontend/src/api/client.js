import axios from 'axios'
import { clearStoredSession, getStoredSession } from '@/stores/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use((config) => {
  try {
    const session = getStoredSession()

    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`
    }
  } catch {
    // ignore session parse errors and continue without auth header
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '')
    const pathname = String(window.location?.pathname || '')
    const isLoginRequest = requestUrl.includes('/auth/login')
    const isPublicPasswordFlowRequest =
      requestUrl.includes('/auth/forgot-password')
      || requestUrl.includes('/auth/reset-password')
    const isPublicPasswordFlowPage =
      pathname === '/forgot-password'
      || pathname.startsWith('/reset-password/')
    const status = error?.response?.status
    const message = String(error?.response?.data?.message || '').toLowerCase()
    const isAuthFailure = status === 401 || (status === 403 && message.includes('invalid or expired token'))

    if (isAuthFailure && !isLoginRequest && !isPublicPasswordFlowRequest && !isPublicPasswordFlowPage) {
      clearStoredSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient