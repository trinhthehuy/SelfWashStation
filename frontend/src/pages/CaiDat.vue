<template>
  <div class="settings-page">
    <el-card shadow="never" class="header-card">
      <p class="section-kicker">Thiết lập</p>
      <h2>Phân quyền tài khoản hệ thống</h2>
      <p>Danh sách tài khoản được lấy trực tiếp từ backend và áp dụng theo phân quyền thực tế.</p>
    </el-card>

    <!-- Bảng danh sách tài khoản -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>Danh sách tài khoản hệ thống</span>
          <el-button v-if="isSa" type="primary" :icon="Plus" @click="handleAdd">Thêm tài khoản</el-button>
        </div>
      </template>
      <el-table :data="users" stripe v-loading="loading">
        <el-table-column prop="username" label="Tài khoản" min-width="160" />
        <el-table-column prop="fullName" label="Họ tên" min-width="180" />
        <el-table-column label="Vai trò" width="140">
          <template #default="{ row }">
            <el-tag :type="roleTag(row.role)">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Liên kết" min-width="160">
          <template #default="{ row }">
            <span v-if="row.role === 'agency'">{{ agencyById(row.agencyId)?.agency_name || `Đại lý #${row.agencyId}` }}</span>
            <span v-else-if="row.role === 'regional_manager' && row._scope">{{ row._scope.provinceIds?.length || 0 }} tỉnh</span>
            <span v-else-if="row.role === 'station_supervisor' && row._scope">{{ row._scope.stationIds?.length || 0 }} trạm</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Đăng nhập lần cuối" min-width="160">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Chưa đăng nhập' }}</template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">{{ row.isActive ? 'Hoạt động' : 'Khóa' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isSa" label="Thao tác" width="190" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">Sửa</el-button>
            <el-button type="warning" link :icon="Key" @click="handleResetPwd(row)">Mật khẩu</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)" :disabled="row.username === 'sa' || row.id === currentUserId">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Đổi mật khẩu của chính mình -->
    <el-card shadow="never" class="table-card">
      <template #header><span>Đổi mật khẩu của tôi</span></template>
      <el-form :model="pwdForm" label-position="top" class="pwd-form" ref="pwdFormRef">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="Mật khẩu hiện tại" prop="current" :rules="[{ required: true, message: 'Bắt buộc' }]">
              <el-input v-model="pwdForm.current" type="password" show-password placeholder="Nhập mật khẩu hiện tại" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Mật khẩu mới" prop="newPwd" :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]">
              <el-input v-model="pwdForm.newPwd" type="password" show-password placeholder="Tối thiểu 6 ký tự" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Xác nhận mật khẩu mới" prop="confirm" :rules="[{ required: true, message: 'Bắt buộc' }, { validator: validateConfirmPwd }]">
              <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="Nhập lại mật khẩu mới" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd">Đổi mật khẩu</el-button>
      </el-form>
    </el-card>

    <!-- Modal tạo / sửa tài khoản -->
    <el-dialog v-model="showModal" :title="isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'" width="480px" destroy-on-close>
      <el-form :model="form" ref="formRef" label-position="top">
        <el-form-item label="Tên đăng nhập" prop="username" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="vd: agency.hanoi" />
        </el-form-item>
        <el-form-item label="Họ tên" prop="fullName" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]">
          <el-input v-model="form.fullName" placeholder="Tên hiển thị" />
        </el-form-item>
        <el-form-item label="Vai trò" prop="role" :rules="[{ required: true, message: 'Bắt buộc', trigger: 'change' }]">
          <el-select v-model="form.role" class="w-full" @change="onRoleChange">
            <el-option value="sa" label="Quản trị hệ thống" />
            <el-option value="engineer" label="Kỹ thuật viên" />
            <el-option value="regional_manager" label="Quản lý vùng" />
            <el-option value="station_supervisor" label="Giám sát trạm" />
            <el-option value="agency" label="Đại lý" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'agency'" label="Đại lý liên kết" prop="agencyId" :rules="[{ required: true, message: 'Vui lòng chọn đại lý', trigger: 'change' }]">
          <el-select
            v-model="form.agencyId"
            filterable
            :filter-method="filterAgencyOptions"
            placeholder="Tìm theo ID, tên đại lý, CCCD, số điện thoại"
            class="w-full"
          >
            <el-option v-for="a in filteredAgencies" :key="a.id" :label="a.agency_name" :value="a.id">
              <div class="agency-dual">
                <div class="agency-dual-name">{{ a.agency_name }}</div>
                <div class="agency-dual-id">ID: {{ a.identity_number || 'N/A' }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'regional_manager'" label="Tỉnh phụ trách">
          <el-select v-model="form.provinceIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="Chọn tỉnh/thành phố" class="w-full" :loading="provinceLoading">
            <el-option v-for="p in provinces" :key="p.id" :label="p.province_name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.role === 'station_supervisor'" label="Trạm phụ trách">
          <el-select v-model="form.stationIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="Chọn trạm rửa xe" class="w-full" :loading="stationLoading">
            <el-option v-for="s in allStations" :key="s.id" :label="s.station_name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="Mật khẩu" prop="password" :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }]">
          <el-input v-model="form.password" type="password" show-password placeholder="Tối thiểu 6 ký tự" />
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
      <p class="reset-hint">Đặt mật khẩu mới cho tài khoản <strong>{{ resetTarget?.username }}</strong></p>
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
import { onMounted, ref, computed, h } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Key } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { agencyApi } from '@/api/agency'
import { wardApi } from '@/api/ward'
import { stationApi } from '@/api/station'
import { authStore } from '@/stores/auth'
import { confirmPopup } from '@/utils/popup'

