<template>
  <div class="login-page">

    <!-- ── Left: branding panel ── -->
    <div class="brand-panel">
      <!-- decorative blobs -->
      <div class="blob blob-1" />
      <div class="blob blob-2" />

      <div class="brand-inner">
        <div class="logo-mark">
          <Car :size="44" />
        </div>

        <p class="brand-eyebrow">Giải pháp trạm rửa xe tự phục vụ 24/7</p>
        <h1 class="brand-title">
          <span class="brand-name">Xe Sạch 365</span>
          <span class="brand-descriptor">Hệ thống quản lý trạm rửa xe tự phục vụ</span>
        </h1>
        <p class="brand-subtitle">
          Nền tảng vận hành tích hợp — quản lý trạm, doanh thu, đại lý
          và thanh toán tự động trên một dashboard duy nhất.
        </p>

        <ul class="feature-list">
          <li>
            <CheckCircle2 :size="15" class="check-icon" />
            <span>Theo dõi doanh thu &amp; phiên rửa theo thời gian thực</span>
          </li>
          <li>
            <CheckCircle2 :size="15" class="check-icon" />
            <span>Quản lý đa trạm, đa đại lý với phân quyền chi tiết</span>
          </li>
          <li>
            <CheckCircle2 :size="15" class="check-icon" />
            <span>Tích hợp ngân hàng &amp; chiến lược vận hành linh hoạt</span>
          </li>
          <li>
            <CheckCircle2 :size="15" class="check-icon" />
            <span>Góp ý &amp; phản hồi hai chiều giữa đại lý và quản trị</span>
          </li>
        </ul>

        <p class="brand-footer">© 2026 XeSach365 · Phiên bản 1.0</p>
      </div>
    </div>

    <!-- ── Right: form panel ── -->
    <div class="form-panel">
      <div class="form-inner">
        <div class="form-logo-mark">
          <Car :size="34" />
        </div>

        <h2 class="form-title">Đăng nhập</h2>
        <p class="form-subtitle">Nhập thông tin xác thực để tiếp tục</p>

        <el-form label-position="top" @submit.prevent>
          <el-form-item label="Tên đăng nhập">
            <el-input
              v-model="form.username"
              placeholder="Nhập tên đăng nhập"
              size="large"
              :prefix-icon="UserIcon"
              autocomplete="username"
            />
          </el-form-item>

          <el-form-item label="Mật khẩu">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="Nhập mật khẩu"
              size="large"
              :prefix-icon="LockIcon"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            show-icon
            :closable="false"
            class="login-alert"
          />

          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="submitting"
            @click="handleLogin"
          >
            <LogIn v-if="!submitting" :size="16" style="margin-right: 6px;" />
            Đăng nhập hệ thống
          </el-button>
        </el-form>

        <p class="form-security-note">
          <ShieldCheck :size="13" />
          Phiên đăng nhập được bảo vệ bằng JWT
        </p>
      </div>

      <el-dialog
        v-model="showForceChangeDialog"
        title="Đổi mật khẩu lần đăng nhập đầu tiên"
        width="460px"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
      >
        <p class="force-change-desc">
          Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi tiếp tục sử dụng hệ thống.
        </p>

        <el-form label-position="top" @submit.prevent>
          <el-form-item label="Mật khẩu mới">
            <el-input
              v-model="forceChangeForm.newPassword"
              type="password"
              show-password
              placeholder="Tối thiểu 6 ký tự"
              autocomplete="new-password"
            />
          </el-form-item>

          <el-form-item label="Nhập lại mật khẩu mới">
            <el-input
              v-model="forceChangeForm.confirmPassword"
              type="password"
              show-password
              placeholder="Nhập lại mật khẩu mới"
              autocomplete="new-password"
              @keyup.enter="handleForceChangePassword"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button type="primary" :loading="forceChangeSubmitting" @click="handleForceChangePassword">
            Xác nhận đổi mật khẩu
          </el-button>
        </template>
      </el-dialog>
    </div>

  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Car, CheckCircle2, User, Lock, LogIn, ShieldCheck } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { authStore } from '@/stores/auth'

const UserIcon = User
const LockIcon = Lock

const router = useRouter()
const submitting = ref(false)
const errorMessage = ref('')
const showForceChangeDialog = ref(false)
const forceChangeSubmitting = ref(false)
const currentPasswordAfterLogin = ref('')

