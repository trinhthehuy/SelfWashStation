<template>
  <div class="settings-page">
    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div>
          <p class="section-kicker">Thiết lập</p>
          <h2>Test hệ thống</h2>
          <p>Gửi webhook test, theo dõi MQTT, dev mode và lịch sử trace để kiểm tra end-to-end.</p>
        </div>
        <div class="status-stack">
          <el-tag :type="mqttConnected ? 'success' : 'danger'" size="large">
            {{ mqttConnected ? 'MQTT đã kết nối' : 'MQTT chưa kết nối' }}
          </el-tag>
          <el-button :type="devModeEnabled ? 'warning' : 'primary'" @click="toggleDevMode" :loading="devModeLoading">
            {{ devModeEnabled ? 'Tắt Dev Mode' : 'Bật Dev Mode' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="test-grid">
      <el-card shadow="never" class="test-card">
        <template #header>
          <span>Gửi webhook test</span>
        </template>

        <el-form label-position="top" class="test-form">
          <el-form-item label="Số tiền">
            <el-input v-model="form.amount" placeholder="10000" />
          </el-form-item>
          <el-form-item label="Nội dung chuyển khoản">
            <el-input v-model="form.content" placeholder="NB001 BY01" />
          </el-form-item>
          <el-form-item label="Số tài khoản nhận">
            <el-input v-model="form.accountNumber" placeholder="999124195" />
          </el-form-item>
          <el-form-item label="Webhook URL tùy chọn">
            <el-input v-model="form.webhookUrl" placeholder="Để trống để dùng endpoint mặc định" />
          </el-form-item>
          <el-button type="primary" :loading="submitting" :disabled="!devModeEnabled || !mqttConnected" @click="sendTest">Gửi webhook test</el-button>
        </el-form>

        <el-alert
          v-if="!devModeEnabled"
          title="Cần bật DEV mode để gửi test webhook. Khi DEV mode tắt, hệ thống sẽ xử lý như thiếu API token để đảm bảo bảo mật."
          type="warning"
          :closable="false"
          class="result-box"
        />

        <el-alert
          v-if="!mqttConnected"
          title="MQTT chưa kết nối nên hệ thống không cho gửi lệnh test."
          type="error"
          :closable="false"
          class="result-box"
        />

        <el-alert v-if="resultMessage" :title="resultMessage" :type="resultType" show-icon :closable="false" class="result-box" />

        <div v-if="lastMqttPayload" class="mqtt-command-box">
          <p class="mqtt-command-title">Lệnh MQTT gửi từ server</p>
          <div class="mqtt-command-line">
            <span class="mqtt-label">Topic:</span>
            <span>{{ lastMqttTopic || '-' }}</span>
          </div>
          <div class="mqtt-command-line mqtt-command-payload">
            <span class="mqtt-label">Payload:</span>
            <span>{{ lastMqttPayload }}</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="test-card">
        <template #header>
          <span>Lịch sử test gần nhất</span>
        </template>
        <el-table :data="testTransactions" stripe v-loading="loadingHistory" height="420">
          <el-table-column prop="created_at" label="Thời gian" min-width="150" />
          <el-table-column prop="content" label="Nội dung" min-width="160" />
          <el-table-column prop="amount" label="Số tiền" width="120" align="right" header-align="right" />
          <el-table-column prop="station_name" label="Trạm" min-width="120" />
          <el-table-column prop="bay_code" label="Trụ" width="90" />
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'

const mqttConnected = ref(false)
const devModeEnabled = ref(false)
const devModeLoading = ref(false)
const submitting = ref(false)
const loadingHistory = ref(false)
const testTransactions = ref([])
const resultMessage = ref('')
const resultType = ref('success')
const lastMqttTopic = ref('')
const lastMqttPayload = ref('')

const form = reactive({
  amount: '10000',
  content: 'NB001 BY01',
  accountNumber: '999124195',
  webhookUrl: ''
})

const fetchStatus = async () => {
  const [mqttResponse, devModeResponse] = await Promise.all([
    systemApi.getMqttStatus(),
    systemApi.getDevModeStatus()
  ])

  mqttConnected.value = Boolean(mqttResponse.data.connected)
  devModeEnabled.value = Boolean(devModeResponse.data.enabled)
}

const fetchHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await systemApi.getTestTransactions()
    testTransactions.value = response.data || []
  } catch {
    ElMessage.error('Không thể tải lịch sử test')
  } finally {
    loadingHistory.value = false
  }
}

const toggleDevMode = async () => {
  devModeLoading.value = true
  try {
    const response = await systemApi.toggleDevMode()
    devModeEnabled.value = Boolean(response.data.devModeEnabled)
    ElMessage.success(response.data.message || 'Đã cập nhật Dev Mode')
  } catch {
    ElMessage.error('Không thể thay đổi Dev Mode')
  } finally {
    devModeLoading.value = false
  }
}

const sendTest = async () => {
  if (!devModeEnabled.value) {
    resultType.value = 'error'
    resultMessage.value = 'Token API không hợp lệ hoặc chưa được cấu hình'
    ElMessage.warning('Vui lòng bật DEV mode trước khi gửi test webhook')
    return
  }

  if (!mqttConnected.value) {
    resultType.value = 'error'
    resultMessage.value = 'MQTT chưa kết nối, không thể gửi lệnh'
    ElMessage.warning('MQTT chưa kết nối, vui lòng kiểm tra cấu hình MQTT')
    return
  }

  submitting.value = true
  resultMessage.value = ''
  lastMqttTopic.value = ''
  lastMqttPayload.value = ''

  try {
    const response = await systemApi.sendTestWebhook({
      amount: Number(String(form.amount).replace(/,/g, '')),
      content: form.content,
      accountNumber: form.accountNumber,
      timestamp: new Date().toISOString(),
      isTest: true
    }, form.webhookUrl)

    resultType.value = 'success'
    resultMessage.value = response.data.message || 'Đã gửi webhook test thành công'
    lastMqttTopic.value = String(response.data.mqttTopic || '')
    lastMqttPayload.value = String(response.data.mqttPayload || response.data.mqttMessage || '')
    await fetchHistory()
    await fetchStatus()
  } catch (error) {
    resultType.value = 'error'
    resultMessage.value = error?.response?.data?.error || 'Không thể gửi webhook test'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchStatus(), fetchHistory()])
})
</script>

<style scoped>
.header-card,
.test-card {
  border-radius: 20px;
}

.status-stack {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 20px;
}

.test-form {
  display: grid;
  gap: 4px;
}

.result-box {
  margin-top: 18px;
}

.mqtt-command-box {
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.mqtt-command-title {
  margin: 0 0 8px;
  font-weight: 600;
  color: var(--text-link);
}

.mqtt-command-line {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px;
  color: var(--text-main);
}

.mqtt-command-payload {
  margin-top: 6px;
  word-break: break-word;
}

.mqtt-label {
  color: var(--text-muted);
  font-weight: 600;
}

@media (max-width: 960px) {
  .header-row,
  .test-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .status-stack {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>