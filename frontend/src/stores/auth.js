import { reactive } from 'vue'

export const AUTH_STORAGE_KEY = 'selfwash.auth.session'

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const storedSession = loadSession()

const state = reactive({
  token: storedSession?.token || '',
  user: storedSession?.user || null,
})

function persistSession() {
  if (state.token && state.user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }))
    return
  }

  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const authStore = {
  state,
  get isAuthenticated() {
    return Boolean(state.token && state.user)
  },
  setSession(session) {
    state.token = session.token
    state.user = session.user
    persistSession()
  },
  clearSession() {
    state.token = ''
    state.user = null
    persistSession()
  },
  hasAnyRole(roles = []) {
    if (!roles.length) return true
    return roles.includes(state.user?.role)
  },
  getDefaultRoute() {
    const role = state.user?.role
    if (role === 'engineer') return '/tram'
    return '/'
  },
  updateUser(updates) {
    if (state.user) {
      Object.assign(state.user, updates)
      persistSession()
    }
  }
}