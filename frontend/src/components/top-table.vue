<template>

<div class="card" :style="desktopTableVars">

  <!-- HEADER -->
  <div class="header">
    <span class="title">TOP DOANH THU</span>
    <div class="filters">
      <select v-model="level" class="level-select" @change="handleLevelChange">
        <template v-if="isAgency">
          <option value="station">Trạm</option>
          <option value="bay">Trụ</option>
        </template>
        <template v-else>
          <option value="province">Tỉnh</option>
          <option value="ward">Xã / Phường</option>
          <option value="agency">Đại lý</option>
          <option value="station">Trạm</option>
          <option value="bay">Trụ</option>
        </template>
      </select>

      <div v-if="!isMobile" class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          :class="{ active: period === p.value }"
          @click="period = p.value; fetchData()"
        >{{ p.label }}</button>
      </div>

      <select
        v-else
        v-model="period"
        class="period-select"
        @change="fetchData"
      >
        <option v-for="p in periods" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>

      <select v-model="topN" class="topn-select">
        <option v-for="n in topNOptions" :key="n" :value="n">Top {{ n }}</option>
      </select>

      <button
        v-if="!isMobile"
        type="button"
        class="detail-toggle"
        :class="{ active: showDetails }"
        @click="showDetails = !showDetails"
      >{{ showDetails ? 'Ẩn chi tiết' : 'Hiện chi tiết' }}</button>

      <select
        v-if="isMobile"
        v-model="sortMetric"
        class="sortmetric-select"
        @change="fetchData"
      >
        <option v-for="opt in availableSortOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
  </div>

  <!-- LOADING -->
  <div class="loading-wrap" v-if="loading">
    <div class="spinner"></div>
  </div>

  <!-- Desktop TABLE -->
  <div class="table-wrapper" ref="tableWrapperRef" v-else-if="!isMobile">
    <table>
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th
            v-for="col in visibleColumns"
            :key="col.prop"
            :class="{ 'col-num': col.numeric, 'is-sorted': isSortedColumn(col.prop) }"
          >
            <button
              v-if="isSortableMetric(col.prop)"
              type="button"
              class="sortable-head"
              :class="{ active: isSortedColumn(col.prop) }"
              @click="handleMetricSort(col.prop)"
            >
              <span>{{ col.label }}</span>
              <span class="sort-arrow" :class="{ active: isSortedColumn(col.prop) }">↓</span>
            </button>
            <span v-else>{{ col.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in topRows" :key="i" :class="{ 'top-1': i === 0, 'top-2': i === 1, 'top-3': i === 2 }">
          <td class="rank-cell">
            <span class="rank-num">{{ i + 1 }}</span>
          </td>
          <td
            v-for="col in visibleColumns"
            :key="col.prop"
            :class="{ 'col-num': col.numeric, 'is-sorted': isSortedColumn(col.prop) }"
          >
            <template v-if="level === 'agency' && col.prop === 'agency_name'">
              <div>{{ row.agency_name ?? '—' }}</div>
              <div class="sub-label">ID: {{ row.identity_number ?? '—' }}</div>
            </template>
            <template v-else-if="col.address">
              <div class="addr-line">{{ row.ward_name ?? '—' }}</div>
              <div class="addr-line addr-detail">{{ row.address ?? '—' }}</div>
            </template>
            <span v-else-if="col.money" :class="['money', { 'money-sorted': isSortedColumn(col.prop) }]">{{ formatMoney(row[col.prop]) }}</span>
            <span v-else>{{ row[col.prop] ?? '—' }}</span>
          </td>
        </tr>
        <tr v-if="topRows.length === 0">
          <td :colspan="visibleColumns.length + 1" class="empty">Không có dữ liệu</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Mobile CARD LIST -->
  <div class="card-list" v-else>
    <div
      v-for="(row, i) in topRows"
      :key="i"
      class="top-card"
      :class="{ 'rank-1': i === 0, 'rank-2': i === 1, 'rank-3': i === 2 }"
    >
      <span class="rank-num">{{ i + 1 }}</span>
      <div class="tc-body">
        <div class="tc-name">{{ row[entityKey] ?? '—' }}</div>
        <!-- Agency sub info -->
        <div v-if="level === 'agency'" class="tc-sub">CCCD: {{ row.identity_number ?? '—' }}</div>
        <!-- Ward/Agency province -->
        <div v-if="(level === 'ward' || level === 'agency') && row.province_name" class="tc-sub">{{ row.province_name }}</div>
        <!-- Station/Bay address -->
        <div v-if="(level === 'station' || level === 'bay') && row.ward_name" class="tc-sub">
          {{ row.ward_name }}<template v-if="showDetailFields && row.address"> · {{ row.address }}</template>
        </div>
        <!-- Bay station -->
        <div v-if="level === 'bay' && row.station_code" class="tc-sub">Trạm: {{ row.station_code }}</div>

        <div class="tc-stats">
          <span v-if="row.station_count != null" class="stat-pill">🏪 {{ row.station_count }} trạm</span>
          <span v-if="showDetailFields && row.bay_count != null" class="stat-pill">🔧 {{ row.bay_count }} trụ</span>
          <span class="stat-pill">📋 {{ row.total_sessions }} phiên</span>
          <span v-if="showDetailFields && row.sessions_per_bay != null && level !== 'bay'" class="stat-pill accent">📊 {{ row.sessions_per_bay }} phiên/trụ</span>
        </div>

        <div class="tc-revenue">
          <span class="money">{{ formatMoney(row.revenue) }}</span>
          <span v-if="showDetailFields && row.revenue_per_bay != null && level !== 'bay'" class="rev-per-bay">· {{ formatMoney(row.revenue_per_bay) }}/trụ</span>
        </div>
      </div>
    </div>
    <div v-if="topRows.length === 0" class="empty">Không có dữ liệu</div>
  </div>

</div>

</template>


<script setup>

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue"
import { revenueApi } from "@/api/revenue"
import { authStore } from "@/stores/auth"

const isAgency = computed(() => authStore.hasAnyRole(['agency']))

/* ── MOBILE DETECTION ───────────────────────────────────── */
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)
function onResize() { windowWidth.value = window.innerWidth }
const tableWrapperRef = ref(null)
const dynamicRowHeight = ref(56)

const visibleRowCount = computed(() => {
  if (isMobile.value) return 5
  if (windowWidth.value <= 1280) return 6
  if (windowWidth.value <= 1500) return 7
  return 8
})

const desktopTableVars = computed(() => {
  if (isMobile.value) return undefined
  return {
    '--visible-rows': String(visibleRowCount.value),
    '--row-height': `${dynamicRowHeight.value}px`
  }
})

let tableResizeObserver = null
function updateRowHeight() {
  if (isMobile.value) return
  const wrap = tableWrapperRef.value
  if (!wrap) return

  const thead = wrap.querySelector('thead')
  const headHeight = thead?.getBoundingClientRect().height || 40
  const available = wrap.clientHeight - headHeight
  const candidate = Math.floor(available / visibleRowCount.value)
  dynamicRowHeight.value = Math.max(46, candidate)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  nextTick(() => {
    updateRowHeight()
    if (tableWrapperRef.value) {
      tableResizeObserver = new ResizeObserver(() => updateRowHeight())
      tableResizeObserver.observe(tableWrapperRef.value)
    }
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  tableResizeObserver?.disconnect()
})

/* ── COLUMN CONFIGS ─────────────────────────────────────── */

const columnConfigs = {
  province: [
    { prop: "province_name",    label: "Tỉnh" },
    { prop: "station_count",    label: "Trạm",       numeric: true },
    { prop: "bay_count",        label: "Trụ",        numeric: true },
    { prop: "total_sessions",   label: "Phiên",      numeric: true },
    { prop: "sessions_per_bay", label: "Phiên/Trụ",  numeric: true },
    { prop: "revenue",          label: "Doanh thu",  money: true,  numeric: true },
    { prop: "revenue_per_bay",  label: "DT/Trụ",     money: true,  numeric: true }
  ],
  ward: [
    { prop: "ward_name",        label: "Xã / Phường" },
    { prop: "province_name",    label: "Tỉnh" },
    { prop: "station_count",    label: "Trạm",       numeric: true },
    { prop: "bay_count",        label: "Trụ",        numeric: true },
    { prop: "total_sessions",   label: "Phiên",      numeric: true },
    { prop: "sessions_per_bay", label: "Phiên/Trụ",  numeric: true },
    { prop: "revenue",          label: "Doanh thu",  money: true,  numeric: true },
    { prop: "revenue_per_bay",  label: "DT/Trụ",     money: true,  numeric: true }
  ],
  agency: [
    { prop: "agency_name",      label: "Đại lý" },
    { prop: "province_name",    label: "Tỉnh" },
    { prop: "station_count",    label: "Trạm",       numeric: true },
    { prop: "bay_count",        label: "Trụ",        numeric: true },
    { prop: "total_sessions",   label: "Phiên",      numeric: true },
    { prop: "sessions_per_bay", label: "Phiên/Trụ",  numeric: true },
    { prop: "revenue",          label: "Doanh thu",  money: true,  numeric: true },
    { prop: "revenue_per_bay",  label: "DT/Trụ",     money: true,  numeric: true }
  ],
  station: [
    { prop: "station_code",     label: "Trạm" },
    { prop: "_address",         label: "Địa chỉ",    address: true },
    { prop: "bay_count",        label: "Trụ",        numeric: true },
    { prop: "total_sessions",   label: "Phiên",      numeric: true },
    { prop: "sessions_per_bay", label: "Phiên/Trụ",  numeric: true },
    { prop: "revenue",          label: "Doanh thu",  money: true,  numeric: true },
    { prop: "revenue_per_bay",  label: "DT/Trụ",     money: true,  numeric: true }
  ],
  bay: [
    { prop: "bay_code",         label: "Mã trụ" },
    { prop: "station_code",     label: "Trạm" },
    { prop: "_address",         label: "Địa chỉ",    address: true },
    { prop: "total_sessions",   label: "Phiên",      numeric: true },
    { prop: "revenue",          label: "Doanh thu",  money: true,  numeric: true }
  ]
}

/* ── STATE ──────────────────────────────────────────────── */

const level   = ref("station")
const period  = ref("30D")
const topN    = ref(window.innerWidth <= 768 ? 5 : 20)
const sortMetric = ref("revenue")
const loading = ref(false)
const rows    = ref([])

const periods = [
  { value: "today", label: "Hôm qua" },
  { value: "7D",    label: "7 ngày"  },
  { value: "30D",   label: "30 ngày" },
  { value: "90D",   label: "90 ngày" }
]

const topNOptions = computed(() =>
  isMobile.value ? [5, 10, 20] : [10, 20, 50, 100]
)

const metricOptions = [
  { value: "total_sessions", label: "Phiên" },
  { value: "sessions_per_bay", label: "Phiên/Trụ" },
  { value: "revenue", label: "Doanh thu" },
  { value: "revenue_per_bay", label: "DT/Trụ" }
]

const sortableMetricsByLevel = {
  province: ["total_sessions", "sessions_per_bay", "revenue", "revenue_per_bay"],
  ward: ["total_sessions", "sessions_per_bay", "revenue", "revenue_per_bay"],
  agency: ["total_sessions", "sessions_per_bay", "revenue", "revenue_per_bay"],
  station: ["total_sessions", "sessions_per_bay", "revenue", "revenue_per_bay"],
  bay: ["total_sessions", "revenue"]
}

/* ── ENTITY KEY per level ───────────────────────────────── */

const entityKey = computed(() => ({
  station:  "station_code",
  agency:   "agency_name",
  ward:     "ward_name",
  province: "province_name",
  bay:      "bay_code"
}[level.value] || "station_code"))

/* ── COMPUTED ───────────────────────────────────────────── */

const activeColumns = computed(() => columnConfigs[level.value] || columnConfigs.station)
const showDetails = ref(false)

const primaryColumnsByLevel = {
  province: ["province_name", "station_count", "bay_count", "total_sessions", "revenue"],
  ward: ["ward_name", "province_name", "station_count", "total_sessions", "revenue"],
  agency: ["agency_name", "province_name", "station_count", "total_sessions", "revenue"],
  station: ["station_code", "_address", "bay_count", "total_sessions", "revenue"],
  bay: ["bay_code", "station_code", "total_sessions", "revenue"]
}

const visibleColumns = computed(() => {
  if (showDetails.value) return activeColumns.value
  const primarySet = new Set(primaryColumnsByLevel[level.value] || primaryColumnsByLevel.station)
  return activeColumns.value.filter(col => primarySet.has(col.prop))
})

const showDetailFields = computed(() => isMobile.value || showDetails.value)

const availableSortMetrics = computed(() =>
  sortableMetricsByLevel[level.value] || sortableMetricsByLevel.station
)

const availableSortOptions = computed(() =>
  metricOptions.filter(opt => availableSortMetrics.value.includes(opt.value))
)

const effectiveSortMetric = computed(() => {
  if (availableSortMetrics.value.includes(sortMetric.value)) return sortMetric.value
  return availableSortMetrics.value.includes("revenue") ? "revenue" : availableSortMetrics.value[0]
})

const topRows = computed(() => rows.value)

const maxRevenue = computed(() =>
  topRows.value.length ? Math.max(...topRows.value.map((r) => Number(r.revenue || 0)), 1) : 1
)

const pct = (revenue) => Math.round(((revenue || 0) / maxRevenue.value) * 100)

function isSortableMetric(prop) {
  return availableSortMetrics.value.includes(prop)
}

function isSortedColumn(prop) {
  return prop === effectiveSortMetric.value
}

function handleMetricSort(metric) {
  if (!isSortableMetric(metric) || effectiveSortMetric.value === metric) return
  sortMetric.value = metric
  fetchData()
}

function handleLevelChange() {
  if (!isSortableMetric(sortMetric.value)) {
    sortMetric.value = availableSortMetrics.value.includes("revenue")
      ? "revenue"
      : availableSortMetrics.value[0]
  }
  fetchData()
}

/* ── DATE HELPERS ───────────────────────────────────────── */

function fmt(d) {
  return d.toISOString().split("T")[0]
}

function getDateParams() {
  const today = new Date()
  const end = fmt(today)

  if (period.value === "today") {
    // Hôm qua: chỉ lấy dữ liệu ngày hôm qua
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yDate = fmt(yesterday)
    return { start_date: yDate, end_date: yDate, time_unit: "day" }
  }

  const days = { "7D": 6, "30D": 29, "90D": 89 }[period.value] ?? 29
  const startD = new Date(today)
  startD.setDate(today.getDate() - days)
  const start = fmt(startD)

  // Dùng time_unit="month" để backend group theo tháng → tối đa 3 dòng/entity cho 90D
  // Giảm đáng kể số row trả về so với time_unit="day" (7-90 dòng/entity)
  const time_unit = period.value === "7D" ? "week" : "month"
  return { start_date: start, end_date: end, time_unit }
}

/* ── FETCH ──────────────────────────────────────────────── */

async function fetchData() {
  loading.value = true
  rows.value = []
  try {
    const dateParams = getDateParams()
    const res = await revenueApi.getRevenueReport({
      level: level.value,
      ...dateParams,
      aggregate_by_entity: true,
      sort_by: effectiveSortMetric.value,
      sort_order: 'desc',
      page: 1,
      limit: Number(topN.value),
      include_total: false
    })
    rows.value = res.data?.data?.list || res.data?.data || []
  } catch (e) {
    console.error("[TopTable] fetchData error:", e)
  } finally {
    loading.value = false
    nextTick(() => updateRowHeight())
  }
}

watch(visibleRowCount, () => nextTick(() => updateRowHeight()))
watch(topN, fetchData)

/* ── FORMAT ─────────────────────────────────────────────── */

function formatMoney(v) {
  if (v == null) return "—"
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v)
}

/* ── INIT ───────────────────────────────────────────────── */

onMounted(fetchData)
</script>


<style scoped>

/* ─── CARD ─────────────────────────────────────────────── */

.card {
  --visible-rows: 8;
  --row-height: 56px;
  height: 100%;
  background: var(--bg-card);
  padding: 20px 24px 16px;
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
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

/* ─── HEADER ────────────────────────────────────────────── */

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
  flex-shrink: 0;
  width: 100%;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

select {
  padding: 4px 10px;
  padding-right: 28px;
  border-radius: 8px;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.18);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-muted);
  background: var(--bg-surface);
  cursor: pointer;
  outline: none;
  transition: box-shadow .15s, color .15s, background .2s;
  height: 28px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

select:focus,
select:hover {
  box-shadow: inset 0 0 0 1px var(--accent);
  color: var(--text-main);
}

/* ─── PERIOD TABS ───────────────────────────────────────── */

.period-tabs {
  display: flex;
  gap: 3px;
  background: var(--bg-surface);
  border-radius: 10px;
  padding: 3px;
  transition: background 0.2s ease;
}

.period-tabs button {
  padding: 3px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-faint);
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  white-space: nowrap;
}

