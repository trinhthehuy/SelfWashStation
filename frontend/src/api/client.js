import axios from 'axios'
import { AUTH_STORAGE_KEY } from '@/stores/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    const session = raw ? JSON.parse(raw) : null

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
    const isLoginRequest = String(error?.config?.url || '').includes('/auth/login')
    const status = error?.response?.status
    const message = String(error?.response?.data?.message || '').toLowerCase()
    const isAuthFailure = status === 401 || (status === 403 && message.includes('invalid or expired token'))

    if (isAuthFailure && !isLoginRequest) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient