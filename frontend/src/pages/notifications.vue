<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div>
          <h2 class="page-title">Thông báo hệ thống</h2>
          <p class="sub-title">Theo dõi cảnh báo và cập nhật xử lý từ hệ thống</p>
        </div>
        <el-button plain :disabled="!unreadCount" @click="markAllRead">Đánh dấu đã đọc tất cả</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="toolbar">
        <el-radio-group v-model="statusFilter" size="small" @change="fetchNotifications">
          <el-radio-button value="all">Tất cả</el-radio-button>
          <el-radio-button value="unread">Chưa đọc</el-radio-button>
          <el-radio-button value="read">Đã đọc</el-radio-button>
        </el-radio-group>
        <el-tag type="danger" effect="light" v-if="unreadCount > 0">{{ unreadCount }} chưa đọc</el-tag>
      </div>

      <el-table
        v-if="!isMobile"
        :data="notifications"
        v-loading="loading"
        border
        stripe
        height="100%"
      >
        <el-table-column label="Trạng thái" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_read ? 'info' : 'danger'" effect="light">{{ row.is_read ? 'Đã đọc' : 'Mới' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Tiêu đề" min-width="220" />
        <el-table-column prop="message" label="Nội dung" min-width="260" />
        <el-table-column label="Thời gian" width="140" align="center">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Thao tác" width="170" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="openNotification(row)">Mở xử lý</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="mobile-card-list" v-loading="loading">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="mobile-card"
          :class="{ unread: !item.is_read }"
          @click="openNotification(item)"
        >
          <div class="mc-header">
            <span class="mc-title">{{ item.title }}</span>
            <el-tag :type="item.is_read ? 'info' : 'danger'" size="small" effect="light">{{ item.is_read ? 'Đã đọc' : 'Mới' }}</el-tag>
          </div>
          <div class="mc-content">{{ item.message }}</div>
          <div class="mc-footer">{{ formatDate(item.created_at) }}</div>
        </div>
      </div>

      <el-empty v-if="!loading && !notifications.length" description="Không có thông báo" style="padding: 40px 0;" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { notificationApi } from '@/api/notification'

const router = useRouter()

const notifications = ref([])
const loading = ref(false)
const unreadCount = ref(0)
const statusFilter = ref('all')
const isMobile = ref(window.innerWidth < 768)

const onResize = () => {
  isMobile.value = window.innerWidth < 768
}

const fetchUnreadCount = async () => {
  try {
    const res = await notificationApi.getUnreadCount()
    unreadCount.value = Number(res.data.count ?? 0)
  } catch {
    unreadCount.value = 0
  }
}

const fetchNotifications = async () => {
  loading.value = true
  try {
    const res = await notificationApi.getNotifications({ status: statusFilter.value, page: 1, limit: 100 })
    notifications.value = Array.isArray(res.data.data) ? res.data.data : []
    await fetchUnreadCount()
  } catch {
    ElMessage.error('Không thể tải thông báo')
  } finally {
    loading.value = false
  }
}

const openNotification = async (item) => {
  try {
    if (!item.is_read) {
      await notificationApi.markRead(item.id)
      item.is_read = 1
      await fetchUnreadCount()
      window.dispatchEvent(new Event('notifications:refresh'))
    }
  } catch {
    ElMessage.error('Không thể cập nhật trạng thái thông báo')
  }

  if (item.action_url) {
    router.push(item.action_url)
    return
  }

  ElMessage.info('Thông báo chưa có hành động điều hướng')
}

const markAllRead = async () => {
  try {
    await notificationApi.markAllRead({})
    ElMessage.success('Đã đánh dấu tất cả là đã đọc')
    await fetchNotifications()
    window.dispatchEvent(new Event('notifications:refresh'))
  } catch {
    ElMessage.error('Không thể đánh dấu đã đọc tất cả')
  }
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('vi-VN')
}

onMounted(() => {
  fetchNotifications()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.page-container {
  padding: 12px 16px;
  background-color: var(--el-bg-color-page);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  box-sizing: border-box;
}
.header-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  flex-shrink: 0;
}
:deep(.header-card .el-card__body) { padding: 8px 16px; }
.table-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
:deep(.table-card .el-card__body) { 
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.page-title {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sub-title {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 10px;
  flex-wrap: wrap;
}

.mobile-card-list { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.mobile-card {
  background: var(--el-bg-color);
  border-radius: 10px;
  border: 1px solid var(--el-border-color-light);
  padding: 12px;
}
.mobile-card.unread { background: var(--el-color-danger-light-9); }
.mc-header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.mc-title { font-weight: 600; color: var(--el-text-color-primary); }
.mc-content { margin-top: 8px; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
.mc-footer { margin-top: 8px; color: var(--el-text-color-secondary); font-size: 12px; }

@media (max-width: 768px) {
  .page-container { padding: 8px; }
}
</style>

