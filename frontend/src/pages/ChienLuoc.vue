<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Quản lý chiến lược</h2>
          <p class="sub-title">Thiết lập các chiến lược vận hành hệ thống trạm rửa xe</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAddNew" size="large">
          Thêm chiến lược mới
        </el-button>
      </div>

      <div class="filter-section">
        <el-input
          v-model="keyword"
          placeholder="Tìm nhanh toàn bộ dữ liệu..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />

        <div v-if="isSystemAdmin" class="advanced-filter-row">
          <el-select
            v-model="fieldFilters.agencyName"
            placeholder="Lọc theo Đại lý"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in agencyFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-select
            v-model="fieldFilters.strategyName"
            placeholder="Lọc theo Tên chiến lược"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in strategyFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-select
            v-model="fieldFilters.amountPerUnit"
            placeholder="Lọc theo số tiền"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in amountFilterOptions"
              :key="item"
              :label="new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(item) + ' VNĐ'"
              :value="String(item)"
            />
          </el-select>

          <el-button class="clear-filter-btn" @click="resetFilters">Xóa bộ lọc</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
        <!-- Desktop table -->
        <el-table
          v-if="!isMobile"
          :data="filteredList" 
          v-loading="loading" 
          style="width: 100%"
          border
          stripe
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        >
          <el-table-column prop="id" label="ID" width="70" align="right" header-align="right" />
          
          <el-table-column label="Thông tin Đại lý" min-width="200">
            <template #default="{ row }">
              <div class="agency-cell">
                <div class="font-bold primary-text">{{ row.agency_name }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Tên chiến lược" min-width="180">
            <template #default="{ row }">
              <el-tag type="success" effect="light" class="bank-tag">
                {{ row.strategy_name }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Thông số chiến lược"  min-width="200">
            <template #default="{ row }">
              <div class="strategy-info">
                <el-tooltip content="Số tiền mỗi đơn vị">
                  <el-tag size="small" type="info" class="mt-1">💰 {{ new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(row.amount_per_unit) }} VNĐ</el-tag>
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

          <el-table-column label="Thao tác" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                link 
                :icon="Edit" 
                @click="handleEdit(row)"
              >
                Sửa
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Mobile card list -->
        <div v-else class="mobile-card-list" v-loading="loading">
          <div v-for="row in filteredList" :key="row.id" class="mobile-card">
            <div class="mc-header">
              <div class="mc-title">
                <span class="mc-name">{{ row.agency_name }}</span>
              </div>
              <el-tag type="success" effect="light" size="small">{{ row.strategy_name }}</el-tag>
            </div>
            <div class="mc-strategy">
              <el-tag size="small" type="info">💰 {{ new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(row.amount_per_unit) }} VNĐ</el-tag>
              <el-tag size="small" type="info">⏱️ {{ row.op_per_unit }}s</el-tag>
              <el-tag size="small" type="info">🧪 {{ row.foam_per_unit }}ml</el-tag>
            </div>
            <el-button type="primary" size="small" plain :icon="Edit" style="width:100%;margin-top:8px" @click="handleEdit(row)">
              Sửa chiến lược
            </el-button>
          </div>
          <div v-if="!loading && filteredList.length === 0" class="mc-empty">Không có dữ liệu</div>
        </div>
    </el-card>

    <el-dialog  
      v-model="showModal" 
      :title="isEdit ? 'Cập nhật chiến lược' : 'Thêm chiến lược mới'"
      width="550px"
      destroy-on-close
      border-radius="8px"
    >
      <el-form 
        :model="formData" 
        label-position="top" 
        ref="formRef"
        :rules="rules"
      >
        <el-form-item label="Tên chiến lược" prop="strategy_name">
          <el-input v-model="formData.strategy_name" placeholder="Nhập tên chiến lược" />
        </el-form-item>

        <el-form-item label="Tên đại lý" prop="agency_name">
          <el-autocomplete
            v-model="formData.agency_name"
            :fetch-suggestions="querySearchName"
            placeholder="Tìm theo ID, tên đại lý, CCCD, số điện thoại"
            @select="handleSelectName"
            clearable
            style="width: 100%"
          >
            <template #default="{ item }">
              <div class="agency-dual">
                <div class="agency-dual-name">{{ item.agency_name }}</div>
                <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>

        <el-form-item label="ID (CCCD)" prop="identity_number">
          <el-select 
            v-model="formData.identity_number" 
            placeholder="Chọn ID (CCCD)" 
            :disabled="!availableIdentities.length"
            @change="handleSelectIdentity"
            style="width: 100%"
          >
            <el-option
              v-for="item in availableIdentities"
              :key="item.id"
              :label="item.identity_number"
              :value="item.identity_number"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Số tiền mỗi đơn vị (VNĐ)" prop="amount_per_unit">
              <el-input-number
                v-model.number="formData.amount_per_unit"
                :min="0"
                :step="100"
                controls-position="right"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Thời gian vận hành (giây)" prop="op_per_unit">
              <el-input-number
                v-model.number="formData.op_per_unit"
                :min="1"
                :step="1"
                controls-position="right"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Định lượng hóa chất (ml)" prop="foam_per_unit">
          <el-input-number
            v-model.number="formData.foam_per_unit"
            :min="0"
            :step="1"
            controls-position="right"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer-container">
          <div class="left-actions">
            <el-button 
              v-if="isEdit" 
              type="danger" 
              link
              :icon="Delete" 
              @click="handleDelete"
            >
              Xóa chiến lược này
            </el-button>
          </div>

          <div class="right-actions">
            <el-button @click="showModal = false">Đóng</el-button>
            <el-button 
              type="primary" 
              @click="handleSubmit(formRef)" 
              :loading="submitting"
            >
              Lưu thông tin
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>

import { ref, computed, onMounted, onUnmounted, reactive } from "vue";

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))
import { Plus, Edit, Search, Delete, Postcard } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { strategyApi } from "@/api/strategy"; 
import { agencyApi } from "@/api/agency";
import { authStore } from '@/stores/auth';
import { confirmPopup } from '@/utils/popup'
// State
const keyword = ref("");
const isSystemAdmin = computed(() => authStore.hasAnyRole(['sa']));
const fieldFilters = reactive({
  agencyName: '',
  strategyName: '',
  amountPerUnit: ''
});
const list = ref([]);
const loading = ref(false);
const showModal = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const formRef = ref(null);
const agencyList = ref([]);
const availableIdentities = ref([]);