const form = reactive({ username: '', password: '' })
const forceChangeForm = reactive({ newPassword: '', confirmPassword: '' })

const handleLogin = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    const response = await authApi.login(form)
    const session = response.data
    authStore.setSession(session)

    if (session?.user?.mustChangePassword) {
      currentPasswordAfterLogin.value = form.password
      forceChangeForm.newPassword = ''
      forceChangeForm.confirmPassword = ''
      showForceChangeDialog.value = true
      return
    }

    router.replace(authStore.getDefaultRoute())
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
  } finally {
    submitting.value = false
  }
}

const handleForceChangePassword = async () => {
  const newPassword = String(forceChangeForm.newPassword || '')
  const confirmPassword = String(forceChangeForm.confirmPassword || '')

  if (newPassword.length < 6) {
    ElMessage.warning('Mật khẩu mới phải có ít nhất 6 ký tự')
    return
  }

  if (newPassword !== confirmPassword) {
    ElMessage.warning('Mật khẩu nhập lại không khớp')
    return
  }

  if (newPassword === currentPasswordAfterLogin.value) {
    ElMessage.warning('Mật khẩu mới phải khác mật khẩu mặc định')
    return
  }

  forceChangeSubmitting.value = true
  try {
    await authApi.changeOwnPassword(currentPasswordAfterLogin.value, newPassword)
    authStore.updateUser({ mustChangePassword: false })
    showForceChangeDialog.value = false
    ElMessage.success('Đổi mật khẩu thành công')
    router.replace(authStore.getDefaultRoute())
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || 'Đổi mật khẩu thất bại, vui lòng thử lại')
  } finally {
    forceChangeSubmitting.value = false
  }
}
</script>

<style scoped>
/* ─── Page shell ────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ─── Brand panel (left) ────────────────────────────────── */
.brand-panel {
  background: linear-gradient(150deg, #07101f 0%, #0d1829 55%, #0f2040 100%);
  padding: 56px 64px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

/* decorative radial blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 560px;
  height: 560px;
  top: -180px;
  right: -160px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 68%);
}
.blob-2 {
  width: 400px;
  height: 400px;
  bottom: -120px;
  left: -80px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 65%);
}

.brand-inner {
  position: relative;
  z-index: 1;
  max-width: 500px;
}

.logo-mark {
  width: 92px;
  height: 92px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.45);
}

.brand-eyebrow {
  margin: 0 0 10px;
  font-size: 11.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6366f1;
  font-weight: 600;
}

.brand-title {
  margin: 0 0 18px;
  font-weight: 700;
  display: block;
}

.brand-name {
  display: block;
  font-size: 52px;
  line-height: 1;
  margin-bottom: 6px;
  background: linear-gradient(110deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-descriptor {
  display: block;
  font-size: 22px;
  line-height: 1.3;
  color: #cbd5e1;
  font-weight: 600;
}

.brand-subtitle {
  margin: 0 0 32px;
  font-size: 15px;
  line-height: 1.75;
  color: #64748b;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0 0 36px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #94a3b8;
}

.check-icon {
  color: #22d3ee;
  flex-shrink: 0;
}

.brand-footer {
  font-size: 12px;
  color: #475569;
}

/* ─── Form panel (right) ────────────────────────────────── */
.form-panel {
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  border-left: 1px solid #e2e8f0;
}

.form-inner {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(15, 23, 42, 0.04);
  border: 1px solid #e2e8f0;
}

.form-logo-mark {
  width: 68px;
  height: 68px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.32);
}

.form-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.form-subtitle {
  margin: 0 0 28px;
  font-size: 14px;
  color: #64748b;
}

/* El-Form overrides */
:deep(.el-form-item__label) {
  font-weight: 500;
  font-size: 13px;
  color: #374151;
  padding-bottom: 4px !important;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #d1d5db;
  transition: box-shadow 0.15s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a5b4fc;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35) !important;
}

.login-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border: none;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.12s;
}

.login-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.form-security-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 12px;
  color: #9ca3af;
  justify-content: center;
}

.force-change-desc {
  margin: 0 0 10px;
  color: #475569;
  line-height: 1.5;
}

/* ─── Responsive ────────────────────────────────────────── */
@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    min-height: 100vh;
    background: #ffffff;
    border-left: none;
  }
}
</style>