.period-tabs button:hover {
  color: var(--text-muted);
}

.period-tabs button.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.detail-toggle {
  height: 28px;
  border: none;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text-muted);
  background: var(--bg-surface);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.18);
  transition: color .15s, background .15s, box-shadow .15s;
}

.detail-toggle:hover {
  color: var(--text-main);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.detail-toggle.active {
  color: #fff;
  background: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
}

/* ─── TABLE WRAPPER ─────────────────────────────────────── */

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: none;
}

.table-wrapper::-webkit-scrollbar {
  display: none;
}

/* ─── TABLE ─────────────────────────────────────────────── */

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  table-layout: fixed;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 1;
  text-align: center;
  padding: 8px 12px 10px;
  color: var(--text-faint);
  font-weight: 600;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .07em;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s ease, color 0.2s ease;
}

thead th.col-rank {
  text-align: center;
}

tbody tr {
  height: var(--row-height);
  transition: background 0.15s, border-color 0.15s;
}

tbody tr:hover td {
  background: var(--bg-hover);
}

/* ─── TOP 3 ROW HIGHLIGHTS ──────────────────────────────── */
/* shared: slightly bolder text for top 3 */
tbody tr.top-1 td,
tbody tr.top-2 td,
tbody tr.top-3 td { font-weight: 500; }

