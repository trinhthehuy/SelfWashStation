<template>
<div class="kpi-grid">

  <!-- Card 1: Doanh thu tháng này -->
  <div class="kpi-card c-blue">
    <div class="top">
      <div class="icon-wrap"><BarChart3 :size="18"/></div>
      <span class="label">Doanh thu tháng này</span>
    </div>
    <div class="value">{{ loading ? '…' : formatMoney(kpi.revenue_this_month) }}</div>
    <div class="bottom">
      <div class="trend-info">
        <span v-if="kpi.revenue_pct_change != null" class="pct" :class="trendClass(kpi.revenue_pct_change)">
          {{ trendArrow(kpi.revenue_pct_change) }} {{ Math.abs(kpi.revenue_pct_change) }}% · {{ trendLabel(kpi.revenue_pct_change) }}
        </span>
        <span class="compare">so với tháng trước <span class="tip" data-tip="So sánh tổng doanh thu 7 ngày gần nhất với cùng kỳ tháng trước">ℹ</span></span>
      </div>
      <svg class="spark" viewBox="0 0 80 32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g-r1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="isTrendUp(kpi.revenue_trend_7d, kpi.revenue_pct_change) ? 'rgba(72,199,142,0.45)' : 'rgba(252,165,165,0.45)'"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </linearGradient>
        </defs>
        <path :d="sparkArea(kpi.revenue_trend_7d)" fill="url(#g-r1)"/>
        <path class="spark-line" :d="sparkLine(kpi.revenue_trend_7d)"
          :stroke="isTrendUp(kpi.revenue_trend_7d, kpi.revenue_pct_change) ? '#6ee7b7' : '#fca5a5'"/>
      </svg>
    </div>
  </div>

  <!-- Card 2: Phiên tháng này -->
  <div class="kpi-card c-green">
    <div class="top">
      <div class="icon-wrap"><Activity :size="18"/></div>
      <span class="label">Phiên rửa tháng này</span>
    </div>
    <div class="value">{{ loading ? '…' : kpi.sessions_this_month.toLocaleString('vi-VN') }}</div>
    <div class="bottom">
      <div class="trend-info">
        <span v-if="kpi.sessions_pct_change != null" class="pct" :class="trendClass(kpi.sessions_pct_change)">
          {{ trendArrow(kpi.sessions_pct_change) }} {{ Math.abs(kpi.sessions_pct_change) }}% · {{ trendLabel(kpi.sessions_pct_change) }}
        </span>
        <span class="compare">so với tháng trước <span class="tip" data-tip="So sánh tổng số phiên 7 ngày gần nhất với cùng kỳ tháng trước">ℹ</span></span>
      </div>
      <svg class="spark" viewBox="0 0 80 32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g-r2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="isTrendUp(kpi.sessions_trend_7d, kpi.sessions_pct_change) ? 'rgba(72,199,142,0.45)' : 'rgba(252,165,165,0.45)'"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </linearGradient>
        </defs>
        <path :d="sparkArea(kpi.sessions_trend_7d)" fill="url(#g-r2)"/>
        <path class="spark-line" :d="sparkLine(kpi.sessions_trend_7d)"
          :stroke="isTrendUp(kpi.sessions_trend_7d, kpi.sessions_pct_change) ? '#6ee7b7' : '#fca5a5'"/>
      </svg>
    </div>
  </div>

  <!-- Card 3: Trạm -->
  <div class="kpi-card c-purple">
    <div class="top">
      <div class="icon-wrap"><MapPin :size="18"/></div>
      <span class="label">Trạm hoạt động</span>
    </div>
    <div class="value">{{ loading ? '…' : kpi.station_count.toLocaleString('vi-VN') }}<span class="sub-val"> / {{ loading ? '' : stationTotal.toLocaleString('vi-VN') }}</span></div>
    <div class="bottom">
      <div class="trend-info">
        <span v-if="!loading" class="pct" :class="trendClass(stationDiff)">
          {{ trendArrow(stationDiff) }} {{ stationDiff >= 0 ? '+' : '' }}{{ stationDiff }} trạm
        </span>
        <span class="compare">so với tháng trước <span class="tip" data-tip="So sánh số trạm đang hoạt động với cùng kỳ tháng trước">ℹ</span></span>
      </div>
      <div v-if="!loading" class="activity-progress-wrap">
        <div class="activity-progress-bar">
          <div class="activity-progress-fill station-fill" :style="{ width: pctStationOnline + '%' }"></div>
        </div>
        <span class="activity-progress-label">{{ pctStationOnline }}%</span>
      </div>
    </div>
  </div>

  <!-- Card 4: Trụ -->
  <div class="kpi-card c-orange">
    <div class="top">
      <div class="icon-wrap"><Cpu :size="18"/></div>
      <span class="label">Trụ hoạt động</span>
    </div>
    <div class="value">{{ loading ? '…' : bayOnline.toLocaleString('vi-VN') }}<span class="sub-val"> / {{ loading ? '' : kpi.bay_count.toLocaleString('vi-VN') }}</span></div>
    <div class="bottom">
      <div class="trend-info">
        <span v-if="!loading" class="pct" :class="trendClass(bayDiff)">
          {{ trendArrow(bayDiff) }} {{ bayDiff >= 0 ? '+' : '' }}{{ bayDiff }} trụ
        </span>
        <span class="compare">online so với tháng trước <span class="tip" data-tip="So sánh số trụ online hiện tại cùng kỳ tháng trước">ℹ</span></span>
      </div>
      <div v-if="!loading" class="activity-progress-wrap">
        <div class="activity-progress-bar">
          <div class="activity-progress-fill bay-fill" :style="{ width: pctOnline + '%' }"></div>
        </div>
        <span class="activity-progress-label">{{ pctOnline }}%</span>
      </div>
    </div>
  </div>

