<template>
  <div class="header">
    <!-- Mobile hamburger -->
    <button class="hamburger-btn" @click="layoutStore.toggle()" title="Menu">
      <Menu :size="20" />
    </button>

    <div class="breadcrumb">
      <span class="brand-mark">Xe Sạch 365</span>
      <ChevronRight class="breadcrumb-sep" :size="13" />
      <span class="page-name">{{ pageLabel }}</span>
    </div>

    <div class="right-actions">
      <!-- Notification bell → quick-view popover -->
      <el-popover
        placement="bottom-end"
        :width="340"
        trigger="click"
        popper-class="notif-popper"
        @show="fetchRecentNotifications"
      >
        <template #reference>
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" type="danger">
            <button class="icon-btn" title="Thông báo">
              <Bell :size="17" />
            </button>
          </el-badge>
        </template>

        <!-- Popover content -->
        <div class="notif-panel">
          <div class="notif-panel-header">
            <span class="notif-panel-title">Thông báo</span>
            <el-tag v-if="unreadCount > 0" type="danger" size="small" effect="light">
              {{ unreadCount }} mới
            </el-tag>
          </div>

          <div v-if="recentLoading" style="padding: 16px;">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else-if="recentItems.length === 0" class="notif-empty">
            Không có thông báo nào
          </div>
          <div v-else class="notif-list">
            <div
              v-for="item in recentItems"
              :key="item.id"
              class="notif-item"
              :class="{ 'notif-unread': !item.is_read }"
              @click="openNotification(item)"
            >
              <div class="notif-item-title">{{ item.title }}</div>
              <div class="notif-item-meta">
                <el-tag
                  size="small"
                  :type="item.type === 'FEEDBACK_REPLIED' ? 'success' : 'warning'"
                  effect="light"
                >
                  {{ item.type === 'FEEDBACK_REPLIED' ? 'Đã phản hồi' : 'Thông báo mới' }}
                </el-tag>
                <span class="notif-item-date">{{ formatNotifDate(item.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="notif-panel-footer">
            <el-button type="primary" link @click="goToNotifications">
              Xem tất cả thông báo →
            </el-button>
          </div>
        </div>
      </el-popover>

      <!-- Theme toggle -->
      <button class="icon-btn" @click="themeStore.toggle()" :title="themeStore.isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'">
        <Sun v-if="themeStore.isDark" :size="17" />
        <Moon v-else :size="17" />
      </button>

      <!-- Separator -->
      <div class="actions-sep"></div>

      <el-dropdown trigger="click">
        <div class="user">
          <div class="user-avatar" :class="avatarClass">
            <img v-if="authStore.state.user?.avatar" :src="authStore.state.user.avatar" class="avatar-img" alt="" />
            <span v-else>{{ userInitials }}</span>
          </div>
          <div class="user-info">
            <div class="user-name">{{ authStore.state.user?.fullName || 'Quản trị hệ thống' }}</div>
            <div class="user-role" :class="roleClass">{{ roleLabel }}</div>
          </div>
          <ChevronDown class="user-chevron" :size="13" />
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="goToProfile">Hồ sơ cá nhân</el-dropdown-item>
            <el-dropdown-item @click="goToSettings" v-if="authStore.hasAnyRole(['sa', 'engineer'])">Tài khoản hệ thống</el-dropdown-item>
            <el-dropdown-item divided @click="logout">Đăng xuất</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authStore } from '@/stores/auth'
import { themeStore } from '@/stores/theme'
import { layoutStore } from '@/stores/layout'
import { Sun, Moon, Bell, ChevronRight, ChevronDown, Menu } from 'lucide-vue-next'
import { notificationApi } from '@/api/notification'

const router = useRouter()
const route  = useRoute()
// ─── Page breadcrumb ──────────────────────────────────────────────
const PAGE_LABELS = {
  'dashboard':           'Tổng quan',
  'dai-ly':              'Đại lý',
  'tram':                'Trạm rửa',
  'Them_Sua_Xoa_Tram':   'Quản lý trạm',
  'tai-khoan-ngan-hang': 'Tài khoản ngân hàng',
  'phien-rua':           'Phiên rửa',
  'doanh-thu':           'Doanh thu',
  'canh-bao':            'Cảnh báo',
  'gop-y':               'Góp ý',
  'cau-hinh':            'Cấu hình',
  'api-management':      'Quản lý API',
  'system-test':         'Kiểm tra hệ thống',
  'cai-dat':             'Cài đặt',
  'nhat-ky':             'Nhật ký',
  'ho-so':               'Hồ sơ',
  'chien-luoc':          'Chiến lược',
}
const pageLabel = computed(() => PAGE_LABELS[route.name] ?? String(route.name ?? 'Tổng quan'))
// ─── Notification bell ───────────────────────────────────────────
const unreadCount  = ref(0)
const recentItems  = ref([])
const recentLoading = ref(false)

const fetchUnreadCount = async () => {
  try {
    const res = await notificationApi.getUnreadCount()
    unreadCount.value = res.data.count ?? 0
  } catch { /* silent */ }
}

const fetchRecentNotifications = async () => {
  recentLoading.value = true
  try {
    const res = await notificationApi.getNotifications({ page: 1, limit: 5 })
    const items = Array.isArray(res.data.data) ? res.data.data : []
    recentItems.value = items
    await fetchUnreadCount()
  } catch { /* silent */ } finally {
    recentLoading.value = false
  }
}

const openNotification = async (item) => {
  try {
    if (!item.is_read) {
      await notificationApi.markRead(item.id)
      item.is_read = 1
      window.dispatchEvent(new Event('notifications:refresh'))
    }
  } catch { /* silent */ }

  if (item.action_url) {
    router.push(item.action_url)
    return
  }

  router.push('/canh-bao')
}

const formatNotifDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return `Hôm nay, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7)  return `${diffDays} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

const goToNotifications = () => {
  router.push('/canh-bao')
}

let pollInterval = null
const onNotificationRefresh = async () => {
  await fetchUnreadCount()
}

onMounted(async () => {
  await fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 60_000)
  window.addEventListener('notifications:refresh', onNotificationRefresh)
})
onUnmounted(() => {
  clearInterval(pollInterval)
  window.removeEventListener('notifications:refresh', onNotificationRefresh)
})

const roleLabel = computed(() => {
  if (authStore.state.user?.role === 'sa') return 'Quản trị hệ thống'
  if (authStore.state.user?.role === 'engineer') return 'Kỹ thuật viên'
  if (authStore.state.user?.role === 'agency') return 'Đại lý'
  return 'Khách'
})

const roleClass = computed(() => {
  if (authStore.state.user?.role === 'sa') return 'role-sa'
  if (authStore.state.user?.role === 'engineer') return 'role-engineer'
  if (authStore.state.user?.role === 'agency') return 'role-agency'
  return ''
})

const avatarClass = computed(() => {
  if (authStore.state.user?.role === 'sa') return 'avatar-sa'
  if (authStore.state.user?.role === 'engineer') return 'avatar-engineer'
  if (authStore.state.user?.role === 'agency') return 'avatar-agency'
  return ''
})

const userInitials = computed(() => {
  const name = authStore.state.user?.fullName || ''
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'U'
})

const goToProfile = () => {
  router.push('/ho-so')
}

const goToSettings = () => {
  router.push('/cai-dat')
}

const logout = () => {
  authStore.clearSession()
  router.replace('/login')
}
</script>

<style scoped>
.header {
  height: 60px;
  background: var(--bg-header);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-header);
  flex-shrink: 0;
  transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
  position: relative;
  z-index: 10;
}

