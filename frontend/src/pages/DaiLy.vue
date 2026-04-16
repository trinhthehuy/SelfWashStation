<template>
  <div class="page">

    <div class="page-header">
      <div class="header-title">
        <el-icon :size="20" color="#409eff"><Shop /></el-icon>
        <h2>Quản lý đại lý</h2>
      </div>
      <el-button v-if="isSaOnly" type="primary" :icon="Plus" @click="handleAdd">
        Thêm đại lý
      </el-button>
    </div>

    <div class="filter-section">
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
          v-for="item in filteredList" 
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
                v-if="isSaOnly"
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
            <el-form-item label="Số CCCD">
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
            <el-form-item label="Số điện thoại liên hệ">
              <el-input v-model="formData.phone" :icon="Phone" placeholder="09xxx..." />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Địa chỉ Email">
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
              <el-col :span="12">
                <el-form-item label="Tên đăng nhập" required>
                  <el-input v-model="accountUsername" placeholder="VD: daily.ninh.binh" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Mật khẩu ban đầu" required>
                  <el-input v-model="accountPassword" type="password" show-password placeholder="Tối thiểu 6 ký tự" />
                </el-form-item>
              </el-col>
            </el-row>
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
import { ref, computed, onMounted } from 'vue'
import { wardApi } from "@/api/ward"; 
import { agencyApi } from "@/api/agency"; 
import { strategyApi } from "@/api/strategy"; 
import { Shop, CreditCard, Plus,   Search,   Edit,   Delete,   
         Location,   Phone,   Message,   House } from '@element-plus/icons-vue';
import { authStore } from '@/stores/auth';

const isSaOnly = computed(() => authStore.hasAnyRole(['sa']));

const keyword = ref('')
const loading = ref(true)
const list = ref([]) // Dữ liệu từ API
const defaultAvatar = 'https://i.pravatar.cc/100?img=3'

// Lọc danh sách theo keyword
const filteredList = computed(() => {
  if (!keyword.value) return list.value
  return list.value.filter(item =>
    item.agency_name.toLowerCase().includes(keyword.value.toLowerCase()) ||
    String(item.identity_number).includes(keyword.value)
  )
})

// Gọi API lấy dữ liệu
const fetchAgencies = async () => {
  loading.value = true
  try {
    const response = await agencyApi.getAgencies();
    const data = await response.data.data;
    if (Array.isArray(data)) {
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
        avatar: item.avatar || defaultAvatar
      }))
    } else {
      list.value = []
      console.error('API trả về không phải mảng:', data)
    }
  } catch (error) {
    console.error('Lỗi khi fetch API:', error)
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAgencies()
})

