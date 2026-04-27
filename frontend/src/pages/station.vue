<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Quản lý trạm rửa xe</h2>
        </div>
        <div class="header-actions">
          <el-button v-if="canManageStation" type="primary" :icon="Plus" @click="handleAddNew" class="mobile-add-btn">
            Thêm mới
          </el-button>
        </div>
      </div>

      <div class="action-row" v-if="isMobile" :class="{ 'is-mobile-row': isMobile }">
        <div class="strategy-actions">
          <template v-if="isSelectionMode">
            <span class="selection-info" v-if="!isMobile">
              <el-tag type="warning" size="small" style="margin-right:6px">{{ selectionAgencyName }}</el-tag>
              <template v-if="selectedStations.length > 0">
                Đã chọn <strong>{{ selectedStations.length }}</strong> trạm
              </template>
              <template v-else>Chọn trạm cần áp dụng</template>
            </span>
            <el-button
              type="success"
              plain
              :icon="Finished"
              @click="handleSelectAll"
              size="small"
            >
              {{ isMobile ? 'Tất cả' : 'Chọn tất cả' }}
            </el-button>
            <el-button
              type="primary"
              :icon="MagicStick"
              :disabled="selectedStations.length === 0"
              @click="openAssignStrategyDialog"
              size="small"
              class="mobile-strategy-confirm"
            >
              {{ isMobile ? 'Áp dụng CL' : 'Chọn chiến lược' }}
            </el-button>
            <el-button @click="exitSelectionMode" size="small">Hủy</el-button>
          </template>
          <template v-else>
            <el-button 
              type="primary" 
              plain 
              :icon="MagicStick" 
              @click="openPickAgencyDialog" 
              :size="isMobile ? 'default' : 'small'"
              class="strategy-toggle-btn"
            >
              Thay đổi chiến lược
            </el-button>
          </template>
        </div>

        <div class="filter-toggle-wrap" v-if="isMobile">
          <el-button 
            type="primary" 
            plain 
            size="small"
            :icon="Filter" 
            @click="showMobileFilter = !showMobileFilter"
            class="filter-toggle-btn-inline"
          >
            {{ showMobileFilter ? 'Đóng' : 'Bộ lọc' }} 
            <span v-if="activeFilterCount > 0" class="filter-count-mini">{{ activeFilterCount }}</span>
          </el-button>
        </div>
      </div>

      <div class="filter-section" v-if="!isMobile || showMobileFilter">
        <transition name="expand">
          <div class="filter-container-desktop" v-if="!isMobile || showMobileFilter">
            <el-form 
              :inline="true" 
              :model="filterForm" 
              class="demo-form-inline filter-layout"
              :class="{ 'is-mobile-filters': isMobile }"
            >
              <el-form-item :label="isMobile ? '' : 'Tỉnh'" :class="{ 'no-label': isMobile }">
                <el-select
                  v-model="filterForm.province_id"
                  filterable remote clearable
                  :loading="selectLoading.province"
                  @change="handleProvinceChange"
                  @clear="handleProvinceClear"
                  :placeholder="isMobile ? 'Chọn tỉnh ...' : 'Chọn tỉnh'"
                  class="filter-select"
                >
                  <el-option v-for="item in options.provinces" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
              </el-form-item>

              <el-form-item :label="isMobile ? '' : 'Xã/Phường'" :class="{ 'no-label': isMobile }">
                <el-select
                  v-model="filterForm.ward_id"
                  filterable remote clearable
                  :remote-method="remoteFetchWards"
                  :loading="selectLoading.ward"
                  @change="handleWardChange"
                  @clear="handleWardClear"
                  :placeholder="isMobile ? 'Chọn xã ...' : 'Chọn xã'"
                  class="filter-select"
                >
                  <el-option v-for="item in options.wards" :key="item.id" :label="item.ward_name" :value="item.id" />
                </el-select>
              </el-form-item>

              <el-form-item :label="isMobile ? '' : 'Đại lý'" :class="{ 'no-label': isMobile }">
                <el-select
                  v-model="filterForm.agency_id"
                  filterable remote clearable
                  :remote-method="remoteFetchAgencies"
                  :loading="selectLoading.agency"
                  @change="handleAgencyChange"
                  @clear="handleAgencyClear"
                  :placeholder="isMobile ? 'Chọn đại lý ...' : 'Chọn đại lý'"
                  class="filter-select"
                >
                  <el-option v-for="item in options.agencies" :key="item.id" :label="item.agency_name" :value="item.id">
                    <div class="agency-dual">
                      <div class="agency-dual-name">{{ item.agency_name }}</div>
                      <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item :label="isMobile ? '' : 'Mã trạm'" :class="{ 'no-label': isMobile }">
                <el-select
                  v-model="filterForm.station_id"
                  filterable remote clearable
                  :remote-method="remoteFetchStations"
                  :loading="selectLoading.station"
                  @change="handleStationChange"
                  @clear="handleStationClear"
                  :placeholder="isMobile ? 'Chọn trạm ...' : 'Chọn trạm'"
                  class="filter-select"
                >
                  <el-option v-for="item in options.stations" :key="item.id" :label="item.station_name" :value="item.id" />
                </el-select>
              </el-form-item>
            </el-form>

            <!-- Strategy actions for desktop -->
            <div class="strategy-actions desktop-actions" v-if="!isMobile">
              <template v-if="isSelectionMode">
                <span class="selection-info">
                  <el-tag type="warning" size="small" style="margin-right:6px">{{ selectionAgencyName }}</el-tag>
                  <template v-if="selectedStations.length > 0">
                    Đã chọn <strong>{{ selectedStations.length }}</strong> trạm
                  </template>
                  <template v-else>Chọn trạm cần áp dụng</template>
                </span>
                <el-button
                  type="success"
                  plain
                  :icon="Finished"
                  @click="handleSelectAll"
                  size="small"
                >
                  Chọn tất cả
                </el-button>
                <el-button
                  type="primary"
                  :icon="MagicStick"
                  :disabled="selectedStations.length === 0"
                  @click="openAssignStrategyDialog"
                  size="small"
                >
                  Chọn chiến lược
                </el-button>
                <el-button @click="exitSelectionMode" size="small">Hủy</el-button>
              </template>
              <template v-else>
                <el-button 
                  type="primary" 
                  plain 
                  :icon="MagicStick" 
                  @click="openPickAgencyDialog" 
                  size="small"
                  class="strategy-toggle-btn"
                >
                  Thay đổi chiến lược
                </el-button>
              </template>
            </div>
          </div>
        </transition>
      </div>
    </el-card>

    <template v-if="!isMobile">
      <el-card shadow="never" class="table-card">
        <div class="table-main">
          <el-table
            ref="tableRef"
            :data="list" 
            :row-key="(row) => row.id"
            :class="{ 'selection-mode': isSelectionMode }"
            v-loading="loading" 
            style="width: 100%"
            height="100%"
            border
            stripe
            highlight-current-row
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="48" align="center" class-name="selection-column" :reserve-selection="true" />
            <el-table-column prop="id" label="ID" min-width="50" align="right" header-align="right" />
            
            <el-table-column label="Thông tin trạm" min-width="120">
              <template #default="{ row }">
                <div class="station-name">
                  <span class="station-name">{{ row.station_name }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="Khu vực" min-width="200">
              <template #default="{ row }">
                <div class="font-bold">{{ row.province_name }}</div>
                <div class="text-secondary">{{ row.ward_name }}</div>
                <div class="text-secondary">{{ row.address }}</div>
              </template>
            </el-table-column>

            <el-table-column prop="agency_name" label="Tên đại lý" min-width="100"  align="center"> </el-table-column>

            <el-table-column label="Trạng thái" min-width="100"  max-width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" effect="light">
                  {{ row.is_active ? 'Hoạt động' : 'Tạm dừng' }}
                </el-tag>
                <el-switch
                  v-model="row.is_active"
                  :active-value="1"
                  :inactive-value="0"
                  active-text=""
                  inactive-text=""
                  style="--el-switch-on-color: #67c23a; --el-switch-off-color: #f56c6c"
                  inline-prompt
                  @change="(val) => handleStationStatusChange(row, val)"
                />
              </template>
            </el-table-column>

            <el-table-column label="Tài khoản ngân hàng" min-width="150">
              <template #default="{ row }">
                <div class="bank-info">
                  <div class="font-bold">{{ row.bank_name }}</div>
                  <div>{{ row.account_number }}</div>
                  <div class="text-secondary">{{ row.account_name }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="Chiến lược vận hành"  min-width="200">
              <template #default="{ row }">
                <div class="strategy-info">
                  <el-tooltip content="Số tiền mỗi đơn vị">
                    <el-tag size="small" type="info" class="mt-1">💰 {{ formatAmount(row.amount_per_unit) }} VNĐ</el-tag>
                  </el-tooltip>
                  <el-tooltip content="Thời gian vận hành">
                    <el-tag size="small" type="info" class="mt-1">⏱️ {{ row.op_per_unit }}s</el-tag>
                  </el-tooltip>
                  <el-tooltip content="Định lượng hóa chất">
                    <el-tag size="small" type="info" class="mt-1">🧪 {{ row.foam_per_unit }}ml</el-tag>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="Ngày tạo" min-width="100" align="center">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>

            <el-table-column label="Thao tác" min-width="120" fixed="right" align="left">
              <template #default="{ row }">
                <div class="action-wrapper">
                  <el-button v-if="canManageStation" type="primary" link :icon="Edit" @click="handleEdit(row)">
                    Sửa
                  </el-button>
                  <el-button type="warning" link :icon="View" @click="handleViewBays(row)">
                    Chi tiết trụ
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next"
            @size-change="handlePageSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </template>

    <div v-else class="mobile-table-main" v-loading="loading">
      <div class="mobile-card-list">
        <div 
          v-for="row in list" 
          :key="row.id" 
          class="mobile-card"
          @click="toggleExpandedCard(row.id)"
        >
          <div class="mc-top-content">
            <div class="mc-header">
              <div class="mc-title">
                <div v-if="isSelectionMode" class="mc-select" @click.stop>
                  <el-checkbox
                    :model-value="isStationSelected(row.id)"
                    @change="(checked) => toggleMobileStationSelection(row, checked)"
                  />
                  <span class="mc-select-label">Chọn trạm</span>
                </div>
                <span class="mc-name">{{ row.station_name }}</span>
                <span class="mc-address">{{ row.address }}</span>
              </div>
              <div class="mc-right-meta">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small" effect="light">
                  {{ row.is_active ? 'Hoạt động' : 'Tạm dừng' }}
                </el-tag>
                <el-icon class="mc-expand-icon" :class="{ 'is-active': expandedCard === row.id }">
                  <ArrowDown />
                </el-icon>
              </div>
            </div>

            <div class="mc-strategy">
              <el-tag size="small" type="info">💰 {{ formatAmount(row.amount_per_unit) }} VNĐ</el-tag>
              <el-tag size="small" type="info">⏱️ {{ row.op_per_unit }}s</el-tag>
              <el-tag size="small" type="info">🧪 {{ row.foam_per_unit }}ml</el-tag>
            </div>
          </div>

          <!-- Phần chi tiết mở rộng -->
          <transition name="expand">
            <div class="mc-detail" v-if="expandedCard === row.id">
              <div class="mc-detail-row">
                <span>Tỉnh / Thành</span><span>{{ row.province_name }}</span>
              </div>
              <div class="mc-detail-row">
                <span>Quận / Huyện / Xã</span><span>{{ row.ward_name }}</span>
              </div>
              <div class="mc-detail-row">
                <span>Đại lý</span><span>{{ row.agency_name }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.bank_name">
                <span>Ngân hàng</span><span>{{ row.bank_name }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.account_number">
                <span>Số tài khoản</span><span>{{ row.account_number }}</span>
              </div>
              <div class="mc-detail-row" v-if="row.account_name">
                <span>Chủ tài khoản</span><span>{{ row.account_name }}</span>
              </div>
              <div class="mc-detail-row">
                <span>Ngày tạo</span><span>{{ formatDate(row.created_at) }}</span>
              </div>
            </div>
          </transition>

          <div class="mc-actions" @click.stop>
            <el-switch
              v-model="row.is_active"
              :active-value="1"
              :inactive-value="0"
              style="--el-switch-on-color: #67c23a; --el-switch-off-color: #f56c6c"
              inline-prompt
              active-text="ON"
              inactive-text="OFF"
              @change="(val) => handleStationStatusChange(row, val)"
            />
            <el-button v-if="canManageStation" type="primary" size="small" plain :icon="Edit" @click="handleEdit(row)">Sửa</el-button>
            <el-button type="warning" size="small" plain :icon="View" @click="handleViewBays(row)">Chi tiết trụ</el-button>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="mc-empty">Không có dữ liệu</div>
      </div>

      <div class="pagination-wrapper mobile-pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          layout="prev, pager, next"
          :pager-count="5"
          @current-change="handlePageChange"
          size="small"
        />
      </div>
    </div>
        <el-dialog
      v-model="bayModalVisible"
      :title="'Danh sách trụ - ' + currentStation?.station_name"
      width="600px"
    >
      <div style="margin-bottom: 15px; display: flex; justify-content: flex-end;">
        <el-button type="success" :icon="Plus" @click="handleAddBay">Thêm trụ mới</el-button>
      </div>

      <el-table :data="bays" border stripe>
        <el-table-column prop="bay_code" label="Mã trụ" align="center" />
        <el-table-column label="Trạng thái" align="center">
          <template #default="{ row }">
            <el-tag :type="row.bay_status == 1 ? 'success' : 'danger'" effect="light">
              {{ row.bay_status == 1 ? 'Hoạt động' : 'Tạm dừng' }}
            </el-tag>
            <el-switch
              v-model="row.bay_status"
              :active-value="1"
              :inactive-value="0"
              active-text=""
              inactive-text=""
              style="--el-switch-on-color: #67c23a; --el-switch-off-color: #f56c6c"
              inline-prompt
              @change="(val) => handleBayStatusChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="150" align="center">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDeleteBay(row)" :icon="Delete">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <ThemSuaXoa 
      v-if="showModal" 
      :editData="editingItem"
      @close="showModal = false" 
      @refresh="handleStationSaved" 
    />

    <!-- Dialog bước 1: Chọn đại lý trước khi thay chiến lược -->
    <el-dialog
      v-model="pickAgencyDialogVisible"
      title="Chọn đại lý"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-select
        v-model="selectionAgencyId"
        placeholder="Tìm đại lý…"
        filterable remote
        :remote-method="remoteFetchSelectionAgencies"
        :loading="selectLoading.agency"
        style="width: 100%"
      >
        <el-option
          v-for="item in options.agencies"
          :key="item.id"
          :label="item.agency_name"
          :value="item.id"
        >
          <div class="agency-dual">
            <div class="agency-dual-name">{{ item.agency_name }}</div>
            <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
          </div>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="pickAgencyDialogVisible = false">Hủy</el-button>
        <el-button type="primary" :disabled="!selectionAgencyId" @click="confirmPickAgency">
          Tiếp tục
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog bước 2: Chọn chiến lược (đã lọc theo đại lý) -->
    <el-dialog
      v-model="assignStrategyDialogVisible"
      title="Áp dụng chiến lược"
      width="500px"
      :close-on-click-modal="false"
    >
      <div>
        <p style="margin-bottom: 10px; color: var(--el-text-color-regular); font-size:13px;">
          Đã chọn <strong>{{ selectedStations.length }}</strong> trạm:
        </p>
        <div class="selected-stations-tags">
          <el-tag
            v-for="s in selectedStations"
            :key="s.id"
            size="small"
            type="info"
            style="margin: 3px;"
          >
            {{ s.station_name }}
          </el-tag>
        </div>
        <el-divider />
        <el-form label-width="120px">
          <el-form-item label="Chiến lược">
            <el-select
              v-model="selectedStrategyId"
              placeholder="Chọn chiến lược"
              style="width: 100%"
              v-loading="loadingStrategies"
            >
              <template v-if="strategies.length === 0 && !loadingStrategies">
                <el-option disabled value="" label="Đại lý này chưa có chiến lược nào" />
              </template>
              <el-option
                v-for="s in strategies"
                :key="s.id"
                :label="`${s.strategy_name} — ${formatAmount(s.amount_per_unit)} VNĐ / ${s.op_per_unit}s`"
                :value="s.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="assignStrategyDialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="loadingAssign" :disabled="!selectedStrategyId" @click="confirmAssignStrategy">
          Áp dụng
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from "vue";

const isMobile = ref(window.innerWidth < 768)
const showMobileFilter = ref(false)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))
import { Plus, Edit, Search, View, Delete, MagicStick, Filter, ArrowDown, Finished } from "@element-plus/icons-vue";
import { ElMessage } from 'element-plus';
import { stationApi } from "@/api/station"; 
import { strategyApi } from "@/api/strategy";
import ThemSuaXoa from "./station-detail.vue";
import { bayApi } from "@/api/bay";
import { wardApi } from "@/api/ward";
import { agencyApi } from "@/api/agency";
import { useMetadataStore } from '@/stores/metadata';
import { authStore } from '@/stores/auth';
import { confirmPopup } from '@/utils/popup'

const canManageStation = computed(() => authStore.hasAnyRole(['sa', 'engineer']));

const list = ref([]);
const loading = ref(false);
const showModal = ref(false);
const editingItem = ref(null);
const stationOptionsLoaded = ref(false);
const expandedCard = ref(null);

const toggleExpandedCard = (id) => {
  if (expandedCard.value === id) {
    expandedCard.value = null;
  } else {
    expandedCard.value = id;
  }
};
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
});

