        
<template>
  <el-dialog
    v-model="visible"
    :title="props.editData ? 'Cập nhật trạm ' + props.editData.station_name : 'Thêm trạm rửa xe mới'"
    class="station-detail-dialog"
    @closed="$emit('close')"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form 
      :model="form" 
      label-position="top" 
      v-loading="submitting"
      class="station-form high-density-mobile"
    >
      <el-row :gutter="16">
        <!-- Khu vực & Đại lý -->
        <el-col :span="12">
          <el-form-item label="Tỉnh/Thành phố" required>
            <el-select 
              v-model="form.province_id" 
              @change="handleProvinceChange"
              class="w-full"
              filterable
            >
              <el-option v-for="p in provinceData" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Quận/Huyện" required>
            <el-select 
              v-model="form.ward_id" 
              :loading="loadingWards"
              :disabled="!form.province_id"
              class="w-full"
              filterable
            >
              <el-option v-for="w in wards" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="Mã trạm (Tự động)">
            <el-input v-model="form.station_name" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Đại lý" required>
            <el-select 
              v-model="form.agency_id" 
              filterable 
              :filter-method="handleAgencyFilter"
              @change="handleAgencyChange"
              class="w-full"
            >
              <el-option v-for="a in filteredAgencyOptions" :key="a.id" :label="a.agency_name" :value="a.id">
                <div class="agency-dual">
                  <div class="agency-dual-name">{{ a.agency_name }}</div>
                  <div class="agency-dual-id">ID: {{ a.identity_number || 'N/A' }}</div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- Tọa độ -->
        <el-col :span="12">
          <el-form-item label="Kinh độ (Lon)" required>
            <el-input v-model="form.longitude" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Vĩ độ (Lat)" required>
            <el-input v-model="form.latitude" />
          </el-form-item>
        </el-col>

        <!-- Tài khoản & Chiến lược -->
        <el-col :span="12">
          <el-form-item label="Tài khoản NH" required>
            <el-select 
              v-model="form.bank_account_id" 
              filterable 
              :disabled="!form.agency_id || bankaccounts.length === 0"
              class="w-full"
            >
              <el-option v-for="b in bankaccounts" :key="b.id" :label="b.name" :value="b.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Chiến lược" required>
            <el-select 
              v-model="form.strategy_id" 
              filterable 
              :disabled="!form.agency_id || strategies.length === 0"
              class="w-full"
            >
              <el-option v-for="s in strategies" :key="s.id" :label="s.name" :value="s.id">
                <div class="strategy-dual">
                  <div class="strategy-dual-name">{{ s.strategy_name }}</div>
                  <div class="strategy-dual-meta">Giá: {{ s.amount_per_unit_text }} - TG: {{ s.op_per_unit }}s</div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- Cấu hình khác -->
        <el-col :span="12" v-if="!props.editData">
          <el-form-item label="Số trụ" required>
            <el-input-number
              v-model="form.initial_bay_count"
              :min="1"
              :max="5"
              :step="1"
              step-strictly
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :span="!props.editData ? 12 : 24">
          <el-form-item label="Trạng thái">
            <el-segmented 
              v-model="form.is_active" 
              :options="statusOptions"
              class="w-full status-segmented"
            />
          </el-form-item>
        </el-col>

        <!-- Địa chỉ & Thông tin thêm -->
        <el-col :span="24">
          <el-form-item label="Địa chỉ chi tiết" required>
            <el-input v-model="form.address" :prefix-icon="Location" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="Prefix chuyển khoản (Tự động)" class="prefix-form-item">
            <el-input v-model="form.prefix" disabled />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button 
          v-if="props.editData" 
          type="danger" 
          plain 
          :icon="Delete"
          @click="handleDelete"
          class="delete-btn"
        >
          Xóa trạm
        </el-button>
        
        <div class="right-buttons">
          <el-button @click="visible = false">Hủy bỏ</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ props.editData ? 'Cập nhật' : 'Tạo trạm mới' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Location, Delete } from '@element-plus/icons-vue';
import { stationApi } from "@/api/station";
import { wardApi } from "@/api/ward";
import { strategyApi } from "@/api/strategy";
import { bankaccountApi } from "@/api/bank-account";
import { agencyApi } from "@/api/agency";
import { useMetadataStore } from '@/stores/metadata';
import { confirmPopup } from '@/utils/popup'

