<template>
<div class="card">

  <div class="header">
    <div class="header-left">
      <span class="title">DOANH THU & GIAO DỊCH</span>
    </div>
    <div class="header-right">
      <div class="tabs">
        <button
          v-for="t in ['day','week','month']"
          :key="t"
          :class="{ active: mode === t }"
          @click="mode = t"
        >{{ modeLabel[t] }}</button>
      </div>
    </div>
  </div>

  <div class="kpi-bar">
    <div class="kpi-group">
        <div class="kpi">
          <span class="kpi-label">Tổng doanh thu</span>
          <span class="kpi-val rev">{{ totalRevenueFmt }}</span>
        </div>
        <div class="divider"></div>
        <div class="kpi">
          <span class="kpi-label">Tổng giao dịch</span>
          <span class="kpi-val txn">{{ totalTxnFmt }}</span>
        </div>
      </div>
  </div>

  <!-- CHART AREA -->
  <div class="chart-container">
    <div v-if="loading" class="loading-overlay">
      <span class="spinner"></span>
    </div>
    <v-chart ref="chartRef" class="chart" :option="option" autoresize />
  </div>

</div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import VChart from "vue-echarts"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { BarChart, LineChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent
} from "echarts/components"
import { revenueApi } from "@/api/revenue"

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent])

/* ── MODE ── */
const mode = ref("day")
const modeLabel = { day: "Ngày", week: "Tuần", month: "Tháng" }

const chartRef = ref(null)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

