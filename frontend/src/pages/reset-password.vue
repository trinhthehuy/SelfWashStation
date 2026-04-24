<template>
  <div class="reset-page">
    <div class="reset-card">
      <h1 class="page-title">Đặt lại mật khẩu</h1>
      <p class="sub-title">
        Tạo mật khẩu mới cho tài khoản của bạn.
      </p>

      <div class="guide-box">
        <p class="guide-title">Cach dung lien ket dat lai</p>
        <ul class="guide-list">
          <li>Day la lien ket/xac minh token duoc gui qua email da dang ky.</li>
          <li>Lien ket nay chi dung 1 lan. Sau khi dat lai thanh cong, token se het hieu luc ngay.</li>
          <li>Neu lien ket het han, quay lai man hinh Quen mat khau de yeu cau lien ket moi.</li>
          <li>Neu ban dang su dung mat khau tam mot lan, dang nhap va doi mat khau ngay de bao mat tai khoan.</li>
        </ul>
      </div>

      <el-alert
        v-if="tokenChecked && !tokenValid"
        title="Lien ket dat lai mat khau khong hop le hoac da het han"
        type="error"
        :closable="false"
        show-icon
        class="state-alert"
      />

      <el-form v-else label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="Mat khau moi" :error="fieldErrors.newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            placeholder="Toi thieu 6 ky tu"
            autocomplete="new-password"
            :aria-invalid="Boolean(fieldErrors.newPassword)"
            @input="fieldErrors.newPassword = ''"
          />
        </el-form-item>

        <el-form-item label="Nhap lai mat khau" :error="fieldErrors.confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="Nhap lai mat khau"
            autocomplete="new-password"
            :aria-invalid="Boolean(fieldErrors.confirmPassword)"
            @keyup.enter="handleSubmit"
            @input="fieldErrors.confirmPassword = ''"
          />
        </el-form-item>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          :closable="false"
          show-icon
          class="state-alert"
        />

        <el-alert
          v-if="successMessage"
          :title="successMessage"
          type="success"
          :closable="false"
          show-icon
          class="state-alert"
        />

        <el-button
          type="primary"
          native-type="submit"
          class="submit-button"
          size="large"
          :loading="submitting"
          :disabled="submitting"
        >
          Xac nhan dat lai mat khau
        </el-button>
      </el-form>

      <router-link to="/login" class="back-link">Quay lai dang nhap</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const route = useRoute()
const router = useRouter()

const submitting = ref(false)
const tokenChecked = ref(false)
const tokenValid = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = reactive({
  newPassword: '',
  confirmPassword: '',
})

const fieldErrors = reactive({
  newPassword: '',
  confirmPassword: '',
})

const token = String(route.params.token || '')

const validateForm = () => {
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''

  if (String(form.newPassword || '').length < 6) {
    fieldErrors.newPassword = 'Mat khau moi phai co it nhat 6 ky tu'
  }

  if (String(form.newPassword || '') !== String(form.confirmPassword || '')) {
    fieldErrors.confirmPassword = 'Mat khau nhap lai khong khop'
  }

  return !fieldErrors.newPassword && !fieldErrors.confirmPassword
}

const checkToken = async () => {
  tokenChecked.value = false
  tokenValid.value = false

  try {
    const response = await authApi.validateResetPasswordToken(token)
    tokenValid.value = Boolean(response?.data?.valid)
  } catch {
    tokenValid.value = false
  } finally {
    tokenChecked.value = true
  }
}

const handleSubmit = async () => {
  if (!tokenValid.value || submitting.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const response = await authApi.resetPasswordByToken(token, form.newPassword)
    successMessage.value = response?.data?.message || 'Dat lai mat khau thanh cong'
    setTimeout(() => {
      router.replace('/login')
    }, 1200)
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Dat lai mat khau that bai'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  checkToken()
})
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: radial-gradient(circle at 85% 20%, #dbeafe 0%, #f8fafc 55%, #d1fae5 100%);
}

.reset-card {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
}

.reset-title {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}

.reset-subtitle {
  margin: 8px 0 24px;
  color: #475569;
  line-height: 1.55;
  font-size: 14px;
}

.guide-box {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #dbeafe;
  background: #f8fbff;
}

.guide-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #1e3a8a;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  font-size: 12px;
  line-height: 1.55;
}

.guide-list li + li {
  margin-top: 4px;
}

.state-alert {
  margin-bottom: 12px;
}

.submit-button {
  width: 100%;
  margin-top: 6px;
}

.back-link {
  display: inline-block;
  margin-top: 16px;
  color: #4f46e5;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}

.back-link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .reset-card {
    padding: 22px;
    border-radius: 14px;
  }

  .reset-title {
    font-size: 24px;
  }
}
</style>
