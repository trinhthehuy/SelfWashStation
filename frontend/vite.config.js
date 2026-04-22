import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  
  server: {    
    port: parseInt(process.env.VITE_PORT || '5173'),
    allowedHosts: true,
  },

  optimizeDeps: {
    include: [
      'element-plus/es/components/dialog/style/css',
      'element-plus/es/components/switch/style/css',
      'element-plus/es/components/form/style/css',
      'element-plus/es/components/row/style/css',
      'element-plus/es/components/col/style/css',
      'element-plus/es/components/form-item/style/css',
      'element-plus/es/components/input/style/css',
      'element-plus/es/components/button/style/css',
      'element-plus/es/components/select/style/css',
      'element-plus/es/components/option/style/css',
      'element-plus/es/components/date-picker/style/css',
      'element-plus/es/components/table/style/css',
      'element-plus/es/components/table-column/style/css',
      'element-plus/es/components/pagination/style/css',
      'element-plus/es/components/message/style/css',
      'element-plus/es/components/message-box/style/css',
      'element-plus/es/components/divider/style/css',
      'element-plus/es/components/tooltip/style/css',
      'element-plus/es/components/segmented/style/css',
      'element-plus/es/components/input-number/style/css',
      'element-plus/es/components/loading/style/css',
      'element-plus/es/components/option-group/style/css',
      'element-plus/es/components/card/style/css',
      'element-plus/es/components/checkbox/style/css',
      'element-plus/es/components/icon/style/css',
      'element-plus/es/components/radio-group/style/css',
      'element-plus/es/components/radio-button/style/css',
      'element-plus/es/components/radio/style/css',
      'element-plus/es/components/tag/style/css',
      'element-plus/es/components/tabs/style/css',
      'element-plus/es/components/tab-pane/style/css',
      'element-plus/es/components/popover/style/css',
      'element-plus/es/components/empty/style/css',
      'element-plus/es/components/avatar/style/css',
      'element-plus/es/components/autocomplete/style/css',
      'element-plus/es/components/alert/style/css',
      'element-plus/es/components/drawer/style/css',
      'element-plus/es/components/menu/style/css',
      'element-plus/es/components/menu-item/style/css',
      'element-plus/es/components/sub-menu/style/css',
      'element-plus/es/components/dropdown/style/css',
      'element-plus/es/components/dropdown-menu/style/css',
      'element-plus/es/components/dropdown-item/style/css',
      'element-plus/es/components/breadcrumb/style/css',
      'element-plus/es/components/breadcrumb-item/style/css',
      'element-plus/es/components/badge/style/css',
      'element-plus/es/components/progress/style/css',
      'element-plus/es/components/steps/style/css',
      'element-plus/es/components/step/style/css',
      'element-plus/es/components/collapse/style/css',
      'element-plus/es/components/collapse-item/style/css',
      'element-plus/es/components/tree/style/css',
      'element-plus/es/components/upload/style/css',
      'element-plus/es/components/slider/style/css',
      'element-plus/es/components/time-picker/style/css',
      'element-plus/es/components/skeleton/style/css',
      'element-plus/es/components/skeleton-item/style/css',
      'element-plus/es/components/descriptions/style/css',
      'element-plus/es/components/descriptions-item/style/css',
      'element-plus/es/components/space/style/css',
      '@element-plus/icons-vue',
    ],
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('echarts') || id.includes('zrender') || id.includes('vue-echarts')) {
            return 'echarts'
          }

          if (id.includes('element-plus') || id.includes('@element-plus')) {
            return 'element-plus'
          }

          return 'vendor'
        },
      },
    },
  }
})