</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { BarChart3, Activity, MapPin, Cpu } from "lucide-vue-next"
import { revenueApi } from "@/api/revenue"

/* ── STATE ── */
const loading = ref(true)
const kpi = ref({
  agency_count: 0,
  station_count: 0,
  station_total_count: 0,
  bay_count: 0,
  revenue_this_month: 0,
  sessions_this_month: 0,
  revenue_pct_change: null,
  sessions_pct_change: null,
  revenue_trend_7d: [],
  sessions_trend_7d: [],
  station_count_prev: 0,
  bay_online_prev: 0,
  bay_status: []
})

const bayOnline = computed(() => {
  const found = kpi.value.bay_status.find(s => s.status === 1)
  return found ? found.count : 0
})

const stationDiff = computed(() => kpi.value.station_count - kpi.value.station_count_prev)
const bayDiff     = computed(() => bayOnline.value - kpi.value.bay_online_prev)
const stationTotal = computed(() => kpi.value.station_total_count || kpi.value.station_count)

/* ── FETCH ── */
async function fetchStats() {
  loading.value = true
  try {
    const res = await revenueApi.getStats()
    const d = res.data?.data || {}
    kpi.value = {
      agency_count:        d.agency_count         || 0,
      station_count:       d.station_count        || 0,
      station_total_count: d.station_total_count  || d.station_count || 0,
      bay_count:           d.bay_count            || 0,
      revenue_this_month:  d.revenue_this_month   || 0,
      sessions_this_month: d.sessions_this_month  || 0,
      revenue_pct_change:  d.revenue_pct_change   ?? null,
      sessions_pct_change: d.sessions_pct_change  ?? null,
      revenue_trend_7d:    d.revenue_trend_7d      || [],
      sessions_trend_7d:   d.sessions_trend_7d     || [],
      station_count_prev:  d.station_count_prev    || 0,
      bay_online_prev:     d.bay_online_prev       || 0,
      bay_status:          d.bay_status            || []
    }
  } catch (e) {
    console.error('[CardKPI] fetchStats error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)

const pctOnline = computed(() =>
  kpi.value.bay_count > 0 ? Math.round(bayOnline.value / kpi.value.bay_count * 100) : 0
)

const pctStationOnline = computed(() =>
  stationTotal.value > 0 ? Math.round(kpi.value.station_count / stationTotal.value * 100) : 0
)

/* ── TREND DIRECTION ── */
function isTrendUp(values, pct = null) {
  if (pct !== null) return pct >= 0
  if (!values || values.length < 2) return true
  return values[values.length - 1] >= values[0]
}

function trendClass(value) {
  if (value > 0) return 'trend-up'
  if (value < 0) return 'trend-down'
  return 'trend-flat'
}

function trendArrow(value) {
  if (value > 0) return '▲'
  if (value < 0) return '▼'
  return '•'
}

function trendLabel(value) {
  if (value > 0) return 'Tăng'
  if (value < 0) return 'Giảm'
  return 'Không đổi'
}

/* ── SPARKLINE HELPERS ── */
function sparkLine(values, w = 80, h = 32) {
  if (!values || values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
  return 'M' + pts.join(' L')
}

function sparkArea(values, w = 80, h = 32) {
  const line = sparkLine(values, w, h)
  if (!line) return ''
  const lastX = (values.length - 1) * (w / (values.length - 1))
  return `${line} L${lastX},${h} L0,${h} Z`
}

/* ── FORMAT ── */
function formatMoney(v) {
  if (!v) return '0đ'
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B đ'
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1)     + 'M đ'
  return v.toLocaleString('vi-VN') + 'đ'
}
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .kpi-grid { grid-template-columns: 1fr; }
}

.kpi-card {
  border-radius: 16px;
  padding: 20px 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  color: white;
  min-height: 140px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* shimmer sweep in dark mode */
.kpi-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg,
    transparent 30%,
    rgba(255,255,255,0.06) 48%,
    rgba(255,255,255,0.04) 52%,
    transparent 70%);
  background-size: 250% 100%;
  background-position: 150% 0;
  animation: card-shimmer 5s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

@keyframes card-shimmer {
  0%, 100% { background-position: 150% 0; }
  50% { background-position: -50% 0; }
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
}

/* colour themes */
.c-blue   { background: linear-gradient(135deg, #1e3a5f, #2563eb); }
.c-green  { background: linear-gradient(135deg, #064e3b, #059669); }
.c-purple { background: linear-gradient(135deg, #2e1065, #7c3aed); }
.c-orange { background: linear-gradient(135deg, #431407, #ea580c); }

/* top row */
.top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.label {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.85;
  letter-spacing: 0.02em;
}

/* main value */
.value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  margin-top: 2px;
}

.sub-val {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.6;
}

/* bottom row */
.bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: auto;
}

.trend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pct {
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.pct.trend-up { color: #86efac; }
.pct.trend-down { color: #fca5a5; }
.pct.trend-flat { color: #e2e8f0; }

.compare {
  font-size: 11px;
  opacity: 0.72;
}

/* sparkline */
.spark {
  width: 80px;
  height: 32px;
  flex-shrink: 0;
}

.spark-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* tooltip */
.tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  font-size: 8px;
  cursor: help;
  position: relative;
  vertical-align: middle;
  margin-left: 3px;
  font-style: normal;
  line-height: 1;
}

.tip::before {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: rgba(8, 8, 20, 0.94);
  color: #e2e8f0;
  font-size: 10px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s;
  z-index: 200;
  border: 1px solid rgba(255,255,255,0.12);
}

.tip:hover::before {
  opacity: 1;
}

/* activity progress (card 3 + 4) */
.activity-progress-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.activity-progress-bar {
  width: 80px;
  height: 6px;
  border-radius: 99px;
  background: rgba(255,255,255,0.2);
  overflow: hidden;
}
.activity-progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease;
}
.activity-progress-fill.station-fill {
  background: #c4b5fd;
}

.activity-progress-fill.bay-fill {
  background: #6ee7b7;
}

.activity-progress-label {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .kpi-card {
    padding: 16px 18px 12px;
    min-height: 120px;
    border-radius: 14px;
  }

  .value {
    font-size: 20px;
  }

  .spark {
    width: 56px;
    height: 26px;
  }

  .activity-progress-bar {
    width: 56px;
  }
}
</style>