// --- Bulk assign strategy ---
const tableRef = ref(null);
const selectedStations = ref([]);
const isSelectionMode = ref(false);
const assignStrategyDialogVisible = ref(false);
const pickAgencyDialogVisible = ref(false);
const selectedStrategyId = ref(null);
const strategies = ref([]);
const loadingAssign = ref(false);
const loadingStrategies = ref(false);
const isInternalAction = ref(false);

// Đại lý được chọn trong luồng thay chiến lược
const selectionAgencyId = ref(null);
const selectionAgencySearchKeyword = ref('');
const selectionAgencyName = computed(() => {
  if (!selectionAgencyId.value) return '';
  return options.agencies.find(a => a.id === selectionAgencyId.value)?.agency_name || '';
});
const filteredSelectionAgencyOptions = computed(() => {
  if (!selectionAgencySearchKeyword.value) return options.agencies;
  return options.agencies.filter(a =>
    String(a.search_text || '').includes(selectionAgencySearchKeyword.value)
  );
});
const handleSelectionAgencyFilter = (query) => {
  selectionAgencySearchKeyword.value = normalizeSearchValue(query);
};

let strategyLoadingPromise = null;
const selectedStationIds = computed(() => new Set(selectedStations.value.map((s) => s.id)));

const options = reactive({
  provinces: [],
  wards: [],
  agencies: [],
  stations: []
});
const agencySearchKeyword = ref('');
const selectLoading = reactive({
  province: false,
  ward: false,
  agency: false,
  station: false
});

