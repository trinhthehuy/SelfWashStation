<template>
  <div class="page-container">
    <el-card shadow="never" class="settings-hero">
      <div class="header-content">
        <h2 class="page-title">Tài khoản hệ thống</h2>
        <el-button v-if="isSa" type="primary" :icon="Plus" @click="handleAdd" class="mobile-add-btn">
          Thêm mới
        </el-button>
      </div>
    </el-card>

    <!-- Bảng danh sách tài khoản -->
    <el-card shadow="never" class="table-card user-list-card">
      <template #header>
        <div class="card-header">
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="Tìm kiếm..."
              clearable
              :prefix-icon="Search"
              class="search-input"
              autocomplete="off"
            />
          </div>
        </div>
      </template>
      
      <!-- Desktop Table -->
      <el-table 
        v-if="!isMobile"
        ref="tableRef"
        :data="filteredUsers" 
        border
        stripe 
        v-loading="loading"
        height="100%"
      >
        <el-table-column prop="fullName" label="Tên hiển thị" min-width="180" />
        <el-table-column prop="email" label="Email / Tài khoản" min-width="200" />
        <el-table-column label="Vai trò" width="130">
          <template #default="{ row }">
            <el-tag :type="roleTag(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Liên kết" min-width="150">
          <template #default="{ row }">
            <span v-if="row.role === 'agency'">{{ agencyById(row.agencyId)?.agency_name || `Đại lý #${row.agencyId}` }}</span>
            <span v-else-if="row.role === 'regional_manager' && row._scope">{{ row._scope.provinceIds?.length || 0 }} tỉnh</span>
            <span v-else-if="row.role === 'station_supervisor' && row._scope">{{ row._scope.stationIds?.length || 0 }} trạm</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Đăng nhập cuối" min-width="140">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">{{ row.isActive ? 'Bật' : 'Khóa' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isSa" label="Thao tác" width="180" fixed="right" align="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">Sửa</el-button>
            <el-button type="warning" link :icon="Key" @click="handleResetPwd(row)"></el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)" :disabled="row.email === 'admin@system.local' || row.id === currentUserId"></el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile List -->
      <div v-else class="mobile-user-list" v-loading="loading">
        <div v-for="u in filteredUsers" :key="u.id" class="mobile-user-card">
          <div class="m-card-header">
            <div class="m-card-title">
              <strong>{{ u.email }}</strong>
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                <el-tag :type="roleTag(u.role)" size="small">{{ roleLabel(u.role) }}</el-tag>
              </div>
            </div>
            <div class="m-card-actions" v-if="isSa">
              <el-button type="primary" link :icon="Edit" @click="handleEdit(u)"></el-button>
              <el-button type="warning" link :icon="Key" @click="handleResetPwd(u)"></el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDelete(u)" :disabled="u.email === 'admin@system.local' || u.id === currentUserId"></el-button>
            </div>
          </div>
          <div class="m-card-body">
            <div class="m-info-row">
              <span class="m-label">Họ tên:</span>
              <span class="m-val">{{ u.fullName }}</span>
            </div>
            <div class="m-info-row">
              <span class="m-label">Liên kết:</span>
              <span class="m-val">
                <span v-if="u.role === 'agency'">{{ agencyById(u.agencyId)?.agency_name || `Đại lý #${u.agencyId}` }}</span>
                <span v-else-if="u.role === 'regional_manager' && u._scope">{{ u._scope.provinceIds?.length || 0 }} tỉnh</span>
                <span v-else-if="u.role === 'station_supervisor' && u._scope">{{ u._scope.stationIds?.length || 0 }} trạm</span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="m-info-row">
              <span class="m-label">Trạng thái:</span>
              <el-tag :type="u.isActive ? 'success' : 'danger'" size="small">{{ u.isActive ? 'Bật' : 'Khóa' }}</el-tag>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && filteredUsers.length === 0" description="Không có dữ liệu" />
      </div>

      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :layout="isMobile ? 'prev, pager, next' : 'total, prev, pager, next'"
          @current-change="handlePageChange"
          size="small"
        />
      </div>
    </el-card>

    <!-- Đổi mật khẩu của chính mình -->
    <el-card shadow="never" class="table-card pwd-card">
      <template #header><span style="font-size: 14px; font-weight: 600;">Đổi mật khẩu của tôi</span></template>
      <el-form :model="pwdForm" label-position="top" class="pwd-form-inline" ref="pwdFormRef" autocomplete="off">
        <!-- Dummy inputs to trick browser autofill -->
        <input type="text" style="display:none" />
        <input type="password" style="display:none" />
        <el-row :gutter="15">
          <el-col :span="6">
            <el-form-item label="Mật khẩu hiện tại" prop="current" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]">
              <el-input 
                v-model="pwdForm.current" 
                type="text" 
                placeholder="Mật khẩu cũ" 
                size="small" 
                autocomplete="new-password"
                @focus="$event.target.type = 'password'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Mật khẩu mới" prop="newPwd" :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }]">
              <el-input 
                v-model="pwdForm.newPwd" 
                type="text" 
                placeholder="Mật khẩu mới" 
                size="small" 
                autocomplete="new-password"
                @focus="$event.target.type = 'password'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Xác nhận lại" prop="confirm" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }, { validator: validateConfirmPwd, trigger: 'blur' }]">
              <el-input 
                v-model="pwdForm.confirm" 
                type="text" 
                placeholder="Xác nhận lại" 
                size="small" 
                autocomplete="new-password"
                @focus="$event.target.type = 'password'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6" style="display: flex; align-items: flex-end; padding-bottom: 18px;">
            <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd" size="small">Đổi mật khẩu</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Modal tạo / sửa tài khoản -->
    <el-dialog v-model="showModal" :title="isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'" width="480px" destroy-on-close>
      <el-form :model="form" ref="formRef" label-position="top" autocomplete="off">
        <!-- Dummy inputs to trick browser autofill -->
        <input type="text" name="fake-email" style="position: fixed; top: -1000px; left: -1000px; opacity: 0;" />
        <input type="password" name="fake-password" style="position: fixed; top: -1000px; left: -1000px; opacity: 0;" />

        <el-form-item label="Email (Dùng để đăng nhập)" prop="email" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }, { validator: validateEmailField, trigger: 'blur' }]">
          <el-input v-model="form.email" placeholder="Nhập email tài khoản" :disabled="isEdit" autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="Họ tên" prop="fullName" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]">
          <el-input v-model="form.fullName" placeholder="Nhập họ và tên" />
        </el-form-item>
        <el-form-item label="Vai trò" prop="role">
          <el-select v-model="form.role" style="width:100%" @change="onRoleChange">
            <el-option label="Quản trị hệ thống (SA)" value="sa" />
            <el-option label="Kỹ thuật viên (Engineer)" value="engineer" />
            <el-option label="Quản lý khu vực (RM)" value="regional_manager" />
            <el-option label="Giám sát trạm (Supervisor)" value="station_supervisor" />
            <el-option label="Chủ đại lý (Agency)" value="agency" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'agency'" label="Liên kết Đại lý" prop="agencyId" :rules="[{ required: true, message: 'Bắt buộc' }]">
          <el-select v-model="form.agencyId" filterable remote :remote-method="filterAgencyOptions" placeholder="Tìm tên hoặc ID đại lý" style="width:100%" @change="onAgencyChange">
            <el-option v-for="item in filteredAgencies" :key="item.id" :label="agencyDisplayLabel(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'regional_manager'" label="Quản lý Tỉnh" prop="provinceIds" :rules="[{ required: true, message: 'Bắt buộc' }]">
          <el-select v-model="form.provinceIds" multiple collapse-tags collapse-tags-tooltip placeholder="Chọn các tỉnh quản lý" style="width:100%">
            <el-option v-for="item in provinces" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'station_supervisor'" label="Giám sát Trạm" prop="stationIds" :rules="[{ required: true, message: 'Bắt buộc' }]">
          <el-select v-model="form.stationIds" multiple collapse-tags collapse-tags-tooltip placeholder="Chọn các trạm giám sát" style="width:100%">
            <el-option v-for="item in allStations" :key="item.id" :label="item.station_name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="Mật khẩu" prop="password" :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }]">
          <el-input v-model="form.password" type="password" show-password placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="Trạng thái">
          <el-switch v-model="form.isActive" active-text="Hoạt động" inactive-text="Khóa" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showModal = false">Hủy</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">{{ isEdit ? 'Cập nhật' : 'Tạo mới' }}</el-button>
      </template>
    </el-dialog>

    <!-- Modal đặt lại mật khẩu -->
    <el-dialog v-model="showResetPwd" title="Đặt lại mật khẩu" width="400px" destroy-on-close>
      <p style="margin: 0 0 16px; color: #909399;">Đặt mật khẩu mới cho tài khoản <strong>{{ resetTarget?.email }}</strong></p>
      <el-form :model="resetForm" :rules="resetRules" ref="resetFormRef" label-position="top">
        <el-form-item label="Mật khẩu mới" prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" show-password placeholder="Tối thiểu 6 ký tự" />
        </el-form-item>
        <el-form-item label="Xác nhận" prop="confirm">
          <el-input v-model="resetForm.confirm" type="password" show-password placeholder="Nhập lại mật khẩu" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetPwd = false">Hủy</el-button>
        <el-button type="warning" :loading="saving" @click="handleSubmitReset">Đặt lại</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, h, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Key, Search } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { useMetadataStore } from '@/stores/metadata'
