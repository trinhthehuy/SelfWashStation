import { reactive } from 'vue'

export const AUTH_STORAGE_KEY = 'selfwash.auth.session'
export const AUTH_STORAGE_MODE_KEY = 'selfwash.auth.storage_mode'
const PERSISTENT_MODE = 'local'
const SESSION_MODE = 'session'

function parseSession(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadSession() {
  const fromLocal = parseSession(localStorage.getItem(AUTH_STORAGE_KEY))
  if (fromLocal) {
    return { session: fromLocal, mode: PERSISTENT_MODE }
  }

  const fromSession = parseSession(sessionStorage.getItem(AUTH_STORAGE_KEY))
  if (fromSession) {
    return { session: fromSession, mode: SESSION_MODE }
  }

  return { session: null, mode: PERSISTENT_MODE }
}

const storedSession = loadSession()

const state = reactive({
  token: storedSession.session?.token || '',
  user: storedSession.session?.user || null,
  rememberMe: storedSession.mode !== SESSION_MODE,
})

function persistSession() {
  const mode = state.rememberMe ? PERSISTENT_MODE : SESSION_MODE
  const primaryStorage = state.rememberMe ? localStorage : sessionStorage
  const secondaryStorage = state.rememberMe ? sessionStorage : localStorage

  secondaryStorage.removeItem(AUTH_STORAGE_KEY)

  if (state.token && state.user) {
    primaryStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }))
    localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode)
    return
  }

  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_STORAGE_MODE_KEY)
}

export function getStoredSession() {
  return parseSession(localStorage.getItem(AUTH_STORAGE_KEY)) || parseSession(sessionStorage.getItem(AUTH_STORAGE_KEY))
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_STORAGE_MODE_KEY)
}

export const authStore = {
  state,
  get isAuthenticated() {
    return Boolean(state.token && state.user)
  },
  setSession(session, options = {}) {
    if (typeof options.rememberMe === 'boolean') {
      state.rememberMe = options.rememberMe
    }
    state.token = session.token
    state.user = session.user
    persistSession()
  },
  setRememberMe(value) {
    state.rememberMe = Boolean(value)
    persistSession()
  },
  clearSession() {
    state.token = ''
    state.user = null
    state.rememberMe = true
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