const formData = ref({
  id: null,
  agency_id: "",
  agency_name: "",
  identity_number: "",
  strategy_name: "",
  amount_per_unit: 1000,
  op_per_unit: 60,
  foam_per_unit: 6
});

// Validation rules
const rules = reactive({
  strategy_name: [{ required: true, message: 'Vui lòng nhập tên chiến lược', trigger: 'blur' }],
  agency_name: [{ required: true, message: 'Vui lòng chọn đại lý', trigger: 'change' }],
  identity_number: [{ required: true, message: 'Vui lòng chọn ID (CCCD)', trigger: 'change' }],
  amount_per_unit: [{ required: true, message: 'Vui lòng nhập số tiền mỗi đơn vị', trigger: 'blur' }],
  op_per_unit: [{ required: true, message: 'Vui lòng nhập thời gian vận hành', trigger: 'blur' }],
  foam_per_unit: [{ required: true, message: 'Vui lòng nhập định lượng hóa chất', trigger: 'blur' }]
});

// Computed
const normalizeFilterValue = (value) => String(value || '').toLowerCase().trim();
const uniqueSortedBy = (selector) => {
  return Array.from(
    new Set(
      list.value
        .map(selector)
        .filter((value) => String(value || '').trim())
    )
  ).sort((a, b) => String(a).localeCompare(String(b), 'vi'));
};

const agencyFilterOptions = computed(() => uniqueSortedBy((item) => item.agency_name));
const strategyFilterOptions = computed(() => uniqueSortedBy((item) => item.strategy_name));
const amountFilterOptions = computed(() => uniqueSortedBy((item) => Number(item.amount_per_unit) || 0));

const filteredList = computed(() => {
  const search = normalizeFilterValue(keyword.value);
  const agencyNameFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.agencyName) : '';
  const strategyNameFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.strategyName) : '';
  const amountPerUnitFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.amountPerUnit) : '';

  return list.value.filter((item) => {
    const matchesQuickSearch = !search || Object.values(item).some((val) => String(val).toLowerCase().includes(search));
    const matchesAgencyName = !agencyNameFilter || normalizeFilterValue(item.agency_name) === agencyNameFilter;
    const matchesStrategyName = !strategyNameFilter || normalizeFilterValue(item.strategy_name) === strategyNameFilter;
    const matchesAmount = !amountPerUnitFilter || String(Number(item.amount_per_unit) || 0) === amountPerUnitFilter;

    return matchesQuickSearch && matchesAgencyName && matchesStrategyName && matchesAmount;
  });
});

const resetFilters = () => {
  keyword.value = '';
  fieldFilters.agencyName = '';
  fieldFilters.strategyName = '';
  fieldFilters.amountPerUnit = '';
};

// Methods
const fetchData = async () => {
  loading.value = true;
  try {
    const response = await strategyApi.getStrategies();
    list.value = Array.isArray(response.data.data) ? response.data.data : [];
  } catch (error) {
    ElMessage.error("Không thể tải danh sách chiến lược. Vui lòng thử lại sau.");
  } finally {
    loading.value = false;
  }
};

