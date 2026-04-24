<template>
  <div class="wash-session-container">
    <el-card shadow="never" class="header-card title-only-card">
      <div class="header-content">
        <h2 class="page-title">Lịch sử rửa xe</h2>
      </div>
    </el-card>
    <el-card shadow="never" class="filter-card">
      <el-form :inline="false" :model="filterForm" class="session-filter-form">
        <el-form-item class="fi-station" :label="isMobile ? '' : 'Trạm'">
          <el-select 
            v-model="filterForm.station" 
            placeholder="Tìm trạm..." 
            class="filter-select station-select"
            filterable 
            remote
            :remote-method="remoteFetchStations"
            :loading="stationsLoading"
            clearable
            @change="handleStationChange"
            @clear="handleStationClear"
          >
            <el-option 
              v-for="item in stationOptions" 
              :key="item.id" 
              :label="item.station_name" 
              :value="item.id" 
            />
          </el-select>
        </el-form-item>

        <el-form-item class="fi-bay" :label="isMobile ? '' : 'Trụ'">
          <el-select
            v-model="filterForm.bayCode"
            placeholder="Chọn trụ"
            class="filter-select bay-select"
            filterable
            clearable
            :disabled="!filterForm.station"
            @change="handleFilter"
            @clear="handleFilter"
          >
            <el-option
              v-for="item in bayOptions"
              :key="item.id"
              :label="item.bay_code"
              :value="item.bay_code"
            />
          </el-select>
        </el-form-item>

        <el-form-item class="fi-time" :label="isMobile ? '' : 'Khoảng thời gian'">
          <el-select 
            v-model="filterForm.timeRange" 
            placeholder="Chọn nhanh" 
            class="filter-select timerange-select"
            @change="handleTimeRangeChange"
          >
            <el-option label="Hôm nay" :value="1" />
            <el-option label="7 ngày qua" :value="7" />
            <el-option label="30 ngày qua" :value="30" />
            <el-option label="Tùy chỉnh" :value="0" /> 
          </el-select>
        </el-form-item>

        <el-form-item class="fi-date" :label="isMobile ? '' : 'Chọn ngày cụ thể'">
          <el-date-picker
            v-model="filterForm.dateRange"
            class="date-range-picker"
            type="daterange"
            range-separator="->"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>

        <el-form-item class="fi-action">
          <el-button type="primary" @click="handleFilter">Tìm kiếm</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="table-main">
      <!-- Desktop table -->
      <el-table 
        v-if="!isMobile" 
        ref="tableRef"
        :data="tableData" 
        stripe 
        style="width: 100%" 
        height="100%"
        v-loading="loading"
      >
        <el-table-column prop="id" label="ID" width="70" align="right" header-align="right" />
        
        <el-table-column label="Thời gian" width="180">
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <el-icon><Timer /></el-icon> <span style="margin-left: 8px">{{ formatTime(scope.row.created_at) }}</span>
            </div>
          </template>
        </el-table-column>
  
        <el-table-column label="Vị trí" min-width="180">
          <template #default="scope">
            <div class="station-display">
              <el-tag type="info" size="small">{{ scope.row.station_name }}</el-tag>
              <span class="bay-display">{{ scope.row.bay_code }}</span>
            </div>
            <div v-if="scope.row.mqtt_topic" class="topic-display">{{ scope.row.mqtt_topic }}</div>
          </template>
        </el-table-column>
  
        <el-table-column label="Thông số">
          <template #default="scope">
            <div>Vận hành: <b>{{ scope.row.op }}s</b></div>
            <div :style="{ fontSize: '12px', color: '#909399' }">
              Bọt tuyết: {{ scope.row.foam }}s
            </div>
          </template>
        </el-table-column>
  
        <el-table-column label="Số tiền" align="right" header-align="right">
          <template #default="scope">
            <span style="color: #f56c6c; font-weight: bold">
              {{ formatMoney(scope.row.amount) }}
            </span>
          </template>
        </el-table-column>
  
        <el-table-column label="Trạng thái" width="120">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">
              {{ scope.row.status ? scope.row.status.toUpperCase() : 'N/A' }}
            </el-tag>
          </template>
        </el-table-column>
  
        <el-table-column label="Thao tác" width="80" align="center" v-if="isAdmin">
          <template #default="scope">
            <el-button type="danger" size="small" circle @click="handleDelete(scope.row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
  
      <!-- Mobile card list -->
      <div v-else class="mobile-card-list" v-loading="loading">
        <div v-for="(row, idx) in tableData" :key="row.id" class="mobile-card">
          <div class="mc-header">
            <span class="mc-stt">{{ (currentPage - 1) * pageSize + idx + 1 }}</span>
            <div class="mc-title">
              <div class="mc-station-row">
                <el-tag type="info" size="small">{{ row.station_name }}</el-tag>
                <span class="mc-name">{{ row.bay_code }}</span>
              </div>
              <span class="mc-sub" v-if="row.mqtt_topic">{{ row.mqtt_topic }}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              <el-tag :type="statusType(row.status)" size="small">
                {{ row.status ? row.status.toUpperCase() : 'N/A' }}
              </el-tag>
              <el-button v-if="isAdmin" type="danger" size="small" circle @click.stop="handleDelete(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="mc-amount">{{ formatMoney(row.amount) }}</div>
          <div class="mc-stats">
            <div class="mc-stat">
              <span class="mcs-label">Thời gian</span>
              <span class="mcs-val">{{ formatTime(row.created_at) }}</span>
            </div>
            <div class="mc-stat">
              <span class="mcs-label">Vận hành</span>
              <span class="mcs-val">{{ row.op }}s</span>
            </div>
            <div class="mc-stat">
              <span class="mcs-label">Bọt tuyết</span>
              <span class="mcs-val">{{ row.foam }}s</span>
            </div>
          </div>
        </div>
        <div v-if="!loading && tableData.length === 0" class="mc-empty">Không có dữ liệu</div>
      </div>
    </div>

    <div class="pagination-container" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-if="!isMobile"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchData"
        @size-change="handleFilter"
        background
      />
      <el-pagination
        v-else
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        :pager-count="5"
        size="small"
        @current-change="fetchData"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { Timer, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { transactionApi } from '@/api/transaction'
import { stationApi } from '@/api/station'
import { bayApi } from '@/api/bay'
import { authStore } from '@/stores/auth'
import { useMetadataStore } from '@/stores/metadata'

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))

