<template>
  <div class="settings-page">
    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div>
          <p class="section-kicker">Thiết lập</p>
          <h2>Quản lý API</h2>
          <p>Quản lý token gọi webhook, theo dõi endpoint tích hợp và chia sẻ cấu hình với đối tác.</p>
        </div>
        <el-button type="primary" size="large" @click="showTokenDialog = true">Tạo token mới</el-button>
      </div>
    </el-card>

    <div class="api-grid">
      <el-card shadow="never" class="api-card">
        <template #header>
          <span>Danh sách token</span>
        </template>

        <el-empty v-if="!tokens.length && !loading" description="Chưa có token nào" />

        <el-table v-else :data="tokens" v-loading="loading" stripe>
          <el-table-column prop="name" label="Tên token" min-width="180" />
          <el-table-column prop="token" label="Mã hash" min-width="190" />
          <el-table-column label="Trạng thái" width="130">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'">{{ row.isActive ? 'Đang hoạt động' : 'Hết hạn' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Sử dụng" width="120" align="right" header-align="right">
            <template #default="{ row }">{{ row.usageCount || 0 }}</template>
          </el-table-column>
          <el-table-column label="Thao tác" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link @click="removeToken(row.id)">Xóa</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never" class="api-card">
        <template #header>
          <span>Endpoint tích hợp</span>
        </template>

        <div class="endpoint-list">
          <div class="endpoint-item" v-for="endpoint in endpoints" :key="endpoint.path">
            <div class="endpoint-head">
              <el-tag :type="endpoint.method === 'GET' ? 'success' : 'warning'">{{ endpoint.method }}</el-tag>
              <code>{{ endpoint.path }}</code>
            </div>
            <h4>{{ endpoint.title }}</h4>
            <p>{{ endpoint.desc }}</p>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="showTokenDialog" title="Tạo token API" width="460px">
      <el-form label-position="top">
        <el-form-item label="Tên token">
          <el-input v-model="tokenForm.name" placeholder="Ví dụ: sepay-production" />
        </el-form-item>
        <el-form-item label="Số ngày hiệu lực">
          <el-input v-model="tokenForm.expiresInDays" type="number" placeholder="30" />
        </el-form-item>
      </el-form>

      <el-alert
        v-if="createdToken"
        type="warning"
        :closable="false"
        title="Token này chỉ hiển thị một lần"
        class="token-alert"
      >
        <template #default>
          <div class="created-token-box">
            <span>{{ createdToken }}</span>
            <el-button link type="primary" @click="copyToken(createdToken)">Sao chép</el-button>
          </div>
        </template>
      </el-alert>

      <template #footer>
        <el-button @click="showTokenDialog = false">Đóng</el-button>
        <el-button type="primary" :loading="submitting" @click="createToken">Tạo token</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'
import { confirmPopup } from '@/utils/popup'

const loading = ref(false)
const submitting = ref(false)
const showTokenDialog = ref(false)
const createdToken = ref('')
const tokens = ref([])

const tokenForm = reactive({
  name: '',
  expiresInDays: '30'
})

const endpoints = [
  { method: 'GET', path: '/api/tokens', title: 'Danh sách token', desc: 'Lấy danh sách token API đã tạo.' },
  { method: 'POST', path: '/api/tokens/create', title: 'Tạo token', desc: 'Tạo token mới để cấp cho webhook đối tác.' },
  { method: 'POST', path: '/api/webhook/bank-transfer', title: 'Webhook nhận tiền vào', desc: 'Nhận giao dịch thanh toán và đẩy lệnh rửa xe qua MQTT.' },
  { method: 'GET', path: '/api/mqtt-status', title: 'Trạng thái MQTT', desc: 'Kiểm tra backend đã sẵn sàng gửi lệnh chưa.' },
  { method: 'GET', path: '/api/test-transactions', title: 'Lịch sử test', desc: 'Đọc trace các lệnh test hệ thống.' },
  { method: 'POST', path: '/api/tokens/dev-mode/toggle', title: 'Bật/tắt dev mode', desc: 'Cho phép test webhook nội bộ với header X-Dev-Test.' }
]

const fetchTokens = async () => {
  loading.value = true
  try {
    const response = await systemApi.getApiTokens()
    tokens.value = response.data || []
  } catch {
    ElMessage.error('Không thể tải danh sách token')
  } finally {
    loading.value = false
  }
}

const createToken = async () => {
  if (!tokenForm.name.trim()) {
    ElMessage.warning('Vui lòng nhập tên token')
    return
  }

  submitting.value = true
  try {
    const response = await systemApi.createApiToken({
      name: tokenForm.name,
      expiresInDays: Number(tokenForm.expiresInDays) || undefined
    })
    createdToken.value = response.data.fullToken || ''
    await fetchTokens()
    tokenForm.name = ''
    tokenForm.expiresInDays = '30'
  } catch {
    ElMessage.error('Không thể tạo token')
  } finally {
    submitting.value = false
  }
}

const removeToken = async (tokenId) => {
  const confirmed = await confirmPopup('Xóa token này khỏi hệ thống?', 'Xác nhận', {
    type: 'warning',
    confirmButtonText: 'Xóa token',
    cancelButtonText: 'Hủy'
  })
  if (!confirmed) return

  try {
    await systemApi.deleteApiToken(tokenId)
    ElMessage.success('Đã xóa token')
    await fetchTokens()
  } catch {
    ElMessage.error('Xóa token thất bại')
  }
}

const copyToken = async (token) => {
  await navigator.clipboard.writeText(token)
  ElMessage.success('Đã sao chép token')
}

onMounted(fetchTokens)
</script>

<style scoped>
.header-card,
.api-card {
  border-radius: 20px;
}

.api-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
}

.endpoint-list {
  display: grid;
  gap: 12px;
}

.endpoint-item {
  padding: 14px;
  border-radius: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.endpoint-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.endpoint-item h4 {
  margin: 12px 0 6px;
}

.endpoint-item p {
  margin: 0;
  color: var(--text-muted);
}

.token-alert {
  margin-top: 10px;
}

.created-token-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  word-break: break-all;
}

@media (max-width: 960px) {
  .header-row,
  .api-grid {
    grid-template-columns: 1fr;
    display: grid;
  }
}
</style>