const fetchAgencies = async () => {
  try {
    const response = await agencyApi.getAgencies(); 
    agencyList.value = Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.error("Lỗi khi lấy DS đại lý:", error);
  }
};

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();
const agencySearchText = (agency) => normalizeSearchValue(`${agency?.id || ''} ${agency?.agency_name || ''} ${agency?.identity_number || ''} ${agency?.phone || ''}`);

const querySearchName = (queryString, cb) => {
  const query = normalizeSearchValue(queryString);
  const results = query
    ? agencyList.value.filter((agency) => agencySearchText(agency).includes(query))
    : agencyList.value;
  const suggestions = results.map((agency) => ({
    value: agency.agency_name,
    agencyId: agency.id,
    agency_name: agency.agency_name,
    identity_number: agency.identity_number
  }));
  cb(suggestions);
};

const handleSelectName = (item) => {
  const agency = agencyList.value.find((a) => a.id === item.agencyId);
  availableIdentities.value = agency ? [agency] : [];
  if (!agency) {
    formData.value.identity_number = "";
    formData.value.agency_id = "";
    return;
  }

  formData.value.agency_name = agency.agency_name;
  formData.value.identity_number = agency.identity_number;
  formData.value.agency_id = agency.id;
};

const handleSelectIdentity = (val) => {
  const agency = availableIdentities.value.find(a => a.identity_number === val);
  if (agency) {
    formData.value.agency_id = agency.id;
    formData.value.agency_name = agency.agency_name;
  }
};

const handleAddNew = async () => {
  isEdit.value = false;
  formData.value = {
    id: null,
    agency_id: "",
    agency_name: "",
    identity_number: "",
    strategy_name: "",
    amount_per_unit: 1000,
    op_per_unit: 60,
    foam_per_unit: 6
  };
  availableIdentities.value = [];
  await fetchAgencies();
  showModal.value = true;
};

const handleEdit = async (item) => {
  isEdit.value = true;
  await fetchAgencies();
  availableIdentities.value = agencyList.value.filter(a => a.id === item.agency_id);
  formData.value = {
    id: item.id,
    agency_id: item.agency_id,
    agency_name: item.agency_name,
    identity_number: item.identity_number,
    strategy_name: item.strategy_name,
    amount_per_unit: Number(item.amount_per_unit),
    op_per_unit: Number(item.op_per_unit),
    foam_per_unit: Number(item.foam_per_unit)
  };
  showModal.value = true;
};

const handleSubmit = async (formEl) => {
  if (!formEl) return;
  await formEl.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      const payload = {
        strategy_name: formData.value.strategy_name,
        agency_id: formData.value.agency_id,
        amount_per_unit: Number(formData.value.amount_per_unit),
        op_per_unit: Number(formData.value.op_per_unit),
        foam_per_unit: Number(formData.value.foam_per_unit)
      };

      try {
        let res;
        if (isEdit.value) {
          res = await strategyApi.updateStrategies(formData.value.id, payload);
        } else {
          res = await strategyApi.createStrategies(payload);
        }

        if (res) {
          ElMessage.success(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công");
          showModal.value = false;
          fetchData();
        }
      } catch (error) {
        ElMessage.error("Thao tác thất bại. Vui lòng kiểm tra lại.");
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleDelete = async () => {
  const confirmed = await confirmPopup(
    `Bạn có chắc chắn muốn xóa chiến lược ${formData.value.strategy_name}?`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xóa ngay', cancelButtonText: 'Hủy', type: 'warning' }
  )
  if (!confirmed) return

  try {
    const res = await strategyApi.deleteStrategies(formData.value.id);
    if (res) {
      ElMessage.success("Đã xóa chiến lược");
      showModal.value = false;
      fetchData();
    }
  } catch (error) {
    console.error("Lỗi xóa chiến lược:", error, error.response?.data);
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Lỗi khi xóa chiến lược";
    ElMessage.error(errorMsg);
  }
};

onMounted(async () => {
  await fetchAgencies();
  await fetchData();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
  background: var(--bg-body);
  min-height: 100%;
  color: var(--text-main);
  transition: background 0.2s ease;
}

.header-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.sub-title {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--text-faint);
}

.search-input {
  width: 100%;
  max-width: 450px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advanced-filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
}

.filter-item {
  width: 100%;
}

.clear-filter-btn {
  width: 100%;
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
  color: var(--text-faint);
}

.agency-cell .primary-text {
  font-weight: 600;
  color: var(--text-link);
}

.bank-details .account-number {
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
  font-size: 15px;
}

.account-name {
  font-size: 12px;
  font-weight: 500;
}

.dialog-footer-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}

.strategy-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

/* Mobile card list */
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}
.mobile-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.mc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.mc-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mc-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-sub {
  font-size: 12px;
  color: #909399;
}
.mc-strategy {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.mc-empty {
  text-align: center;
  color: #909399;
  padding: 32px 0;
  font-size: 14px;
}

@media (max-width: 900px) {
  .advanced-filter-row {
    grid-template-columns: 1fr;
  }
}
</style>