const isAdmin = computed(() => authStore.state.user?.role === 'sa');

const loading = ref(false)
const stationsLoading = ref(false)
const tableRef = ref(null)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const stationOptions = ref([]) 
const bayOptions = ref([])
const filterForm = reactive({
  station: '',
  bayCode: '',
  timeRange: 30, // Mặc định 1 ngày
  dateRange: [], // Lưu [from, to]
  status: ''
})


const metadataStore = useMetadataStore();

let stationSearchTimer = null;
const remoteFetchStations = (query) => {
  if (stationSearchTimer) clearTimeout(stationSearchTimer);
  stationSearchTimer = setTimeout(() => {
    fetchStations(query);
  }, 300);
}

const fetchStations = async (keyword = '') => {
  try {    
    stationsLoading.value = true;
    const res = await stationApi.getFilterStations({ keyword, limit: 20 });
    stationOptions.value = res.data.data || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trạm:', error)
  } finally {
    stationsLoading.value = false;
  }
}

const fetchBays = async (stationId) => {
  if (!stationId) {
    bayOptions.value = []
    return
  }

  try {
    const response = await bayApi.getBays(stationId)
    bayOptions.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trụ:', error)
    bayOptions.value = []
    ElMessage.error('Không thể tải danh sách trụ')
  }
}