import { authStore } from '@/stores/auth'
import { confirmPopup } from '@/utils/popup'

const metadataStore = useMetadataStore()

const loading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const pwdLoading = ref(false)
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const tableRef = ref(null)

const agencies = computed(() => metadataStore.agencies)
const provinces = computed(() => metadataStore.provinces)
const allStations = computed(() => metadataStore.allStations)
const provinceLoading = computed(() => metadataStore.provincesLoading)
const stationLoading = computed(() => metadataStore.stationsLoading)

const agencySearchKeyword = ref('')
const showModal = ref(false)
const isEdit = ref(false)
const showResetPwd = ref(false)
const resetTarget = ref(null)

const formRef = ref()
const resetFormRef = ref()
const pwdFormRef = ref()

const isMobile = ref(window.innerWidth < 768)
const handleResize = () => {
  isMobile.value = window.innerWidth < 768
}

const isSa = computed(() => authStore.hasAnyRole(['sa']))
const currentUserId = computed(() => authStore.state.user?.id)

const roleTag = (role) => {
  const map = { sa: 'danger', engineer: 'warning', regional_manager: 'success', station_supervisor: 'info', agency: '' }
  return map[role] || 'info'
}

const roleLabel = (role) => {
  const map = { sa: 'SA', engineer: 'Kỹ thuật', regional_manager: 'Quản lý vùng', station_supervisor: 'Giám sát', agency: 'Đại lý' }
  return map[role] || role
}