const metadataStore = useMetadataStore();

const provinceData = computed(() => metadataStore.provinces.map(p => ({
  id: p.id,
  name: p.province_name,
  code: p.province_code
})));

const emit = defineEmits(['close', 'refresh']);
const props = defineProps({ editData: { type: Object, default: null } });

const visible = ref(true); // Điều khiển el-dialog
const submitting = ref(false);
const loadingWards = ref(false);

const statusOptions = [
  { label: 'Hoạt động', value: 1 },
  { label: 'Tạm dừng', value: 0 }
];

const wards = ref([]);
const agencies = ref([]);
const agencySearchKeyword = ref('');
const bankaccounts = ref([]);
const strategies = ref([]);

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();
const formatVnNumber = (value) => Number(value || 0).toLocaleString('vi-VN');
const filteredAgencyOptions = computed(() => {
  if (!agencySearchKeyword.value) return agencies.value;
  return agencies.value.filter((agency) =>
    String(agency.search_text || '').includes(agencySearchKeyword.value)
  );
});

const handleAgencyFilter = (query) => {
  agencySearchKeyword.value = normalizeSearchValue(query);
};

const form = reactive({
  station_name: '',
  province_id: null,
  ward_id: null,
  agency_id: null,
  address: '',
  latitude: null,
  longitude: null,
  is_active: 1,
  prefix: '',
  bank_account_id: null,
  strategy_id: null,
  initial_bay_count: 1,
});

const normalizeInitialBayCount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.min(5, Math.max(1, Math.round(num)));
};

// Logic giữ nguyên nhưng thay Alert bằng ElMessage
const handleProvinceChange = async (val) => {
  form.ward_id = null;
  const selectedProvince = provinceData.value.find(p => p.id === val);
  if (!selectedProvince) return;

  try {
    const codeRes = await stationApi.generateCode(selectedProvince.code);
    form.station_name = codeRes.data.nextCode;
    form.prefix = codeRes.data.nextCode;

    loadingWards.value = true;
    const [wardRes, agencyRes] = await Promise.all([
      wardApi.getWards(val),
      agencyApi.getAgencies()
    ]);
    
    wards.value = (wardRes.data.data || []).map(i => ({ id: i.id, name: i.ward_name }));
    agencies.value = (agencyRes.data.data || []).map(i => ({
      id: i.id,
      agency_name: i.agency_name,
      identity_number: i.identity_number,
      search_text: normalizeSearchValue(`${i.id || ''} ${i.agency_name || ''} ${i.identity_number || ''} ${i.phone || ''}`)
    }));
  } catch (error) {
    ElMessage.error("Lỗi tải thông tin khu vực");
  } finally {
    loadingWards.value = false;
  }
};

