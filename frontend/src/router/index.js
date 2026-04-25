import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '@/stores/auth'

const login = () => import('@/pages/login.vue')
const forgotPassword = () => import('@/pages/forgot-password.vue')
const resetPassword = () => import('@/pages/reset-password.vue')
const dashboard = () => import('@/pages/dashboard.vue')
const agency = () => import('@/pages/agency.vue')
const station = () => import('@/pages/station.vue')
const stationDetail = () => import('@/pages/station-detail.vue')
const bankAccount = () => import('@/pages/bank-account.vue')
const washSession = () => import('@/pages/wash-session.vue')
const revenue = () => import('@/pages/revenue.vue')
const notifications = () => import('@/pages/notifications.vue')
const feedback = () => import('@/pages/feedback.vue')
const profile = () => import('@/pages/profile.vue')
const accounts = () => import('@/pages/accounts.vue')
const configuration = () => import('@/pages/configuration.vue')
const strategy = () => import('@/pages/strategy.vue')
const auditLog = () => import('@/pages/audit-log.vue')

const routes = [
  { path: '/login', name: 'login', component: login, meta: { public: true, noShell: true } },
  { path: '/forgot-password', name: 'forgot-password', component: forgotPassword, meta: { public: true, noShell: true } },
  { path: '/reset-password/:token', name: 'reset-password', component: resetPassword, meta: { public: true, noShell: true } },
  { path: '/', name: 'dashboard', component: dashboard, meta: { roles: ['sa', 'agency'] } },
  { path: '/agency', name: 'agency', component: agency, meta: { roles: ['sa', 'agency'] } },
  { path: '/station', name: 'station', component: station, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/station-detail', name: 'station-detail', component: stationDetail, meta: { roles: ['sa'] } },
  { path: '/bank-account', name: 'bank-account', component: bankAccount, meta: { roles: ['sa', 'agency'] } },
  { path: '/wash-session', name: 'wash-session', component: washSession, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/revenue', name: 'revenue', component: revenue, meta: { roles: ['sa', 'agency'] } },
  { path: '/notifications', name: 'notifications', component: notifications, meta: { roles: ['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor'] } },
  { path: '/feedback', name: 'feedback', component: feedback, alias: '/gop-y', meta: { roles: ['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor'] } },
  { path: '/configuration', name: 'configuration', component: configuration, meta: { roles: ['sa', 'engineer'] } },
  { path: '/accounts', name: 'accounts', component: accounts, meta: { roles: ['sa'] } },
  { path: '/audit-log', name: 'audit-log', component: auditLog, meta: { roles: ['sa'] } },
  { path: '/profile', name: 'profile', component: profile, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/strategy', name: 'strategy', component: strategy, meta: { roles: ['sa', 'agency'] } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const mustChangePassword = Boolean(authStore.state.user?.mustChangePassword)
  const publicAuthPaths = ['/login', '/forgot-password']
  const isResetPasswordRoute = String(to.path || '').startsWith('/reset-password/')

  if (to.meta.public) {
    // Always allow password-reset links so users can reset even with stale sessions.
    if (isResetPasswordRoute) {
      return true
    }

    if (authStore.isAuthenticated && publicAuthPaths.includes(to.path)) {
      if (mustChangePassword) {
        return true
      }
      return authStore.getDefaultRoute()
    }

    return true
  }

  if (!authStore.isAuthenticated) {
    return '/login'
  }

  if (mustChangePassword) {
    return '/login'
  }

  const allowedRoles = to.meta.roles || []
  if (allowedRoles.length && !authStore.hasAnyRole(allowedRoles)) {
    return authStore.getDefaultRoute()
  }

  return true
})

export default router