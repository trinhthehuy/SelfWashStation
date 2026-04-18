<template>
  <div class="settings-page">
    <el-card shadow="never" class="settings-hero">
      <div>
        <p class="section-kicker">Thiết lập</p>
        <h2>Cấu hình tích hợp thanh toán chuyển khoản</h2>
        <p>Quản lý trạng thái kết nối MQTT và endpoint webhook dùng để nhận giao dịch từ ngân hàng hoặc SePay.</p>
      </div>
      <div class="hero-actions">
        <el-tag size="large" :type="mqttConnected ? 'success' : 'danger'">
          {{ mqttConnected ? 'MQTT đang kết nối' : 'MQTT chưa kết nối' }}
        </el-tag>
        <el-button type="primary" @click="refreshMqtt" :loading="refreshing">Làm mới kết nối</el-button>
      </div>
    </el-card>

    <div class="config-grid">
      <el-card shadow="never" class="config-card full-width">
        <template #header>
          <div class="card-title-row">
            <span>Cấu hình SMTP gửi email</span>
            <el-tag :type="smtpForm.source === 'database' ? 'success' : 'info'" effect="light">
              {{ smtpForm.source === 'database' ? 'Nguồn: Database' : 'Nguồn: Environment' }}
            </el-tag>
          </div>
        </template>

        <el-form label-position="top" class="smtp-form" v-loading="smtpLoading">
          <el-row :gutter="16">
            <el-col :xs="24" :md="6">
              <el-form-item label="Bật gửi email">
                <el-switch v-model="smtpForm.enabled" active-text="Bật" inactive-text="Tắt" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="6">
              <el-form-item label="SMTP Host">
                <el-input v-model="smtpForm.host" placeholder="smtp.gmail.com" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="4">
              <el-form-item label="Port">
                <el-input-number v-model="smtpForm.port" :min="1" :max="65535" class="w-full" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="4">
              <el-form-item label="Kết nối bảo mật">
                <el-switch v-model="smtpForm.secure" active-text="SSL/TLS" inactive-text="STARTTLS" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="4">
              <el-form-item label="Đã có mật khẩu">
                <el-tag :type="smtpForm.hasPassword ? 'success' : 'warning'">
                  {{ smtpForm.hasPassword ? 'Đã cấu hình' : 'Chưa có' }}
                </el-tag>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :md="8">
              <el-form-item label="Tài khoản SMTP">
                <el-input v-model="smtpForm.user" placeholder="no-reply@yourdomain.com" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="Mật khẩu SMTP">
                <el-input
                  v-model="smtpForm.password"
                  type="password"
                  show-password
                  placeholder="Để trống để giữ mật khẩu hiện tại"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="Email gửi (From)">
                <el-input v-model="smtpForm.from" placeholder="support@yourdomain.com" />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="smtp-actions">
            <el-button @click="fetchSmtpSettings" :disabled="smtpSaving">Tải lại</el-button>
            <el-button type="primary" :loading="smtpSaving" @click="saveSmtpSettings">Lưu cấu hình SMTP</el-button>
          </div>
        </el-form>
        <p class="card-note">
          Cấu hình này được backend dùng ngay cho luồng "Quên mật khẩu". Nếu để nguồn Environment, hệ thống đang dùng biến .env hiện tại.
        </p>
      </el-card>

      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-title-row">
            <span>Webhook thanh toán</span>
            <el-button link type="primary" @click="copy(webhookUrl)">Sao chép</el-button>
          </div>
        </template>
        <div class="mono-box">{{ webhookUrl }}</div>
        <p class="card-note">Dùng endpoint này cho webhook chuyển khoản vào. Token API được quản lý ở mục Quản lý API.</p>
      </el-card>

      <el-card shadow="never" class="config-card">
        <template #header>
          <div class="card-title-row">
            <span>Webhook outgoing payment</span>
            <el-button link type="primary" @click="copy(outgoingWebhookUrl)">Sao chép</el-button>
          </div>
        </template>
        <div class="mono-box">{{ outgoingWebhookUrl }}</div>
        <p class="card-note">Dùng khi cần theo dõi trạng thái chi tiền hoặc webhook outbound từ đối tác.</p>
      </el-card>

      <el-card shadow="never" class="config-card full-width">
        <template #header>
          <span>Ghi chú vận hành</span>
        </template>
        <ul class="notes-list">
          <li>Backend bank-transfer đã được nhập vào backend chính, không còn cần chạy app bank-transfer riêng.</li>
          <li>MQTT hiện ưu tiên đọc từ biến môi trường. Nút làm mới sẽ khởi tạo lại kết nối với cấu hình runtime hiện tại.</li>
          <li>Đại lý không được truy cập các mục này. Chỉ `sa` và `engineer` mới nhìn thấy phân hệ Thiết lập hệ thống.</li>
        </ul>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'