/* #1 — AMBER GOLD (~45°) */
tbody tr.top-1 td:first-child {
  border-left: 4px solid #d97706;
  background: linear-gradient(90deg,
    rgba(217,119,6,0.22) 0%,
    rgba(245,158,11,0.07) 50%,
    transparent 100%);
  animation: gold-pulse 3s ease-in-out infinite;
}
tbody tr.top-1 td:not(:first-child) {
  background: linear-gradient(90deg,
    rgba(245,158,11,0.08) 0%, transparent 100%);
}

/* #2 — INDIGO (~255°) — theme accent, clearly distinct */
tbody tr.top-2 td:first-child {
  border-left: 3px solid #6366f1;
  background: linear-gradient(90deg,
    rgba(99,102,241,0.20) 0%,
    rgba(99,102,241,0.06) 50%,
    transparent 100%);
}
tbody tr.top-2 td:not(:first-child) {
  background: linear-gradient(90deg,
    rgba(99,102,241,0.07) 0%, transparent 100%);
}

/* #3 — EMERALD (~160°) — cool green, 120° from both */
tbody tr.top-3 td:first-child {
  border-left: 3px solid #10b981;
  background: linear-gradient(90deg,
    rgba(16,185,129,0.18) 0%,
    rgba(16,185,129,0.05) 50%,
    transparent 100%);
}
tbody tr.top-3 td:not(:first-child) {
  background: linear-gradient(90deg,
    rgba(16,185,129,0.06) 0%, transparent 100%);
}

