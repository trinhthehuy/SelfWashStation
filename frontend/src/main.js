import './assets/main.css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/message/style/css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { themeStore } from './stores/theme'
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { PieChart } from "echarts/charts"
import {
    TooltipComponent,
    LegendComponent,
    GraphicComponent
} from "echarts/components"

import VChart from 'vue-echarts'
use([
    CanvasRenderer,
    PieChart,
    TooltipComponent,
    LegendComponent,
    GraphicComponent
])

const app = createApp(App)
app.component('v-chart', VChart)
app.use(router)

// Apply saved theme before mount
themeStore.init()

app.mount('#app')