const filterForm = reactive({
  province_id: null,
  ward_id: null,
  agency_id: null,
  station_id: null
});

const activeFilterCount = computed(() => {
  let count = 0
  if (filterForm.province_id) count++
  if (filterForm.ward_id) count++
  if (filterForm.agency_id) count++
  if (filterForm.station_id) count++
  return count
})

const amountFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const lastSearch = reactive({
  ward: '',
  agency: '',
  station: ''
});

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();

let remoteAgencyTimer = null;
const remoteFetchAgencies = (query) => {
  const q = normalizeSearchValue(query);
  if (q === lastSearch.agency && options.agencies.length > 0) return;
  if (remoteAgencyTimer) clearTimeout(remoteAgencyTimer);
  remoteAgencyTimer = setTimeout(() => {
    fetchAgencies(q);
  }, 300);
};

let remoteStationTimer = null;
const remoteFetchStations = (query) => {
  const q = normalizeSearchValue(query);
  if (q === lastSearch.station && options.stations.length > 0) return;
  if (remoteStationTimer) clearTimeout(remoteStationTimer);
  remoteStationTimer = setTimeout(() => {
    fetchStations(q);
  }, 300);
};

const remoteFetchSelectionAgencies = (query) => {
  remoteFetchAgencies(query);
};