const loading = ref(false)
const saving = ref(false)
const pwdLoading = ref(false)
const provinceLoading = ref(false)
const stationLoading = ref(false)
const users = ref([])
const agencies = ref([])
const agencySearchKeyword = ref('')
const provinces = ref([])
const allStations = ref([])
const showModal = ref(false)
const isEdit = ref(false)
const showResetPwd = ref(false)
const resetTarget = ref(null)

const formRef = ref()
const resetFormRef = ref()
const pwdFormRef = ref()

const isSa = computed(() => authStore.hasAnyRole(['sa']))
const currentUserId = computed(() => authStore.state.user?.id)

const form = ref({ username: '', fullName: '', role: 'agency', agencyId: null, provinceIds: [], stationIds: [], password: '', isActive: true })
const resetForm = ref({ newPassword: '', confirm: '' })
const pwdForm = ref({ current: '', newPwd: '', confirm: '' })

const validateConfirmPwd = (_rule, value, cb) => {
  if (value !== pwdForm.value.newPwd) cb(new Error('Mật khẩu nhập lại không khớp'))
  else cb()
}
const validateResetConfirm = (_rule, value, cb) => {
  if (value !== resetForm.value.newPassword) cb(new Error('Mật khẩu nhập lại không khớp'))
  else cb()
}

const resetRules = {
  newPassword: [{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }],
  confirm: [{ required: true, message: 'Bắt buộc' }, { validator: validateResetConfirm }]
}

const roleLabel = (role) => ({
  sa: 'Quản trị hệ thống',
  engineer: 'Kỹ thuật viên',
  regional_manager: 'Quản lý vùng',
  station_supervisor: 'Giám sát trạm',
  agency: 'Đại lý'
}[role] || role)
const roleTag = (role) => ({
  sa: 'danger',
  engineer: 'warning',
  regional_manager: 'primary',
  station_supervisor: 'info',
  agency: 'success'
}[role] || '')

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim()
const agencyDisplayLabel = (agency) => `${agency?.agency_name || 'Không rõ'} - ID: ${agency?.identity_number || 'N/A'}`
const agencySearchText = (agency) => normalizeSearchValue(`${agency?.id || ''} ${agency?.agency_name || ''} ${agency?.identity_number || ''} ${agency?.phone || ''}`)