const form = ref({ fullName: '', email: '', role: 'agency', agencyId: null, provinceIds: [], stationIds: [], password: '', isActive: true })
const resetForm = ref({ newPassword: '', confirm: '' })
const pwdForm = ref({ current: '', newPwd: '', confirm: '' })

const validateConfirmPwd = (_rule, value, cb) => {
  if (!value || !pwdForm.value.newPwd) return cb()
  if (value !== pwdForm.value.newPwd) cb(new Error('Mật khẩu nhập lại không khớp'))
  else cb()
}
const validateEmailField = (_rule, value, cb) => {
  const email = String(value || '').trim().toLowerCase()
  if (!email) {
    cb()
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    cb(new Error('Email không hợp lệ'))
    return
  }
  cb()
}
const validateResetConfirm = (_rule, value, cb) => {
  if (value !== resetForm.value.newPassword) cb(new Error('Mật khẩu nhập lại không khớp'))
  else cb()
}
const resetRules = {
  newPassword: [{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }],
  confirm: [{ required: true, message: 'Bắt buộc', trigger: 'blur' }, { validator: validateResetConfirm, trigger: 'blur' }]
}

const normalizeSearchValue = (v) => String(v || '').toLowerCase().trim()
const filteredUsers = computed(() => users.value)

let searchTimer = null
watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchUsers()
  }, 400)
})