/* ── DARK: glassmorphism header ── */
:global([data-theme="dark"]) .header {
  background: rgba(13, 24, 41, 0.75) !important;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border-bottom: 1px solid rgba(99, 102, 241, 0.12) !important;
  box-shadow: 0 1px 0 rgba(0,0,0,0.4), 0 4px 24px rgba(0,0,0,0.25) !important;
}

/* ── BREADCRUMB ────────────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-mark {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.02em;
  user-select: none;
  white-space: nowrap;
}

.breadcrumb-sep {
  color: var(--text-faint);
  flex-shrink: 0;
  opacity: 0.5;
}

.page-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── THEME TOGGLE ────────────────────────────────────────── */
.theme-toggle {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--accent);
  transform: rotate(15deg);
}

:global([data-theme="dark"]) .theme-toggle:hover {
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.5);
  color: #a5b4fc;
}

/* ── USER ────────────────────────────────────────────────── */
.user {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}

.user:hover {
  background: var(--bg-hover);
}

.user-chevron {
  color: var(--text-faint);
  flex-shrink: 0;
  margin-left: 2px;
  transition: transform 0.2s, color 0.2s;
}

.user:hover .user-chevron {
  color: var(--text-muted);
  transform: translateY(1px);
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-sa      { background: rgba(99,102,241,0.18); color: #818cf8; }
.avatar-engineer{ background: rgba(16,185,129,0.18); color: #34d399; }
.avatar-agency  { background: rgba(245,158,11,0.18);  color: #fbbf24; }

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.3;
  transition: color 0.2s ease;
}

.user-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 1px 6px;
  border-radius: 20px;
  line-height: 1.6;
  transition: color 0.2s ease;
}

.role-sa       { background: rgba(99,102,241,0.15); color: #818cf8; }
.role-engineer { background: rgba(16,185,129,0.15); color: #34d399; }
.role-agency   { background: rgba(245,158,11,0.15);  color: #fbbf24; }

/* ── NOTIFICATION POPOVER ──────────────────────────────────── */
.notif-panel {
  display: flex;
  flex-direction: column;
}

.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 4px;
}

.notif-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.notif-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
}

.notif-item {
  padding: 10px 8px;
  border-radius: 6px;
  cursor: default;
  transition: background 0.15s;
}

.notif-item:hover {
  background: var(--el-fill-color-light);
}

.notif-unread {
  background: var(--el-color-warning-light-9);
}

.notif-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-item-date {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.notif-panel-footer {
  border-top: 1px solid var(--el-border-color-light);
  padding-top: 10px;
  margin-top: 6px;
  text-align: center;
}

.notif-panel-footer {
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 4px;
  text-align: center;
}

/* ── HAMBURGER (mobile only) ────────────────────────────── */
.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.hamburger-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
}

@media (max-width: 768px) {
  .hamburger-btn {
    display: flex;
  }

  .header {
    padding: 0 12px;
    gap: 4px;
  }

  /* Show only brand-mark on mobile, hide separator and page name */
  .breadcrumb-sep,
  .page-name {
    display: none;
  }

  .brand-mark {
    font-size: 16px;
  }

  /* Compact user info on mobile */
  .user-info {
    display: none;
  }

  .user-chevron {
    display: none;
  }

  .right-actions {
    gap: 8px;
  }

  .actions-sep {
    display: none;
  }
}
</style>
