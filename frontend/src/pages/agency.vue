<template>
  <div class="page">

    <div class="page-header">
      <div class="header-title">
        <el-icon :size="20" color="#409eff"><Shop /></el-icon>
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>
      <el-button v-if="isSaOnly" type="primary" :icon="Plus" @click="handleAdd" class="mobile-add-btn">
        Thêm mới
      </el-button>
    </div>

    <div class="filter-section" v-if="!isAgencyOnly">
      <el-input
        v-model="keyword"
        placeholder="Tìm theo tên, mã đại lý hoặc số điện thoại..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <div class="grid-wrapper">
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="filteredList.length === 0" class="empty-state">
        <el-empty description="Không tìm thấy đại lý nào phù hợp" />
      </div>

      <div class="grid" v-else>
        <el-card 
          v-for="item in visibleList" 
          :key="item.id" 
          class="agency-card" 
          shadow="hover"
        >
          <div class="card-header-custom">
            <el-avatar 
              :size="52" 
              :src="item.avatar || defaultAvatar" 
              shape="square"
              class="agency-avatar"
            />
            <div class="header-info">
              <div class="agency-name">{{ item.agency_name }}</div>
              <div class="agency-id">
                <el-tag size="small" type="info" effect="plain">ID: {{ item.identity_number }}</el-tag>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="info-line">
              <span class="label">
                <el-icon><Location /></el-icon> Khu vực
              </span>
              <span class="value">{{ item.ward_name }}, {{ item.province_name }}</span>
            </div>
            
            <div class="info-line">
              <span class="label">
                <el-icon><House /></el-icon> Địa chỉ
              </span>
              <span class="value">{{ item.address }}</span>
            </div>

            <div class="info-line">
              <span class="label">
                <el-icon><Phone /></el-icon> Điện thoại
              </span>
              <span class="value">{{ item.phone }}</span>
            </div>

            <div class="info-line">
              <span class="label">
                <el-icon><Message /></el-icon> Email
              </span>
              <span class="value">{{ item.email }}</span>
            </div>

            <div class="info-line" v-if="item.tax_code">
              <span class="label">
                <el-icon><CreditCard /></el-icon> MST
              </span>
              <span class="value">{{ item.tax_code }}</span>
            </div>
          </div>

          <template #footer>
            <div class="button-group">
              <el-button 
                v-if="canEditAgency"
                type="info" 
                plain 
                :icon="Edit" 
                class="flex-1" 
                @click="handleEdit(item)"
              >
                Sửa
              </el-button>
            </div>
          </template>
        </el-card>
      </div>

      <div class="pagination-footer" v-if="filteredList.length > pageSize">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="filteredList.length"
          :page-size="pageSize"
          v-model:current-page="page"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="showModal"
      :title="isEdit ? 'Chỉnh sửa đại lý' : 'Thêm đại lý mới'"
      width="550px"
      destroy-on-close
      border-radius="8px"
    >
      <el-form :model="formData" label-position="top" class="custom-form">
        <el-form-item label="Tên đại lý" required>
          <el-input v-model="formData.agency_name" placeholder="Nhập tên đại lý hoặc cửa hàng" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Số CCCD" required>
              <el-input v-model="formData.identity_number" placeholder="Số căn cước" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Mã số thuế">
              <el-input v-model="formData.tax_code" placeholder="Nhập MST (nếu có)" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Tỉnh/Thành phố" required>
              <el-select 
                v-model="formData.province_id" 
                placeholder="Chọn tỉnh" 
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
                v-model="formData.ward_id" 
                :disabled="!formData.province_id || loadingWards" 
                placeholder="Chọn huyện" 
                class="w-full"
                filterable
              >
                <el-option v-for="w in wards" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Địa chỉ cụ thể">
          <el-input v-model="formData.address" placeholder="Số nhà, tên đường..." />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Số điện thoại liên hệ" required>
              <el-input v-model="formData.phone" :icon="Phone" placeholder="09xxx..." />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Địa chỉ Email" required>
              <el-input v-model="formData.email" placeholder="example@gmail.com" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- Tạo tài khoản người dùng kèm (chỉ hiện khi tạo mới) -->
        <template v-if="!isEdit">
          <el-divider />
          <el-form-item>
            <div class="account-toggle-row">
              <el-switch v-model="createAccount" active-color="#409eff" />
              <span class="account-toggle-label">Tạo tài khoản đăng nhập ngay cho đại lý này</span>
            </div>
          </el-form-item>
          <template v-if="createAccount">
            <el-row :gutter="20">
              <el-col :span="24">
                <el-alert title="Tài khoản sẽ sử dụng Email của đại lý để đăng nhập." type="info" :closable="false" show-icon style="margin-bottom: 12px;" />
              </el-col>
              <el-col :span="12">
              </el-col>
              <el-col :span="12">
                <el-form-item label="Mật khẩu ban đầu" required>
                  <el-input v-model="accountPassword" type="password" show-password placeholder="Mặc định: 123456aA@" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="account-default-note">
              Email đăng nhập: <strong>{{ formData.email || 'Chưa nhập email' }}</strong>
            </div>
          </template>
        </template>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button 
            v-if="isEdit && isSaOnly" 
            type="danger" 
            plain 
            :icon="Delete" 
            @click="handleDelete"
          >
            Xóa đại lý
          </el-button>
          <div class="right-buttons">
            <el-button @click="showModal = false">Đóng</el-button>
            <el-button type="primary" @click="handleSubmit">
              {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { wardApi } from "@/api/ward"; 
import { agencyApi } from "@/api/agency"; 
import { strategyApi } from "@/api/strategy"; 
import { Shop, CreditCard, Plus,   Search,   Edit,   Delete,   
         Location,   Phone,   Message,   House } from '@element-plus/icons-vue';
import { authStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { confirmPopup } from '@/utils/popup';

const router = useRouter();

const isSaOnly = computed(() => authStore.hasAnyRole(['sa']));
const isAgencyOnly = computed(() => authStore.hasAnyRole(['agency']) && !isSaOnly.value);
const canEditAgency = computed(() => authStore.hasAnyRole(['sa', 'agency']));
const pageTitle = computed(() => (isAgencyOnly.value ? 'Thông tin đại lý' : 'Quản lý đại lý'));

const keyword = ref('')
const loading = ref(true)
const list = ref([]) // Dữ liệu từ API
const defaultAvatar = 'https://i.pravatar.cc/100?img=3'

const page = ref(1)
const pageSize = ref(8)

import { useMetadataStore } from '@/stores/metadata';

const metadataStore = useMetadataStore();

// Lọc danh sách theo keyword
const filteredList = computed(() => {
  if (!keyword.value) return list.value
  const kw = keyword.value.toLowerCase()
  return list.value.filter(item =>
    item.agency_name.toLowerCase().includes(kw) ||
    String(item.identity_number).includes(kw)
  )
})

// Phân trang phía client
const visibleList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredList.value.slice(start, end)
})

