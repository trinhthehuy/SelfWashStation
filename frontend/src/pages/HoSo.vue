<template>
  <div class="profile-page">

    <!-- Avatar + tên -->
    <el-card shadow="never" class="profile-card">
      <div class="profile-header">
        <div class="avatar-wrap">
          <div class="avatar-ring" :class="avatarRingClass">
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" alt="avatar" />
            <span v-else class="avatar-initials">{{ userInitials }}</span>
          </div>
          <label class="avatar-upload-btn" title="Đổi ảnh đại diện">
            <Camera :size="16" />
            <input type="file" accept="image/*" class="hidden-input" @change="handleAvatarFile" />
          </label>
        </div>
        <div class="profile-meta">
          <div class="profile-fullname">{{ authStore.state.user?.fullName }}</div>
          <div class="profile-username">@{{ authStore.state.user?.username }}</div>
          <div class="role-badge" :class="roleClass">{{ roleLabel }}</div>
        </div>
      </div>
    </el-card>

    <!-- Chỉnh sửa thông tin -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="card-title">Thông tin cá nhân</span></template>
      <el-form :model="profileForm" ref="profileFormRef" label-position="top" class="profile-form">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item
              label="Họ và tên"
              prop="fullName"
              :rules="[{ required: true, min: 2, message: 'Tối thiểu 2 ký tự', trigger: 'blur' }]"
            >
              <el-input v-model="profileForm.fullName" placeholder="Tên hiển thị" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Tên đăng nhập">
              <el-input :value="authStore.state.user?.username" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <div v-if="avatarPreview" class="avatar-preview-row">
          <span class="preview-label">Ảnh đại diện mới</span>
          <img :src="avatarPreview" class="preview-thumb" />
          <el-button link type="danger" @click="removeAvatar">Xóa ảnh</el-button>
        </div>

        <el-button type="primary" :loading="profileLoading" @click="handleSaveProfile" style="margin-top: 8px">
          Lưu thay đổi
        </el-button>
      </el-form>
    </el-card>

    <!-- Đổi mật khẩu -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="card-title">Đổi mật khẩu</span></template>
      <el-form :model="pwdForm" ref="pwdFormRef" label-position="top" class="profile-form">
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item
              label="Mật khẩu hiện tại"
              prop="current"
              :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]"
            >
              <el-input v-model="pwdForm.current" type="password" show-password placeholder="Nhập mật khẩu hiện tại" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="Mật khẩu mới"
              prop="newPwd"
              :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }]"
            >
              <el-input v-model="pwdForm.newPwd" type="password" show-password placeholder="Tối thiểu 6 ký tự" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item
              label="Xác nhận mật khẩu mới"
              prop="confirm"
              :rules="[
                { required: true, message: 'Bắt buộc', trigger: 'blur' },
                { validator: validateConfirm, trigger: 'blur' }
              ]"
            >
              <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="Nhập lại mật khẩu mới" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd">
          Đổi mật khẩu
        </el-button>
      </el-form>
    </el-card>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Camera } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { authStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

// ── Avatar preview ────────────────────────────────────────
const avatarPreview = ref(authStore.state.user?.avatar || null)
const avatarChanged = ref(false)

const handleAvatarFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('Ảnh đại diện không được vượt quá 2MB')
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    avatarPreview.value = ev.target.result
    avatarChanged.value = true
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const removeAvatar = () => {
  avatarPreview.value = null
  avatarChanged.value = true
}

// ── Profile form ──────────────────────────────────────────
const profileForm = ref({ fullName: authStore.state.user?.fullName || '' })
const profileFormRef = ref()
const profileLoading = ref(false)

const handleSaveProfile = async () => {
  await profileFormRef.value.validate()
  profileLoading.value = true
  try {
    const payload = { fullName: profileForm.value.fullName }
    if (avatarChanged.value) payload.avatar = avatarPreview.value || null

    const res = await authApi.updateProfile(payload)
    authStore.updateUser(res.data.user)
    avatarChanged.value = false
    ElMessage.success('Cập nhật thông tin thành công')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || 'Cập nhật thất bại')
  } finally {
    profileLoading.value = false
  }
}

// ── Password form ─────────────────────────────────────────
const pwdForm = ref({ current: '', newPwd: '', confirm: '' })
const pwdFormRef = ref()
const pwdLoading = ref(false)

const validateConfirm = (rule, value, callback) => {
  if (value !== pwdForm.value.newPwd) callback(new Error('Mật khẩu xác nhận không khớp'))
  else callback()
}

const handleChangePwd = async () => {
  await pwdFormRef.value.validate()
  pwdLoading.value = true
  try {
    await authApi.changeOwnPassword(pwdForm.value.current, pwdForm.value.newPwd)
    ElMessage.success('Đổi mật khẩu thành công')
    pwdForm.value = { current: '', newPwd: '', confirm: '' }
    pwdFormRef.value.resetFields()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || 'Đổi mật khẩu thất bại')
  } finally {
    pwdLoading.value = false
  }
}

// ── Display helpers ───────────────────────────────────────
const roleLabel = computed(() => {
  const r = authStore.state.user?.role
  if (r === 'sa') return 'Quản trị hệ thống'
  if (r === 'engineer') return 'Kỹ thuật viên'
  if (r === 'agency') return 'Đại lý'
  return ''
})

const roleClass = computed(() => {
  const r = authStore.state.user?.role
  if (r === 'sa') return 'role-sa'
  if (r === 'engineer') return 'role-engineer'
  if (r === 'agency') return 'role-agency'
  return ''
})

const avatarRingClass = computed(() => {
  const r = authStore.state.user?.role
  if (r === 'sa') return 'ring-sa'
  if (r === 'engineer') return 'ring-engineer'
  if (r === 'agency') return 'ring-agency'
  return ''
})

const userInitials = computed(() => {
  const name = authStore.state.user?.fullName || ''
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'U'
})
</script>

<style scoped>
.profile-page {
  padding: 16px;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Profile header card ─────────────────────────────────── */
.profile-card :deep(.el-card__body) {
  padding: 24px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  border: 3px solid transparent;
  overflow: hidden;
}

.ring-sa       { background: rgba(99,102,241,0.15); color: #818cf8; border-color: rgba(99,102,241,0.4); }
.ring-engineer { background: rgba(16,185,129,0.15); color: #34d399; border-color: rgba(16,185,129,0.4); }
.ring-agency   { background: rgba(245,158,11,0.15);  color: #fbbf24; border-color: rgba(245,158,11,0.4); }

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.avatar-upload-btn:hover { opacity: 0.85; }

.hidden-input { display: none; }

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-fullname {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.profile-username {
  font-size: 13px;
  color: var(--text-faint);
}

.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 2px 10px;
  border-radius: 20px;
  width: fit-content;
  margin-top: 2px;
}

.role-sa       { background: rgba(99,102,241,0.15); color: #818cf8; }
.role-engineer { background: rgba(16,185,129,0.15); color: #34d399; }
.role-agency   { background: rgba(245,158,11,0.15);  color: #fbbf24; }

/* ── Section cards ───────────────────────────────────────── */
.section-card { background: var(--bg-card); }

.card-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-main);
}

.profile-form { max-width: 720px; }

.avatar-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-label {
  font-size: 13px;
  color: var(--text-muted);
}

.preview-thumb {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}
</style>
