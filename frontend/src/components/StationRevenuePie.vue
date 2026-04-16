<script setup>
import { ref, computed, onMounted } from "vue"
import { revenueApi } from "@/api/revenue"

const COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#64748b"
]

const items   = ref([])
const total   = ref(0)
const loading = ref(true)

async function fetchData() {
  loading.value = true
  try {
    const res = await revenueApi.getStationPie()
    const d = res.data?.data || {}
    items.value = (d.items || []).map((item, i) => ({
      ...item,
      color: COLORS[i % COLORS.length]
    }))
    total.value = d.total || 0
  } catch (e) {
    console.error('[StationRevenuePie] error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function formatMoney(v) {
  if (!v) return '0đ'
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' Tỷ'
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + ' Mđ'
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K'
  return v.toLocaleString('vi-VN') + 'đ'
}

const option = computed(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: '#1e293b',
    borderColor: 'transparent',
    padding: [8, 12],
    textStyle: { color: '#f8fafc', fontSize: 12 },
    formatter: (p) =>
      `<div style="line-height:1.8"><b style="color:#fff">${p.name}</b><br/>
       ${formatMoney(p.value)} &nbsp;
       <span style="color:#94a3b8;font-size:11px">${p.percent.toFixed(1)}%</span></div>`
  },
  legend: { show: false },
  series: [{
    type: 'pie',
    radius: ['55%', '82%'],
    center: ['50%', '50%'],
    label: { show: false },
    labelLine: { show: false },
    emphasis: {
      scale: true,
      scaleSize: 5,
      itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.18)' }
    },
    itemStyle: { borderWidth: 3, borderColor: '#ffffff' },
    data: items.value.map(i => ({
      value: i.revenue,
      name:  i.name,
      itemStyle: { color: i.color }
    }))
  }]
}))
</script>

<template>
<div class="card">
  <div class="header">
    <span class="title">DOANH THU THEO TRẠM</span>
    <span class="badge">30 ngày</span>
  </div>

  <div class="body">
    <!-- Donut + center text overlay -->
    <div class="chart-wrap">
      <v-chart class="echart" :option="option" autoresize />
      <div class="chart-center">
        <div v-if="loading" class="spinner-wrap">
          <span class="spinner"></span>
        </div>
        <template v-else>
          <span class="center-val">{{ formatMoney(total) }}</span>
          <span class="center-label">tổng DT</span>
        </template>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div v-if="loading" class="loading-rows">
        <div v-for="n in 5" :key="n" class="skeleton-row">
          <span class="sk sk-dot"></span>
          <span class="sk sk-name"></span>
          <span class="sk sk-val"></span>
        </div>
      </div>
      <div
        v-else
        v-for="item in items"
        :key="item.name"
        class="legend-row"
      >
        <span class="dot" :style="{ background: item.color }"></span>
        <span class="leg-name" :title="item.name">{{ item.name }}</span>
        <div class="leg-right">
          <span class="leg-val">{{ formatMoney(item.revenue) }}</span>
          <span class="leg-pct">{{ total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0 }}%</span>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 16px 18px 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}
.badge {
  font-size: 10px;
  font-weight: 600;
  color: #6366f1;
  background: var(--bg-active);
  padding: 2px 8px;
  border-radius: 99px;
}

/* ── Body ── */
.body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;
  align-items: stretch;
}

/* ── Chart wrap: fixed width, flex height via align-stretch ── */
.chart-wrap {
  flex: 0 0 46%;
  position: relative;
  min-height: 160px;
}
.echart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
/* Center overlay */
.chart-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.center-val {
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}
.center-label {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}
.spinner-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Legend ── */
.legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
  min-width: 0;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 6px;
  border-radius: 7px;
  transition: background 0.15s;
  min-width: 0;
  cursor: default;
}
.legend-row:hover { background: #f8fafc; }

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.leg-name {
  flex: 1;
  font-size: 11.5px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.leg-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 0px;
}
.leg-val {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
}
.leg-pct {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
}

/* ── Loading skeleton ── */
.loading-rows { display: flex; flex-direction: column; gap: 8px; padding: 4px 6px; }
.skeleton-row { display: flex; align-items: center; gap: 8px; }
.sk { background: #e2e8f0; border-radius: 4px; animation: shimmer 1.2s ease-in-out infinite; }
.sk-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sk-name { flex: 1; height: 10px; }
.sk-val  { width: 48px; height: 10px; }
@keyframes shimmer {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

/* ── Spinner ── */
.spinner {
  width: 16px; height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
