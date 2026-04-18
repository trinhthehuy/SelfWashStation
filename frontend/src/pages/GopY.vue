<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Góp ý & Phản hồi</h2>
          <p class="sub-title">
            <template v-if="isSA">Quản lý và phản hồi góp ý từ người dùng hệ thống</template>
            <template v-else>Gửi góp ý, kiến nghị đến tài khoản quản trị</template>
          </p>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">
          Gửi góp ý mới
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <!-- Admin badge summary -->
      <div v-if="isSA" class="admin-summary">
        <el-tag type="warning" effect="light" v-if="pendingCount > 0" style="font-size: 13px;">
          {{ pendingCount }} góp ý đang chờ phản hồi
        </el-tag>
        <el-tag type="success" effect="light" v-else style="font-size: 13px;">
          Tất cả góp ý đã được phản hồi
        </el-tag>
      </div>

      <!-- Desktop table -->
      <el-table
        v-if="!isMobile"
        :data="feedbacks"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
        :row-class-name="getRowClass"
      >
        <el-table-column v-if="isSA" prop="creator_name" label="Người gửi" min-width="140" />
        <el-table-column prop="title" label="Tiêu đề" min-width="200" />
        <el-table-column label="Nội dung" min-width="250">
          <template #default="{ row }">
            <div class="multiline-text">{{ row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="170" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'replied' ? 'success' : 'warning'" effect="light">
              {{ row.status === 'replied' ? 'Đã phản hồi' : 'Chờ phản hồi' }}
            </el-tag>
            <el-badge
              v-if="!isSA && row.status === 'replied' && !row.is_read_by_creator"
              is-dot
              type="danger"
              style="margin-left: 6px;"
            />
          </template>
        </el-table-column>
        <el-table-column label="Ngày gửi" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Thao tác" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              {{ isSA ? 'Xem / Phản hồi' : 'Xem chi tiết' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile card list -->
      <div v-else class="mobile-card-list" v-loading="loading">
        <div
          v-for="row in feedbacks"
          :key="row.id"
          class="mobile-card"
          :class="{ unread: !isSA && row.status === 'replied' && !row.is_read_by_creator }"
          @click="viewDetail(row)"
        >
          <div class="mc-header">
            <div class="mc-title">
              <span class="mc-name">{{ row.title }}</span>
              <span v-if="isSA" class="mc-sub">Người gửi: {{ row.creator_name }}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <el-tag :type="row.status === 'replied' ? 'success' : 'warning'" size="small" effect="light">
                {{ row.status === 'replied' ? 'Đã phản hồi' : 'Chờ phản hồi' }}
              </el-tag>
              <el-badge v-if="!isSA && row.status === 'replied' && !row.is_read_by_creator" is-dot type="danger" />
            </div>
          </div>
          <div class="mc-content">{{ row.content }}</div>
          <div class="mc-footer">
            <span class="mc-date">{{ formatDate(row.created_at) }}</span>
            <el-button type="primary" link size="small">{{ isSA ? 'Xem / Phản hồi' : 'Xem chi tiết' }}</el-button>
          </div>
        </div>
        <div v-if="!loading && feedbacks.length === 0" class="mc-empty">Không có dữ liệu</div>
      </div>
    </el-card>

    <!-- ─── Dialog gửi góp ý mới (agency) ─── -->
    <el-dialog v-model="createDialogVisible" title="Gửi góp ý mới" width="520px" :close-on-click-modal="false">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="Tiêu đề" prop="title">
          <el-input
            v-model="createForm.title"
            placeholder="Nhập tiêu đề góp ý"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="Nội dung" prop="content">
          <el-input
            v-model="createForm.content"
            type="textarea"
            :rows="5"
            placeholder="Mô tả chi tiết góp ý của bạn..."
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="submitFeedback">Gửi góp ý</el-button>
      </template>
    </el-dialog>

    <!-- ─── Dialog xem chi tiết & phản hồi ─── -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="isSA ? 'Chi tiết góp ý' : 'Góp ý của bạn'"
      width="580px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedFeedback" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item v-if="isSA" label="Người gửi">{{ selectedFeedback.creator_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Tiêu đề">{{ selectedFeedback.title }}</el-descriptions-item>
          <el-descriptions-item label="Nội dung">
            <div class="multiline-text">{{ selectedFeedback.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="Ngày gửi">{{ formatDate(selectedFeedback.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="Trạng thái">
            <el-tag :type="selectedFeedback.status === 'replied' ? 'success' : 'warning'" effect="light">
              {{ selectedFeedback.status === 'replied' ? 'Đã phản hồi' : 'Chờ phản hồi' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- Reply đã có -->
        <div v-if="selectedFeedback.status === 'replied'" class="reply-section">
          <div class="reply-header">
            <span class="reply-label">Phản hồi từ ban quản trị</span>
            <span class="reply-meta">{{ selectedFeedback.replied_by }} · {{ formatDate(selectedFeedback.replied_at) }}</span>
          </div>
          <div class="reply-body">{{ selectedFeedback.reply }}</div>
        </div>

        <!-- Form phản hồi (chỉ admin + pending) -->
        <div v-if="isSA && selectedFeedback.status === 'pending'" class="reply-form">
          <el-divider content-position="left">Phản hồi</el-divider>
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="4"
            placeholder="Nhập nội dung phản hồi..."
            maxlength="2000"
            show-word-limit
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="closeDetailDialog">Đóng</el-button>
        <el-button
          v-if="isSA && selectedFeedback?.status === 'pending'"
          type="primary"
          :loading="replying"
          @click="submitReply"
        >
          Gửi phản hồi
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const isMobile = ref(window.innerWidth < 768)
const _onResize = () => { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', _onResize))
onUnmounted(() => window.removeEventListener('resize', _onResize))
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { feedbackApi } from '@/api/feedback';
import { notificationApi } from '@/api/notification';
import { authStore } from '@/stores/auth';

const route = useRoute();

const isSA = computed(() => authStore.hasAnyRole(['sa']));

const feedbacks    = ref([]);
const loading      = ref(false);
const pendingCount = ref(0);

// Create dialog
const createDialogVisible = ref(false);
const createFormRef       = ref(null);
const createForm          = ref({ title: '', content: '' });
const submitting          = ref(false);
const createRules = {
  title:   [{ required: true, message: 'Vui lòng nhập tiêu đề', trigger: 'blur' }],
  content: [{ required: true, message: 'Vui lòng nhập nội dung', trigger: 'blur' }],
};

// Detail / reply dialog
const detailDialogVisible = ref(false);
const selectedFeedback    = ref(null);
const replyContent        = ref('');
const replying            = ref(false);

// ─── Fetch ───────────────────────────────────────────────────────
const fetchFeedbacks = async () => {
  loading.value = true;
  try {
    const res = await feedbackApi.getFeedbacks();
    feedbacks.value = Array.isArray(res.data.data) ? res.data.data : [];
    if (isSA.value) {
      pendingCount.value = feedbacks.value.filter(f => f.status === 'pending').length;
    }
  } catch {
    ElMessage.error('Không thể tải danh sách góp ý');
  } finally {
    loading.value = false;
  }
};

const openFromQuery = async () => {
  const feedbackId = Number(route.query.feedbackId);
  const notifId = Number(route.query.notifId);

  if (!Number.isFinite(feedbackId) || feedbackId <= 0) {
    return;
  }

  try {
    const res = await feedbackApi.getFeedbackById(feedbackId);
    const item = res.data?.data;
    if (item) {
      await viewDetail(item);
      if (Number.isFinite(notifId) && notifId > 0) {
        await notificationApi.markRead(notifId);
      }
      window.dispatchEvent(new Event('notifications:refresh'));
    }
  } catch {
    ElMessage.error('Không thể mở góp ý từ thông báo');
  }
};

onMounted(async () => {
  await fetchFeedbacks();
  await openFromQuery();
});

watch(() => route.query.feedbackId, async () => {
  await openFromQuery();
});

// ─── Helpers ─────────────────────────────────────────────────────
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('vi-VN');
};

const getRowClass = ({ row }) => {
  if (!isSA.value && row.status === 'replied' && !row.is_read_by_creator) return 'row-unread';
  return '';
};

// ─── Create (agency) ─────────────────────────────────────────────
const openCreateDialog = () => {
  createForm.value = { title: '', content: '' };
  createDialogVisible.value = true;
};

const submitFeedback = async () => {
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await feedbackApi.createFeedback(createForm.value);
      ElMessage.success('Đã gửi góp ý thành công');
      createDialogVisible.value = false;
      await fetchFeedbacks();
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch {
      ElMessage.error('Không thể gửi góp ý, vui lòng thử lại');
    } finally {
      submitting.value = false;
    }
  });
};

// ─── View detail ─────────────────────────────────────────────────
const viewDetail = async (row, options = { skipMarkRead: false }) => {
  selectedFeedback.value    = { ...row };
  replyContent.value        = '';
  detailDialogVisible.value = true;

  if (!isSA.value && !options.skipMarkRead && row.status === 'replied' && !row.is_read_by_creator) {
    try {
      await feedbackApi.markRead(row.id);
      row.is_read_by_creator = 1;
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch { /* silent */ }
  }
};

const closeDetailDialog = () => {
  detailDialogVisible.value = false;
  selectedFeedback.value    = null;
};

// ─── Reply (admin) ───────────────────────────────────────────────
const submitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('Vui lòng nhập nội dung phản hồi');
    return;
  }
  replying.value = true;
  try {
    await feedbackApi.replyFeedback(selectedFeedback.value.id, { reply: replyContent.value });
    ElMessage.success('Đã gửi phản hồi thành công');
    detailDialogVisible.value = false;
    await fetchFeedbacks();
    window.dispatchEvent(new Event('notifications:refresh'));
  } catch {
    ElMessage.error('Không thể gửi phản hồi, vui lòng thử lại');
  } finally {
    replying.value = false;
  }
};
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: var(--el-bg-color-page);
  min-height: 100vh;
}

.header-card {
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.table-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  margin: 0 0 4px;
  font-size: var(--el-font-size-extra-large);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sub-title {
  margin: 0;
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}

.admin-summary {
  margin-bottom: 16px;
}

.multiline-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--el-font-size-small);
  line-height: 1.6;
  max-height: 80px;
  overflow: hidden;
}

:deep(.row-unread) {
  background-color: var(--el-color-warning-light-9) !important;
}

.reply-section {
  margin-top: 20px;
  padding: 16px;
  background: var(--el-color-success-light-9);
  border-left: 4px solid var(--el-color-success);
  border-radius: var(--el-border-radius-base);
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reply-label {
  font-weight: 600;
  color: var(--el-color-success-dark-2);
}

.reply-meta {
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.reply-body {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.reply-form { margin-top: 8px; }

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Mobile card list ────────────────────────────── */
.mobile-card-list { display: flex; flex-direction: column; gap: 10px; }
.mobile-card {
  background: var(--el-bg-color);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: border-color 0.2s;
}
.mobile-card:active { border-color: var(--el-color-primary); }
.mobile-card.unread { background: var(--el-color-warning-light-9); }
.mc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
.mc-title { flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.mc-name { font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-sub { font-size: 11px; color: var(--el-text-color-secondary); }
.mc-content {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 60px;
  overflow: hidden;
  margin-bottom: 8px;
  line-height: 1.5;
}
.mc-footer { display: flex; justify-content: space-between; align-items: center; }
.mc-date { font-size: 11px; color: var(--el-text-color-placeholder); }
.mc-empty { text-align: center; padding: 40px 0; color: var(--el-text-color-placeholder); font-size: 14px; }

@media (max-width: 768px) {
  .page-container { padding: 8px; }
}
</style>
