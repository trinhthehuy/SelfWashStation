<template>
  <div class="card">

    <!-- HEADER -->

    <div class="header">
      <span style="display: flex; align-items: center; gap: 4px;">
        <span class="title">HEATMAP PHÂN BỐ DOANH THU</span>
        <span class="subtitle heatmap-tooltip-trigger" tabindex="0" style="margin:0;">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
            <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="9" y="8" width="2" height="5" rx="1" fill="currentColor"/>
            <rect x="9" y="5" width="2" height="2" rx="1" fill="currentColor"/>
          </svg>
          <span class="heatmap-tooltip-content">
            Thống kê dữ liệu 90 ngày gần nhất
          </span>
        </span>
      </span>
    </div>

    <!-- CHART -->
    <v-chart
      ref="chartRef"
      class="chart"
      :option="option"
      autoresize
    />

  </div>
</template>

<script setup>

import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"
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
const heatData = ref([])
const maxVal   = ref(1)

const chartRef = ref(null)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)
const isDark = computed(() => themeStore.isDark)

const palette = computed(() => {
  if (isDark.value) {
    return {
      axisLabel: "#cbd5e1",
      legendText: "#cbd5e1",
      tooltipBg: "#1e293b",
      tooltipText: "#f8fafc",
      tooltipMuted: "#cbd5e1",
      tooltipDot: "#818cf8",
      cellBorder: "rgba(15, 23, 42, 0.32)",
      hoverShadow: "rgba(0, 0, 0, 0.3)",
      heatmapStops: ["#eef2ff", "#c7d2fe", "#818cf8", "#4f46e5", "#312e81"]
    }
  }

  return {
    axisLabel: "#475569",
    legendText: "#475569",
    tooltipBg: "#ffffff",
    tooltipText: "#0f172a",
    tooltipMuted: "#475569",
    tooltipDot: "#0ea5e9",
    cellBorder: "rgba(148, 163, 184, 0.24)",
    hoverShadow: "rgba(14, 165, 233, 0.18)",
    heatmapStops: ["#f8fbff", "#dbeafe", "#93c5fd", "#38bdf8", "#0f766e"]
  }
})

function handleResize() {
  windowWidth.value = window.innerWidth
  chartRef.value?.resize()
}

let ro = null
onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await nextTick()
  const el = chartRef.value?.$el
  if (el) {
    ro = new ResizeObserver(() => {
      windowWidth.value = window.innerWidth
      chartRef.value?.resize()
    })
    ro.observe(el)
  }
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  ro?.disconnect()
})

/* FETCH */
async function fetchData() {
  try {
    const today = new Date()
    const s = new Date(today); s.setDate(today.getDate() - 89)
    const fmt = (d) => d.toISOString().split('T')[0]
    const res = await revenueApi.getHourlyReport({ start_date: fmt(s), end_date: fmt(today) })
    const rows = res.data?.data || []

    // Build [hour, dowIndex, revenue] — dow from backend: 1=Sun, 2=Mon…7=Sat
    // days array index: 0=Mon…5=Sat, 6=Sun  →  dowIndex = (dow + 5) % 7
    const data = rows.map(r => [
      Number(r.hour),
      (Number(r.dow) + 5) % 7,
      Number(r.revenue || 0)
    ])

    maxVal.value = data.length ? Math.max(...data.map(d => d[2])) || 1 : 1
    heatData.value = data
  } catch (e) {
    console.error('[RevenueHeatmap] fetch error:', e)
  }
}

onMounted(fetchData)

/* OPTION */

const option = computed(()=>({

tooltip:{
backgroundColor:palette.value.tooltipBg,
borderColor:isDark.value ? "transparent" : "rgba(148, 163, 184, 0.24)",
borderWidth:isDark.value ? 0 : 1,
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
borderRadius:4,
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

@media (max-width: 768px) {
  .card {
    height: 270px;
    padding: 12px 12px 8px;
    border-radius: 12px;
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