@keyframes gold-pulse {
  0%, 100% { box-shadow: inset 4px 0 14px rgba(217,119,6,0.15); }
  50%       { box-shadow: inset 4px 0 26px rgba(217,119,6,0.35); }
}

/* dark mode — stronger tints */
:global([data-theme="dark"]) tbody tr.top-1 td:first-child {
  background: linear-gradient(90deg, rgba(217,119,6,0.32) 0%, rgba(245,158,11,0.11) 50%, transparent 100%);
}
:global([data-theme="dark"]) tbody tr.top-1 td:not(:first-child) {
  background: linear-gradient(90deg, rgba(245,158,11,0.12) 0%, transparent 100%);
}

:global([data-theme="dark"]) tbody tr.top-2 td:first-child {
  background: linear-gradient(90deg, rgba(99,102,241,0.30) 0%, rgba(99,102,241,0.10) 50%, transparent 100%);
}
:global([data-theme="dark"]) tbody tr.top-2 td:not(:first-child) {
  background: linear-gradient(90deg, rgba(99,102,241,0.11) 0%, transparent 100%);
}

:global([data-theme="dark"]) tbody tr.top-3 td:first-child {
  background: linear-gradient(90deg, rgba(16,185,129,0.26) 0%, rgba(16,185,129,0.08) 50%, transparent 100%);
}
:global([data-theme="dark"]) tbody tr.top-3 td:not(:first-child) {
  background: linear-gradient(90deg, rgba(16,185,129,0.09) 0%, transparent 100%);
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-main);
  white-space: nowrap;
  vertical-align: middle;
  transition: color 0.2s ease, border-color 0.2s ease;
}

