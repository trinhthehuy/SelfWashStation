<template>
  <div class="wash-session-container">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="false" :model="filterForm" class="session-filter-form">
        <el-form-item class="fi-station" :label="isMobile ? '' : 'Trạm'">
          <el-select 
            v-model="filterForm.station" 
            placeholder="Chọn trạm" 
            class="filter-select station-select"
            filterable 
            clearable
            @change="handleStationChange"
            @clear="handleStationChange"
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

    <!-- Desktop table -->
    <el-table v-if="!isMobile" :data="tableData" stripe style="width: 100%" v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" align="right" header-align="right" />
      
      <el-table-column label="Thời gian" width="180">
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <el-icon><Timer /></el-icon> <span style="margin-left: 8px">{{ formatTime(scope.row.created_at) }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Vị trí">
        <template #default="scope">
          <el-tag effect="plain">{{ scope.row.mqtt_topic }}</el-tag>
          <span style="margin-left: 8px; font-weight: bold">
            {{ scope.row.bay_code }}
          </span>
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
            <span class="mc-name">{{ row.bay_code }}</span>
            <span class="mc-sub">{{ row.mqtt_topic }}</span>
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

    <div class="pagination-container" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-if="!isMobile"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="handleFilter"
      />
      <el-pagination
        v-else
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        :pager-count="5"
        size="small"
        @current-change="handleFilter"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { watch } from 'vue'
import dayjs from 'dayjs'
import { Timer, Delete } from '@element-plus/icons-vue'

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))
import { ElMessage, ElMessageBox } from 'element-plus';
import { transactionApi } from '@/api/transaction';
import { stationApi } from '@/api/station';
import { bayApi } from '@/api/bay';
import { authStore } from '@/stores/auth';

const isAdmin = computed(() => authStore.state.user?.role === 'sa');

const loading = ref(false)
const tableData = ref([]); // Biến chứa dữ liệu phiên rửa để hiển thị trong Table
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(100)
const stationOptions = ref([]) // Biến chứa danh sách trạm để hiển thị trong Dropdown (Select)
const bayOptions = ref([])
const filterForm = reactive({
  station: '',
  bayCode: '',
  timeRange: 30, // Mặc định 1 ngày
  dateRange: [], // Lưu [from, to]
  status: ''
})

// Hàm gọi API lấy danh sách trạm
const fetchStations = async () => {
  try {    
    const response = await stationApi.getStations();
    
    if (response.data) {
      stationOptions.value = response.data
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trạm:', error)
    ElMessage.error('Không thể tải danh sách trạm')
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
  await fetchBays(stationId)
  handleFilter()
}

const handleFilter = () => {
  loading.value = true
  const params = {
    page: currentPage.value,
    station_id: filterForm.station,
    bay_code: filterForm.bayCode,
    // Nếu có chọn ngày thì format về dạng YYYY-MM-DD
    start_date: filterForm.dateRange?.[0] ? dayjs(filterForm.dateRange[0]).format('YYYY-MM-DD') : null,
    end_date: filterForm.dateRange?.[1] ? dayjs(filterForm.dateRange[1]).format('YYYY-MM-DD') : null,
    status: filterForm.status
  }
  fetchData(params);
}

// Hàm Reset bộ lọc
const resetFilter = () => {
  filterForm.station = ''
  filterForm.bayCode = ''
  bayOptions.value = []
  filterForm.timeRange = 30 // Reset về "30 ngày qua"
  filterForm.status = ''
  currentPage.value = 1
  fetchData()
}

const fetchData = async () => {
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
      // Giữ nguyên logic trừ ngày của bạn
      startDate = dayjs()
        .subtract(filterForm.timeRange - 1, 'day')
        .startOf('day')
        .format('YYYY-MM-DD HH:mm:ss')
    }

    // 3. Xây dựng params
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      // Nếu không có station_id, backend sẽ hiểu là lấy toàn bộ (khi timeRange = 1)
      station_id: filterForm.station || undefined,
      bay_code: filterForm.bayCode || undefined,
      start_date: startDate || undefined,
      end_date: endDate,
      status: filterForm.status || undefined
    }

    const response = await transactionApi.gettransactions(params);
    
    if (response && response.data) {
      tableData.value = response.data.data
      total.value = Number(response.data.total) || 0
    }
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error)
    // Có thể reset tableData về rỗng nếu gọi lỗi
    tableData.value = []
    total.value = 0
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
  padding: 20px;
  background: var(--bg-body);
  min-height: 100%;
  color: var(--text-main);
  transition: background 0.2s ease;
}
.filter-card {
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
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

/* ── Landscape ──────────────────────────────────── */
@media (min-width: 769px) and (max-width: 900px) and (orientation: landscape) {
  .filter-card {
    margin-bottom: 4px;
  }
}
</style>