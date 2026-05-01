<template>
  <div class="profile-page">
    <el-card shadow="never" class="header-card title-only-card">
      <div class="header-content">
        <h2 class="page-title">Trang cá nhân</h2>
      </div>
    </el-card>

    <!-- Avatar + tên -->
    <el-card shadow="never" class="profile-card">
      <div class="profile-header">
        <div class="avatar-wrap">
          <div class="avatar-ring" :class="avatarRingClass">
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" alt="avatar" />
            <img v-else :src="defaultAvatar" class="avatar-img" alt="avatar" />
          </div>
          <label class="avatar-upload-btn" title="Đổi ảnh đại diện">
            <Camera :size="16" />
            <input type="file" accept="image/*" class="hidden-input" @change="handleAvatarFile" />
          </label>
          <button v-if="avatarChanged" class="avatar-cancel-btn" title="Hủy thay đổi" @click="avatarChanged = false; avatarPreview = authStore.state.user?.avatar">
            <span style="font-size: 14px; font-weight: bold">×</span>
          </button>
        </div>
        <div class="profile-meta">
          <div class="profile-fullname">{{ authStore.state.user?.fullName }}</div>
          <div class="profile-email">{{ authStore.state.user?.email }}</div>
          <div class="role-badge" :class="roleClass">{{ roleLabel }}</div>
        </div>
      </div>
    </el-card>

    <!-- Chỉnh sửa thông tin -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="card-title">Thông tin cá nhân</span></template>
      <el-form :model="profileForm" ref="profileFormRef" label-position="top" class="profile-form">
        <el-row :gutter="12">
          <el-col :xs="16" :sm="12">
            <el-form-item
              label="Tên hiển thị"
              prop="fullName"
              :rules="[{ required: true, min: 2, message: 'Tối thiểu 2 ký tự', trigger: 'blur' }]"
            >
              <el-input v-model="profileForm.fullName" placeholder="Tên hiển thị" />
            </el-form-item>
          </el-col>
          <el-col :xs="0" :sm="12">
            <el-form-item label="Email (Dùng để đăng nhập)">
              <el-input :value="authStore.state.user?.email" disabled />
            </el-form-item>
          </el-col>
          <el-col :xs="8" :sm="24" class="btn-col">
            <el-button type="primary" :loading="profileLoading" @click="handleSaveProfile" class="save-profile-btn">
              Lưu
            </el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Đổi mật khẩu -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="card-title">Đổi mật khẩu</span></template>
      <el-form :model="pwdForm" ref="pwdFormRef" label-position="top" class="profile-form">
        <el-row :gutter="12">
          <el-col :xs="12" :sm="8">
            <el-form-item
              label="Mật khẩu cũ"
              prop="current"
              :rules="[{ required: true, message: 'Bắt buộc', trigger: 'blur' }]"
            >
              <el-input v-model="pwdForm.current" type="password" show-password placeholder="Mật khẩu cũ" autocomplete="new-password" />
            </el-form-item>

          </el-col>
          <el-col :xs="12" :sm="8">
            <el-form-item
              label="Mật khẩu mới"
              prop="newPwd"
              :rules="[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' }]"
            >
              <el-input v-model="pwdForm.newPwd" type="password" show-password placeholder="Mới" autocomplete="new-password" />
            </el-form-item>

          </el-col>
          <el-col :xs="12" :sm="8">
            <el-form-item
              label="Xác nhận"
              prop="confirm"
              :rules="[
                { required: true, message: 'Bắt buộc', trigger: 'blur' },
                { validator: validateConfirm, trigger: 'blur' }
              ]"
            >
              <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="Xác nhận" autocomplete="new-password" />
            </el-form-item>

          </el-col>
          <el-col :xs="12" :sm="24" class="btn-col">
            <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd" class="change-pwd-btn">
              Đổi mật khẩu
            </el-button>
          </el-col>
        </el-row>
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
const defaultAvatar = 'https://i.pravatar.cc/100?img=3'
const avatarPreview = ref(authStore.state.user?.avatar || null)
const avatarChanged = ref(false)