function handleResize() {
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

/* ── STATE ── */
const loading     = ref(true)
const revenueData = ref([])   // [{ x, y }]
const txnData     = ref([])   // [{ x, y }]

/* ── FETCH ── */
function fmt(d) { return d.toISOString().split("T")[0] }

function getDateRange() {
  const today = new Date()
  if (mode.value === "day") {
    const s = new Date(today); s.setDate(today.getDate() - 29)
    return { start_date: fmt(s), end_date: fmt(today), time_unit: "day" }
  }
  if (mode.value === "week") {
    const s = new Date(today); s.setDate(today.getDate() - 83)
    return { start_date: fmt(s), end_date: fmt(today), time_unit: "week" }
  }
  const s = new Date(today); s.setMonth(today.getMonth() - 11); s.setDate(1)
  return { start_date: fmt(s), end_date: fmt(today), time_unit: "month" }
}

async function fetchData() {
  loading.value = true
  revenueData.value = []
  txnData.value = []
  try {
    const params = getDateRange()
    const res = await revenueApi.getRevenueReport({
      level: "province",
      ...params,
      group_by_time_only: true,
      sort_by: 'Time',
      sort_order: 'asc',
      page: 1,
      limit: 500,
      include_total: false
    })
    const list = res.data?.data?.list || []

    if (!isMounted.value) return
    // Dữ liệu đã được backend gộp theo mốc thời gian và sort tăng dần.
    const complete = list.slice(0, -1)
    revenueData.value = complete.map((row) => ({ x: row.Time, y: Number(row.revenue || 0) }))
    txnData.value     = complete.map((row) => ({ x: row.Time, y: Number(row.total_sessions || 0) }))
  } catch (e) {
    console.error("[RevenueChart] fetchData error:", e)
  } finally {
    loading.value = false
  }
}

watch(mode, fetchData)
onMounted(fetchData)

/* ── HELPERS ── */
function fmtMoney(v) {
  if (!v) return "0đ"
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + " Tỷ"
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + " triệu"
  return v.toLocaleString("vi-VN") + "đ"
}

/* ── COMPUTED KPIs ── */
const totalRevenueFmt = computed(() => {
  const s = revenueData.value.reduce((a, p) => a + p.y, 0)
  return fmtMoney(s)
})
const totalTxnFmt = computed(() => {
  const s = txnData.value.reduce((a, p) => a + p.y, 0)
  return s.toLocaleString("vi-VN") + ""
})

/* ── CHART OPTION ── */
const option = computed(() => {
  const xLabels  = revenueData.value.map(p => p.x)
  const revVals  = revenueData.value.map(p => p.y)
  const txnVals  = txnData.value.map(p => p.y)

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1e293b",
      borderColor: "transparent",
      padding: [10, 14],
      textStyle: { color: "#f8fafc", fontSize: 12 },
      axisPointer: {
        type: "cross",
        crossStyle: { color: "#e2e8f0" },
        lineStyle: { color: "rgba(226,232,240,0.45)", width: 1 }
      },
      formatter(params) {
        const date = params[0]?.axisValue
        const rows = params.map(p => {
          const isRev = p.seriesIndex === 0
          const val = isRev ? fmtMoney(p.value) : p.value.toLocaleString("vi-VN") + ""
          const dot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span>`
          return `${dot}<span style="color:#cbd5e1">${p.seriesName}</span>&nbsp;&nbsp;<b>${val}</b>`
        })
        return `<div style="font-size:11px;color:#cbd5e1;margin-bottom:6px">${date}</div>${rows.join("<br/>")}`
      }
    },

    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 18,
      textStyle: { color: "#cbd5e1", fontSize: 11 }
    },

    grid: isMobile.value
      ? { top: 8, left: 46, right: 42, bottom: 36 }
      : { top: 12, left: 58, right: 60, bottom: 48 },

    xAxis: {
      type: "category",
      data: xLabels,
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: {
        color: "#cbd5e1",
        fontSize: isMobile.value ? 10 : 11,
        interval: "auto",
        formatter: v => mode.value === "day" ? v.slice(5) : v
      },
      splitLine: { show: false }
    },

    yAxis: [
      {
        // Left: Revenue
        type: "value",
        name: isMobile.value ? '' : 'Doanh thu',
        nameTextStyle: { color: "#a5b4fc", fontSize: 11 },
        axisLine:  { show: false },
        axisTick:  { show: false },
        axisLabel: {
          color: "#cbd5e1", fontSize: isMobile.value ? 10 : 11,
          formatter: v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + "M" : v
        },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.26)", type: "dashed" } }
      },
      {
        // Right: Transactions
        type: "value",
        name: isMobile.value ? '' : 'Giao dịch',
        nameTextStyle: { color: "#fbbf24", fontSize: 11 },
        axisLine:  { show: false },
        axisTick:  { show: false },
        axisLabel: {
          color: "#cbd5e1", fontSize: isMobile.value ? 10 : 11,
          formatter: v => v >= 1000 ? (v / 1000).toFixed(1) + "K" : v
        },
        splitLine: { show: false }
      }
    ],

    series: [
      {
        // Bar: daily revenue
        name: "Doanh thu",
        type: "bar",
        yAxisIndex: 0,
        data: revVals,
        barMaxWidth: 14,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#818cf8" },
              { offset: 1, color: "#6366f1" }
            ]
          }
        },
        emphasis: { itemStyle: { color: "#4f46e5" } }
      },
      {
        // Line: daily transactions
        name: "Giao dịch",
        type: "line",
        yAxisIndex: 1,
        data: txnVals,
        smooth: 0.4,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        triggerLineEvent: true,
        lineStyle: { width: 2.5, color: "#f59e0b" },
        itemStyle: { color: "#f59e0b", borderWidth: 2, borderColor: "#fff" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(245,158,11,0.15)" },
              { offset: 1, color: "rgba(245,158,11,0.01)" }
            ]
          }
        }
      }
    ]
  }
})
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px 24px 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

:global([data-theme="dark"]) .card {
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.07);
}

:global([data-theme="dark"]) .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15), 0 0 20px rgba(99,102,241,0.08);
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
  width: 100%;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 0;
}
.tabs button {
  border: none;
  padding: 4px 12px;
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
}
.tabs button:hover { background: var(--bg-hover); }
.tabs button.active { background: var(--accent); color: #fff; }
.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}
.sub {
  font-size: 10px;
  color: var(--text-faint);
}

/* ── KPI bar ── */
.kpi-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
  flex-shrink: 0;
}

/* ── KPI group ── */
.kpi-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.kpi-label {
  font-size: 10px;
  color: var(--text-faint);
}
.kpi-val {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}
.kpi-val.rev { color: var(--accent); }
.kpi-val.txn { color: #f59e0b; }
.divider {
  width: 1px;
  height: 32px;
  background: var(--border);
}

/* ── Chart ── */
.chart {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

/* ── Chart & Loading ── */
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
  background: rgba(var(--bg-card-rgb, 30, 41, 59), 0.4);
  backdrop-filter: blur(2px);
  z-index: 5;
  border-radius: 12px;
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
    padding: 16px 18px 12px;
    border-radius: 14px;
    height: 260px; /* explicit height so ECharts can measure DOM */
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .kpi-bar {
    justify-content: flex-start;
  }
}
</style>
