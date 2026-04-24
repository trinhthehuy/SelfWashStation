<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed, 'mobile-open': layoutStore.mobileMenuOpen }">
    <div class="logo">
      <Car class="icon"/>
      <button class="collapse-btn" @click="toggleCollapse" :title="isCollapsed ? 'Mở rộng' : 'Thu gọn'">
        <ChevronLeft class="collapse-icon" :class="{ flipped: isCollapsed }"/>
      </button>
    </div>

    <div class="menu">
      <!-- Dashboard – not for engineer -->
      <router-link v-if="!isEngineer" to="/" class="menu-item">
        <LayoutDashboard class="icon"/>
        <span class="nav-label">Tổng quan</span>
      </router-link>

      <div class="category"><span class="nav-label">Quản lý</span></div>

      <!-- Doanh thu – not for engineer -->
      <router-link v-if="!isEngineer" to="/revenue" class="menu-item">
        <LineChart class="icon"/>
        <span class="nav-label">Doanh thu</span>
      </router-link>
      
      <!-- Trạm – all roles -->
      <router-link to="/station" class="menu-item">
        <Building2 class="icon"/>
        <span class="nav-label">Trạm</span>
      </router-link>

      <!-- Phiên rửa – all roles -->
      <router-link to="/wash-session" class="menu-item">
        <History class="icon"/>
        <span class="nav-label">Phiên rửa</span>
      </router-link>
      
      <!-- Đại lý group – SA only -->
      <div class="menu-group" v-if="isSA">
        <div class="menu-item-wrapper" :class="{ 'active': $route.path.startsWith('/agency') }">
          <router-link to="/agency" class="menu-item main-link">
            <Users class="icon"/>
            <span class="nav-label">Đại lý</span>
          </router-link>
          <div class="toggle-icon" v-if="!isCollapsed" @click="isDaiLyOpen = !isDaiLyOpen">
            <ChevronDown :class="{ 'rotate': isDaiLyOpen }"/>
          </div>
        </div>

        <div v-show="isDaiLyOpen && !isCollapsed" class="sub-menu-container">
          <router-link to="/bank-account" class="sub-item">
            <Wallet class="sub-icon"/>
            <span>Tài khoản ngân hàng</span>
          </router-link>

          <router-link to="/strategy" class="sub-item">
            <Target class="sub-icon"/>
            <span>Chiến lược</span>
          </router-link>
        </div>
      </div>

      <!-- Agency: grouped Dai Ly menu (same pattern as SA) -->
      <div class="menu-group" v-if="isAgency">
        <div class="menu-item-wrapper" :class="{ 'active': $route.path.startsWith('/agency') }">
          <router-link to="/agency" class="menu-item main-link">
            <Users class="icon"/>
            <span class="nav-label">Đại lý</span>
          </router-link>
          <div class="toggle-icon" v-if="!isCollapsed" @click="isDaiLyOpen = !isDaiLyOpen">
            <ChevronDown :class="{ 'rotate': isDaiLyOpen }"/>
          </div>
        </div>

        <div v-show="isDaiLyOpen && !isCollapsed" class="sub-menu-container">
          <router-link to="/bank-account" class="sub-item">
            <Wallet class="sub-icon"/>
            <span>Tài khoản ngân hàng</span>
          </router-link>

          <router-link to="/strategy" class="sub-item">
            <Target class="sub-icon"/>
            <span>Chiến lược</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Settings section – SA and Engineer -->
    <div class="category" v-if="isSA || isEngineer"><span class="nav-label">Thiết lập</span></div>

    <!-- SA and Engineer: direct links -->
    <div class="menu" v-if="isSA || isEngineer">
      <router-link to="/configuration" class="menu-item">
        <Sliders class="icon"/>
        <span class="nav-label">Cấu hình</span>
      </router-link>
      <template v-if="isSA">
        <router-link to="/accounts" class="menu-item">
          <Settings class="icon"/>
          <span class="nav-label">Tài khoản</span>
        </router-link>
        <router-link to="/audit-log" class="menu-item">
          <ScrollText class="icon"/>
          <span class="nav-label">Nhật ký</span>
        </router-link>
      </template>
    </div>

    <div class="sidebar-bottom">
      <router-link to="/feedback" class="menu-item" @click="layoutStore.close()">
        <MessageSquare class="icon"/>
        <span class="nav-label">Góp ý & Phản hồi</span>
      </router-link>
    </div>
  </div>

  <!-- Mobile bottom navigation bar -->
  <nav class="mobile-nav">
    <router-link v-if="!isEngineer" to="/" class="mobile-nav-item" exact-active-class="active">
      <LayoutDashboard :size="22"/>
      <span>Tổng quan</span>
    </router-link>
    <router-link v-if="!isEngineer" to="/revenue" class="mobile-nav-item">
      <LineChart :size="22"/>
      <span>Doanh thu</span>
    </router-link>
    <router-link to="/station" class="mobile-nav-item">
      <Building2 :size="22"/>
      <span>Trạm</span>
    </router-link>
    <router-link to="/wash-session" class="mobile-nav-item">
      <History :size="22"/>
      <span>Phiên rửa</span>
    </router-link>
    <button class="mobile-nav-item mobile-nav-more" @click="layoutStore.toggle()">
      <Menu :size="22"/>
      <span>Menu</span>
    </button>
  </nav>
