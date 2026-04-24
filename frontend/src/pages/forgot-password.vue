<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <h1 class="page-title">Quên mật khẩu</h1>
      <p class="sub-title">
        Nhập địa chỉ email để nhận liên kết đặt lại mật khẩu.
      </p>

      <div class="guide-box">
        <p class="guide-title">Hướng dẫn nhanh</p>
        <ul class="guide-list">
          <li>Liên kết đặt lại mật khẩu sẽ được gửi vào email đã đăng ký.</li>
          <li>Liên kết chỉ có hiệu lực trong một khoảng thời gian ngắn và chỉ dùng được 1 lần.</li>
          <li>Nếu không thấy email, vui lòng kiểm tra thư mục Spam/Junk.</li>
          <li>Nếu được cấp mật khẩu tạm một lần, hãy đăng nhập bằng mật khẩu đó và đổi mật khẩu ngay.</li>
        </ul>
      </div>

      <el-form label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="Email tài khoản" :error="fieldError">
          <el-input
            v-model="form.email"
            placeholder="Nhập email của bạn"
            size="large"
            autocomplete="email"
            :aria-invalid="Boolean(fieldError)"
            @keyup.enter="handleSubmit"
            @input="fieldError = ''"
          />
        </el-form-item>

        <el-alert
          v-if="successMessage"
          :title="successMessage"
          type="success"
          :closable="false"
          show-icon
          class="state-alert"
        />

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          :closable="false"
          show-icon
          class="state-alert"
        />

        <el-alert
          v-if="deliveryHint"
          :title="deliveryHint"
          type="warning"
          :closable="false"
          show-icon
          class="state-alert"
        />

        <el-button
          type="primary"
          native-type="submit"
          size="large"
          class="submit-button"
          :loading="submitting"
          :disabled="submitting"
        >
          Gửi yêu cầu đặt lại mật khẩu
        </el-button>
      </el-form>

      <router-link to="/login" class="back-link">Quay lại đăng nhập</router-link>

      <p v-if="devToken" class="dev-token">
        Dev token: <span>{{ devToken }}</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { authApi } from '@/api/auth'

const form = reactive({ email: '' })
const submitting = ref(false)
const fieldError = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const deliveryHint = ref('')
const devToken = ref('')

const handleSubmit = async () => {
  if (submitting.value) {
    return
  }

  fieldError.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  deliveryHint.value = ''
  devToken.value = ''

  form.email = String(form.email || '').trim()
  if (!form.email) {
    fieldError.value = 'Vui lòng nhập email'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    fieldError.value = 'Email không hợp lệ'
    return
  }

  submitting.value = true
  try {
    const response = await authApi.forgotPassword(form.email)
    successMessage.value = response?.data?.message || 'Yeu cau da duoc ghi nhan'
    deliveryHint.value = response?.data?.deliveryHint || ''
    devToken.value = response?.data?.resetToken || ''
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Khong the xu ly yeu cau luc nay'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: radial-gradient(circle at 20% 20%, #e0e7ff 0%, #f8fafc 55%, #eef2ff 100%);
}

.forgot-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
}

.forgot-title {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}

.forgot-subtitle {
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

.dev-token {
  margin-top: 16px;
  padding: 10px;
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  font-size: 12px;
  color: #334155;
  word-break: break-all;
}

.dev-token span {
  font-family: Consolas, 'Courier New', monospace;
}

@media (max-width: 600px) {
  .forgot-card {
    padding: 22px;
    border-radius: 14px;
  }

  .forgot-title {
    font-size: 24px;
  }
}
</style>
