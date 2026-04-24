<template>
  <div class="card">

    <!-- HEADER -->
    <div class="header">
      <div class="header-left">
        <span style="display: flex; align-items: center; gap: 4px;">
          <span class="title">HEATMAP PHÂN BỐ DOANH THU</span>
          <span class="subtitle heatmap-tooltip-trigger" tabindex="0" style="margin:0;">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
              <rect x="9" y="8" width="2" height="5" rx="1" fill="currentColor"/>
              <rect x="9" y="5" width="2" height="2" rx="1" fill="currentColor"/>
            </svg>
            <span class="heatmap-tooltip-content">
              Thống kê dữ liệu {{ timeRange }} ngày gần nhất. Theo yêu cầu: Màu càng sẫm/đậm thể hiện doanh thu càng cao.
            </span>
          </span>
        </span>
      </div>

      <div class="header-right">
        <div class="tabs">
          <button
            v-for="val in [7, 30, 90]"
            :key="val"
            :class="{ active: timeRange === val }"
            @click="timeRange = val"
          >{{ val }} ngày</button>
        </div>
      </div>
    </div>

    <!-- CHART AREA -->
    <div class="chart-container">
      <div v-if="loading" class="loading-overlay">
        <span class="spinner"></span>
      </div>
      <v-chart
        ref="chartRef"
        class="chart"
        :option="option"
        autoresize
      />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue"
import VChart from "vue-echarts"
import { use } from "echarts/core"
import { revenueApi } from "@/api/revenue"
import { themeStore } from "@/stores/theme"

import { CanvasRenderer } from "echarts/renderers"
import { HeatmapChart } from "echarts/charts"

import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent
} from "echarts/components"

use([
  CanvasRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent
])

/* AXIS */
const hours = Array.from({length:24},(_,i)=>`${i}h`)
const days = [
  "Thứ 2","Thứ 3","Thứ 4",
  "Thứ 5","Thứ 6","Thứ 7","CN"
]

/* STATE */
const timeRange = ref(30)
const loading = ref(false)
const heatData = ref([])
const maxVal   = ref(1)

const chartRef = ref(null)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)
const isDark = computed(() => themeStore.isDark)

const palette = computed(() => {
  // Quy tắc: Càng Sẫm/Đậm = Càng Lớn
  if (isDark.value) {
    return {
      axisLabel: "#94a3b8",
      legendText: "#cbd5e1",
      tooltipBg: "#1e293b",
      tooltipText: "#f8fafc",
      tooltipMuted: "#94a3b8",
      tooltipDot: "#818cf8",
      cellBorder: "rgba(255, 255, 255, 0.05)",
      hoverShadow: "rgba(255, 255, 255, 0.1)",
      // Dark Mode: 0 là màu sáng (Cyan/Light Blue), Max là màu sẫm (Deep Indigo/Dark)
      heatmapStops: ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#312e81"]
    }
  }

  return {
    axisLabel: "#64748b",
    legendText: "#475569",
    tooltipBg: "#ffffff",
    tooltipText: "#0f172a",
    tooltipMuted: "#64748b",
    tooltipDot: "#0ea5e9",
    cellBorder: "rgba(15, 23, 42, 0.05)",
    hoverShadow: "rgba(15, 23, 42, 0.1)",
    // Light Mode: 0 là màu sáng (Trắng xanh), Max là màu sẫm (Deep Ocean Blue)
    heatmapStops: ["#f0f9ff", "#bae6fd", "#38bdf8", "#0284c7", "#0c4a6e"]
  }
})

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const isMounted = ref(false)
onMounted(async () => {
  isMounted.value = true
  window.addEventListener('resize', handleResize)
  await nextTick()
})
onUnmounted(() => {
  isMounted.value = false
  window.removeEventListener('resize', handleResize)
})

