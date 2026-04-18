import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '@/stores/auth'

const Login = () => import('@/pages/Login.vue')
const Dashboard = () => import('@/pages/Dashboard.vue')
const DaiLy = () => import('@/pages/DaiLy.vue')
const Tram = () => import('@/pages/Tram.vue')
const ThemSuaXoaTram = () => import('@/pages/ThemSuaXoaTram.vue')
const TaiKhoanNganHang = () => import('@/pages/TaiKhoanNganHang.vue')
const PhienRua = () => import('@/pages/PhienRua.vue')
const DoanhThu = () => import('@/pages/DoanhThu.vue')
const CanhBao = () => import('@/pages/CanhBao.vue')
const GopY = () => import('@/pages/GopY.vue')
const HoSo = () => import('@/pages/HoSo.vue')
const CaiDat = () => import('@/pages/CaiDat.vue')
const CauHinh = () => import('@/pages/CauHinh.vue')
const ChienLuoc = () => import('@/pages/ChienLuoc.vue')
const ApiManagement = () => import('@/pages/ApiManagement.vue')
const SystemTest = () => import('@/pages/SystemTest.vue')
const NhatKy = () => import('@/pages/NhatKy.vue')

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true, noShell: true } },
  { path: '/', name: 'dashboard', component: Dashboard, meta: { roles: ['sa', 'agency'] } },
  { path: '/dai-ly', name: 'dai-ly', component: DaiLy, meta: { roles: ['sa'] } },
  { path: '/tram', name: 'tram', component: Tram, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/Them_Sua_Xoa_Tram', name: 'Them_Sua_Xoa_Tram', component: ThemSuaXoaTram, meta: { roles: ['sa'] } },
  { path: '/tai-khoan-ngan-hang', name: 'tai-khoan-ngan-hang', component: TaiKhoanNganHang, meta: { roles: ['sa', 'agency'] } },
  { path: '/phien-rua', name: 'phien-rua', component: PhienRua, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/doanh-thu', name: 'doanh-thu', component: DoanhThu, meta: { roles: ['sa', 'agency'] } },
  { path: '/canh-bao', name: 'canh-bao', component: CanhBao, meta: { roles: ['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor'] } },
  { path: '/gop-y', name: 'gop-y', component: GopY, meta: { roles: ['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor'] } },
  { path: '/cau-hinh', name: 'cau-hinh', component: CauHinh, meta: { roles: ['sa'] } },
  { path: '/api-management', name: 'api-management', component: ApiManagement, meta: { roles: ['sa', 'engineer'] } },
  { path: '/system-test', name: 'system-test', component: SystemTest, meta: { roles: ['sa', 'engineer'] } },
  { path: '/cai-dat', name: 'cai-dat', component: CaiDat, meta: { roles: ['sa'] } },
  { path: '/nhat-ky', name: 'nhat-ky', component: NhatKy, meta: { roles: ['sa'] } },
  { path: '/ho-so', name: 'ho-so', component: HoSo, meta: { roles: ['sa', 'engineer', 'agency'] } },
  { path: '/chien-luoc', name: 'chien-luoc', component: ChienLuoc, meta: { roles: ['sa', 'agency'] } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const mustChangePassword = Boolean(authStore.state.user?.mustChangePassword)

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.path === '/login') {
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