</template>

<script setup>
import { computed, ref } from 'vue';
import { authStore } from '@/stores/auth';
import { layoutStore } from '@/stores/layout';
import {
  Car, LayoutDashboard, Users, Building2,
  Wallet, History, LineChart, ChevronDown, ChevronLeft, Target, Settings, Sliders, KeyRound, FlaskConical, MessageSquare, ScrollText, Menu
} from 'lucide-vue-next';

const isDaiLyOpen = ref(true);

const isSA = computed(() => authStore.hasAnyRole(['sa']));
const isEngineer = computed(() => authStore.hasAnyRole(['engineer']));
const isAgency = computed(() => authStore.hasAnyRole(['agency']));

const COLLAPSE_KEY = 'sidebar-collapsed'
const isCollapsed = ref(localStorage.getItem(COLLAPSE_KEY) === 'true')

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem(COLLAPSE_KEY, isCollapsed.value)
  // Notify ECharts instances to resize after CSS transition (250ms) finishes
  setTimeout(() => window.dispatchEvent(new Event('resize')), 280)
}
</script>

<style scoped>

.sidebar {
  min-width: 248px;
  width: 248px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  padding: 16px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  transition: width 0.25s ease, min-width 0.25s ease, background 0.3s ease, border-color 0.3s ease;
  position: relative;
  z-index: 5;
}

/* Collapsed state */
.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  padding: 16px 8px;
}

.sidebar.collapsed .nav-label { display: none; }
.sidebar.collapsed .category  { margin: 12px 0 4px; }

/* logo */

.logo {
  margin-bottom: 20px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar.collapsed .logo {
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

/* collapse button */
.collapse-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-faint);
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}
.collapse-btn:hover { color: var(--text-muted); background: var(--bg-hover); }

.collapse-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.25s ease;
}
.collapse-icon.flipped { transform: rotate(180deg); }

/* Collapsed menu item: icon only, centered */
.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 10px;
  gap: 0;
}
.sidebar.collapsed .menu-item-wrapper .main-link {
  justify-content: center;
  padding: 10px;
  gap: 0;
}
.sidebar.collapsed .toggle-icon { display: none; }

/* category */

.category {
  font-size: 11px;
  color: var(--text-faint);
  margin: 16px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 600;
}

/* menu */

.menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
  text-decoration: none;
  color: var(--text-main);
}

.menu-item:hover {
  background: var(--bg-hover);
}