// Formatters
const formatTime = (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
const formatMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

const statusType = (status) => {
  if (status === 'processed') return 'success'
  if (status === 'pending') return 'warning'
  return 'danger'
}

const handleTimeRangeChange = (val) => {
  if (val === 0 || val === null) return;

  const end = dayjs().format('YYYY-MM-DD');
  const start = dayjs().subtract(val - 1, 'day').format('YYYY-MM-DD');
  
  // Tự động điền vào ô From -> To
  filterForm.dateRange = [start, end];
  
  // Gọi API filter
  handleFilter();
}

const handleDateRangeChange = (val) => {
  if (val) {
    // Chuyển select Timerange sang trạng thái trung gian (null/không xác định)
    filterForm.timeRange = 0;
  }
  
  // Gọi API filter
  handleFilter();
}

const handleStationChange = async (stationId) => {
  filterForm.bayCode = ''
  if (stationId) {
    await fetchBays(stationId)
  } else {
    bayOptions.value = []
  }
  handleFilter()
}

const handleStationClear = () => {
  filterForm.station = ''
  filterForm.bayCode = ''
  bayOptions.value = []
  handleFilter()
}

const handleFilter = () => {
  fetchData({ resetPage: true });
}

// Hàm Reset bộ lọc
const resetFilter = () => {
  filterForm.station = ''
  filterForm.bayCode = ''
  bayOptions.value = []
  filterForm.timeRange = 30 // Reset về "30 ngày qua"
  filterForm.status = ''
  fetchData({ resetPage: true })
}

const fetchData = async ({ resetPage = false } = {}) => {
  if (resetPage) currentPage.value = 1
  
  // 1. Kiểm tra logic điều kiện trước khi thực hiện bất kỳ thao tác nào
  const hasStation = !!filterForm.station;
  const isLongTimeRange = Number(filterForm.timeRange) > 90;

  // Logic: Nếu chưa chọn trạm VÀ timeRange > 1 => Không làm gì (chờ chọn trạm)
  if (!hasStation && isLongTimeRange) {
    return; 
  }

  loading.value = true
  
  try {
    // 2. Logic tính toán ngày
    let startDate = null
    let endDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

    if (filterForm.timeRange > 0) {
      startDate = dayjs()
        .subtract(filterForm.timeRange - 1, 'day')
        .startOf('day')
        .format('YYYY-MM-DD HH:mm:ss')
    } else if (filterForm.dateRange?.length === 2) {
      startDate = dayjs(filterForm.dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss')
      endDate = dayjs(filterForm.dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss')
    }

    // 3. Xây dựng params
    const shouldIncludeTotal = resetPage || total.value === 0
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      station_id: filterForm.station || undefined,
      bay_code: filterForm.bayCode || undefined,
      start_date: startDate || undefined,
      end_date: endDate,
      status: filterForm.status || undefined,
      include_total: shouldIncludeTotal
    }

    const response = await transactionApi.gettransactions(params);
    
    if (response && response.data) {
      const result = response.data
      tableData.value = result.data || []
      if (result.total !== undefined) {
        total.value = Number(result.total) || 0
      }
      // Tự động cuộn bảng về đầu dòng
      if (tableRef.value) {
        tableRef.value.setScrollTop(0)
      }
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn xóa phiên rửa tại trụ ${row.bay_code} không? Dữ liệu không thể khôi phục.`,
    'Cảnh báo',
    {
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await transactionApi.deleteTransaction(row.id)
      ElMessage.success('Xóa phiên rửa thành công')
      fetchData()
    } catch (error) {
      console.error('Lỗi khi xóa phiên rửa:', error)
      ElMessage.error(error.response?.data?.message || 'Không thể xóa phiên rửa')
    }
  }).catch(() => {
    // Huỷ xoá
  })
}

// Gọi lần đầu khi component mount
onMounted(() => {
  fetchStations()
  fetchData();
});

watch([currentPage], () => {
  fetchData()
})

watch([pageSize], () => {
  handleFilter()
})

</script>

<style scoped>
.wash-session-container {
  padding: 12px 16px;
  background: var(--bg-body);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--text-main);
  transition: background 0.2s ease;
  overflow: hidden;
  box-sizing: border-box;
}

.filter-card {
  border-radius: 8px;
  flex-shrink: 0;
}
:deep(.filter-card .el-card__body) { padding: 10px 16px; }

.pagination-container {
  margin-top: 8px;
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

/* Desktop/Tablet: avoid over-compressed filter fields */
:deep(.session-filter-form) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: flex-end;
}

:deep(.session-filter-form .el-form-item) {
  margin: 0;
}

:deep(.session-filter-form .station-select),
:deep(.session-filter-form .bay-select),
:deep(.session-filter-form .timerange-select) {
  width: 180px;
}

:deep(.session-filter-form .date-range-picker) {
  width: 280px;
}

/* ── Mobile ─────────────────────────────────────── */
@media (max-width: 768px) {
  .wash-session-container {
    padding: 8px;
  }

  .filter-card {
    margin-bottom: 8px;
  }

  :deep(.session-filter-form) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }

  :deep(.session-filter-form .el-form-item) {
    margin: 0 !important;
    min-width: 0;
  }

  :deep(.session-filter-form .fi-station),
  :deep(.session-filter-form .fi-bay) {
    grid-column: span 1;
    order: 1;
  }

  :deep(.session-filter-form .fi-date) {
    grid-column: 1 / -1;
    order: 2;
  }

  :deep(.session-filter-form .fi-time) {
    grid-column: 1 / -1;
    order: 3;
  }

  :deep(.session-filter-form .fi-action) {
    grid-column: 1 / -1;
    order: 4;
  }

  :deep(.session-filter-form .fi-action .el-form-item__content) {
    justify-content: stretch;
  }

  :deep(.session-filter-form .fi-action .el-button) {
    width: 100%;
    min-height: 36px;
  }

  :deep(.session-filter-form .filter-select) {
    width: 100%;
  }

  :deep(.session-filter-form .el-date-editor) {
    width: 100%;
  }

  :deep(.session-filter-form .el-range-input) {
    min-width: 0;
  }

  :deep(.session-filter-form .el-range-separator) {
    width: 18px;
    color: var(--text-muted);
    font-weight: 600;
  }

  :deep(.el-form-item__label) {
    display: none !important;
  }

  .pagination-container {
    justify-content: center;
    margin-top: 8px;
  }
}

/* ── Mobile card list ────────────────────────────── */
.mobile-card-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid transparent;
}

.mc-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.mc-stt {
  font-size: 11px;
  color: var(--text-sub, #9ca3af);
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
  color: var(--text-main, #e5e7eb);
}

.mc-sub {
  font-size: 11px;
  color: var(--text-sub, #9ca3af);
}

.mc-amount {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
  margin-bottom: 8px;
}

.mc-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.mc-stat {
  display: flex;
  flex-direction: column;
}

.mcs-label {
  font-size: 10px;
  color: var(--text-sub, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.mcs-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #e5e7eb);
}

.mc-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--text-sub, #9ca3af);
  font-size: 14px;
}

.station-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bay-display {
  font-weight: 700;
  color: var(--report-accent, #53a8ff);
}

.topic-display {
  font-size: 11px;
  color: var(--text-sub, #9ca3af);
  margin-top: 2px;
}

.mc-station-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

/* ── Landscape ──────────────────────────────────── */
@media (min-width: 769px) and (max-width: 900px) and (orientation: landscape) {
  .filter-card {
    margin-bottom: 4px;
  }
}
</style>