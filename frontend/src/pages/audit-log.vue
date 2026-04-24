<template>
  <div class="page-container">
    <!-- Header -->
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div>
          <h2 class="page-title">Nhật ký hệ thống</h2>
          <p class="page-desc">Lịch sử các thao tác tạo, sửa, xóa và đăng nhập trong hệ thống.</p>
        </div>
      </div>
    </el-card>

    <!-- Filters -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-grid-container">
        <div class="filter-date-col">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="–"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
            class="w-full"
            @change="fetchLogs({ resetPage: true })"
          />
        </div>
        <div class="filter-actions-col">
          <div class="filter-actions-group">
            <el-select v-model="filterAction" placeholder="Chọn hành động" clearable class="filter-select" size="small" style="width: 100%" @change="fetchLogs({ resetPage: true })">
              <el-option-group label="Xác thực">
                <el-option label="Đăng nhập thành công" value="LOGIN_SUCCESS" />
                <el-option label="Đăng nhập thất bại" value="LOGIN_FAILED" />
              </el-option-group>
              <el-option-group label="Người dùng">
                <el-option label="Tạo tài khoản" value="USER_CREATE" />
                <el-option label="Sửa tài khoản" value="USER_UPDATE" />
                <el-option label="Xóa tài khoản" value="USER_DELETE" />
                <el-option label="Reset mật khẩu" value="USER_RESET_PASSWORD" />
                <el-option label="Cập nhật phạm vi" value="USER_SCOPE_UPDATE" />
              </el-option-group>
              <el-option-group label="Đại lý">
                <el-option label="Tạo đại lý" value="AGENCY_CREATE" />
                <el-option label="Sửa đại lý" value="AGENCY_UPDATE" />
                <el-option label="Xóa đại lý" value="AGENCY_DELETE" />
              </el-option-group>
              <el-option-group label="Trạm">
                <el-option label="Tạo trạm" value="STATION_CREATE" />
                <el-option label="Sửa trạm" value="STATION_UPDATE" />
                <el-option label="Xóa trạm" value="STATION_DELETE" />
              </el-option-group>
              <el-option-group label="Chiến lược">
                <el-option label="Tạo chiến lược" value="STRATEGY_CREATE" />
                <el-option label="Sửa chiến lược" value="STRATEGY_UPDATE" />
                <el-option label="Xóa chiến lược" value="STRATEGY_DELETE" />
              </el-option-group>
              <el-option-group label="Khác">
                <el-option label="Xóa phiên rửa" value="TRANSACTION_DELETE" />
              </el-option-group>
            </el-select>
            <el-select v-model="filterEntityType" placeholder="Chọn đối tượng" clearable class="filter-select" size="small" style="width: 100%" @change="fetchLogs({ resetPage: true })">
              <el-option label="Tài khoản hệ thống" value="system_user" />
              <el-option label="Đại lý" value="agency" />
              <el-option label="Trạm" value="station" />
              <el-option label="Chiến lược" value="strategy" />
              <el-option label="Phiên rửa" value="transaction" />
            </el-select>
            <el-button @click="resetFilters" plain class="reset-btn" size="small" :icon="Refresh">
              <span v-if="!isMobile">Xóa bộ lọc</span>
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <div class="table-main">
        <!-- Desktop -->
        <el-table
          v-if="!isMobile"
          ref="tableRef"
          v-loading="loading"
          :data="logs"
          stripe
          style="width: 100%"
          height="100%"
          :empty-text="'Không có dữ liệu nhật ký'"
        >
          <el-table-column label="Thời gian" width="165" fixed>
            <template #default="{ row }">
              <span class="mono">{{ formatDate(row.created_at) }}</span>
            </template>
          </el-table-column>
  
          <el-table-column label="Tài khoản" width="200">
            <template #default="{ row }">
              <div class="user-cell">
                <span class="user-email">{{ row.email }}</span>
                <el-tag :type="roleTagType(row.role)" size="small" effect="plain">{{ roleLabel(row.role) }}</el-tag>
              </div>
            </template>
          </el-table-column>
  
          <el-table-column label="Hành động" width="190">
            <template #default="{ row }">
              <el-tag :type="actionTagType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
            </template>
          </el-table-column>
  
          <el-table-column label="Đối tượng" min-width="180">
            <template #default="{ row }">
              <span v-if="row.entity_type" class="entity-cell">
                <span class="entity-type">{{ entityTypeLabel(row.entity_type) }}</span>
                <span v-if="row.entity_name" class="entity-name"> — {{ row.entity_name }}</span>
                <span v-if="row.entity_id" class="entity-id">#{{ row.entity_id }}</span>
              </span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
  
          <el-table-column label="Chi tiết" min-width="200">
            <template #default="{ row }">
              <span v-if="getDetailText(row)" class="details-text">{{ getDetailText(row) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
  
          <el-table-column label="IP" width="130">
            <template #default="{ row }">
              <span class="mono text-muted">{{ row.ip_address || '—' }}</span>
            </template>
          </el-table-column>
        </el-table>
  
        <!-- Mobile card list -->
        <div v-else class="mobile-card-list" v-loading="loading">
          <div v-for="(row, idx) in logs" :key="idx" class="mobile-card">
            <div class="mc-header">
              <div class="mc-title">
                <span class="mc-name">{{ row.email }}</span>
                <span class="mc-sub mono">{{ formatDate(row.created_at) }}</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                <el-tag :type="roleTagType(row.role)" size="small" effect="plain">{{ roleLabel(row.role) }}</el-tag>
                <el-tag :type="actionTagType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
              </div>
            </div>
            <div v-if="row.entity_type" class="mc-entity">
              <span class="mcs-label">Đối tượng: </span>
              <span>{{ entityTypeLabel(row.entity_type) }}<template v-if="row.entity_name"> — {{ row.entity_name }}</template><template v-if="row.entity_id"> #{{ row.entity_id }}</template></span>
            </div>
            <div v-if="getDetailText(row)" class="mc-details">{{ getDetailText(row) }}</div>
            <div v-if="row.ip_address" class="mc-ip mono">IP: {{ row.ip_address }}</div>
          </div>
          <div v-if="!loading && logs.length === 0" class="mc-empty">Không có dữ liệu</div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-wrap">
        <el-pagination
          v-if="!isMobile"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[25, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchLogs({ resetPage: true })"
          @current-change="fetchLogs()"
        />
        <el-pagination
          v-else
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          :pager-count="5"
          size="small"
          @current-change="fetchLogs()"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { auditApi } from '@/api/audit.js'
import dayjs from 'dayjs'

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))

const loading = ref(false)
const tableRef = ref(null)
const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const dateRange = ref(null)
const filterAction = ref('')
const filterEntityType = ref('')

const fetchLogs = async ({ resetPage = false } = {}) => {
  if (resetPage) page.value = 1
  loading.value = true
  try {
    const shouldIncludeTotal = resetPage || total.value === 0
    const params = {
      page: page.value,
      limit: pageSize.value,
      include_total: shouldIncludeTotal
    }
    if (filterAction.value) params.action = filterAction.value
    if (filterEntityType.value) params.entity_type = filterEntityType.value
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await auditApi.getLogs(params)
    const result = res.data
    logs.value = result.data || []
    if (result.total !== undefined) {
      total.value = result.total || 0
    }
    // Tự động cuộn bảng về đầu dòng
    if (tableRef.value) {
      tableRef.value.setScrollTop(0)
    }
  } catch (e) {
    ElMessage.error('Không thể tải nhật ký')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  dateRange.value = null
  filterAction.value = ''
  filterEntityType.value = ''
  fetchLogs({ resetPage: true })
}

onMounted(fetchLogs)

// ---- Helpers ----

const formatDate = (val) => {
  if (!val) return '—'
  return dayjs(val).format('DD/MM/YYYY HH:mm:ss')
}

const formatDetails = (details) => {
  if (!details) return ''
  try {
    const obj = typeof details === 'string' ? JSON.parse(details) : details
    if (!obj || typeof obj !== 'object') return String(details)
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${detailKeyLabel(k)}: ${formatDetailValue(v)}`)
      .join(' | ')
  } catch {
    return String(details)
  }
}

const detailKeyLabel = (key) => ({
  message: 'Thông tin',
  reason: 'Lý do',
  role: 'Vai trò',
  agencyId: 'Đại lý',
  fullName: 'Họ tên',
  isActive: 'Kích hoạt',
  provinceIds: 'Tỉnh',
  stationIds: 'Trạm',
  entityType: 'Loại đối tượng',
  targetName: 'Tên đối tượng',
  targetId: 'Mã đối tượng',
}[key] || key)

const formatDetailValue = (value) => {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Rỗng'
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không'
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value)
  }

  if (value === null || value === undefined || value === '') {
    return '—'
  }

  return String(value)
}

const fallbackDetails = (row) => {
  const parts = []

  if (row.entity_name) {
    parts.push(`Đối tượng: ${row.entity_name}`)
  }

  if (row.entity_id) {
    parts.push(`Mã: #${row.entity_id}`)
  }

  if (row.entity_type) {
    parts.push(`Loại: ${entityTypeLabel(row.entity_type)}`)
  }

  if (parts.length > 0) {
    return parts.join(' | ')
  }

  return actionLabel(row.action)
}

const getDetailText = (row) => {
  const formatted = formatDetails(row.details)
  return formatted || fallbackDetails(row)
}

const roleLabel = (role) => ({ sa: 'SA', engineer: 'Engineer', agency: 'Đại lý' }[role] || role)
const roleTagType = (role) => ({ sa: 'danger', engineer: 'warning', agency: 'info' }[role] || 'info')

const ACTION_LABELS = {
  LOGIN_SUCCESS: 'Đăng nhập',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  USER_CREATE: 'Tạo tài khoản',
  USER_UPDATE: 'Sửa tài khoản',
  USER_DELETE: 'Xóa tài khoản',
  USER_RESET_PASSWORD: 'Reset mật khẩu',
  USER_SCOPE_UPDATE: 'Cập nhật phạm vi',
  AGENCY_CREATE: 'Tạo đại lý',
  AGENCY_UPDATE: 'Sửa đại lý',
  AGENCY_DELETE: 'Xóa đại lý',
  STATION_CREATE: 'Tạo trạm',
  STATION_UPDATE: 'Sửa trạm',
  STATION_DELETE: 'Xóa trạm',
  STRATEGY_CREATE: 'Tạo chiến lược',
  STRATEGY_UPDATE: 'Sửa chiến lược',
  STRATEGY_DELETE: 'Xóa chiến lược',
  BAY_CREATE: 'Tạo trụ',
  BAY_UPDATE: 'Sửa trụ',
  BAY_DELETE: 'Xóa trụ',
  TRANSACTION_DELETE: 'Xóa phiên rửa',
}
const actionLabel = (action) => ACTION_LABELS[action] || action

const actionTagType = (action) => {
  if (action.endsWith('_DELETE') || action === 'LOGIN_FAILED') return 'danger'
  if (action.endsWith('_CREATE')) return 'success'
  if (action.endsWith('_UPDATE') || action === 'USER_RESET_PASSWORD') return 'warning'
  if (action === 'LOGIN_SUCCESS') return 'primary'
  return 'info'
}

const ENTITY_LABELS = {
  system_user: 'Tài khoản',
  agency: 'Đại lý',
  station: 'Trạm',
  strategy: 'Chiến lược',
  bay: 'Trụ rửa',
  transaction: 'Phiên rửa',
}
const entityTypeLabel = (type) => ENTITY_LABELS[type] || type
</script>

<style scoped>
.page-container {
  --report-border: rgba(144, 169, 204, 0.24);
  --report-card-radius: 10px;
  padding: 12px 14px;
  background-color: var(--bg-body);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

.header-card {
  border: 1px solid var(--report-border);
  border-radius: var(--report-card-radius);
  flex-shrink: 0;
}
:deep(.header-card .el-card__body) { padding: 8px 16px; }

.section-kicker {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--el-text-color-secondary);
  margin: 0 0 4px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.filter-card {
  border: 1px solid var(--report-border);
  border-radius: var(--report-card-radius);
  flex-shrink: 0;
}
:deep(.filter-card .el-card__body) { padding: 10px 16px; }

.table-card {
  border: 1px solid var(--report-border);
  border-radius: var(--report-card-radius);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.table-card .el-card__body) { 
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}

.table-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.filter-grid-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-date-col {
  width: 250px;
  flex-shrink: 0;
}

.filter-actions-col {
  flex: 1;
}

.filter-actions-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  flex: 1;
}

.reset-btn {
  flex-shrink: 0;
}

.w-full {
  width: 100%;
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-email {
  font-weight: 600;
  font-size: 13px;
}

.entity-cell {
  font-size: 13px;
}

.entity-type {
  font-weight: 500;
}

.entity-name {
  color: var(--el-text-color-regular);
}

.entity-id {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  margin-left: 4px;
}

.details-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}

.pagination-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ── Mobile card list ────────────────────────────── */
.mobile-card-list { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
  overflow-y: auto; 
}
.mobile-card {
  background: var(--bg-card);
  border-radius: var(--report-card-radius);
  padding: 10px 12px;
  border: 1px solid var(--report-border);
  transition: border-color 0.2s;
}
.mobile-card:active {
  border-color: var(--el-color-primary);
}
.mc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
.mc-title { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden; }
.mc-name { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); }
.mc-sub { font-size: 11px; color: var(--el-text-color-secondary); }
.mc-entity { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.mc-details { font-size: 11px; color: var(--el-text-color-placeholder); word-break: break-word; margin-bottom: 4px; }
.mc-ip { font-size: 11px; color: var(--el-text-color-placeholder); }
.mcs-label { font-weight: 500; }
.mc-empty { text-align: center; padding: 40px 0; color: var(--el-text-color-placeholder); font-size: 14px; }

@media (max-width: 768px) {
  .page-container { padding: 8px 4px; gap: 8px; }
  :deep(.filter-card .el-card__body) { padding: 8px 4px !important; }
  .filter-grid-container {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .filter-date-col {
    width: 100%;
  }
  .filter-actions-col {
    width: 100%;
  }
  .filter-actions-group {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 4px;
    width: 100%;
    align-items: center;
  }
  .filter-select,
  .filter-select :deep(.el-select),
  .filter-select :deep(.el-select__wrapper) {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  .reset-btn {
    width: auto;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .reset-btn :deep(span) {
    display: none;
  }
  .reset-btn :deep(i) {
    margin: 0 !important;
  }
  .pagination-wrap { justify-content: center; }
}
</style>