const handlePageChange = (p) => {
  page.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Gọi API lấy dữ liệu
const fetchAgencies = async () => {
  loading.value = true
  try {
    await metadataStore.fetchAgencies()
    const data = metadataStore.agencies
    list.value = data.map(item => ({  
      id: item.id,      
      agency_name: item.agency_name,
      identity_number: item.identity_number,        
      address: item.address,
      ward_id: item.ward_id,
      province_id: item.province_id,
      ward_name: item.ward_name,
      province_name: item.province_name,
      phone: item.phone,
      email: item.email,   
      tax_code: item.tax_code,     
      avatar: item.avatar
    }))
  } catch (error) {
    console.error('Lỗi khi fetch agencies:', error)
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAgencies()
  metadataStore.fetchProvinces()
})

const provinceData = computed(() => metadataStore.provinces.map(p => ({
  id: p.id,
  name: p.province_name,
  code: p.province_code
})))

const showModal = ref(false)
const isEdit = ref(false)
const createAccount = ref(false)
const accountPassword = ref('')
const DEFAULT_AGENCY_PASSWORD = '123456aA@'
const formData = ref({
  id: null,
  province_id: '',
  ward_id: '',
  agency_name: '',
  identity_number: '',
  address: '',
  phone: '',
  email: '',
  tax_code: '',
  is_active: '',
  avatar: '' 
})

// Load Tỉnh/Huyện/Đại lý
const wards = ref([]);
const loadingWards = ref(false);
const handleProvinceChange = async (val) => {
  formData.value.ward_id = null;
  if (!val) return;

  try {
    loadingWards.value = true;
    const wardRes = await wardApi.getWards(val);    
    wards.value = wardRes.data.data.map(i => ({ id: i.id, name: i.ward_name }));

  } catch (error) {
    console.error(error);
  } finally {
    loadingWards.value = false;
  }
};


// Mở form thêm mới
const handleAdd = () => {
  isEdit.value = false
  createAccount.value = false
  accountPassword.value = ''
  // Reset form về mặc định
  formData.value = {
    id: null,
    province_id: '',
    ward_id: '',
    agency_name: '',
    identity_number: '',
    address: '',
    phone: '',
    email: '',
    tax_code: '',
    is_active: 1,
    avatar: ''
  }
  showModal.value = true
}

// Mở form chỉnh sửa
const handleEdit = (item) => {
  isEdit.value = true
  createAccount.value = false
  accountPassword.value = ''
  formData.value = {
    id: item.id,
    province_id: item.province_id,
    ward_id: item.ward_id,
    agency_name: item.agency_name,
    identity_number: item.identity_number,
    address: item.address,
    phone: item.phone,
    email: item.email,
    tax_code: item.tax_code,
    is_active: item.is_active || 1,
    avatar: item.avatar || ''
  }
  showModal.value = true
}

watch(createAccount, (enabled) => {
  if (enabled) {
    if (!accountPassword.value) {
      accountPassword.value = DEFAULT_AGENCY_PASSWORD
    }
  }
})

const createAgency = async (agencyData) => {
  try {
    const payload = { ...agencyData }
    if (createAccount.value) {
      const passwordValue = accountPassword.value || DEFAULT_AGENCY_PASSWORD
      if (passwordValue.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự')
      payload.accountData = { password: passwordValue }
    }

    // 1. Gọi API tạo đại lý mới
    const response = await agencyApi.createAgency(payload)

    // Kiểm tra nếu tạo đại lý thành công và có ID trả về
    if (response && response.data.data && response.data.data.id) {
      const newAgencyId = response.data.data.id;

      // 2. Định nghĩa object chiến lược mặc định
      const defaultStrategy = {
        strategy_name: "Mặc định",
        agency_id: newAgencyId,
        amount_per_unit: 1000,
        op_per_unit: 60,
        foam_per_unit: 6,
        enabled: 1
      };

      // 3. Gọi API tạo chiến lược
      try {
        await strategyApi.createStrategies(defaultStrategy);
      } catch (stratErr) {
        console.error("Lỗi tạo chiến lược mặc định:", stratErr);
        // Không chặn quá trình nếu chỉ lỗi tạo chiến lược
      }

      return {
        agencyId: newAgencyId,
        agencyName: agencyData.agency_name,
        identityNumber: agencyData.identity_number || '',
        email: agencyData.email
      }
    }

    throw new Error('Không nhận được thông tin đại lý sau khi tạo');
  } catch (error) {
    console.error("Lỗi khi tạo đại lý:", error);
    if (error?.response?.status === 409) {
      throw new Error('Email đại lý này đã được sử dụng cho một tài khoản khác');
    }
    throw error;
  }
};

// Xử lý nút Lưu (Submit)
const handleSubmit = async () => {
  if (!formData.value.agency_name) {
    ElMessage.warning('Vui lòng nhập tên đại lý')
    return
  }

  if (!formData.value.identity_number) {
    ElMessage.warning('Vui lòng nhập số CCCD đại lý')
    return
  }

  if (!formData.value.province_id) {
    ElMessage.warning('Vui lòng chọn tỉnh/thành phố')
    return
  }

  if (!formData.value.ward_id) {
    ElMessage.warning('Vui lòng chọn quận/huyện')
    return
  }

  const normalizedAddress = String(formData.value.address || '').trim()
  if (!normalizedAddress) {
    ElMessage.warning('Vui lòng nhập địa chỉ đại lý')
    return
  }
  formData.value.address = normalizedAddress

  const normalizedPhone = String(formData.value.phone || '').trim()
  if (!normalizedPhone) {
    ElMessage.warning('Vui lòng nhập số điện thoại đại lý')
    return
  }
  formData.value.phone = normalizedPhone

  const normalizedEmail = String(formData.value.email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    ElMessage.warning('Vui lòng nhập email đại lý')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    ElMessage.warning('Email đại lý không hợp lệ')
    return
  }
  formData.value.email = normalizedEmail

  try {
    if (isEdit.value) {
      if(await agencyApi.updateAgency(formData.value.id, formData.value)) {
        ElMessage.success(`Đã cập nhật đại lý thành công: ${formData.value.agency_name}`)
      }
      else {
        ElMessage.error(`Cập nhật đại lý thất bại: ${formData.value.agency_name}`)
      }

    } else {
      const result = await createAgency(formData.value);
      if (result?.email) {
        ElMessage.success(`Đã tạo đại lý: ${result.agencyName}. Email đăng nhập: ${result.email}`)
      } else {
        ElMessage.success(`Đã tạo đại lý thành công: ${formData.value.agency_name}`)
      }

      if (result?.agencyId) {
        const shouldCreateBankAccount = await confirmPopup(
          `Đại lý "${result.agencyName}" đã được tạo thành công. Bạn có muốn tạo tài khoản ngân hàng ngay bây giờ không?`,
          'Tạo tài khoản ngân hàng',
          {
            confirmButtonText: 'Tạo ngay',
            cancelButtonText: 'Để sau',
            type: 'info'
          }
        )

        if (shouldCreateBankAccount) {
          showModal.value = false
          await router.push({
            name: 'bank-account',
            query: {
              autoCreate: '1',
              agencyId: String(result.agencyId),
              agencyName: result.agencyName || '',
              identityNumber: result.identityNumber || ''
            }
          })
          return
        }
      }
    }
    
    showModal.value = false
    fetchAgencies() // Tải lại danh sách sau khi lưu
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu:', error)
    ElMessage.error('Lưu dữ liệu thất bại. Vui lòng thử lại.')
  }
}

// Xử lý nút Xóa
const handleDelete = async () => {
  const id = formData.value.id;
  const name = formData.value.agency_name;

  // 1. Xác nhận với người dùng
  const confirmed = await confirmPopup(
    `Bạn có chắc chắn muốn xóa đại lý "${name}" không? Hành động này không thể hoàn tác.`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xóa ngay', cancelButtonText: 'Hủy', type: 'warning' }
  )
  if (!confirmed) {
    return;
  }

  try {
    loading.value = true;
    
    // 2. Gọi API xóa (Giả sử agencyApi có hàm deleteAgency)
    const success = await agencyApi.deleteAgency(id);
    
    if (success) {
      ElMessage.success(`Đã xóa đại lý ${name} thành công`);
      showModal.value = false; // Đóng modal
      fetchAgencies();         // Tải lại danh sách để cập nhật giao diện
    } else {
      ElMessage.error('Xóa đại lý thất bại. Vui lòng thử lại.');
    }
  } catch (error) {
    console.error("Lỗi khi xóa đại lý:", error);
    ElMessage.error('Có lỗi xảy ra trong quá trình xóa.');
  } finally {
    loading.value = false;
  }
};

</script>

<style scoped>
.account-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-toggle-label {
  font-size: 14px;
  color: var(--el-text-color-regular, var(--text-main));
}

.account-default-note {
  margin-top: 4px;
  color: var(--text-faint);
  font-size: 12px;
}

.page {
  padding: 16px 24px;
  background: var(--bg-body);
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-main);
  transition: background 0.2s ease;
  overflow: hidden;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.filter-section {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.search-input {
  max-width: 400px;
}

.grid-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Cấu trúc Grid cho Card */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px; /* Space for scrollbar */
}

.agency-card {
  --el-card-padding: 16px;
  border-radius: 8px;
}

.card-header-custom {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.agency-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-main);
}

.agency-id {
  font-size: 12px;
  color: var(--text-faint);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.label {
  color: var(--text-muted);
}

.value {
  color: var(--text-main);
  font-weight: 500;
  text-align: right;
}

.button-group {
  display: flex;
  gap: 10px;
}

.flex-1 {
  flex: 1;
}

.pagination-footer {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.right-buttons {
  display: flex;
  gap: 12px;
}

.w-full {
  width: 100%;
}

@media (max-width: 768px) {
  .page {
    padding: 8px;
  }

  .filter-section {
    margin-bottom: 12px;
  }

  .search-input {
    max-width: 100%;
    width: 100%;
  }

  /* Single column grid on small screens */
  .grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .agency-card {
    --el-card-padding: 12px;
  }

  .card-header-custom {
    padding-bottom: 8px;
    margin-bottom: 10px;
  }

  .agency-name {
    font-size: 14px;
  }

  .button-group {
    flex-wrap: wrap;
  }

  .button-group :deep(.el-button) {
    flex: 1 1 auto;
    font-size: 11px;
    padding: 6px 10px;
  }
}

@media (max-width: 900px) and (orientation: landscape) {
  .page {
    padding: 4px 8px;
  }

  /* Two columns in landscape */
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
</style>