const filteredAgencies = computed(() => {
  if (!agencySearchKeyword.value) return agencies.value
  return agencies.value.filter((agency) => agencySearchText(agency).includes(agencySearchKeyword.value))
})

const filterAgencyOptions = (query) => {
  agencySearchKeyword.value = normalizeSearchValue(query)
}

const agencyById = (id) => agencies.value.find((agency) => agency.id === id)

const agencyName = (id) => {
  const agency = agencies.value.find(a => a.id === id)
  return agency ? agencyDisplayLabel(agency) : (id ? `Đại lý #${id}` : '-')
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await authApi.getUsers()
    users.value = res.data.data || []
  } catch {
    ElMessage.error('Không thể tải danh sách tài khoản')
  } finally {
    loading.value = false
  }
}

const fetchAgencies = async () => {
  try {
    const res = await agencyApi.getAgencies()
    agencies.value = res.data.data || []
  } catch { /* silent */ }
}

const fetchProvinces = async () => {
  provinceLoading.value = true
  try {
    const res = await wardApi.getProvinces()
    provinces.value = res.data.data || []
  } catch { /* silent */ } finally {
    provinceLoading.value = false
  }
}

const fetchAllStations = async () => {
  stationLoading.value = true
  try {
    const res = await stationApi.getStations()
    allStations.value = res.data.data || []
  } catch { /* silent */ } finally {
    stationLoading.value = false
  }
}

const onRoleChange = () => {
  form.value.agencyId = null
  form.value.provinceIds = []
  form.value.stationIds = []
}

const handleAdd = () => {
  isEdit.value = false
  form.value = { username: '', fullName: '', role: 'agency', agencyId: null, provinceIds: [], stationIds: [], password: '', isActive: true }
  showModal.value = true
}

const handleEdit = async (row) => {
  isEdit.value = true
  form.value = { username: row.username, fullName: row.fullName, role: row.role, agencyId: row.agencyId, provinceIds: [], stationIds: [], password: '', isActive: row.isActive, _id: row.id }
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
        role: form.value.role,
        agencyId: form.value.role === 'agency' ? form.value.agencyId : null,
        isActive: form.value.isActive
      })
      userId = form.value._id
      ElMessage.success('Cập nhật tài khoản thành công')
    } else {
      const res = await authApi.createUser({
        username: form.value.username,
        password: form.value.password,
        fullName: form.value.fullName,
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
    h('div', { class: 'delete-confirm-content' }, [
      h('p', null, `Xóa tài khoản "${row.username}"?`),
      h('p', { class: 'delete-confirm-warning' }, 'Hành động này không thể hoàn tác.')
    ]),
    'Xác nhận xóa',
    {
      type: 'warning',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      customClass: 'delete-account-confirm'
    }
  )
  if (!confirmed) {
    return
  }
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
  fetchUsers()
  fetchAgencies()
  fetchProvinces()
  fetchAllStations()
})
</script>

<style scoped>
.header-card,
.table-card {
  border-radius: 20px;
}

.header-card h2 {
  margin: 0;
  font-size: 28px;
}

.header-card p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pwd-form {
  max-width: 900px;
}

.w-full {
  width: 100%;
}

.reset-hint {
  margin: 0 0 16px;
  color: var(--text-muted);
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
  color: var(--text-muted);
}

:global(.delete-account-confirm .el-message-box__message) {
  line-height: 1.5;
}

:global(.delete-account-confirm .delete-confirm-content) {
  display: grid;
  gap: 4px;
}

:global(.delete-account-confirm .delete-confirm-warning) {
  color: var(--el-color-danger);
  font-weight: 500;
}
</style>