// Hàm resize ảnh về 200x200px, trả về base64
function resizeImage(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSize) {
            h *= maxSize / w;
            w = maxSize;
          }
        } else {
          if (h > maxSize) {
            w *= maxSize / h;
            h = maxSize;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const handleAvatarFile = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('Ảnh đại diện không được vượt quá 5MB')
    e.target.value = ''
    return
  }
  try {
    const resizedBase64 = await resizeImage(file, 200)
    avatarPreview.value = resizedBase64
    avatarChanged.value = true
  } catch (err) {
    ElMessage.error('Không đọc được ảnh')
  }
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
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 10px;
    gap: 10px;
    overflow: hidden; /* Try to prevent scroll if content fits */
  }
}


/* ── Profile header card ─────────────────────────────────── */
.profile-card :deep(.el-card__body) {
  padding: 24px;
}

@media (max-width: 768px) {
  .profile-card :deep(.el-card__body) {
    padding: 12px;
  }
}


.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

@media (max-width: 768px) {
  .profile-header {
    gap: 12px;
  }
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

@media (max-width: 768px) {
  .avatar-ring {
    width: 60px;
    height: 60px;
    font-size: 20px;
  }
}


.ring-sa       { background: rgba(255, 77, 79, 0.13);  color: #FF4D4F; border-color: rgba(255, 77, 79, 0.35); }
.ring-engineer { background: rgba(46, 204, 113, 0.13); color: #2ECC71; border-color: rgba(46, 204, 113, 0.35); }
.ring-agency   { background: rgba(241, 196, 15, 0.13); color: #F1C40F; border-color: rgba(241, 196, 15, 0.35); }

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

.avatar-cancel-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-danger);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid var(--bg-card);
  padding: 0;
  z-index: 2;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s;
}
.avatar-cancel-btn:hover { transform: scale(1.1); }

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

.profile-email {
  font-size: 13px;
  color: var(--text-faint);
}

@media (max-width: 768px) {
  .profile-fullname { font-size: 16px; }
  .profile-email { font-size: 12px; }
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

@media (max-width: 768px) {
  .role-badge {
    font-size: 9px;
    padding: 1px 6px;
  }
}

.role-sa       { background: rgba(255, 77, 79, 0.13);  color: #FF4D4F; }
.role-engineer { background: rgba(46, 204, 113, 0.13); color: #2ECC71; }
.role-agency   { background: rgba(241, 196, 15, 0.13); color: #F1C40F; }

/* ── Section cards ───────────────────────────────────────── */
.section-card { background: var(--bg-card); }

.section-card :deep(.el-card__header) {
  padding: 12px 16px;
}
.section-card :deep(.el-card__body) {
  padding: 16px;
}

@media (max-width: 768px) {
  .section-card :deep(.el-card__header) {
    padding: 8px 12px;
  }
  .section-card :deep(.el-card__body) {
    padding: 10px 12px;
  }
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-main);
}

.profile-form { max-width: 720px; }

@media (max-width: 768px) {
  .profile-form :deep(.el-form-item) {
    margin-bottom: 8px;
  }
  .profile-form :deep(.el-form-item__label) {
    margin-bottom: 2px;
    font-size: 12px;
    line-height: 1.2;
  }
  .profile-form :deep(.el-button) {
    width: 100%;
    margin-top: 4px !important;
    padding: 8px;
    font-size: 13px;
  }
  .profile-form :deep(.el-input__inner) {
    height: 32px;
  }
  .btn-col {
    display: flex;
    align-items: flex-end;
    margin-bottom: 8px; /* Match el-form-item margin-bottom */
  }
  .change-pwd-btn, .save-profile-btn {
    margin-top: 0 !important;
    height: 32px;
    width: 100%;
  }

}


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