tbody tr:last-child td {
  border-bottom: none;
}

/* ─── RANK CELL ─────────────────────────────────────────── */

.col-rank {
  width: 42px;
  text-align: center;
}

/* ─── NUMERIC COLUMNS (center-aligned) ──────────────────── */

th.col-num,
td.col-num {
  text-align: center;
}

th.is-sorted {
  color: var(--accent);
  font-weight: 700;
}

.sortable-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  padding: 0;
}

.sortable-head:hover {
  color: var(--text-muted);
}

.sortable-head.active {
  color: var(--accent);
  font-weight: 700;
}

.sort-arrow {
  opacity: 0;
  transform: translateY(-1px);
  transition: opacity 0.15s ease;
}

.sort-arrow.active {
  opacity: 1;
}

td.is-sorted {
  background: linear-gradient(180deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03));
  font-weight: 700;
  color: var(--text-link);
}

tbody tr.top-1 td.is-sorted,
tbody tr.top-2 td.is-sorted,
tbody tr.top-3 td.is-sorted {
  font-weight: 700;
}

td.is-sorted .addr-line,
td.is-sorted .money,
td.is-sorted .money-sorted {
  font-weight: 700;
}

.rank-cell {
  text-align: center;
  vertical-align: middle;
}

/* rank number badge */
.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
  background: var(--bg-surface);
  color: var(--text-faint);
}

