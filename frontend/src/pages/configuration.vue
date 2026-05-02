<template>
  <div class="configuration-page">
    <el-card shadow="never" class="settings-hero">
      <div class="header-content">
        <div class="hero-content">
          <h2 class="page-title">Cấu hình hệ thống</h2>
        </div>
        <div class="hero-actions">
          <el-tag size="large" :type="mqttConnected ? 'success' : 'danger'">
            {{ mqttConnected ? 'MQTT đang kết nối' : 'MQTT chưa kết nối' }}
          </el-tag>
          <el-button type="primary" @click="refreshMqtt" :loading="refreshing">Làm mới kết nối</el-button>
        </div>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- TAB 1: KẾT NỐI & SMTP -->
      <el-tab-pane label="Kết nối & SMTP" name="general">
        <div class="tab-content-grid">
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
          </el-card>

          <el-card shadow="never" class="config-card">
            <template #header>
              <div class="card-title-row">
                <span>Webhook thanh toán (vào)</span>
                <el-button link type="primary" @click="copy(webhookUrl)">Sao chép</el-button>
              </div>
            </template>
            <div class="mono-box">{{ webhookUrl }}</div>
            <p class="card-note">Dùng endpoint này cho webhook chuyển khoản vào. Token API được quản lý ở tab Quản lý API.</p>
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

        </div>
      </el-tab-pane>

      <!-- TAB 2: QUẢN LÝ API -->
      <el-tab-pane label="Quản lý API" name="api">
        <div class="tab-actions-header">
          <h3>Danh sách Token API</h3>
          <el-button type="primary" @click="showTokenDialog = true">Tạo token mới</el-button>
        </div>

        <div class="api-grid">
          <el-card shadow="never" class="api-card">
            <el-empty v-if="!tokens.length && !tokensLoading" description="Chưa có token nào" />
            <el-table v-else :data="tokens" v-loading="tokensLoading" border stripe>
              <el-table-column prop="name" label="Tên token" min-width="150" />
              <el-table-column prop="agencyName" label="Đại lý" min-width="140">
                <template #default="{ row }">
                  <el-tag :type="row.agencyId ? 'info' : 'warning'" size="small" effect="plain">
                    {{ row.agencyName }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="token" label="Mã hash" min-width="170" />
              <el-table-column label="Trạng thái" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">{{ row.isActive ? 'Bật' : 'Hết hạn' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Sử dụng" width="80" align="right">
                <template #default="{ row }">{{ row.usageCount || 0 }}</template>
              </el-table-column>
              <el-table-column label="Thao tác" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="danger" link @click="removeToken(row.id)">Xóa</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card shadow="never" class="api-card">
            <template #header><span>Endpoint tích hợp</span></template>
            <div class="endpoint-list">
              <div class="endpoint-item" v-for="endpoint in endpoints" :key="endpoint.path">
                <div class="endpoint-head">
                  <el-tag :type="endpoint.method === 'GET' ? 'success' : 'warning'" size="small">{{ endpoint.method }}</el-tag>
                  <code>{{ endpoint.path }}</code>
                </div>
                <h4>{{ endpoint.title }}</h4>
                <p>{{ endpoint.desc }}</p>
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- TAB 3: TEST HỆ THỐNG -->
      <el-tab-pane label="Test hệ thống" name="test">
        <div class="tab-actions-header">
          <h3>Công cụ kiểm tra End-to-End</h3>
          <div class="status-stack">
            <el-button :type="devModeEnabled ? 'warning' : 'primary'" @click="toggleDevMode" :loading="devModeLoading">
              {{ devModeEnabled ? 'Tắt Dev Mode' : 'Bật Dev Mode' }}
            </el-button>
          </div>
        </div>

        <div class="test-grid">
          <el-card shadow="never" class="test-card">
            <template #header><span>Gửi webhook test</span></template>
            <el-form label-position="top" class="test-form">
              <el-form-item label="Số tiền">
                <el-input v-model="testForm.amount" placeholder="10000" />
              </el-form-item>
              <el-form-item label="Nội dung chuyển khoản">
                <el-input v-model="testForm.content" placeholder="NB001 BY01" />
              </el-form-item>
              <el-form-item label="Số tài khoản nhận">
                <el-input v-model="testForm.accountNumber" placeholder="999124195" />
              </el-form-item>
              <el-form-item label="Webhook URL tùy chọn">
                <el-input v-model="testForm.webhookUrl" placeholder="Để trống để dùng endpoint mặc định" />
              </el-form-item>
              <el-button type="primary" :loading="testSubmitting" :disabled="!devModeEnabled || !mqttConnected" @click="sendTest">Gửi webhook test</el-button>
            </el-form>

            <el-alert v-if="!devModeEnabled" title="Cần bật DEV mode để gửi test webhook." type="warning" :closable="false" class="result-box" />
            <el-alert v-if="resultMessage" :title="resultMessage" :type="resultType" show-icon :closable="false" class="result-box" />

            <div v-if="lastMqttPayload" class="mqtt-command-box">
              <p class="mqtt-command-title">Lệnh MQTT gửi từ server</p>
              <div class="mqtt-command-line">
                <span class="mqtt-label">Topic:</span><span>{{ lastMqttTopic || '-' }}</span>
              </div>
              <div class="mqtt-command-line mqtt-command-payload">
                <span class="mqtt-label">Payload:</span><span>{{ lastMqttPayload }}</span>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="test-card">
            <template #header><span>Lịch sử test gần nhất</span></template>
            <el-table :data="testTransactions" border stripe v-loading="loadingHistory" height="400">
              <el-table-column prop="created_at" label="Thời gian" min-width="150" />
              <el-table-column prop="content" label="Nội dung" min-width="160" />
              <el-table-column prop="amount" label="Số tiền" width="100" align="right" />
              <el-table-column prop="station_name" label="Trạm" min-width="120" />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Dialog Tạo Token -->
    <el-dialog v-model="showTokenDialog" title="Tạo token API" width="760px" append-to-body>
      <el-form label-position="top">
        <el-form-item label="Tên token">
          <el-input v-model="newTokenForm.name" placeholder="Ví dụ: sepay-production" />
        </el-form-item>
        <el-form-item label="Kiểu dùng tại SePay">
          <el-select v-model="newTokenForm.authType" class="w-full">
            <el-option label="API Key" value="api_key" />
            <el-option label="OAuth 2.0 / Bearer Token" value="oauth2" />
          </el-select>
        </el-form-item>
        <el-form-item label="Liên kết đại lý" v-if="authStore.isAdmin">
          <el-select v-model="newTokenForm.agencyId" placeholder="Chọn đại lý (để trống nếu dùng chung)" clearable filterable class="w-full">
            <el-option v-for="a in agencies" :key="a.id" :label="a.agency_name" :value="a.id">
              <div class="agency-option-row">
                <span class="agency-option-name">{{ a.agency_name }}</span>
                <span class="agency-option-id">ID: {{ a.identity_number }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="Số ngày hiệu lực">
          <el-input v-model="newTokenForm.expiresInDays" type="number" placeholder="30" />
        </el-form-item>
      </el-form>
      <el-alert v-if="createdToken" type="warning" :closable="false" title="Token này chỉ hiển thị một lần" class="token-alert">
        <template #default>
          <div class="created-token-box">
            <span>{{ createdToken }}</span>
            <el-button link type="primary" @click="copy(createdToken)">Sao chép</el-button>
          </div>
        </template>
      </el-alert>
      <div v-if="createdToken" class="token-usage-box">
        <p class="token-usage-title">Hướng dẫn cấu hình SePay cho token này</p>
        <div class="token-usage-row">
          <span class="token-usage-label">Webhook URL:</span>
          <span>{{ webhookUrl }}</span>
        </div>
        <div class="token-usage-row">
          <span class="token-usage-label">Content-Type hỗ trợ:</span>
          <span>application/json, multipart/form-data, application/x-www-form-urlencoded</span>
        </div>
        <div class="token-usage-row">
          <span class="token-usage-label">Kiểu chứng thực:</span>
          <span>{{ newTokenForm.authType === 'oauth2' ? 'OAuth 2.0 / Bearer Token' : 'API Key' }}</span>
        </div>
        <div class="token-usage-row" v-if="newTokenForm.agencyId">
          <span class="token-usage-label">Đại lý:</span>
          <span>{{ selectedAgencyName }}</span>
        </div>
        <template v-if="newTokenForm.authType === 'oauth2'">
          <div class="token-usage-row">
            <span class="token-usage-label">Access Token URL:</span>
            <span>{{ oauthAccessTokenUrl }}</span>
          </div>
          <div class="token-usage-row">
            <span class="token-usage-label">Client ID:</span>
            <span>{{ createdTokenId }}</span>
          </div>
          <div class="token-usage-row">
            <span class="token-usage-label">Client Secret:</span>
            <span>{{ createdToken }}</span>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="showTokenDialog = false">Đóng</el-button>
        <el-button v-if="!createdToken" type="primary" :loading="tokenSubmitting" @click="createToken">Tạo token</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'
import { agencyApi } from '@/api/agency'
import { authStore } from '@/stores/auth'
import { confirmPopup } from '@/utils/popup'

// --- State chung ---
const activeTab = ref('general')
const mqttConnected = ref(false)
const refreshing = ref(false)

// --- SMTP ---
const smtpLoading = ref(false)
const smtpSaving = ref(false)
const smtpForm = ref({
  enabled: false, host: '', port: 587, secure: false,
  user: '', password: '', from: '', hasPassword: false, source: 'environment',
})

// --- API Management ---
const tokensLoading = ref(false)
const tokenSubmitting = ref(false)
const showTokenDialog = ref(false)
const createdToken = ref('')
const createdTokenId = ref('')
const tokens = ref([])
const agencies = ref([])
const newTokenForm = reactive({ name: '', authType: 'api_key', expiresInDays: '30', agencyId: null })
const endpoints = [
  { method: 'GET', path: '/api/tokens', title: 'Danh sách token', desc: 'Lấy danh sách token API đã tạo.' },
  { method: 'POST', path: '/api/tokens/create', title: 'Tạo token', desc: 'Tạo token mới.' },
  { method: 'POST', path: '/api/webhook/bank-transfer', title: 'Webhook nhận tiền', desc: 'Nhận giao dịch thanh toán.' },
  { method: 'GET', path: '/api/mqtt-status', title: 'Trạng thái MQTT', desc: 'Kiểm tra kết nối MQTT.' },
]

// --- System Test ---
const devModeEnabled = ref(false)
const devModeLoading = ref(false)
const testSubmitting = ref(false)
const loadingHistory = ref(false)
const testTransactions = ref([])
const resultMessage = ref('')
const resultType = ref('success')
const lastMqttTopic = ref('')
const lastMqttPayload = ref('')
const testForm = reactive({
  amount: '10000', content: 'NB001 BY01', accountNumber: '999124195', webhookUrl: ''
})

const webhookUrl = computed(() => `${window.location.origin}/api/webhook/bank-transfer`)
const outgoingWebhookUrl = computed(() => `${window.location.origin}/api/webhook/outgoing-payment`)
const oauthAccessTokenUrl = computed(() => `${window.location.origin}/api/webhook/oauth/token`)
const selectedAgencyName = computed(() => {
  const selectedAgency = agencies.value.find((agency) => Number(agency.id) === Number(newTokenForm.agencyId))
  return selectedAgency?.agency_name || 'Dùng chung toàn hệ thống'
})
const sepayAuthPreview = computed(() => {
  if (!createdToken.value) {
    return ''
  }

  if (newTokenForm.authType === 'oauth2') {
    return `Authorization: Bearer ${createdToken.value}`
  }

  return `x-api-key: ${createdToken.value}`
})

// --- Methods ---

const fetchStatus = async () => {
  const [mqttRes, devRes] = await Promise.all([
    systemApi.getMqttStatus(),
    systemApi.getDevModeStatus()
  ])
  mqttConnected.value = Boolean(mqttRes.data.connected)
  devModeEnabled.value = Boolean(devRes.data.enabled)
}

const refreshMqtt = async () => {
  refreshing.value = true
  try {
    await systemApi.refreshMqtt()
    await fetchStatus()
    ElMessage.success('Đã làm mới kết nối MQTT')
  } catch {
    ElMessage.error('Lỗi kết nối MQTT')
  } finally { refreshing.value = false }
}

const fetchSmtpSettings = async () => {
  smtpLoading.value = true
  try {
    const res = await systemApi.getSmtpSettings()
    const data = res?.data?.data || {}
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
  } finally { smtpLoading.value = false }
}

const saveSmtpSettings = async () => {
  const payload = {
    enabled: smtpForm.value.enabled,
    host: smtpForm.value.host,
    port: smtpForm.value.port,
    secure: smtpForm.value.secure,
    user: smtpForm.value.user,
    from: smtpForm.value.from,
  }
  if (smtpForm.value.password) payload.pass = smtpForm.value.password
  smtpSaving.value = true
  try {
    const res = await systemApi.updateSmtpSettings(payload)
    smtpForm.value.hasPassword = Boolean(res?.data?.data?.hasPassword)
    smtpForm.value.password = ''
    ElMessage.success('Đã lưu cấu hình SMTP')
  } catch (err) { ElMessage.error(err?.response?.data?.message || 'Lỗi lưu SMTP') }
  finally { smtpSaving.value = false }
}

const fetchTokens = async () => {
  tokensLoading.value = true
  try {
    const res = await systemApi.getApiTokens()
    tokens.value = res.data || []
  } finally { tokensLoading.value = false }
}

const createToken = async () => {
  if (!newTokenForm.name.trim()) return ElMessage.warning('Nhập tên token')
  tokenSubmitting.value = true
  try {
    const res = await systemApi.createApiToken({
      name: newTokenForm.name,
      expiresInDays: Number(newTokenForm.expiresInDays),
      agencyId: newTokenForm.agencyId
    })
    createdTokenId.value = String(res.data.tokenId || '')
    createdToken.value = res.data.fullToken
    const revokedCount = Number(res?.data?.revokedCount || 0)
    if (revokedCount > 0 && newTokenForm.agencyId) {
      ElMessage.success(`Đã tạo token mới và thu hồi ${revokedCount} token cũ của đại lý này`)
    }
    await fetchTokens()
  } finally { tokenSubmitting.value = false }
}

const removeToken = async (id) => {
  if (!await confirmPopup('Xóa token này?', 'Xác nhận')) return
  try {
    await systemApi.deleteApiToken(id)
    ElMessage.success('Đã xóa')
    await fetchTokens()
  } catch { ElMessage.error('Lỗi xóa token') }
}

const toggleDevMode = async () => {
  devModeLoading.value = true
  try {
    const res = await systemApi.toggleDevMode()
    devModeEnabled.value = Boolean(res.data.devModeEnabled)
    ElMessage.success(res.data.message)
  } finally { devModeLoading.value = false }
}

const fetchHistory = async () => {
  loadingHistory.value = true
  try {
    const res = await systemApi.getTestTransactions()
    testTransactions.value = res.data || []
  } finally { loadingHistory.value = false }
}

const sendTest = async () => {
  testSubmitting.value = true
  resultMessage.value = ''
  try {
    const res = await systemApi.sendTestWebhook({
      amount: Number(testForm.amount),
      content: testForm.content,
      accountNumber: testForm.accountNumber,
      isTest: true
    }, testForm.webhookUrl)
    resultType.value = 'success'
    resultMessage.value = res.data.message
    lastMqttTopic.value = res.data.mqttTopic
    lastMqttPayload.value = res.data.mqttPayload || res.data.mqttMessage
    await fetchHistory()
  } catch (err) {
    resultType.value = 'error'
    resultMessage.value = err?.response?.data?.error || 'Lỗi gửi test'
  } finally { testSubmitting.value = false }
}

const copy = async (text) => {
  await navigator.clipboard.writeText(text)
  ElMessage.success('Đã sao chép')
}

const fetchAgencies = async () => {
  if (!authStore.isAdmin) return
  try {
    const res = await agencyApi.getAgencies({ limit: 1000 })
    agencies.value = res.data.data || []
  } catch (err) { console.error('Error fetching agencies:', err) }
}

onMounted(() => {
  Promise.all([fetchStatus(), fetchSmtpSettings(), fetchTokens(), fetchHistory(), fetchAgencies()])
})
</script>

<style scoped>
.configuration-page {
  padding: 12px 16px;
  background-color: var(--el-bg-color-page, var(--bg-body));
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

.page-title {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.settings-hero {
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface) 100%);
  margin-bottom: 0;
  flex-shrink: 0;
}
:deep(.settings-hero .el-card__body) { padding: 12px 20px; }
.hero-content { flex: 1; }
.hero-actions { display: flex; align-items: center; gap: 12px; }

.config-tabs { 
  flex: 1; 
  min-height: 0; 
  display: flex; 
  flex-direction: column; 
}
:deep(.config-tabs .el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 5px;
}
:deep(.el-tabs__nav-wrap::after) { display: none; }
:deep(.el-tabs__item) { font-weight: 600; font-size: 14px; }

.tab-content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.full-width { grid-column: 1 / -1; }
.config-card { border-radius: 16px; }

.tab-actions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.tab-actions-header h3 { margin: 0; font-size: 18px; }

.api-grid, .test-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
.test-grid { grid-template-columns: 0.9fr 1.1fr; }

.endpoint-list { display: grid; gap: 12px; }
.endpoint-item { padding: 12px; border-radius: 12px; background: var(--bg-surface); border: 1px solid var(--border); }
.endpoint-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.endpoint-item h4 { margin: 0 0 4px; font-size: 14px; }
.endpoint-item p { margin: 0; color: var(--text-muted); font-size: 13px; }

.mono-box {
  padding: 12px; border-radius: 12px; background: #0f172a; color: #f8fafc;
  font-family: monospace; word-break: break-all; font-size: 13px;
}
.card-note { margin: 10px 0 0; color: var(--text-muted); font-size: 13px; }

.smtp-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.w-full { width: 100%; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; }

.result-box { margin-top: 15px; }
.mqtt-command-box {
  margin-top: 15px; padding: 12px; border-radius: 12px;
  background: var(--bg-surface); border: 1px solid var(--border);
}
.mqtt-command-title { margin: 0 0 8px; font-weight: 600; color: var(--accent); }
.mqtt-command-line { display: grid; grid-template-columns: 70px 1fr; gap: 8px; font-size: 13px; }
.mqtt-label { color: var(--text-muted); font-weight: 600; }

.created-token-box { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.token-alert { margin-top: 10px; }
.token-usage-box {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}
.token-usage-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.token-usage-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
}
.token-usage-label {
  color: var(--text-muted);
  font-weight: 600;
}
.token-usage-mono {
  margin-top: 8px;
}

.agency-option-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  line-height: 1.2;
}
.agency-option-name {
  font-size: 14px;
  font-weight: 500;
}
.agency-option-id {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  opacity: 0.8;
}
:deep(.el-select-dropdown__item) {
  height: auto !important;
  padding: 8px 12px !important;
}

@media (max-width: 960px) {
  .tab-content-grid, .api-grid, .test-grid { grid-template-columns: 1fr; }
}
</style>