/* FETCH */
async function fetchData() {
  loading.value = true
  try {
    const today = new Date()
    const s = new Date(today); s.setDate(today.getDate() - (timeRange.value - 1))
    const fmt = (d) => d.toISOString().split('T')[0]
    
    const res = await revenueApi.getHourlyReport({ 
      start_date: fmt(s), 
      end_date: fmt(today) 
    })
    const rows = res.data?.data || []

    const dataMap = new Map()
    rows.forEach(r => {
      const h = Number(r.hour)
      const d = (Number(r.dow) + 5) % 7
      dataMap.set(`${h}-${d}`, Number(r.revenue || 0))
    })

    const data = []
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        const val = dataMap.get(`${h}-${d}`) || 0
        data.push([h, d, val])
      }
    }

    if (!isMounted.value) return
    maxVal.value = data.length ? Math.max(...data.map(d => d[2])) || 1 : 1
    heatData.value = data
  } catch (e) {
    console.error('[RevenueHeatmap] fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(timeRange, fetchData)
onMounted(fetchData)

/* OPTION */
const option = computed(()=>({
  tooltip:{
    backgroundColor:palette.value.tooltipBg,
    borderColor:isDark.value ? "rgba(255,255,255,0.1)" : "rgba(148, 163, 184, 0.24)",
    borderWidth: 1,
    padding:[10,14],
    textStyle:{color:palette.value.tooltipText,fontSize:12},
    formatter:(p)=>{
      const h = p.value[0]
      const day = days[p.value[1]]
      const val = p.value[2]
      const timeFrom = `${h}:00`
      const timeTo   = `${h + 1}:00`

      return `
        <div style="font-size:11px;color:${palette.value.tooltipMuted};margin-bottom:6px">${day} &nbsp;|&nbsp; ${timeFrom} – ${timeTo}</div>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${palette.value.tooltipDot};margin-right:6px;vertical-align:middle"></span>
        <span style="color:${palette.value.tooltipMuted}">Doanh thu</span>&nbsp;&nbsp;<b style="color:${palette.value.tooltipText}">${Number(val).toLocaleString('vi-VN')}đ</b>
      `
    }
  },

  grid: isMobile.value
    ? { top: 4, left: 46, right: 6, bottom: 48 }
    : { top: 0,  left: 52, right: 8, bottom: 60 },

  xAxis:{
    type:"category",
    data:hours,
    axisLine:{show:false},
    axisTick:{show:false},
    axisLabel:{
      color:palette.value.axisLabel,
      fontSize: isMobile.value ? 9 : 11,
      interval: isMobile.value ? 2 : 0
    },
    splitArea:{show:false}
  },

  yAxis:{
    type:"category",
    data:days,
    axisLine:{show:false},
    axisTick:{show:false},
    axisLabel:{
      color:palette.value.axisLabel,
      fontSize: isMobile.value ? 10 : 11
    },
    splitArea:{show:false}
  },

  visualMap:{
    min:0,
    max:maxVal.value,
    calculable:false,
    orient: isMobile.value ? 'vertical' : 'horizontal',
    left: isMobile.value ? 'right' : 'center',
    top: isMobile.value ? 'middle' : undefined,
    bottom: isMobile.value ? undefined : 0,
    itemWidth: isMobile.value ? 12 : 18,
    itemHeight: isMobile.value ? 80 : 120,
    textStyle: {
      color: palette.value.legendText,
      fontSize: isMobile.value ? 9 : 11
    },
    inRange:{
      color:palette.value.heatmapStops
    }
  },

  series:[
    {
      type:"heatmap",
      data:heatData.value,
      label:{show:false},
      itemStyle:{
        borderRadius:2,
        borderWidth:isMobile.value ? 0.5 : 1,
        borderColor:palette.value.cellBorder
      },
      emphasis:{
        itemStyle:{
          shadowBlur:10,
          shadowColor:palette.value.hoverShadow
        }
      }
    }
  ]
}))

</script>

<style scoped>
.card{
  height:380px;
  min-width:0;
  background: var(--bg-card);
  border-radius:12px;
  padding:20px;
  box-shadow: var(--shadow-card);
  transition: background 0.2s ease, box-shadow 0.2s ease;
  overflow:hidden;
  display: flex;
  flex-direction: column;
}

.chart{
  width:100%;
  flex: 1;
  min-height:0;
  min-width:0;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
  width: 100%;
}

.title{
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.subtitle{
  font-size:12px;
  color: var(--text-faint);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
}
.tabs button {
  border: none;
  padding: 4px 12px;
  border-radius: 7px;
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.tabs button:hover { background: var(--bg-hover); }
.tabs button.active { background: var(--accent); color: #fff; }

/* Loading & Chart Container */
.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--bg-card-rgb, 18, 39, 74), 0.4);
  backdrop-filter: blur(2px);
  z-index: 5;
  border-radius: 8px;
}
.spinner {
  display: block;
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .card {
    height: 320px;
    padding: 12px 12px 8px;
    border-radius: 12px;
  }
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* Tooltip styles for info icon */
.heatmap-tooltip-trigger {
  position: relative;
  display: inline-block;
  outline: none;
}
.heatmap-tooltip-content {
  visibility: hidden;
  opacity: 0;
  width: max-content;
  max-width: 220px;
  background: var(--bg-card, #fff);
  color: var(--text-muted, #475569);
  text-align: left;
  border-radius: 6px;
  padding: 8px 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  position: absolute;
  z-index: 10;
  top: 120%;
  left: 50%;
  transform: translateX(-50%);
  transition: opacity 0.18s;
  font-size: 12px;
  pointer-events: none;
}
.heatmap-tooltip-trigger:hover .heatmap-tooltip-content,
.heatmap-tooltip-trigger:focus .heatmap-tooltip-content {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}
</style>