const mqttConnected = ref(false)
const refreshing = ref(false)
const smtpLoading = ref(false)
const smtpSaving = ref(false)

const smtpForm = ref({
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: '',
  hasPassword: false,
  source: 'environment',
})

const webhookUrl = computed(() => `${window.location.origin}/api/webhook/bank-transfer`)
const outgoingWebhookUrl = computed(() => `${window.location.origin}/api/webhook/outgoing-payment`)

const fetchStatus = async () => {
  const response = await systemApi.getMqttStatus()
  mqttConnected.value = Boolean(response.data.connected)
}

const refreshMqtt = async () => {
  refreshing.value = true
  try {
    await systemApi.refreshMqtt()
    await fetchStatus()
    ElMessage.success('Đã làm mới kết nối MQTT')
  } catch {
    ElMessage.error('Không thể làm mới kết nối MQTT')
  } finally {
    refreshing.value = false
  }
}

const fetchSmtpSettings = async () => {
  smtpLoading.value = true
  try {
    const response = await systemApi.getSmtpSettings()
    const data = response?.data?.data || {}
    smtpForm.value = {
      enabled: Boolean(data.enabled),
      host: data.host || '',
      port: Number(data.port || 587),
      secure: Boolean(data.secure),
      user: data.user || '',
      password: '',
      from: data.from || '',
      hasPassword: Boolean(data.hasPassword),
      source: data.source || 'environment',
    }
  } catch {
    ElMessage.error('Không thể tải cấu hình SMTP')
  } finally {
    smtpLoading.value = false
  }
}

const saveSmtpSettings = async () => {
  const payload = {
    enabled: smtpForm.value.enabled,
    host: String(smtpForm.value.host || '').trim(),
    port: Number(smtpForm.value.port || 587),
    secure: smtpForm.value.secure,
    user: String(smtpForm.value.user || '').trim(),
    from: String(smtpForm.value.from || '').trim(),
  }

  if (smtpForm.value.password) {
    payload.pass = smtpForm.value.password
  }

  smtpSaving.value = true
  try {
    const response = await systemApi.updateSmtpSettings(payload)
    const data = response?.data?.data || {}
    smtpForm.value.hasPassword = Boolean(data.hasPassword)
    smtpForm.value.source = data.source || smtpForm.value.source
    smtpForm.value.password = ''
    ElMessage.success(response?.data?.message || 'Đã lưu cấu hình SMTP')
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || 'Lưu cấu hình SMTP thất bại')
  } finally {
    smtpSaving.value = false
  }
}

const copy = async (value) => {
  await navigator.clipboard.writeText(value)
  ElMessage.success('Đã sao chép')
}

onMounted(async () => {
  await Promise.all([fetchStatus(), fetchSmtpSettings()])
})
</script>

<style scoped>
.settings-hero {
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%);
}

.settings-hero h2 {
  margin: 0;
  font-size: 28px;
}

.settings-hero p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.config-card {
  border-radius: 18px;
}

.full-width {
  grid-column: 1 / -1;
}

.smtp-form {
  margin-top: 4px;
}

.smtp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.w-full {
  width: 100%;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mono-box {
  padding: 14px 16px;
  border-radius: 14px;
  background: #0f172a;
  color: #f8fafc;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.card-note {
  margin: 12px 0 0;
  color: var(--text-muted);
}

.notes-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-main);
  display: grid;
  gap: 10px;
}

@media (max-width: 960px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>