/* active route */
.router-link-active {
  background: var(--bg-active);
  color: var(--text-active);
  position: relative;
}

/* Active indicator bar + glow (dark mode benefit) */
.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

/* icon */

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.menu-group {
  display: flex;
  flex-direction: column;
}

.menu-item-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.main-link {
  flex-grow: 1;
  text-decoration: none;
}

.toggle-icon {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--text-faint);
  transition: transform 0.25s, color 0.15s;
}

.toggle-icon:hover {
  color: var(--text-muted);
}

.rotate {
  transform: rotate(180deg);
}

.sub-menu-container {
  display: flex;
  flex-direction: column;
  padding-left: 0;
  margin-top: 4px;
  border-left: 1px solid var(--border-submenu);
  margin-left: 22px;
  transition: border-color 0.2s ease;
}

.sub-item {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  gap: 8px;
  white-space: nowrap;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.sub-item:hover,
.sub-item.router-link-active {
  color: var(--text-active);
  background: var(--bg-active);
}

.sub-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ── DARK MODE: glassmorphism + active glow ───────────────────── */
:global([data-theme="dark"]) .sidebar {
  background: rgba(10, 17, 32, 0.82) !important;
  backdrop-filter: blur(14px) saturate(1.3);
  -webkit-backdrop-filter: blur(14px) saturate(1.3);
  border-right: 1px solid rgba(99, 102, 241, 0.1) !important;
}

:global([data-theme="dark"]) .router-link-active {
  box-shadow: inset 0 0 16px rgba(99,102,241,0.06), 0 0 10px rgba(99,102,241,0.12);
}

:global([data-theme="dark"]) .logo .icon {
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
}

/* ── BOTTOM SECTION (Góp ý) ─────────────────────────────── */
.sidebar-bottom {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* ── MOBILE: sidebar as overlay drawer ──────────────────── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed !important;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.27s ease, background 0.3s ease !important;
    width: 220px !important;
    min-width: 220px !important;
    max-width: 220px !important;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  /* On mobile, always show full labels (never collapsed) */
  .sidebar.collapsed {
    width: 220px !important;
    min-width: 220px !important;
    max-width: 220px !important;
    padding: 16px !important;
  }

  .sidebar.collapsed .nav-label { display: inline !important; }
  .sidebar.collapsed .category { margin: 16px 0 8px !important; }
  .sidebar.collapsed .menu-item {
    justify-content: flex-start !important;
    padding: 8px 10px !important;
    gap: 10px !important;
  }
  .sidebar.collapsed .menu-item-wrapper .main-link {
    justify-content: flex-start !important;
    padding: 8px 10px !important;
    gap: 10px !important;
  }
  .sidebar.collapsed .toggle-icon { display: flex !important; }

  /* Hide the desktop collapse button on mobile */
  .collapse-btn { display: none; }
}

/* ── MOBILE BOTTOM NAVIGATION ──────────────────────────── */
.mobile-nav {
  display: none;
}

@media (max-width: 768px) {
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--bg-sidebar);
    border-top: 1px solid var(--border);
    z-index: 30;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
    padding: 0 4px;
    align-items: stretch;
  }

  .mobile-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 10px;
    font-weight: 600;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--text-faint);
    text-decoration: none;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 6px 4px;
    border-radius: 10px;
    transition: color 0.15s, background 0.15s;
    line-height: 1.2;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-nav-item:hover,
  .mobile-nav-item.active,
  .mobile-nav-item.router-link-active {
    color: var(--accent);
  }

  .mobile-nav-item.router-link-active {
    background: var(--bg-active);
  }

  .mobile-nav-more {
    outline: none;
  }
}

:global([data-theme="dark"]) .mobile-nav {
  background: rgba(10, 17, 32, 0.95);
  border-top: 1px solid rgba(99, 102, 241, 0.12);
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.4);
}

</style>