tbody tr.top-1 .rank-num { color: #d97706; }
tbody tr.top-2 .rank-num { color: #818cf8; }
tbody tr.top-3 .rank-num { color: #34d399; }

/* ─── MONEY ─────────────────────────────────────────────── */

.money {
  font-weight: 600;
  color: inherit;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.money-sorted {
  font-weight: 700;
  color: var(--text-link);
}

/* ─── SUB LABELS ────────────────────────────────────────── */

.sub-label {
  font-size: 10.5px;
  color: var(--text-faint);
  margin-top: 2px;
}

/* ─── ADDRESS ───────────────────────────────────────────── */

.addr-line {
  font-size: 12.5px;
  color: var(--text-main);
  line-height: 1.45;
  white-space: normal;
}

.addr-detail {
  font-size: 11.5px;
  color: var(--text-muted);
}

/* ─── EMPTY / LOADING ───────────────────────────────────── */

.empty {
  text-align: center;
  color: var(--text-faint);
  padding: 48px;
  font-size: 13px;
  letter-spacing: 0.03em;
}

.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── MOBILE RESPONSIVE ─────────────────────────────────── */

@media (max-width: 768px) {
  .card {
    padding: 16px 18px 12px;
    border-radius: 14px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
  }

  .filters {
    width: 100%;
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    overflow: hidden;
    gap: 6px;
    min-width: 0;
  }

  .filters {
    font-size: 0;
  }

  .level-select {
    flex: 0 1 78px;
    min-width: 70px;
    max-width: 86px;
  }

  .period-tabs {
    flex: 1;
    min-width: 0;
  }

  .period-select {
    flex: 1 1 88px;
    min-width: 78px;
  }

  .period-tabs button {
    padding: 3px 9px;
    font-size: 10.5px;
  }

  select {
    font-size: 11px;
    height: 26px;
  }

  .topn-select {
    flex: 0 0 78px;
    min-width: 78px;
    margin-left: 0;
  }

  .sortmetric-select {
    flex: 1 1 98px;
    min-width: 84px;
  }

  .filters > select {
    width: 100%;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .detail-toggle {
    white-space: nowrap;
  }

}

/* ─── MOBILE CARD LIST ──────────────────────────────────── */

.card-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 0;
  scrollbar-width: none;
}
.card-list::-webkit-scrollbar { display: none; }

.top-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  transition: background 0.15s;
}

.top-card.rank-1 { border-left: 4px solid #d97706; background: linear-gradient(135deg, rgba(217,119,6,0.08) 0%, var(--bg-surface) 100%); }
.top-card.rank-2 { border-left: 3px solid #6366f1; background: linear-gradient(135deg, rgba(99,102,241,0.07) 0%, var(--bg-surface) 100%); }
.top-card.rank-3 { border-left: 3px solid #10b981; background: linear-gradient(135deg, rgba(16,185,129,0.07) 0%, var(--bg-surface) 100%); }

.top-card .rank-num {
  flex-shrink: 0;
  margin-top: 2px;
}
.rank-1 .rank-num { color: #d97706; }
.rank-2 .rank-num { color: #818cf8; }
.rank-3 .rank-num { color: #34d399; }

.tc-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tc-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tc-sub {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.stat-pill {
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.stat-pill.accent {
  background: rgba(99,102,241,0.1);
  color: var(--accent);
  border-color: rgba(99,102,241,0.2);
}

.tc-revenue {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.rev-per-bay {
  font-size: 11px;
  color: var(--text-faint);
  font-weight: 500;
}

</style>