let remoteWardTimer = null;
const remoteFetchWards = (query) => {
  const q = normalizeSearchValue(query);
  if (q === lastSearch.ward && options.wards.length > 0) return;
  if (remoteWardTimer) clearTimeout(remoteWardTimer);
  remoteWardTimer = setTimeout(() => {
    fetchWards(filterForm.province_id, q);
  }, 300);
};

const handleAddNew = () => {
  editingItem.value = null;
  showModal.value = true;
};

const handleEdit = (item) => {
  editingItem.value = { ...item };
  showModal.value = true;
};

const handleStationSaved = async () => {
  await fetchData();
  await refreshStationOptionsIfLoaded();
};

const fetchData = async ({ resetPage = false } = {}) => {
  if (resetPage) {
    pagination.page = 1;
  }

  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    };
    if (filterForm.province_id) params.province_id = filterForm.province_id;
    if (filterForm.ward_id) params.ward_id = filterForm.ward_id;
    if (filterForm.agency_id) params.agency_id = filterForm.agency_id;
    if (filterForm.station_id) params.station_id = filterForm.station_id;

    const response = await stationApi.getStations(params);
    const payload = response.data;

    if (Array.isArray(payload)) {
      list.value = payload;
      pagination.total = payload.length;
    } else {
      list.value = Array.isArray(payload?.data) ? payload.data : [];
      pagination.total = Number(payload?.total ?? 0);
      pagination.page = Number(payload?.page ?? pagination.page);
      pagination.limit = Number(payload?.limit ?? pagination.limit);
    }
    if (!isSelectionMode.value) {
      clearSelection();
    } else if (!isMobile.value && tableRef.value) {
      // Nếu đang trong mode chọn, đảm bảo các dòng mới load về được tick nếu đã được chọn trước đó
      nextTick(() => {
        list.value.forEach(row => {
          if (selectedStationIds.value.has(row.id)) {
            tableRef.value.toggleRowSelection(row, true);
          }
        });
      });
    }

    // Tự động cuộn về đầu
    if (!isMobile.value && tableRef.value) {
      tableRef.value.setScrollTop(0);
    } else if (isMobile.value) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (error) {
    console.error("Lỗi:", error);
    list.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const resetStationDropdown = () => {
  options.stations = [];
  stationOptionsLoaded.value = false;
};

const refreshStationOptionsIfLoaded = async () => {
  if (stationOptionsLoaded.value) {
    await fetchStations();
  }
};

const handleProvinceChange = async (provinceId) => {
  filterForm.ward_id = null;
  filterForm.agency_id = null;
  filterForm.station_id = null;
  if (provinceId) {
    await fetchWards(provinceId);
    resetStationDropdown();
    await fetchData({ resetPage: true });
    await refreshStationOptionsIfLoaded();
  } else {
    options.wards = [];
    resetStationDropdown();
    await fetchData({ resetPage: true });
  }
};

const handleWardChange = async (wardId) => {
  filterForm.agency_id = null;
  filterForm.station_id = null;
  resetStationDropdown();
  await fetchData({ resetPage: true });
  await refreshStationOptionsIfLoaded();
};

const handleAgencyChange = async () => {
  filterForm.station_id = null;
  resetStationDropdown();
  await fetchData({ resetPage: true });
  await refreshStationOptionsIfLoaded();
};

const handleProvinceClear = async () => {
  filterForm.province_id = null;
  filterForm.ward_id = null;
  filterForm.agency_id = null;
  filterForm.station_id = null;
  options.wards = [];
  resetStationDropdown();
  await fetchData({ resetPage: true });
};

const handleWardClear = async () => {
  filterForm.ward_id = null;
  filterForm.station_id = null;
  resetStationDropdown();
  await fetchData({ resetPage: true });
  await refreshStationOptionsIfLoaded();
};

const handleAgencyClear = async () => {
  filterForm.agency_id = null;
  filterForm.station_id = null;
  resetStationDropdown();
  await fetchData({ resetPage: true });
  await refreshStationOptionsIfLoaded();
};

const handleStationChange = async () => {
  await fetchData({ resetPage: true });
};

const handleStationClear = async () => {
  filterForm.station_id = null;
  await fetchData({ resetPage: true });
};

const handleStationDropdownVisible = async (visible) => {
  if (!visible || stationOptionsLoaded.value) return;
  await fetchStations();
};

const fetchWards = async (provinceId, keyword = '') => {
  const q = normalizeSearchValue(keyword);
  selectLoading.ward = true;
  try {
    const response = await wardApi.getWards(provinceId, q);
    options.wards = response.data.data;
    lastSearch.ward = q;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách xã:", error);
  } finally {
    selectLoading.ward = false;
  }
};

const metadataStore = useMetadataStore()

const fetchAgencies = async (keyword = '') => {
  const q = normalizeSearchValue(keyword);
  selectLoading.agency = true;
  try {
    const res = await agencyApi.getAgencies({ keyword: q, limit: 1000 });

    options.agencies = (res.data?.data || res.data || []).map((agency) => ({
      ...agency,
      search_text: normalizeSearchValue(`${agency.id || ''} ${agency.agency_name || ''} ${agency.identity_number || ''} ${agency.phone || ''}`)
    }));
    lastSearch.agency = q;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đại lý:", error);
  } finally {
    selectLoading.agency = false;
  }
};

const fetchProvinces = async () => {
  selectLoading.province = true;
  try {
    await metadataStore.fetchProvinces();
    options.provinces = metadataStore.provinces.map((p) => ({
      id: p.id,
      name: p.province_name
    }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tỉnh:", error);
  } finally {
    selectLoading.province = false;
  }
};

const fetchStations = async (keyword = '') => {
  const q = normalizeSearchValue(keyword);
  selectLoading.station = true;
  try {
    const params = { keyword: q, limit: 1000 };

    if (filterForm.province_id) params.province_id = filterForm.province_id;
    if (filterForm.ward_id) params.ward_id = filterForm.ward_id;
    if (filterForm.agency_id) params.agency_id = filterForm.agency_id;
    const response = await stationApi.getFilterStations(params);
    options.stations = response.data.data;
    stationOptionsLoaded.value = true;
    lastSearch.station = q;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách trạm:", error);
    stationOptionsLoaded.value = false;
  } finally {
    selectLoading.station = false;
  }
};

onMounted(async () => {
  await Promise.all([
    fetchData(),
    fetchAgencies(),
    fetchProvinces()
  ]);
});

const handlePageChange = async (page) => {
  pagination.page = page;
  await fetchData();
};

const handlePageSizeChange = async (size) => {
  pagination.limit = size;
  pagination.page = 1;
  await fetchData();
};

// --- Bulk assign strategy handlers ---
const handleSelectionChange = (selection) => {
  if (isInternalAction.value) return;
  
  // Đối với desktop, ta cần thủ công giữ lại selection của các trang khác 
  // vì el-table mặc định chỉ trả về selection của trang hiện tại (nếu không dùng reserve-selection phức tạp)
  // Lấy danh sách ID đang hiển thị ở trang hiện tại
  const currentIds = new Set(list.value.map(s => s.id));
  
  // Giữ lại những trạm đã chọn ở các trang KHÁC
  const otherPageStations = selectedStations.value.filter(s => !currentIds.has(s.id));
  
  // Hợp nhất với những trạm được chọn ở trang HIỆN TẠI
  selectedStations.value = [...otherPageStations, ...selection];
};

const handleSelectAll = async () => {
  if (!selectionAgencyId.value) {
    ElMessage.warning('Vui lòng chọn đại lý trước');
    return;
  }
  
  loading.value = true;
  try {
    const res = await stationApi.getStations({
      agency_id: selectionAgencyId.value,
      limit: 1000 // Lấy tất cả trạm của đại lý này
    });
    
    const allStations = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    
    if (allStations.length === 0) {
      ElMessage.info('Đại lý này chưa có trạm nào');
      return;
    }

    // Cập nhật danh sách chọn
    isInternalAction.value = true;
    selectedStations.value = allStations;

    // Đồng bộ UI cho Table (Desktop)
    if (!isMobile.value && tableRef.value) {
      allStations.forEach(row => {
        const match = list.value.find(item => item.id === row.id);
        if (match) {
          tableRef.value.toggleRowSelection(match, true);
        }
      });
    }
    
    setTimeout(() => {
      isInternalAction.value = false;
    }, 200);
    
    ElMessage.success(`Đã chọn tất cả ${allStations.length} trạm của đại lý ${selectionAgencyName.value}`);
  } catch (error) {
    console.error("Lỗi khi chọn tất cả:", error);
    ElMessage.error('Không thể lấy danh sách trạm để chọn tất cả');
  } finally {
    loading.value = false;
  }
};

// Mở dialog bước 1 - chọn đại lý (bỏ qua nếu user là agency vì đại lý đã fixed)
const openPickAgencyDialog = () => {
  const currentUser = authStore.state.user;
  if (currentUser?.role === 'agency' && currentUser?.agencyId) {
    // Agency user: tự động set đại lý, bỏ qua dialog chọn
    selectionAgencyId.value = currentUser.agencyId;
    selectionAgencySearchKeyword.value = '';
    strategies.value = [];
    confirmPickAgency();
    return;
  }
  // SA/engineer: hiển thị dialog chọn đại lý
  selectionAgencyId.value = null;
  selectionAgencySearchKeyword.value = '';
  strategies.value = [];
  pickAgencyDialogVisible.value = true;
};

// Xác nhận chọn đại lý → vào selection mode với filter theo đại lý
const confirmPickAgency = async () => {
  if (!selectionAgencyId.value) return;
  pickAgencyDialogVisible.value = false;

  // Tự động filter table theo đại lý đã chọn
  filterForm.agency_id = selectionAgencyId.value;
  filterForm.station_id = null;
  resetStationDropdown();
  await fetchData({ resetPage: true });

  // Vào selection mode và load chiến lược của đại lý này
  isSelectionMode.value = true;
  await loadStrategiesForAgency(selectionAgencyId.value);
};

const loadStrategiesForAgency = async (agencyId) => {
  loadingStrategies.value = true;
  strategies.value = [];
  strategyLoadingPromise = null;
  try {
    const response = await strategyApi.getStrategies({ agency_id: agencyId, limit: 1000 });

    strategies.value = Array.isArray(response.data.data) ? response.data.data : [];
  } catch {
    ElMessage.error('Không thể tải danh sách chiến lược');
  } finally {
    loadingStrategies.value = false;
  }
};

const exitSelectionMode = () => {
  isSelectionMode.value = false;
  selectionAgencyId.value = null;
  strategies.value = [];
  clearSelection();
  // Gỡ filter đại lý đã áp theo selection mode nếu người dùng hủy
  filterForm.agency_id = null;
  filterForm.station_id = null;
  fetchData({ resetPage: true });
};

const clearSelection = () => {
  tableRef.value?.clearSelection();
  selectedStations.value = [];
};

const isStationSelected = (stationId) => {
  return selectedStationIds.value.has(stationId);
};

const toggleMobileStationSelection = (station, checked) => {
  if (checked) {
    if (!selectedStationIds.value.has(station.id)) {
      selectedStations.value = [...selectedStations.value, station];
    }
    return;
  }
  selectedStations.value = selectedStations.value.filter((s) => s.id !== station.id);
};

const openAssignStrategyDialog = () => {
  if (!selectionAgencyId.value) {
    ElMessage.warning('Vui lòng chọn đại lý trước');
    return;
  }
  if (selectedStations.value.length === 0) {
    ElMessage.warning('Vui lòng chọn ít nhất một trạm');
    return;
  }
  selectedStrategyId.value = null;
  assignStrategyDialogVisible.value = true;
};

const confirmAssignStrategy = async () => {
  if (!selectedStrategyId.value) {
    ElMessage.warning('Vui lòng chọn chiến lược');
    return;
  }
  loadingAssign.value = true;
  try {
    const stationIds = selectedStations.value.map(s => s.id);
    await stationApi.assignStrategy({
      station_ids: stationIds,
      strategy_id: selectedStrategyId.value
    });

    const selectedStrategy = strategies.value.find(s => s.id === selectedStrategyId.value);
    if (selectedStrategy) {
      const stationIdSet = new Set(stationIds);
      list.value = list.value.map((station) => {
        if (!stationIdSet.has(station.id)) return station;
        return {
          ...station,
          strategy_id: selectedStrategy.id,
          amount_per_unit: selectedStrategy.amount_per_unit,
          op_per_unit: selectedStrategy.op_per_unit,
          foam_per_unit: selectedStrategy.foam_per_unit
        };
      });
    }

    ElMessage.success(`Áp dụng chiến lược thành công cho ${stationIds.length} trạm`);
    assignStrategyDialogVisible.value = false;
    exitSelectionMode();
  } catch (error) {
    ElMessage.error('Không thể áp dụng chiến lược');
    console.error(error);
  } finally {
    loadingAssign.value = false;
  }
};

const formatAmount = (val) => {
  if (val == null) return '-';
  return amountFormatter.format(val);
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN");
};


const handleStationStatusChange = async (station, newValue) => {
  try {
    // Gọi API cập nhật trạng thái
    await stationApi.updateStation(station.id, { is_active: newValue });
    ElMessage.success(`Trạm ${station.station_name} đã ${newValue === 1 ? 'hoạt động' : 'tạm dừng'}`);
  } catch (error) {
    // Nếu lỗi, trả lại giá trị cũ trên UI
    station.is_active = newValue === 1 ? 0 : 1;
    ElMessage.error('Không thể cập nhật trạng thái');
  }
};

// --- State cho quản lý trụ ---
const bayModalVisible = ref(false);
const currentStation = ref(null);
const bays = ref([]); // Danh sách trụ của trạm đang chọn
// --- Hàm xử lý trụ ---
const fetchBays = async (id) => {
  try {
    const response = await bayApi.getBays(id); 
    bays.value = response.data;
  } catch (error) {
    console.error("Lỗi khi lấy DS trụ:", error);
  } finally {
  }
};
// Mở modal và lấy dữ liệu trụ
const handleViewBays = (station) => {
  currentStation.value = station;
  fetchBays(currentStation.value.id);
  bayModalVisible.value = true;
};

const handleAddBay = async () => {
  const confirmed = await confirmPopup(
    `Bạn có chắc chắn muốn thêm một trụ mới cho trạm "${currentStation.value.station_name}" không?`,
    'Xác nhận thêm trụ',
    {
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      type: 'warning'
    }
  )
  if (!confirmed) return

  try {
    const response = await bayApi.createBays(currentStation.value.id); 
    
    if(response) {
      ElMessage.success('Đã thêm trụ mới thành công!');
      fetchBays(currentStation.value.id); 
    }
  } catch (error) {
    ElMessage.error('Thêm trụ thất bại');
    console.error(error);
  }
};

const handleBayStatusChange = async (bay, newValue) => {
  try {
    // Gọi API cập nhật trạng thái
    await bayApi.updateBays(bay.id, { bay_status: newValue });
    ElMessage.success(`Trụ ${bay.bay_code} đã ${newValue === 1 ? 'hoạt động' : 'tạm dừng'}`);
  } catch (error) {
    // Nếu lỗi, trả lại giá trị cũ trên UI
    bay.bay_status = newValue === 1 ? 0 : 1;
    ElMessage.error('Không thể cập nhật trạng thái');
  }
};

const handleDeleteBay = async (bay) => {
  const confirmed = await confirmPopup(
    `Bạn có chắc chắn muốn xóa trụ ${bay.bay_code}?`,
    'Xác nhận xóa',
    {
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      type: 'warning'
    }
  )
  if (!confirmed) return

  try {
    const response = await bayApi.deleteBays(bay.id); // Gọi API xóa trụ với ID cụ thể
    
    if(response) {
      ElMessage.success('Đã xóa trụ thành công!');
      fetchBays(currentStation.value.id); 
    }
  } catch (error) {
    ElMessage.error('Xóa trụ thất bại');
    console.error(error);
  }
};
</script>

<style scoped>
/* 1. Container & Layout - Optimized for Single Screen */
.page-container {
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

.header-card {
  border-radius: 8px;
  flex-shrink: 0;
}
:deep(.header-card .el-card__body) { padding: 10px 16px; }

.table-card {
  border-radius: 8px;
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

.pagination-wrapper {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
/* Filter Select Widths */
.filter-select {
  width: 180px;
}
.filter-layout :deep(.el-form-item:nth-child(1) .filter-select),
.filter-layout :deep(.el-form-item:nth-child(2) .filter-select) {
  width: 150px;
}

.filter-container-desktop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.desktop-actions {
  flex-shrink: 0;
  margin-top: 2px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.strategy-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 2. Header Content */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: var(--el-font-size-extra-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.search-input {
  width: 350px;
}

/* 3. Typography & Colors */
.font-bold {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.text-secondary {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
  line-height: 1.5;
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
  color: var(--el-text-color-secondary);
}

/* 4. Table Customization */
.station-name {
  font-weight: bold;
  color: var(--el-color-primary);
  cursor: pointer;
  transition: var(--el-transition-duration);
}

.station-name:hover {
  color: var(--el-color-primary-light-3);
}

/* Căn chỉnh các khối thông tin trong Cell */
.bank-info, 
.action-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strategy-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start; /* Thường để trái sẽ chuyên nghiệp hơn trong bảng */
}

/* 5. Element Plus Component Overrides (Deep Selectors) */
:deep(.el-table__header-th) {
  background-color: var(--el-fill-color-light) !important;
  color: var(--el-text-color-regular) !important;
  font-weight: bold !important;
  height: 48px;
}

/* Tăng khoảng cách cho switch cạnh Tag */
:deep(.el-switch) {
  margin-left: 8px;
}

/* Giữ cột selection cố định để tránh re-render nặng khi bật/tắt selection mode. */
:deep(.el-table:not(.selection-mode) .selection-column .cell .el-checkbox),
:deep(.el-table:not(.selection-mode) .el-table__header .selection-column .cell .el-checkbox) {
  visibility: hidden;
  pointer-events: none;
}

/* 6. Modal / Dialog Styles */
.modal-toolbar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

/* Tối ưu hiển thị Tag trong bảng */
.el-tag--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--el-border-radius-small);
}

/* Utility classes */
.mt-1 { margin-top: 4px; }

.selection-info {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-primary);
}

.selected-stations-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  margin-bottom: 4px;
}

/* ── Mobile ─────────────────────────────────────── */
@media (max-width: 768px) {
  .page-container {
    padding: 4px 4px 2px 4px;
    gap: 2px;
  }

  .header-card {
    margin-bottom: 0;
  }
  :deep(.header-card .el-card__body) {
    padding: 8px 10px !important;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .action-row.is-mobile-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    gap: 8px;
  }

  .strategy-toggle-btn {
    height: 32px;
    padding: 0 12px;
    font-weight: 600;
    border-radius: 8px;
  }

  .strategy-actions {
    flex: 1;
    display: flex;
    gap: 6px;
  }

  .filter-toggle-wrap {
    flex-shrink: 0;
  }

  .header-actions :deep(.el-button) {
    font-size: 11px;
    padding: 6px 10px;
  }

  .filter-toggle-btn-inline {
    font-weight: 600;
    border-radius: 8px;
  }

  .filter-count-mini {
    background: var(--el-color-primary);
    color: #fff;
    padding: 0 5px;
    border-radius: 6px;
    font-size: 10px;
    margin-left: 4px;
    line-height: 1.4;
  }

  .is-mobile-filters {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100%;
    margin-top: 8px !important;
  }

  .is-mobile-filters :deep(.el-form-item) {
    margin: 0 !important;
    flex: none !important;
  }

  .is-mobile-filters :deep(.el-form-item.no-label .el-form-item__label) {
    display: none;
  }

  .search-input {
    width: 100%;
  }

  /* Filter form: wrap items */
  :deep(.el-form.el-form--inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 8px;
  }

  :deep(.el-form.el-form--inline .el-form-item) {
    margin: 0 !important;
    flex: 1 1 140px;
    min-width: 0;
  }

  :deep(.el-form.el-form--inline .el-select) {
    width: 100%;
  }

  /* Table cells compact */
  :deep(.el-table .el-table__cell) {
    padding: 5px 6px !important;
    font-size: 12px;
  }

  .page-title {
    font-size: 15px;
    letter-spacing: -0.01em;
  }

  .mobile-table-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 2px;
    min-height: 0;
    overflow: hidden;
  }

  .mobile-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 4px;
    margin-bottom: 2px;
  }


}

/* ── Landscape ──────────────────────────────────── */
@media (max-width: 900px) and (orientation: landscape) {
  .page-container {
    padding: 4px 8px;
  }

  .header-content {
    flex-direction: row;
    margin-bottom: 6px;
  }

  :deep(.el-form.el-form--inline) {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  :deep(.el-form.el-form--inline .el-form-item) {
    flex: 0 0 auto;
  }
}



.mobile-card {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  transition: all 0.2s ease;
}
.mobile-card:active {
  transform: scale(0.98);
  border-color: var(--el-color-primary);
}

.mc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.mc-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow: hidden;
}

.mc-address {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc-right-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-expand-icon {
  transition: transform 0.3s ease;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.mc-expand-icon.is-active {
  transform: rotate(180deg);
  color: var(--el-color-primary);
}

.mc-select {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.mc-select-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.mc-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.mc-detail {
  padding: 8px 0;
  border-top: 1px dashed var(--el-border-color-lighter);
  margin-top: 4px;
}

.mc-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  line-height: 1.8;
}

.mc-detail-row span:first-child {
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.mc-detail-row span:last-child {
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: right;
}

.mc-strategy {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.mc-strategy :deep(.el-tag) {
  padding: 0 4px;
  height: 20px;
  font-size: 10px;
}



.mc-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 8px;
  margin-top: 4px;
}
.mc-actions :deep(.el-button) {
  padding: 4px 8px;
  height: 28px;
  font-size: 11px;
}

.mc-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
.mobile-card-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

/* --- Transitions --- */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
  max-height: 500px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
}
</style>