const agencyDisplayLabel = (agency) => `${agency?.agency_name || 'Không rõ'} - ID: ${agency?.identity_number || 'N/A'}`
const agencySearchText = (agency) => normalizeSearchValue(`${agency?.id || ''} ${agency?.agency_name || ''} ${agency?.identity_number || ''} ${agency?.phone || ''}`)

const filteredAgencies = computed(() => {
  if (!agencySearchKeyword.value) return agencies.value
  return agencies.value.filter((agency) => agencySearchText(agency).includes(agencySearchKeyword.value))
})

const filterAgencyOptions = (query) => {
  agencySearchKeyword.value = normalizeSearchValue(query)
}

const agencyById = (id) => metadataStore.getAgencyById(id)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await authApi.getUsers({ 
      page: page.value, 
      limit: pageSize.value,
      include_total: 1,
      keyword: searchKeyword.value
    })
    users.value = res.data.data || []
    if (res.data.total !== undefined) {
      total.value = res.data.total
    }
    if (tableRef.value) tableRef.value.setScrollTop(0)
  } catch {
    ElMessage.error('Không thể tải danh sách tài khoản')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (p) => {
  page.value = p
  fetchUsers()
}

const fetchAgencies = () => metadataStore.fetchAgencies()

const onRoleChange = () => {
  form.value.agencyId = null
  form.value.provinceIds = []
  form.value.stationIds = []
  if (form.value.role === 'agency') form.value.email = ''
  formRef.value?.clearValidate(['email'])
}

const onAgencyChange = (agencyId) => {
  if (form.value.role !== 'agency') return
  // Bỏ tự động điền email của đại lý
  formRef.value?.validateField('email')
}

const handleAdd = () => {
  isEdit.value = false
  form.value = { fullName: '', email: '', role: 'agency', agencyId: null, provinceIds: [], stationIds: [], password: '', isActive: true }
  showModal.value = true
}

const handleEdit = async (row) => {
  isEdit.value = true
  form.value = { fullName: row.fullName, email: row.email || '', role: row.role, agencyId: row.agencyId, provinceIds: [], stationIds: [], password: '', isActive: row.isActive, _id: row.id }
  if (row.role === 'regional_manager' || row.role === 'station_supervisor') {
    try {
      const res = await authApi.getUserScope(row.id)
      const scope = res.data.data || {}
      form.value.provinceIds = scope.provinceIds || []
      form.value.stationIds = scope.stationIds || []
    } catch { /* silent */ }
  }
  showModal.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    let userId
    if (isEdit.value) {
      await authApi.updateUser(form.value._id, {
        fullName: form.value.fullName,
        email: String(form.value.email || '').trim().toLowerCase(),
        role: form.value.role,
        agencyId: form.value.role === 'agency' ? form.value.agencyId : null,
        isActive: form.value.isActive
      })
      userId = form.value._id
      ElMessage.success('Cập nhật tài khoản thành công')
    } else {
      const res = await authApi.createUser({
        password: form.value.password,
        fullName: form.value.fullName,
        email: String(form.value.email || '').trim().toLowerCase(),
        role: form.value.role,
        agencyId: form.value.role === 'agency' ? form.value.agencyId : null
      })
      userId = res.data.data?.id
      ElMessage.success('Tạo tài khoản thành công')
    }
    if (userId && form.value.role === 'regional_manager') {
      await authApi.setUserScope(userId, { provinceIds: form.value.provinceIds })
    } else if (userId && form.value.role === 'station_supervisor') {
      await authApi.setUserScope(userId, { stationIds: form.value.stationIds })
    }
    showModal.value = false
    fetchUsers()
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || 'Có lỗi xảy ra')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  const confirmed = await confirmPopup(
    h('div', null, [
      h('p', null, `Xóa tài khoản "${row.email}"?`),
      h('p', { style: 'color:red;font-size:12px' }, 'Hành động này không thể hoàn tác.')
    ]),
    'Xác nhận xóa',
    { type: 'warning' }
  )
  if (!confirmed) return
  try {
    await authApi.deleteUser(row.id)
    ElMessage.success('Đã xóa tài khoản')
    fetchUsers()
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || 'Xóa thất bại')
  }
}