const showModal = ref(false)
const isEdit = ref(false)
const createAccount = ref(false)
const accountUsername = ref('')
const accountPassword = ref('')
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
// Danh sách tỉnh
const provinceData = [
  { name: "An Giang", code: "AG", id: 32 },
  { name: "Bắc Ninh", code: "BN", id: 2 },
  { name: "Cà Mau", code: "CM", id: 34 },
  { name: "Cần Thơ", code: "CT", id: 33 },
  { name: "Cao Bằng", code: "CB", id: 7 },
  { name: "Đà Nẵng", code: "DN", id: 21 },
  { name: "Đắc Lắc", code: "DL", id: 25 },
  { name: "Điện Biên", code: "DB", id: 13 },
  { name: "Đồng Nai", code: "DI", id: 28 },
  { name: "Đồng Tháp", code: "DT", id: 31 },
  { name: "Gia Lai", code: "GL", id: 24 },
  { name: "Hà Nội", code: "HN", id: 1 },
  { name: "Hà Tĩnh", code: "HT", id: 18 },
  { name: "Hải Phòng", code: "HP", id: 4 },
  { name: "Hồ Chí Minh", code: "HC", id: 29 },
  { name: "Huế", code: "HU", id: 20 },
  { name: "Hưng Yên", code: "HY", id: 5 },
  { name: "Khánh Hòa", code: "KH", id: 23 },
  { name: "Lai Châu", code: "LU", id: 14 },
  { name: "Lâm Đồng", code: "LD", id: 26 },
  { name: "Lạng Sơn", code: "LS", id: 11 },
  { name: "Lào Cai", code: "LI", id: 9 },
  { name: "Nghệ An", code: "NA", id: 17 },
  { name: "Ninh Bình", code: "NB", id: 6 },
  { name: "Phú Thọ", code: "PT", id: 12 },
  { name: "Quảng Ngãi", code: "QI", id: 22 },
  { name: "Quảng Ninh", code: "QH", id: 3 },
  { name: "Quảng Trị", code: "QT", id: 19 },
  { name: "Sơn La", code: "SL", id: 15 },
  { name: "Tây Ninh", code: "TI", id: 27 },
  { name: "Thái Nguyên", code: "TN", id: 10 },
  { name: "Thanh Hóa", code: "TH", id: 16 },
  { name: "Tuyên Quang", code: "TQ", id: 8 },
  { name: "Vĩnh Long", code: "VL", id: 30 }
];
// Load Tỉnh/Huyện/Đại lý
const wards = ref([]);
const loadingWards = ref(false);
const handleProvinceChange = async (val) => {
  formData.value.ward_id = null;
  const selectedProvince = provinceData.find(p => p.id === val);
  if (!selectedProvince) return;

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
  accountUsername.value = ''
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

const createAgency = async (agencyData) => {
  try {
    const payload = { ...agencyData }

    // Gửi accountData nếu người dùng bật switch tạo tài khoản
    if (createAccount.value) {
      if (!accountUsername.value) throw new Error('Vui lòng nhập tên đăng nhập')
      if (!accountPassword.value || accountPassword.value.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự')
      payload.accountData = { username: accountUsername.value, password: accountPassword.value }
    }

    // 1. Gọi API tạo đại lý mới
    const response = await agencyApi.createAgency(payload);

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
      await strategyApi.createStrategies(defaultStrategy);

      const createdAccount = response.data.data.createdAccount
      if (createdAccount) {
        return { agencyName: agencyData.agency_name, username: createdAccount.username }
      }
    } else {
      console.error("Không nhận được ID:", response);
    }
    return { agencyName: agencyData.agency_name, username: null }
  } catch (error) {
    console.error("Lỗi khi tạo đại lý hoặc chiến lược:", error);
    throw error;
  }
};

// Xử lý nút Lưu (Submit)
const handleSubmit = async () => {
  if (!formData.value.agency_name) return alert('Vui lòng nhập tên đại lý')
  try {
    if (isEdit.value) {
      if(await agencyApi.updateAgency(formData.value.id, formData.value)) {
        alert(`Đã cập nhật đại lý thành công: ${formData.value.agency_name}`)
      }
      else {
        alert(`Cập nhật đại lý thất bại: ${formData.value.agency_name}`)
      }

    } else {
      const result = await createAgency(formData.value);
      if (result?.username) {
        alert(`Đã tạo đại lý: ${result.agencyName}\nTài khoản đăng nhập: ${result.username}`)
      } else {
        alert(`Đã tạo đại lý thành công: ${formData.value.agency_name}`)
      }
    }
    
    showModal.value = false
    fetchAgencies() // Tải lại danh sách sau khi lưu
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu:', error)
  }
}

// Xử lý nút Xóa
const handleDelete = async () => {
  const id = formData.value.id;
  const name = formData.value.agency_name;

  // 1. Xác nhận với người dùng
  if (!confirm(`Bạn có chắc chắn muốn xóa đại lý "${name}" không? Hành động này không thể hoàn tác.`)) {
    return;
  }

  try {
    loading.value = true;
    
    // 2. Gọi API xóa (Giả sử agencyApi có hàm deleteAgency)
    const success = await agencyApi.deleteAgency(id);
    
    if (success) {
      alert(`Đã xóa đại lý ${name} thành công`);
      showModal.value = false; // Đóng modal
      fetchAgencies();         // Tải lại danh sách để cập nhật giao diện
    } else {
      alert("Xóa đại lý thất bại. Vui lòng thử lại.");
    }
  } catch (error) {
    console.error("Lỗi khi xóa đại lý:", error);
    alert("Có lỗi xảy ra trong quá trình xóa.");
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

.page {
  padding: 24px;
  background: var(--bg-body);
  min-height: 100%;
  color: var(--text-main);
  transition: background 0.2s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 24px;
}

.search-input {
  max-width: 400px;
}

/* Cấu trúc Grid cho Card */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
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
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
  }

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