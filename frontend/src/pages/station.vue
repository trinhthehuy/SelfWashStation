<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Quản lý trạm rửa xe</h2>
        </div>
        <div class="header-actions">
          <el-button v-if="canManageStation" type="primary" :icon="Plus" @click="handleAddNew">
            Thêm trạm mới
          </el-button>
        </div>
      </div>

      <div class="filter-section">
        <el-form :inline="true" :model="filterForm" class="demo-form-inline filter-layout">
          <el-form-item label="Tỉnh">
            <el-select
              v-model="filterForm.province_id"
              filterable remote clearable
              :loading="selectLoading.province"
              @change="handleProvinceChange"
              @clear="handleProvinceClear"
              style="width: 150px"
            >
              <el-option v-for="item in options.provinces" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="Xã">
            <el-select
              v-model="filterForm.ward_id"
              filterable clearable
              :loading="selectLoading.ward"
              @change="handleWardChange"
              @clear="handleWardClear"
              style="width: 150px"
            >
              <el-option v-for="item in options.wards" :key="item.id" :label="item.ward_name" :value="item.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="Đại lý">
            <el-select
              v-model="filterForm.agency_id"
              filterable clearable
              :filter-method="handleAgencyFilter"
              :loading="selectLoading.agency"
              @change="handleAgencyChange"
              @clear="handleAgencyClear"
              style="width: 180px"
            >
              <el-option v-for="item in filteredAgencyOptions" :key="item.id" :label="item.agency_name" :value="item.id">
                <div class="agency-dual">
                  <div class="agency-dual-name">{{ item.agency_name }}</div>
                  <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="Mã trạm">
            <el-select
              v-model="filterForm.station_id"
              filterable clearable
              :loading="selectLoading.station"
              @visible-change="handleStationDropdownVisible"
              @change="handleStationChange"
              @clear="handleStationClear"
              style="width: 180px"
            >
              <el-option v-for="item in options.stations" :key="item.id" :label="item.station_name" :value="item.id" />
            </el-select>
          </el-form-item>

          <!-- Nút + trạng thái chọn trạm inline với filter -->
          <el-form-item>
            <template v-if="isSelectionMode">
              <span class="selection-info" style="margin-right: 8px;">
                <el-tag type="warning" size="small" style="margin-right:6px">{{ selectionAgencyName }}</el-tag>
                <template v-if="selectedStations.length > 0">
                  Đã chọn <strong>{{ selectedStations.length }}</strong> trạm
                </template>
                <template v-else>Chọn trạm cần áp dụng</template>
              </span>
              <el-button
                type="primary"
                :icon="MagicStick"
                :disabled="selectedStations.length === 0"
                @click="openAssignStrategyDialog"
              >
                Chọn chiến lược
              </el-button>
              <el-button @click="exitSelectionMode">Hủy</el-button>
            </template>
            <template v-else>
              <el-button :icon="MagicStick" @click="openPickAgencyDialog">
                Thay đổi chiến lược
              </el-button>
            </template>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-main">
        <el-table
          v-if="!isMobile"
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
          <el-table-column type="selection" width="48" align="center" class-name="selection-column" />
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

        <!-- Mobile card list -->
        <div v-else class="mobile-card-list" v-loading="loading">
          <div v-for="row in list" :key="row.id" class="mobile-card">
            <div class="mc-header">
              <div class="mc-title">
                <div v-if="isSelectionMode" class="mc-select">
                  <el-checkbox
                    :model-value="isStationSelected(row.id)"
                    @change="(checked) => toggleMobileStationSelection(row, checked)"
                  />
                  <span class="mc-select-label">Chọn trạm</span>
                </div>
                <span class="mc-name">{{ row.station_name }}</span>
                <span class="mc-sub">{{ row.province_name }} · {{ row.ward_name }}</span>
                <span class="mc-sub" v-if="row.address">{{ row.address }}</span>
              </div>
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small" effect="light">
                {{ row.is_active ? 'Hoạt động' : 'Tạm dừng' }}
              </el-tag>
            </div>

            <div class="mc-agency">{{ row.agency_name }}</div>

            <div class="mc-strategy">
              <el-tag size="small" type="info">💰 {{ formatAmount(row.amount_per_unit) }} VNĐ</el-tag>
              <el-tag size="small" type="info">⏱️ {{ row.op_per_unit }}s</el-tag>
              <el-tag size="small" type="info">🧪 {{ row.foam_per_unit }}ml</el-tag>
            </div>

            <div class="mc-bank" v-if="row.bank_name">
              <span class="mcs-label">Ngân hàng</span>
              <span>{{ row.bank_name }} · {{ row.account_number }}</span>
            </div>

            <div class="mc-actions">
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
      title="Bước 1 — Chọn đại lý"
      width="420px"
      :close-on-click-modal="false"
    >
      <p style="margin-bottom:14px; color: var(--el-text-color-regular); font-size:13px;">
        Chọn đại lý để lọc danh sách trạm và chiến lược tương ứng. Chỉ chiến lược thuộc đại lý đã chọn mới được áp dụng.
      </p>
      <el-select
        v-model="selectionAgencyId"
        placeholder="Chọn đại lý…"
        filterable
        :filter-method="handleSelectionAgencyFilter"
        style="width: 100%"
      >
        <el-option
          v-for="item in filteredSelectionAgencyOptions"
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
      title="Bước 2 — Áp dụng chiến lược vận hành"
      width="500px"
      :close-on-click-modal="false"
    >
      <div>
        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom:14px;"
          :title="`Chiến lược thuộc đại lý: ${selectionAgencyName}`"
          description="Chỉ những chiến lược của đại lý này mới được hiển thị để tránh áp dụng nhầm."
          show-icon
        />
        <p style="margin-bottom: 10px; color: var(--el-text-color-regular); font-size:13px;">
          Áp dụng cho <strong>{{ selectedStations.length }}</strong> trạm đã chọn:
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
import { ref, computed, reactive, onMounted, onUnmounted } from "vue";

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))
import { Plus, Edit, Search, View, Delete, MagicStick } from "@element-plus/icons-vue";
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

const amountFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();
const filteredAgencyOptions = computed(() => {
  if (!agencySearchKeyword.value) return options.agencies;
  return options.agencies.filter((agency) =>
    String(agency.search_text || '').includes(agencySearchKeyword.value)
  );
});

const handleAgencyFilter = (query) => {
  agencySearchKeyword.value = normalizeSearchValue(query);
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
    clearSelection();

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

const fetchWards = async (provinceId) => {
  selectLoading.ward = true;
  try {
    const response = await wardApi.getWards(provinceId);
    options.wards = response.data.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách xã:", error);
  } finally {
    selectLoading.ward = false;
  }
};

const metadataStore = useMetadataStore()

const fetchAgencies = async () => {
  selectLoading.agency = true;
  try {
    await metadataStore.fetchAgencies();
    options.agencies = metadataStore.agencies.map((agency) => ({
      ...agency,
      search_text: normalizeSearchValue(`${agency.id || ''} ${agency.agency_name || ''} ${agency.identity_number || ''} ${agency.phone || ''}`)
    }));
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

const fetchStations = async () => {
  selectLoading.station = true;
  try {
    const params = {};
    if (filterForm.province_id) params.province_id = filterForm.province_id;
    if (filterForm.ward_id) params.ward_id = filterForm.ward_id;
    if (filterForm.agency_id) params.agency_id = filterForm.agency_id;
    const response = await stationApi.getFilterStations(params);
    options.stations = response.data.data;
    stationOptionsLoaded.value = true;
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
  selectedStations.value = selection;
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
    const response = await strategyApi.getStrategies(agencyId);
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
    padding: 8px;
  }

  .header-card {
    margin-bottom: 8px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
  }

  .header-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .header-actions :deep(.el-button) {
    flex: 1 1 auto;
    font-size: 11px;
    padding: 6px 10px;
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
    font-size: 16px;
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

/* ── Mobile card list ────────────────────────────── */
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-card {
  background: var(--el-bg-color);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
}

.mc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.mc-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow: hidden;
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

.mc-agency {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
  font-weight: 500;
}

.mc-strategy {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.mc-bank {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.mcs-label {
  font-weight: 500;
  color: var(--el-text-color-placeholder);
}

.mc-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
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
  gap: 10px;
  overflow-y: auto;
}
</style>