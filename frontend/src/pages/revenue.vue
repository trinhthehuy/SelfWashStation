<template>
  <div class="revenue-report-container">
    <el-card shadow="never" class="filter-card">
      <!-- Dòng 1: Thống kê + Thời gian -->
      <div class="filter-row top-filter-row">
        <div class="filter-item">
          <span class="filter-label">Thống kê</span>
          <el-select v-model="filterForm.level" @change="handleLevelFilter" size="small" class="level-select">
            <el-option label="Theo Tỉnh" value="province" />
            <el-option label="Theo Xã" value="ward" />
            <el-option label="Theo Đại lý" value="agency" />
            <el-option label="Theo Trạm" value="station" />
            <el-option label="Theo Trụ" value="bay" />
          </el-select>
        </div>
        <div class="time-controls">
          <el-radio-group v-model="filterForm.timeType" size="small" @change="handleTimeTypeChange" class="time-group">
            <el-radio-button value="day">Ngày</el-radio-button>
            <el-radio-button value="week">Tuần</el-radio-button>
            <el-radio-button value="month">Tháng</el-radio-button>
          </el-radio-group>

          <transition name="slide-down">
            <div v-if="!isMobile" class="inline-date-picker-wrap">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="-"
                start-placeholder="Từ ngày"
                end-placeholder="Đến ngày"
                value-format="YYYY-MM-DD"
                size="small"
                :disabled="filterForm.timeType !== 'day'"
                @change="handleDateRangeChange"
                class="date-range-picker inline-date-picker"
              />
            </div>
          </transition>
        </div>
      </div>

      <!-- Mobile: giữ date range ở hàng riêng như cũ -->
      <transition name="slide-down">
        <div class="filter-row" v-if="isMobile">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            value-format="YYYY-MM-DD"
            size="small"
            :disabled="filterForm.timeType !== 'day'"
            @change="handleDateRangeChange"
            class="date-range-picker"
          />
        </div>
      </transition>

      <!-- Dòng 3: Filter chips -->
      <div class="filter-row filter-chips-row">
        <div v-if="!isMobile" class="desktop-filter-field province-field">
          <span class="desktop-filter-label">Tỉnh</span>
          <el-select
            v-model="filterForm.province_id"
            :disabled="filterForm.level === 'agency'"
            filterable
            clearable
            :loading="selectLoading.province"
            @change="handleProvinceChange"
            @clear="handleProvinceChange(null)"
            class="desktop-filter-select"
            placeholder="Chọn tỉnh"
          >
            <el-option v-for="item in options.provinces" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>

        <div v-if="!isMobile" class="desktop-filter-field ward-field">
          <span class="desktop-filter-label">Xã</span>
          <el-select
            v-model="filterForm.ward_id"
            :disabled="['province','agency'].includes(filterForm.level)"
            filterable
            clearable
            :loading="selectLoading.ward"
            @change="handleWardChange"
            @clear="handleWardChange(null)"
            class="desktop-filter-select"
            placeholder="Chọn xã"
          >
            <el-option v-for="item in options.wards" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>

        <div v-if="!isMobile" class="desktop-filter-field agency-field">
          <span class="desktop-filter-label">Đại lý</span>
          <el-select
            v-model="filterForm.agency_id"
            :disabled="['province','ward'].includes(filterForm.level) || isAgency"
            filterable
            clearable
            :filter-method="handleAgencyFilter"
            :loading="selectLoading.agency"
            @change="handleAgencyChange"
            @clear="handleAgencyChange(null)"
            class="desktop-filter-select"
            placeholder="Chọn đại lý"
          >
            <el-option v-for="item in filteredAgencyOptions" :key="item.id" :label="item.agency_name" :value="item.id">
              <div class="agency-dual">
                <div class="agency-dual-name">{{ item.agency_name }}</div>
                <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
              </div>
            </el-option>
          </el-select>
        </div>

        <div v-if="!isMobile" class="desktop-filter-field station-field">
          <span class="desktop-filter-label">Mã trạm</span>
          <el-select
            v-model="filterForm.station_id"
            :disabled="['province','ward','agency'].includes(filterForm.level)"
            filterable
            clearable
            :loading="selectLoading.station"
            @change="handleStationChange"
            @clear="handleStationClear"
            class="desktop-filter-select"
            placeholder="Chọn trạm"
          >
            <el-option v-for="item in options.stations" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>

        <div v-if="!isMobile" class="desktop-filter-field bay-field">
          <span class="desktop-filter-label">Mã trụ</span>
          <el-select
            v-model="filterForm.bay_code"
            :disabled="['province','ward','agency','station'].includes(filterForm.level) || !filterForm.station_id"
            filterable
            clearable
            :loading="selectLoading.bay"
            @change="handleBayChange"
            @clear="handleBayClear"
            class="desktop-filter-select"
            placeholder="Chọn trụ"
          >
            <el-option v-for="item in options.bays" :key="item.bay_code" :label="item.bay_code" :value="item.bay_code" />
          </el-select>
        </div>

        <el-popover v-if="isMobile" trigger="click" placement="bottom-start" :width="210" popper-class="filter-pop">
          <template #reference>
            <button class="filter-chip" :class="{ active: filterForm.province_id }" :disabled="filterForm.level === 'agency'">
              <span class="chip-label">Tỉnh</span>
              <span class="chip-val" v-if="selectedProvinceName">{{ selectedProvinceName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
          </template>
          <el-select v-model="filterForm.province_id" :disabled="filterForm.level === 'agency'" filterable clearable
            :loading="selectLoading.province" @change="handleProvinceChange" @clear="handleProvinceChange(null)"
            style="width:100%" placeholder="Chọn tỉnh">
            <el-option v-for="item in options.provinces" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-popover>

        <el-popover v-if="isMobile" trigger="click" placement="bottom-start" :width="210" popper-class="filter-pop">
          <template #reference>
            <button class="filter-chip" :class="{ active: filterForm.ward_id }" :disabled="['province','agency'].includes(filterForm.level)">
              <span class="chip-label">Xã</span>
              <span class="chip-val" v-if="selectedWardName">{{ selectedWardName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
          </template>
          <el-select v-model="filterForm.ward_id" :disabled="['province','agency'].includes(filterForm.level)" filterable clearable
            :loading="selectLoading.ward" @change="handleWardChange" @clear="handleWardChange(null)"
            style="width:100%" placeholder="Chọn xã">
            <el-option v-for="item in options.wards" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-popover>

        <el-popover v-if="isMobile" trigger="click" placement="bottom-start" :width="220" popper-class="filter-pop">
          <template #reference>
            <button class="filter-chip" :class="{ active: filterForm.agency_id }" :disabled="['province','ward'].includes(filterForm.level) || isAgency">
              <span class="chip-label">Đại lý</span>
              <span class="chip-val" v-if="selectedAgencyName">{{ selectedAgencyName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
          </template>
          <el-select v-model="filterForm.agency_id" :disabled="['province','ward'].includes(filterForm.level) || isAgency" filterable clearable
            :filter-method="handleAgencyFilter"
            :loading="selectLoading.agency" @change="handleAgencyChange" @clear="handleAgencyChange(null)"
            style="width:100%" placeholder="Chọn đại lý">
            <el-option v-for="item in filteredAgencyOptions" :key="item.id" :label="item.agency_name" :value="item.id">
              <div class="agency-dual">
                <div class="agency-dual-name">{{ item.agency_name }}</div>
                <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
              </div>
            </el-option>
          </el-select>
        </el-popover>

        <el-popover v-if="isMobile" trigger="click" placement="bottom-start" :width="220" popper-class="filter-pop">
          <template #reference>
            <button class="filter-chip" :class="{ active: filterForm.station_id }" :disabled="['province','ward','agency'].includes(filterForm.level)">
              <span class="chip-label">Mã trạm</span>
              <span class="chip-val" v-if="selectedStationName">{{ selectedStationName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
          </template>
          <el-select v-model="filterForm.station_id" :disabled="['province','ward','agency'].includes(filterForm.level)" filterable clearable
            :loading="selectLoading.station" @change="handleStationChange" @clear="handleStationClear"
            style="width:100%" placeholder="Chọn trạm">
            <el-option v-for="item in options.stations" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-popover>

        <el-popover v-if="isMobile" trigger="click" placement="bottom-start" :width="220" popper-class="filter-pop">
          <template #reference>
            <button class="filter-chip" :class="{ active: filterForm.bay_code }" :disabled="['province','ward','agency','station'].includes(filterForm.level) || !filterForm.station_id">
              <span class="chip-label">Mã trụ</span>
              <span class="chip-val" v-if="filterForm.bay_code">{{ filterForm.bay_code }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
          </template>
          <el-select v-model="filterForm.bay_code" :disabled="['province','ward','agency','station'].includes(filterForm.level) || !filterForm.station_id" filterable clearable
            :loading="selectLoading.bay" @change="handleBayChange" @clear="handleBayClear"
            style="width:100%" placeholder="Chọn trụ">
            <el-option v-for="item in options.bays" :key="item.bay_code" :label="item.bay_code" :value="item.bay_code" />
          </el-select>
        </el-popover>

        <!-- Right-aligned display mode switch -->
        <div v-if="!isMobile" class="display-mode-switch-inline">
          <span class="display-mode-label">Hiển thị</span>
          <el-radio-group v-model="displayMode" size="small" class="display-mode-group">
            <el-radio-button value="compact">Rút gọn</el-radio-button>
            <el-radio-button value="full">Đầy đủ</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </el-card>

    <div v-if="!isMobile" class="insight-strip">
      <div class="insight-card">
        <span class="insight-label">Doanh thu (trang hiện tại)</span>
        <strong class="insight-value primary">{{ formatMoney(insightMetrics.revenue) }}</strong>
      </div>
      <div class="insight-card">
        <span class="insight-label">Tổng phiên (trang hiện tại)</span>
        <strong class="insight-value">{{ insightMetrics.totalSessions }}</strong>
      </div>
      <div class="insight-card">
        <span class="insight-label">DT/Trụ TB</span>
        <strong class="insight-value">{{ formatMoney(insightMetrics.avgRevenuePerBay) }}</strong>
      </div>
      <div class="insight-card">
        <span class="insight-label">Phiên/Trụ TB</span>
        <strong class="insight-value">{{ insightMetrics.avgSessionsPerBay }}</strong>
      </div>
    </div>


    <div class="table-main">
      <el-table
        v-if="!isMobile"
        ref="tableRef"
        :data="tableData"
        stripe
        style="width: 100%; margin-top: 16px"
        height="100%"
        v-loading="loading"
        show-summary
        :summary-method="getSummaries"
      >
        <el-table-column label="STT" type="index" :index="indexMethod" width="60" align="center" fixed="left" />
        <el-table-column
          v-for="col in displayedColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :sortable="col.sortable"
          :align="getColumnAlign(col.prop)"
          :header-align="getColumnAlign(col.prop)"
        >
          <template #default="scope">
            <template v-if="col.prop === 'revenue'">
              <span class="revenue-emphasis">
                {{ formatMoney(scope.row[col.prop]) }}
              </span>
            </template>
            <template v-else-if="col.prop === 'revenue_per_bay'">
              <span class="revenue-secondary">
                {{ formatNumber(scope.row[col.prop]) }}
                <span class="money-unit">đ</span>
              </span>
            </template>
            <template v-else>{{ scope.row[col.prop] }}</template>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile card list -->
      <div v-else class="mobile-card-list" v-loading="loading">
        <div
          v-for="(row, idx) in tableData"
          :key="idx"
          class="mobile-card"
          role="button"
          tabindex="0"
          :aria-expanded="expandedCard === idx"
          @click="toggleExpandedCard(idx)"
          @keydown.enter.prevent="toggleExpandedCard(idx)"
          @keydown.space.prevent="toggleExpandedCard(idx)"
        >
          <!-- Card header: STT + tên chính + thời gian -->
          <div class="mc-header">
            <span class="mc-stt">{{ indexMethod(idx) }}</span>
            <div class="mc-title">
              <span class="mc-name">{{ row[mobileCardCfg.title] ?? '—' }}</span>
              <span class="mc-sub" v-if="mobileCardCfg.sub">{{ row[mobileCardCfg.sub] }}</span>
            </div>
            <span class="mc-time">{{ row.Time }}</span>
          </div>

          <!-- Doanh thu nổi bật -->
          <div class="mc-revenue">{{ formatMoney(row.revenue) }}</div>

          <!-- Stats dòng chính -->
          <div class="mc-stats">
            <div class="mc-stat" v-if="row.total_sessions !== undefined">
              <span class="mcs-label">Phiên</span>
              <span class="mcs-val">{{ row.total_sessions }}</span>
            </div>
            <div class="mc-stat" v-if="row.bay_count !== undefined">
              <span class="mcs-label">Số trụ</span>
              <span class="mcs-val">{{ row.bay_count }}</span>
            </div>
            <div class="mc-stat" v-if="row.revenue_per_bay !== undefined">
              <span class="mcs-label">DT/Trụ</span>
              <span class="mcs-val money">{{ formatMoney(row.revenue_per_bay) }}</span>
            </div>
          </div>

          <!-- Chi tiết mở rộng -->
          <transition name="expand">
            <div class="mc-detail" v-if="expandedCard === idx">
              <div class="mc-detail-row" v-if="row.station_count !== undefined">
                <span>Số trạm</span><span>{{ row.station_count }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.agency_count !== undefined">
                <span>Số đại lý</span><span>{{ row.agency_count }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.ward_count !== undefined">
                <span>Số xã có trạm</span><span>{{ row.ward_count }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.sessions_per_bay !== undefined">
                <span>Phiên/Trụ</span><span>{{ row.sessions_per_bay }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.province_name && mobileCardCfg.title !== 'province_name'">
                <span>Tỉnh</span><span>{{ row.province_name }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.agency_name && mobileCardCfg.title !== 'agency_name'">
                <span>Đại lý</span><span>{{ row.agency_name }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.address">
                <span>Địa chỉ</span><span>{{ row.address }}</span>
              </div>
            </div>
          </transition>

          <div class="mc-expand-hint">{{ expandedCard === idx ? '▲ Thu gọn' : '▼ Chi tiết' }}</div>
        </div>

        <div v-if="!loading && tableData.length === 0" class="mc-empty">Không có dữ liệu</div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination-container" style="margin-top: 16px">
      <el-pagination
        v-if="!isMobile"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
      <el-pagination
        v-else
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        layout="prev, pager, next"
        :pager-count="5"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        size="small"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { revenueApi } from '@/api/revenue'
import { ElMessage } from 'element-plus'
import { wardApi } from '@/api/ward'
import { agencyApi } from '@/api/agency'
import { stationApi } from '@/api/station'
import { bayApi } from '@/api/bay'
import { authStore } from '@/stores/auth'
import { useMetadataStore } from '@/stores/metadata'

const isAgency = computed(() => authStore.hasAnyRole(['agency']))

const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const tableData = ref([])
const loading = ref(false)
const tableRef = ref(null)
const expandedCard = ref(null)
const displayMode = ref('compact')

const options = reactive({
  provinces: [],
  wards: [],
  agencies: [],
  stations: [],
  bays: []
})

const selectLoading = reactive({
  province: false,
  ward: false,
  agency: false,
  station: false,
  bay: false
})

const filterForm = reactive({
  level: 'agency',
  timeType: 'day',
  dateRange: [],
  province_id: null,
  ward_id: null,
  agency_id: null,
  station_id: null,
  bay_code: null
})
const agencySearchKeyword = ref('')

const isMobile = ref(window.innerWidth < 768)
const onResize = () => {
  isMobile.value = window.innerWidth < 768
}
const FETCH_DEBOUNCE_MS = 250
let fetchDebounceTimer = null
let fetchRequestSeq = 0

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (fetchDebounceTimer) {
    clearTimeout(fetchDebounceTimer)
    fetchDebounceTimer = null
  }
})

const scheduleFetchData = ({ resetPage = true, debounceMs = FETCH_DEBOUNCE_MS } = {}) => {
  if (fetchDebounceTimer) {
    clearTimeout(fetchDebounceTimer)
  }

  fetchDebounceTimer = setTimeout(() => {
    fetchDebounceTimer = null
    fetchData({ resetPage })
  }, debounceMs)
}

const mobileCardCfg = computed(() => {
  const cfgMap = {
    province: { title: 'province_name', sub: null },
    ward: { title: 'ward_name', sub: 'province_name' },
    agency: { title: 'agency_name', sub: 'province_name' },
    station: { title: 'station_code', sub: 'agency_name' },
    bay: { title: 'bay_code', sub: 'station_code' }
  }
  return cfgMap[filterForm.level] ?? cfgMap.province
})

const selectedProvinceName = computed(() =>
  filterForm.province_id ? (options.provinces.find((p) => p.id === filterForm.province_id)?.name ?? null) : null
)

const selectedWardName = computed(() =>
  filterForm.ward_id ? (options.wards.find((w) => w.id === filterForm.ward_id)?.name ?? null) : null
)

const selectedAgencyName = computed(() =>
  filterForm.agency_id ? (options.agencies.find((a) => a.id === filterForm.agency_id)?.agency_name ?? null) : null
)

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim()
const filteredAgencyOptions = computed(() => {
  if (!agencySearchKeyword.value) return options.agencies
  return options.agencies.filter((agency) => String(agency.searchText || '').includes(agencySearchKeyword.value))
})

const handleAgencyFilter = (query) => {
  agencySearchKeyword.value = normalizeSearchValue(query)
}

const selectedStationName = computed(() =>
  filterForm.station_id ? (options.stations.find((s) => s.id === filterForm.station_id)?.name ?? null) : null
)

const allColumnConfigs = {
  province: [
    { prop: 'Time', label: 'Thời gian', width: '150' },
    { prop: 'province_name', label: 'Tên Tỉnh', width: '150' },
    { prop: 'ward_count', label: 'Số Xã Có Trạm', width: '150' },
    { prop: 'agency_count', label: 'Số Đại lý', width: '150' },
    { prop: 'station_count', label: 'Số Trạm' },
    { prop: 'bay_count', label: 'Số Trụ' },
    { prop: 'total_sessions', label: 'Tổng phiên', sortable: true },
    { prop: 'revenue', label: 'Doanh thu', sortable: true },
    { prop: 'revenue_per_bay', label: 'Doanh thu / Trụ', sortable: true },
    { prop: 'sessions_per_bay', label: 'Số phiên / Trụ', sortable: true }
  ],
  ward: [
    { prop: 'Time', label: 'Thời gian', width: '150' },
    { prop: 'province_name', label: 'Tên Tỉnh', width: '150' },
    { prop: 'ward_name', label: 'Tên Xã/Phường', width: '150' },
    { prop: 'agency_count', label: 'Số Đại lý', width: '150' },
    { prop: 'station_count', label: 'Số Trạm' },
    { prop: 'bay_count', label: 'Số Trụ' },
    { prop: 'total_sessions', label: 'Tổng phiên', sortable: true },
    { prop: 'revenue', label: 'Doanh thu', sortable: true },
    { prop: 'revenue_per_bay', label: 'Doanh thu / Trụ', sortable: true },
    { prop: 'sessions_per_bay', label: 'Số phiên / Trụ', sortable: true }
  ],
  agency: [
    { prop: 'Time', label: 'Thời gian', width: '150' },
    { prop: 'agency_name', label: 'Tên Đại lý', width: '180' },
    { prop: 'province_name', label: 'Tỉnh', width: '120' },
    { prop: 'ward_name', label: 'Xã / Phường', width: '120' },
    { prop: 'station_count', label: 'Số Trạm' },
    { prop: 'bay_count', label: 'Số Trụ' },
    { prop: 'total_sessions', label: 'Tổng phiên', sortable: true },
    { prop: 'revenue', label: 'Doanh thu', sortable: true },
    { prop: 'revenue_per_bay', label: 'Doanh thu / Trụ', sortable: true },
    { prop: 'sessions_per_bay', label: 'Số phiên / Trụ', sortable: true }
  ],
  station: [
    { prop: 'Time', label: 'Thời gian', width: '150' },
    { prop: 'station_code', label: 'Mã trạm', width: '120' },
    { prop: 'agency_name', label: 'Đại lý', width: '180' },
    { prop: 'province_name', label: 'Tỉnh', width: '120' },
    { prop: 'ward_name', label: 'Xã / Phường', width: '120' },
    { prop: 'address', label: 'Địa chỉ', width: '200' },
    { prop: 'bay_count', label: 'Số Trụ' },
    { prop: 'total_sessions', label: 'Tổng phiên', sortable: true },
    { prop: 'revenue', label: 'Doanh thu', sortable: true },
    { prop: 'revenue_per_bay', label: 'Doanh thu / Trụ', sortable: true },
    { prop: 'sessions_per_bay', label: 'Số phiên / Trụ', sortable: true }
  ],
  bay: [
    { prop: 'Time', label: 'Thời gian', width: '150' },
    { prop: 'station_code', label: 'Mã trạm', width: '120' },
    { prop: 'bay_code', label: 'Mã trụ' },
    { prop: 'agency_name', label: 'Đại lý', width: '180' },
    { prop: 'province_name', label: 'Tỉnh', width: '120' },
    { prop: 'ward_name', label: 'Xã / Phường', width: '120' },
    { prop: 'address', label: 'Địa chỉ', width: '200' },
    { prop: 'total_sessions', label: 'Tổng phiên', sortable: true },
    { prop: 'revenue', label: 'Doanh thu', sortable: true }
  ]
}

const numericColumnProps = new Set([
  'ward_count',
  'agency_count',
  'station_count',
  'bay_count',
  'total_sessions',
  'revenue',
  'revenue_per_bay',
  'sessions_per_bay'
])

const handleLevelFilter = async () => {
  const { level, province_id, ward_id, agency_id } = filterForm

  if (level === 'province') {
    filterForm.ward_id = filterForm.station_id = null
    if (!isAgency.value) filterForm.agency_id = null
  } else if (level === 'ward') {
    filterForm.station_id = null
    if (!isAgency.value) filterForm.agency_id = null
  } else if (level === 'agency') {
    filterForm.ward_id = filterForm.province_id = filterForm.station_id = null
  }

  loading.value = true
  const tasks = []

  if (['ward', 'station', 'bay'].includes(level) && province_id) {
    tasks.push(fetchWards(province_id))
  }

  if (['agency', 'station', 'bay'].includes(level)) {
    if (options.agencies.length === 0) tasks.push(fetchAgencies())
  }

  if (['station', 'bay'].includes(level)) {
    tasks.push(fetchStations(province_id, ward_id, agency_id))
  }

  if (level === 'bay' && filterForm.station_id) {
    tasks.push(fetchBays(filterForm.station_id))
  }

  try {
    if (tasks.length > 0) await Promise.all(tasks)
    if (isAgency.value) {
      filterForm.agency_id = authStore.state.user?.agencyId ?? null
    }
    await fetchData({ resetPage: true })
  } catch (error) {
    console.error('Lỗi khi load filter:', error)
  } finally {
    loading.value = false
  }
}

const handleProvinceChange = async (val) => {
  filterForm.ward_id = null
  filterForm.station_id = null
  filterForm.bay_code = null
  options.stations = []
  options.bays = []

  if (!val) {
    options.wards = []
    if (['station', 'bay'].includes(filterForm.level) && filterForm.agency_id) {
      await fetchStations(null, null, filterForm.agency_id)
    }
    scheduleFetchData({ resetPage: true })
    return
  }

  const tasks = []
  if (['ward', 'station', 'bay'].includes(filterForm.level)) {
    tasks.push(fetchWards(val))
  }

  if (['station', 'bay'].includes(filterForm.level)) {
    tasks.push(fetchStations(val, null, filterForm.agency_id))
  }

  if (tasks.length > 0) await Promise.all(tasks)
  scheduleFetchData({ resetPage: true })
}

const handleWardChange = async (val) => {
  filterForm.station_id = null
  filterForm.bay_code = null
  options.stations = []
  options.bays = []

  if (!val) {
    if (['station', 'bay'].includes(filterForm.level)) {
      await fetchStations(filterForm.province_id, null, filterForm.agency_id)
    }
    scheduleFetchData({ resetPage: true })
    return
  }

  if (['station', 'bay'].includes(filterForm.level)) {
    await fetchStations(filterForm.province_id, val, filterForm.agency_id)
  }

  scheduleFetchData({ resetPage: true })
}

const handleAgencyChange = async (val) => {
  filterForm.station_id = null
  filterForm.bay_code = null
  options.stations = []
  options.bays = []

  if (!val) {
    if (['station', 'bay'].includes(filterForm.level)) {
      await fetchStations(filterForm.province_id, filterForm.ward_id, null)
    }
    scheduleFetchData({ resetPage: true })
    return
  }

  if (['station', 'bay'].includes(filterForm.level)) {
    await fetchStations(filterForm.province_id, filterForm.ward_id, val)
  }

  scheduleFetchData({ resetPage: true })
}

const handleStationChange = async (val) => {
  filterForm.bay_code = null
  options.bays = []

  if (!val) {
    scheduleFetchData({ resetPage: true })
    return
  }

  if (filterForm.level === 'bay') {
    await fetchBays(val)
  }

  scheduleFetchData({ resetPage: true })
}

const handleStationClear = () => {
  filterForm.station_id = null
  filterForm.bay_code = null
  options.bays = []
  scheduleFetchData({ resetPage: true })
}

const handleBayChange = () => {
  scheduleFetchData({ resetPage: true })
}

const handleBayClear = () => {
  filterForm.bay_code = null
  scheduleFetchData({ resetPage: true })
}

const handleDateRangeChange = () => {
  scheduleFetchData({ resetPage: true })
}

const toggleExpandedCard = (idx) => {
  expandedCard.value = expandedCard.value === idx ? null : idx
}

const metadataStore = useMetadataStore()

const fetchWards = async (provinceId) => {
  try {
    selectLoading.ward = true
    const res = await wardApi.getWards(provinceId)
    const data = res.data?.data || res.data || []
    options.wards = data.map((i) => ({
      id: i.id,
      name: i.ward_name
    }))
  } catch (error) {
    console.error('Lỗi tải xã:', error)
    ElMessage.error('Lỗi tải thông tin xã / phường')
  } finally {
    selectLoading.ward = false
  }
}

const fetchAgencies = async () => {
  try {
    selectLoading.agency = true
    await metadataStore.fetchAgencies()
    options.agencies = metadataStore.agencies.map((i) => ({
      id: i.id,
      agency_name: i.agency_name,
      identity_number: i.identity_number,
      searchText: normalizeSearchValue(`${i.id || ''} ${i.agency_name || ''} ${i.identity_number || ''} ${i.phone || ''}`)
    }))
  } catch (error) {
    console.error('Lỗi tải đại lý:', error)
    ElMessage.error('Lỗi tải thông tin đại lý')
  } finally {
    selectLoading.agency = false
  }
}

const fetchProvinces = async () => {
  try {
    selectLoading.province = true
    await metadataStore.fetchProvinces()
    options.provinces = metadataStore.provinces.map((i) => ({
      id: i.id,
      name: i.province_name
    }))
  } catch (error) {
    console.error('Lỗi tải tỉnh:', error)
  } finally {
    selectLoading.province = false
  }
}

const fetchStations = async (provinceId, wardId, agencyId) => {
  try {
    selectLoading.station = true
    const res = await stationApi.getFilterStations({
      province_id: provinceId,
      ward_id: wardId,
      agency_id: agencyId
    })

    const data = res.data?.data || []
    options.stations = data.map((i) => ({
      id: i.id,
      name: i.station_name
    }))
  } catch (error) {
    console.error('Lỗi tải trạm:', error)
  } finally {
    selectLoading.station = false
  }
}

const fetchBays = async (stationId) => {
  try {
    selectLoading.bay = true
    const res = await bayApi.getBays(stationId)
    const data = res.data?.data || res.data || []
    options.bays = data.map((i) => ({
      bay_code: i.bay_code
    }))
  } catch (error) {
    console.error('Lỗi tải trụ:', error)
  } finally {
    selectLoading.bay = false
  }
}

const activeColumns = computed(() => {
  return allColumnConfigs[filterForm.level] || allColumnConfigs.province
})

const compactColumnPropsByLevel = {
  province: ['Time', 'province_name', 'total_sessions', 'revenue', 'revenue_per_bay'],
  ward: ['Time', 'ward_name', 'total_sessions', 'revenue', 'revenue_per_bay'],
  agency: ['Time', 'agency_name', 'total_sessions', 'revenue', 'revenue_per_bay'],
  station: ['Time', 'station_code', 'total_sessions', 'revenue', 'revenue_per_bay'],
  bay: ['Time', 'station_code', 'bay_code', 'total_sessions', 'revenue']
}

const displayedColumns = computed(() => {
  if (displayMode.value === 'full') return activeColumns.value

  const compactProps = compactColumnPropsByLevel[filterForm.level] || compactColumnPropsByLevel.province
  return activeColumns.value.filter((col) => compactProps.includes(col.prop))
})

const getColumnAlign = (prop) => {
  return numericColumnProps.has(prop) ? 'right' : 'left'
}

const insightMetrics = computed(() => {
  const rows = tableData.value || []
  const revenue = rows.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0)
  const totalSessions = rows.reduce((sum, row) => sum + (Number(row.total_sessions) || 0), 0)

  const revenuePerBayRows = rows.filter((row) => row.revenue_per_bay !== undefined && row.revenue_per_bay !== null)
  const avgRevenuePerBay = revenuePerBayRows.length
    ? revenuePerBayRows.reduce((sum, row) => sum + (Number(row.revenue_per_bay) || 0), 0) / revenuePerBayRows.length
    : 0

  const sessionsPerBayRows = rows.filter((row) => row.sessions_per_bay !== undefined && row.sessions_per_bay !== null)
  const avgSessionsPerBay = sessionsPerBayRows.length
    ? sessionsPerBayRows.reduce((sum, row) => sum + (Number(row.sessions_per_bay) || 0), 0) / sessionsPerBayRows.length
    : 0

  return {
    revenue,
    totalSessions,
    avgRevenuePerBay,
    avgSessionsPerBay: Number(avgSessionsPerBay.toFixed(2))
  }
})

const fetchData = async ({ resetPage = false } = {}) => {
  if (resetPage) currentPage.value = 1
  const requestSeq = ++fetchRequestSeq
  loading.value = true
  try {
    const shouldIncludeTotal = resetPage || total.value === 0
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      level: filterForm.level,
      time_unit: filterForm.timeType,
      start_date: filterForm.dateRange?.[0] || null,
      end_date: filterForm.dateRange?.[1] || null,
      province_id: filterForm.province_id,
      ward_id: filterForm.ward_id,
      agency_id: filterForm.agency_id,
      station_id: filterForm.station_id,
      bay_code: filterForm.bay_code,
      include_total: shouldIncludeTotal
    }

    const response = await revenueApi.getRevenueReport(params)
    if (requestSeq !== fetchRequestSeq) return

    const result = response.data.data
    tableData.value = result.list || []
    if (result.total !== undefined) {
      total.value = result.total
    }
    // Tự động cuộn bảng về đầu dòng
    if (tableRef.value) {
      tableRef.value.setScrollTop(0)
    }
  } catch (error) {
    if (requestSeq !== fetchRequestSeq) return
    ElMessage.error('Không thể tải dữ liệu')
  } finally {
    if (requestSeq === fetchRequestSeq) {
      loading.value = false
    }
  }
}

const handleTimeTypeChange = (val) => {
  scheduleFetchData({ resetPage: true })
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

const indexMethod = (index) => {
  return (currentPage.value - 1) * pageSize.value + index + 1
}

const formatMoney = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

const formatNumber = (val) => {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0)
}

const getSummaries = (param) => {
  const { columns, data } = param
  const sums = []

  columns.forEach((column, index) => {
    if (index === 1) {
      sums[index] = 'TỔNG'
      return
    }

    const property = column.property
    const values = data.map((item) => Number(item[property]))

    if (property === 'revenue' || property === 'total_sessions') {
      const sumValue = values.reduce((prev, curr) => (!isNaN(curr) ? prev + curr : prev), 0)
      sums[index] = property === 'revenue' ? formatMoney(sumValue) : sumValue
    } else {
      sums[index] = ''
    }
  })

  return sums
}

onMounted(async () => {
  fetchProvinces() // Tải danh sách tỉnh cho bộ lọc
  await handleLevelFilter()
})
</script>

<style scoped>
.revenue-report-container {
  --report-text-main: #e7eefb;
  --report-text-sub: #9eb1cc;
  --report-text-dim: #7f93b1;
  --report-accent: #53a8ff;
  --report-success: #67c98c;
  --report-border: rgba(144, 169, 204, 0.24);
  --report-soft-bg: rgba(18, 39, 74, 0.35);
  --report-card-radius: 10px;
  padding: 12px 14px;
  background: var(--bg-body);
  min-height: 100%;
  color: var(--report-text-main);
  transition: background 0.2s ease;
}
.text-success { color: var(--report-success); font-weight: 700; }
.text-danger  { color: #f0828f; font-weight: 700; }
.pagination-container { display: flex; justify-content: flex-end; }

/* ── Filter card ─────────────────────────────────── */
.filter-card {
  margin-bottom: 12px;
  background-color: var(--bg-card);
  border-radius: var(--report-card-radius);
  border: 1px solid var(--report-border);
}

:deep(.filter-card .el-card__body) {
  padding: 12px 14px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.filter-row:last-child { margin-bottom: 0; }

.top-filter-row {
  justify-content: space-between;
  align-items: flex-start;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--report-text-sub);
  white-space: nowrap;
  font-weight: 500;
}

.level-select { width: 120px; }

.time-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.date-range-picker {
  min-width: 180px;
  max-width: 220px;
}

.inline-date-picker {
  width: 220px;
}

.inline-date-picker-wrap {
  display: flex;
}

/* ── Filter chips row ────────────────────────────── */
.filter-chips-row {
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid var(--report-border);
}

@media (min-width: 769px) {
  .top-filter-row {
    display: grid;
    grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
    align-items: center;
    gap: 12px 18px;
  }

  .filter-item {
    gap: 8px;
  }

  .level-select {
    width: 176px;
  }

  .time-controls {
    margin-left: 0;
    justify-self: stretch;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
  }

  .time-group {
    flex-shrink: 0;
  }

  .inline-date-picker {
    width: 260px;
  }

  .inline-date-picker-wrap {
    min-width: 260px;
  }

  .filter-chips-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    margin-top: 2px;
    gap: 10px 12px;
  }

  .desktop-filter-field {
    flex: 0 0 auto;
    min-height: 0;
  }

  .desktop-filter-select {
    min-width: 0;
  }

  .province-field .desktop-filter-select,
  .ward-field .desktop-filter-select {
    width: 150px;
  }

  .station-field .desktop-filter-select,
  .bay-field .desktop-filter-select {
    width: 180px;
  }

  .agency-field .desktop-filter-select {
    width: 180px;
  }
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--report-border);
  background: transparent;
  color: var(--report-text-main);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  white-space: nowrap;
  line-height: 1.4;
}
.filter-chip:hover:not(:disabled) {
  border-color: var(--report-accent);
  color: var(--report-accent);
}
.filter-chip.active {
  border-color: var(--report-accent);
  background: rgba(83, 168, 255, 0.16);
  color: var(--report-accent);
}
.filter-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chip-label { font-weight: 500; }
.chip-val {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  opacity: 0.85;
}

.desktop-filter-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
}

.desktop-filter-label {
  font-size: 14px;
  font-weight: 400;
  color: var(--report-text-sub);
  white-space: nowrap;
}

.agency-dual {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.agency-dual-name {
  font-weight: 600;
}

.agency-dual-id {
  font-size: 12px;
  color: var(--report-text-sub);
}

.insight-strip {
  margin-top: 5px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 1200px) {
  .insight-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .insight-strip {
    grid-template-columns: 1fr;
  }
}

.insight-card {
  background: var(--bg-card);
  border: 1px solid var(--report-border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--report-accent);
}

.insight-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--report-accent);
  opacity: 0.5;
}

.insight-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--report-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.insight-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--report-text-main);
  line-height: 1.2;
}

.insight-value.primary {
  color: var(--report-accent);
  text-shadow: 0 0 15px rgba(83, 168, 255, 0.2);
}

.display-mode-switch-inline {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--report-soft-bg);
  border-radius: 8px;
  border: 1px solid var(--report-border);
}

.display-mode-switch {
  margin-top: 12px;
  margin-bottom: 2px;
  padding: 9px 11px;
  border: 1px solid var(--report-border);
  border-radius: 9px;
  background: var(--report-soft-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.display-mode-label {
  font-size: 12px;
  color: var(--report-text-sub);
  white-space: nowrap;
}

.display-mode-group {
  --el-fill-color-blank: transparent;
}

@media (max-width: 768px) {
  .display-mode-switch {
    margin-top: 10px;
    padding: 8px 10px;
    gap: 8px;
  }

  .display-mode-group {
    margin-left: auto;
  }
}

/* ── Slide transition for date row ───────────────── */
.slide-down-enter-active,
.slide-down-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-down-enter-from,
.slide-down-leave-to   { opacity: 0; transform: translateY(-4px); }

/* ── Table ───────────────────────────────────────── */
:deep(.el-table) {
  border-radius: var(--report-card-radius);
  overflow: hidden;
}

:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  padding: 10px 12px;
}

:deep(.el-table th.el-table__cell) {
  color: var(--report-text-main);
  font-weight: 600;
}

:deep(.el-table th.el-table__cell .cell) {
  white-space: nowrap;
}

:deep(.el-table .el-table__fixed th.el-table__cell:first-child .cell),
:deep(.el-table th.el-table__cell:first-child .cell),
:deep(.el-table td.el-table__cell:first-child .cell) {
  padding-left: 4px;
  padding-right: 4px;
}

:deep(.el-table td.el-table__cell) {
  color: var(--report-text-main);
}

:deep(.el-table__footer-wrapper td.el-table__cell) {
  color: var(--report-text-sub);
  font-weight: 600;
}

:deep(.el-radio-button__inner) {
  padding: 5px 10px !important;
  font-size: 12px !important;
}

.revenue-emphasis {
  font-weight: 700;
  color: var(--report-accent);
}

.revenue-secondary {
  font-weight: 600;
  color: #79bcff;
}

.money-unit {
  margin-left: 2px;
  font-size: 11px;
  opacity: 0.75;
}

:deep(.el-table th.el-table__cell .caret-wrapper .sort-caret.ascending) {
  border-bottom-color: #9ec9ff;
}

:deep(.el-table th.el-table__cell .caret-wrapper .sort-caret.descending) {
  border-top-color: #9ec9ff;
}

:deep(.el-table th.el-table__cell.ascending .caret-wrapper .sort-caret.ascending),
:deep(.el-table th.el-table__cell.descending .caret-wrapper .sort-caret.descending) {
  border-bottom-color: #53a8ff;
  border-top-color: #53a8ff;
}

@media (max-width: 768px) {
  .revenue-report-container { padding: 10px; }
  :deep(.filter-card .el-card__body) { padding: 10px; }

  .top-filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-item {
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    min-width: 58px;
  }

  .level-select {
    width: 100%;
  }

  .time-controls {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
  }

  .time-group {
    margin-left: 0;
    width: 100%;
  }

  :deep(.time-group .el-radio-button) {
    flex: 1;
  }

  :deep(.time-group .el-radio-button__inner) {
    width: 100%;
    text-align: center;
  }

  .filter-row {
    gap: 8px;
  }

  .date-range-picker {
    min-width: 0;
    max-width: 100%;
    width: 100%;
  }

  .filter-chips-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  :deep(.filter-chips-row .el-popover__reference-wrapper) {
    display: block;
    width: 100%;
  }

  .filter-chip {
    width: 100%;
    justify-content: space-between;
    border-radius: 10px;
  }

  .pagination-container { justify-content: center; margin-top: 12px; }
  .chip-val { max-width: 90px; }
}

/* ── Mobile card list ────────────────────────────── */
.mobile-card-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-card {
  background: var(--bg-card);
  border-radius: var(--report-card-radius);
  padding: 13px 14px;
  cursor: pointer;
  border: 1px solid var(--report-border);
  transition: border-color 0.2s;
}
.mobile-card:active { border-color: var(--report-accent); }
.mobile-card:focus-visible {
  outline: 2px solid var(--report-accent);
  outline-offset: 2px;
}

.mc-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}
.mc-stt {
  font-size: 11px;
  color: var(--report-text-sub);
  min-width: 18px;
  padding-top: 2px;
}
.mc-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.mc-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--report-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-sub {
  font-size: 11px;
  color: var(--report-text-sub);
}
.mc-time {
  font-size: 11px;
  color: var(--report-text-sub);
  white-space: nowrap;
  padding-top: 2px;
}

.mc-revenue {
  font-size: 18px;
  font-weight: 700;
  color: var(--report-accent);
  margin-bottom: 8px;
}

.mc-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.mc-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.mcs-label {
  font-size: 10px;
  color: var(--report-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.mcs-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--report-text-main);
}
.mcs-val.money { color: var(--report-success); }

.mc-detail {
  border-top: 1px solid var(--report-border);
  margin-top: 6px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.mc-detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--report-text-main);
}
.mc-detail-row span:first-child { color: var(--report-text-sub); }
.mc-detail-row span:last-child { text-align: right; margin-left: 12px; }

.mc-expand-hint {
  text-align: center;
  font-size: 10px;
  color: var(--report-text-dim);
  margin-top: 6px;
  letter-spacing: 0.05em;
}

/* Expand animation */
.expand-enter-active, .expand-leave-active {
  transition: opacity 0.2s, max-height 0.25s ease;
  overflow: hidden;
  max-height: 300px;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.mc-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--report-text-sub);
  font-size: 14px;
}
.revenue-report-container {
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

.filter-card {
  border-radius: 8px;
  flex-shrink: 0;
}
:deep(.filter-card .el-card__body) { padding: 10px 16px; }


.display-mode-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  flex-shrink: 0;
}

.pagination-container {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.table-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mobile-card-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
</style>