const handleAgencyChange = async (val) => {
  form.bank_account_id = null;
  form.strategy_id = null;
  try {
    const [bankRes, stratRes] = await Promise.all([
      bankaccountApi.getBankAccounts(val),
      strategyApi.getStrategies(val)
    ]);
    bankaccounts.value = bankRes.data.data.map(i => ({
      id: i.id, name: `${i.bank_name} - ${i.account_number}`
    }));
    strategies.value = stratRes.data.data.map(i => ({
      id: i.id,
      strategy_name: i.strategy_name || i.name || `Chiến lược #${i.id}`,
      amount_per_unit: i.amount_per_unit,
      amount_per_unit_text: formatVnNumber(i.amount_per_unit),
      op_per_unit: i.op_per_unit,
      foam_per_unit: i.foam_per_unit,
      name: `${i.strategy_name || i.name || `Chiến lược #${i.id}`} - Giá: ${formatVnNumber(i.amount_per_unit)} - TG: ${i.op_per_unit}s - Bọt: ${i.foam_per_unit}ml`
    }));
  } catch (error) {
    ElMessage.error("Lỗi tải dữ liệu đại lý");
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const payload = {
      station_name: form.station_name,
      address: form.address,
      longitude: form.longitude,
      latitude: form.latitude,
      province_id: form.province_id,
      ward_id: form.ward_id,
      agency_id: form.agency_id,
      bank_account_id: form.bank_account_id,
      strategy_id: form.strategy_id,
      is_active: form.is_active,
      transfer_prefix: form.prefix
    };

    if (props.editData) {
      await stationApi.updateStation(props.editData.id, payload);
      ElMessage.success('Cập nhật trạm thành công');
    } else {
      await stationApi.createStation({
        ...payload,
        initial_bay_count: normalizeInitialBayCount(form.initial_bay_count)
      });
      ElMessage.success('Thêm trạm mới thành công');
    }
    emit('refresh');
    visible.value = false;
  } catch (error) {
    ElMessage.error('Không thể lưu thông tin. Vui lòng kiểm tra lại.');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async () => {
  const confirmed = await confirmPopup(
    `Bạn có chắc muốn xóa trạm ${props.editData.station_name}?`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xác nhận xóa', cancelButtonText: 'Hủy', type: 'warning' }
  )
  if (!confirmed) return

  try {
    submitting.value = true;
    await stationApi.deleteStation(props.editData.id);
    ElMessage.success('Đã xóa trạm');
    emit('refresh');
    visible.value = false;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Lỗi khi xóa trạm';
    ElMessage.error(errorMsg);
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await metadataStore.fetchProvinces();
  if (props.editData) {
    Object.assign(form, {
      ...props.editData,
      is_active: props.editData.is_active ? 1 : 0
    });
    await handleProvinceChange(form.province_id);
    await handleAgencyChange(form.agency_id);
    // Gán lại các ID sau khi options đã load xong
    form.ward_id = props.editData.ward_id;
    form.bank_account_id = props.editData.bank_account_id;
    form.strategy_id = props.editData.strategy_id;
    form.station_name = props.editData.station_name;
    form.prefix = props.editData.transfer_prefix;
  }
});
</script>

<style scoped>
.w-full { width: 100%; }

.station-form {
  padding: 10px 5px;
}



/* Responsive Dialog */
:deep(.station-detail-dialog) {
  width: 650px;
  max-width: 98%;
  border-radius: 12px;
  overflow: hidden;
}

@media (max-width: 768px) {
  :deep(.station-detail-dialog) {
    width: 98% !important;
    margin: 10px auto !important;
  }
  
  :deep(.el-dialog__body) {
    padding: 12px 16px !important;
  }

  .coordinate-inputs {
    gap: 10px !important;
  }
  
  /* Slightly more readable fonts */
  .high-density-mobile :deep(.el-form-item__label) {
    font-size: 12px !important;
  }
  
  .high-density-mobile :deep(.el-input__inner),
  .high-density-mobile :deep(.el-select__wrapper) {
    font-size: 14px !important;
  }

  .status-segmented :deep(.el-segmented__item-label) {
    font-size: 12px !important;
    padding: 0 6px !important;
  }
}

/* High density form - loosened slightly */
.high-density-mobile :deep(.el-form-item) {
  margin-bottom: 14px;
}

.high-density-mobile :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--el-text-color-regular);
  padding-bottom: 4px !important;
  line-height: 1.2;
  margin-bottom: 0 !important;
}

.station-form {
  padding: 0;
}



/* Dual display formatting */
.agency-dual, .strategy-dual {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  padding: 2px 0;
}

.agency-dual-name, .strategy-dual-name {
  font-weight: 600;
  font-size: 13px;
}

.agency-dual-id, .strategy-dual-meta {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

/* Footer layout */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 10px;
}

@media (max-width: 480px) {
  .dialog-footer {
    flex-direction: column-reverse;
    padding-top: 10px;
  }
  
  .right-buttons {
    width: 100%;
    flex-direction: row; /* Keep buttons side by side if possible or stack */
    justify-content: stretch;
  }
  
  .right-buttons .el-button {
    flex: 1;
    margin-left: 0 !important;
  }
  
  .delete-btn {
    width: 100%;
  }
}

.right-buttons {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* Premium Inputs */
:deep(.el-input__wrapper), :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #e4e7ed inset;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  padding: 4px 12px !important;
  height: 40px;
}

@media (max-width: 768px) {
  :deep(.el-input__wrapper), :deep(.el-select__wrapper) {
    height: 36px;
    padding: 2px 10px !important;
  }
}

:deep(.el-input__wrapper:hover), :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

:deep(.el-input__wrapper.is-focus), :deep(.el-select__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
}

:deep(.el-input.is-disabled .el-input__wrapper) {
  background-color: #f5f7fa;
}
/* Giảm khoảng cách chỉ cho prefix */
.prefix-form-item {
  margin-bottom: 4px !important;
}
</style>