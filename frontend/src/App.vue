<template>
  <router-view v-if="!showShell" />

  <div v-else class="app">
    <!-- Mobile backdrop -->
    <div
      v-if="layoutStore.mobileMenuOpen"
      class="mobile-backdrop"
      @click="layoutStore.close()"
    />

    <Sidebar />

    <div class="main">
      <Header />

      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from "./components/Sidebar.vue"
import Header from "./components/Header.vue"
import { layoutStore } from './stores/layout'

const route = useRoute()
const showShell = computed(() => !route.meta.noShell)
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content {
  padding: 10px;
  background: var(--bg-body);
  flex: 1;
  overflow: auto;
  transition: background 0.2s ease;
}

/* Mobile backdrop overlay */
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 40;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

@media (max-width: 768px) {
  .main {
    width: 100%;
  }

  .content {
    padding: 8px 10px 72px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .content::-webkit-scrollbar {
    display: none;
  }
}
</style>