const handleResetPwd = (row) => {
  resetTarget.value = row
  resetForm.value = { newPassword: '', confirm: '' }
  showResetPwd.value = true
}

const handleSubmitReset = async () => {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await authApi.resetPassword(resetTarget.value.id, resetForm.value.newPassword)
    ElMessage.success('Đặt lại mật khẩu thành công')
    showResetPwd.value = false
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || 'Có lỗi xảy ra')
  } finally {
    saving.value = false
  }
}

const handleChangePwd = async () => {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    await authApi.changeOwnPassword(pwdForm.value.current, pwdForm.value.newPwd)
    ElMessage.success('Đổi mật khẩu thành công')
    pwdForm.value = { current: '', newPwd: '', confirm: '' }
    pwdFormRef.value?.resetFields()
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || 'Đổi mật khẩu thất bại')
  } finally {
    pwdLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Clear any data in pwdForm to prevent unexpected autofill
  pwdForm.value = { current: '', newPwd: '', confirm: '' }
  
  fetchUsers()
  fetchAgencies()
  metadataStore.fetchProvinces()
  metadataStore.fetchAllStations()
  
  // Clear any validation errors caused by browser autofill on load
  setTimeout(() => {
    pwdFormRef.value?.clearValidate()
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>

.settings-hero { 
  border-radius: 8px; 
}
:deep(.settings-hero .el-card__body) { padding: 8px 16px; }
.page-title { margin: 0; font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); }
.page-desc { margin: 0; color: var(--el-text-color-secondary); font-size: 12px; }

.user-list-card { 
  flex: 1; 
  min-height: 0; 
  display: flex; 
  flex-direction: column; 
  border-radius: 8px;
}
:deep(.user-list-card .el-card__body) { 
  flex: 1; 
  min-height: 0; 
  display: flex; 
  flex-direction: column; 
  padding: 10px;
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.search-input { width: 220px; }
.pagination-wrap { margin-top: 8px; display: flex; justify-content: flex-end; flex-shrink: 0; }

.pwd-card { 
  border-radius: 8px; 
  flex-shrink: 0; 
}
:deep(.pwd-card .el-card__header) { padding: 8px 16px; }
:deep(.pwd-card .el-card__body) { padding: 20px 16px 30px; }
.pwd-form-inline .el-form-item { margin-bottom: 0; }

/* Mobile styles */

@media (max-width: 768px) {

  .page-container {
    padding: 10px;
  }
  .settings-hero { margin-bottom: 10px; }
  .user-list-card { 
    margin-bottom: 10px; 
    height: 500px; /* Fixed height for table container on mobile to allow internal scroll if needed, or use auto */
    max-height: 70vh;
  }
  .search-input { width: 140px; }
  .pwd-form-inline .el-col {
    margin-bottom: 15px;
  }
  :deep(.pwd-card .el-card__body) { padding: 15px; }
}
</style>
