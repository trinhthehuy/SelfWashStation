<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Quản lý Tài khoản Ngân hàng</h2>
          <p class="sub-title">Thiết lập tài khoản ngân hàng để gán cho các trụ rửa xe</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAddNew" size="large">
          Thêm tài khoản mới
        </el-button>
      </div>

      <div class="filter-section">
        <el-input
          v-model="keyword"
          placeholder="Tìm theo tên đại lý, STK, tên chủ tài khoản..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table
        :data="filteredList"
        v-loading="loading"
        style="width: 100%"
        border
        stripe
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
      >
        <el-table-column prop="id" label="ID" width="70" align="right" header-align="right" />

        <el-table-column label="Thông tin Đại lý" min-width="200">
          <template #default="{ row }">
            <div class="agency-cell">
              <div class="font-bold primary-text">{{ row.agency_name }}</div>
              <div class="text-small text-secondary">
                <el-icon><Postcard /></el-icon> CCCD: {{ row.identity_number }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Ngân hàng" min-width="180">
          <template #default="{ row }">
            <el-tag type="success" effect="light" class="bank-tag">
              {{ row.bank_name }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Chi tiết tài khoản" min-width="250">
          <template #default="{ row }">
            <div class="bank-details">
              <div class="account-number">{{ row.account_number }}</div>
              <div class="account-name text-secondary">{{ row.account_name }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="170" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                link
                :icon="Edit"
                @click="handleEdit(row)"
              >
                Sửa
              </el-button>
              <el-button
                type="primary"
                link
                :icon="Grid"
                @click="openQrModal(row)"
              >
                Tạo mã QR
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="showModal"
      :title="isEdit ? 'Cập nhật tài khoản' : 'Thêm tài khoản ngân hàng mới'"
      width="550px"
      destroy-on-close
      border-radius="8px"
    >
      <el-form
        :model="formData"
        label-position="top"
        ref="formRef"
        :rules="rules"
      >
        <el-form-item label="Tên đại lý" prop="agency_name">
          <el-autocomplete
            v-model="formData.agency_name"
            :fetch-suggestions="querySearchName"
            placeholder="Nhập tên để tìm kiếm..."
            @select="handleSelectName"
            clearable
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Số căn cước" prop="identity_number">
          <el-select
            v-model="formData.identity_number"
            placeholder="Chọn số CCCD"
            :disabled="!availableIdentities.length"
            @change="handleSelectIdentity"
            style="width: 100%"
          >
            <el-option
              v-for="item in availableIdentities"
              :key="item.id"
              :label="item.identity_number"
              :value="item.identity_number"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Ngân hàng" prop="bank_name">
              <el-select v-model="formData.bank_name" placeholder="Chọn ngân hàng" style="width: 100%">
                <el-option label="Vietcombank" value="Vietcombank" />
                <el-option label="MB Bank" value="MB Bank" />
                <el-option label="Techcombank" value="Techcombank" />
                <el-option label="BIDV" value="BIDV" />
                <el-option label="Agribank" value="Agribank" />
                <el-option label="MSB" value="MSB" />
                <el-option label="LPBank" value="LPBank" />
                <el-option label="Viet A Bank" value="Viet A Bank" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Số tài khoản" prop="account_number">
              <el-input v-model="formData.account_number" placeholder="Nhập STK" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Chủ tài khoản" prop="account_name">
          <el-input
            v-model="formData.account_name"
            placeholder="TÊN CHỦ TÀI KHOẢN (VIẾT HOA)"
            style="text-transform: uppercase"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer-container">
          <div class="left-actions">
            <el-button
              v-if="isEdit"
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete"
            >
              Xóa tài khoản này
            </el-button>
          </div>

          <div class="right-actions">
            <el-button @click="showModal = false">Đóng</el-button>
            <el-button
              type="primary"
              @click="handleSubmit(formRef)"
              :loading="submitting"
            >
              Lưu thông tin
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showQrModal" title="Tạo mã QR chuyển khoản" width="1200px" destroy-on-close draggable overflow>
      <div class="qr-layout">
        <div class="qr-form-panel">
          <el-form label-position="top">
            <el-form-item>
              <template #label>
                Ngân hàng thụ hưởng <span class="required-marker">(*)</span>
              </template>
              <el-select v-model="qrForm.bankBin" filterable placeholder="Chọn ngân hàng" :loading="loadingBanks" style="width: 100%">
                <el-option
                  v-for="bank in bankCatalog"
                  :key="bank.bin"
                  :label="`${bank.shortName} - ${bank.name}`"
                  :value="bank.bin"
                />
              </el-select>
            </el-form-item>

            <el-form-item>
              <template #label>
                Số tài khoản <span class="required-marker">(*)</span>
              </template>
              <el-input v-model="qrForm.accountNumber" />
            </el-form-item>

            <el-form-item label="Tên chủ tài khoản (Tự động)">
              <el-input v-model="qrForm.accountName" readonly placeholder="Nhập STK để tìm tên..." />
            </el-form-item>

            <div class="qr-inline-fields">
              <el-form-item label="Số tiền chuyển khoản">
                <el-input v-model="qrForm.amount" placeholder="10000" />
              </el-form-item>

              <el-form-item label="Nội dung thanh toán">
                <el-input v-model="qrForm.content" readonly />
              </el-form-item>
            </div>

            <div class="qr-generate-action">
              <el-button type="primary" size="large" class="generate-btn" @click="generateQrPayload">
                Tạo QR &amp; Dãy số
              </el-button>
            </div>
          </el-form>
        </div>

        <div class="qr-preview-panel">
          <div class="qr-preview-card" v-if="generatedQrUrl">
            <img :src="generatedQrUrl" alt="VietQR" class="qr-image" referrerpolicy="no-referrer" />
            <div class="qr-actions">
              <el-button type="primary" link @click="copyQrUrl">Sao chép Link ảnh</el-button>
            </div>
          </div>
          <el-empty v-else description="Nhấn 'Tạo QR & Dãy số' để tạo mã QR" />
        </div>
      </div>

      <div class="raw-block">
        <div class="raw-header">
          <span>Dãy số QR (RAW DATA)</span>
          <el-button type="primary" link :disabled="!rawQrPayload" @click="copyIntegrationCode">Sao chép</el-button>
        </div>
        <el-input :model-value="rawQrPayload" readonly type="textarea" :rows="2" placeholder="Dữ liệu QR raw sẽ hiển thị ở đây" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from "vue";
import { Plus, Edit, Search, Delete, Postcard, Grid } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { bankaccountApi } from "@/api/bankaccount";
import { agencyApi } from "@/api/agency";

const keyword = ref("");
const list = ref([]);
const loading = ref(false);
const showModal = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const formRef = ref(null);
const agencyList = ref([]);
const availableIdentities = ref([]);
const showQrModal = ref(false);
const bankCatalog = ref([]);
const loadingBanks = ref(false);
const generatedQrUrl = ref('');
const rawQrPayload = ref('');
const qrReady = ref(false);

const formData = ref({
  id: null,
  agency_id: "",
  agency_name: "",
  identity_number: "",
  bank_name: "",
  account_number: "",
  account_name: ""
});

const qrForm = reactive({
  bankBin: '',
  accountNumber: '',
  accountName: '',
  amount: '',
  content: '',
  template: 'compact2'
});

const rules = reactive({
  agency_name: [{ required: true, message: 'Vui lòng chọn đại lý', trigger: 'change' }],
  identity_number: [{ required: true, message: 'Vui lòng chọn CCCD', trigger: 'change' }],
  bank_name: [{ required: true, message: 'Vui lòng chọn ngân hàng', trigger: 'change' }],
  account_number: [{ required: true, message: 'Vui lòng nhập số tài khoản', trigger: 'blur' }],
  account_name: [{ required: true, message: 'Vui lòng nhập tên chủ tài khoản', trigger: 'blur' }]
});

const filteredList = computed(() => {
  const search = keyword.value.toLowerCase().trim();
  if (!search) return list.value;
  return list.value.filter(item =>
    Object.values(item).some(val => String(val).toLowerCase().includes(search))
  );
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await bankaccountApi.getBankAccounts();
    list.value = Array.isArray(response.data.data) ? response.data.data : [];
  } catch {
    ElMessage.error("Không thể tải danh sách tài khoản");
  } finally {
    loading.value = false;
  }
};

const fetchAgencies = async () => {
  try {
    const response = await agencyApi.getAgencies();
    agencyList.value = Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (error) {
    console.error("Lỗi khi lấy DS đại lý:", error);
  }
};

const querySearchName = (queryString, cb) => {
  const results = queryString
    ? agencyList.value.filter(a => a.agency_name.toLowerCase().includes(queryString.toLowerCase()))
    : agencyList.value;
  const suggestions = [...new Set(results.map(item => item.agency_name))].map(name => ({ value: name }));
  cb(suggestions);
};

const handleSelectName = (item) => {
  const matches = agencyList.value.filter(a => a.agency_name === item.value);
  availableIdentities.value = matches;
  if (matches.length === 1) {
    formData.value.identity_number = matches[0].identity_number;
    formData.value.agency_id = matches[0].id;
  } else {
    formData.value.identity_number = "";
    formData.value.agency_id = "";
  }
};

const handleSelectIdentity = (val) => {
  const agency = availableIdentities.value.find(a => a.identity_number === val);
  if (agency) formData.value.agency_id = agency.id;
};

const handleAddNew = async () => {
  isEdit.value = false;
  formData.value = { id: null, agency_id: "", agency_name: "", identity_number: "", bank_name: "", account_number: "", account_name: "" };
  availableIdentities.value = [];
  await fetchAgencies();
  showModal.value = true;
};

const handleEdit = async (item) => {
  isEdit.value = true;
  formData.value = { ...item };
  await fetchAgencies();
  availableIdentities.value = agencyList.value.filter(a => a.agency_name === item.agency_name);
  showModal.value = true;
};

const handleSubmit = async (formEl) => {
  if (!formEl) return;
  await formEl.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    const payload = {
      agency_id: formData.value.agency_id,
      bank_name: formData.value.bank_name,
      account_number: formData.value.account_number,
      account_name: formData.value.account_name.toUpperCase(),
    };

    try {
      if (isEdit.value) {
        await bankaccountApi.updateBankAccounts(formData.value.id, payload);
      } else {
        await bankaccountApi.createBankAccounts(payload);
      }

      ElMessage.success(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công");
      showModal.value = false;
      fetchData();
    } catch {
      ElMessage.error("Thao tác thất bại. Vui lòng kiểm tra lại.");
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async () => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của ${formData.value.account_name}?`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xóa ngay', cancelButtonText: 'Hủy', type: 'warning' }
  ).then(async () => {
    try {
      await bankaccountApi.deleteBankAccounts(formData.value.id);
      ElMessage.success("Đã xóa tài khoản");
      showModal.value = false;
      fetchData();
    } catch {
      ElMessage.error("Lỗi khi xóa dữ liệu");
    }
  }).catch(() => {});
};

const normalizeBankText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveBank = (bankName) => {
  const normalizedBankName = normalizeBankText(bankName);
  return bankCatalog.value.find((bank) => {
    const candidates = [bank.shortName, bank.name, bank.code, bank.bin].map(normalizeBankText);
    return candidates.some((candidate) => candidate && (candidate.includes(normalizedBankName) || normalizedBankName.includes(candidate)));
  });
};

const fetchBanks = async () => {
  if (bankCatalog.value.length) {
    return;
  }

  loadingBanks.value = true;
  try {
    const response = await fetch('https://api.vietqr.io/v2/banks');
    const payload = await response.json();
    bankCatalog.value = payload.data || [];
  } catch {
    ElMessage.error('Không thể tải danh mục ngân hàng VietQR');
  } finally {
    loadingBanks.value = false;
  }
};

const formatTransferContent = (stationCode, bayCode, fallbackId) => {
  const station = String(stationCode || '').replace(/\s+/g, '').toUpperCase();
  const bay = String(bayCode || '').replace(/\s+/g, '').toUpperCase();

  if (station && bay) {
    return `${station}${bay}`;
  }

  const safeId = String(Number(fallbackId) || 1).padStart(3, '0');
  return `NB${safeId}BY01`;
};

const buildRawPayload = () => {
  const amountDigits = String(qrForm.amount || '').replace(/\D/g, '');
  const amountChunk = amountDigits ? `54${String(amountDigits.length).padStart(2, '0')}${amountDigits}` : '';
  const contentValue = String(qrForm.content || '').trim();
  const contentChunk = contentValue ? `08${String(contentValue.length).padStart(2, '0')}${contentValue}` : '';

  return [
    '00020101021138540010A0000007270124',
    String(qrForm.bankBin || '').padStart(6, '0').slice(0, 6),
    String(qrForm.accountNumber || ''),
    '0208QRIBFTTA5303704',
    amountChunk,
    '5802VN62',
    String(contentChunk.length).padStart(2, '0'),
    contentChunk,
    '6304A4CF'
  ].join('');
};

const copyIntegrationCode = async () => {
  if (!rawQrPayload.value) {
    ElMessage.warning('Chưa có dãy số raw để sao chép');
    return;
  }

  await navigator.clipboard.writeText(rawQrPayload.value);
  ElMessage.success('Đã sao chép dãy số QR raw');
};

const openQrModal = async (row) => {
  await fetchBanks();
  const matchedBank = resolveBank(row.bank_name);

  qrForm.bankBin = matchedBank?.bin || '';
  qrForm.accountNumber = row.account_number || '';
  qrForm.accountName = row.account_name || '';
  qrForm.amount = '10000';
  qrForm.content = formatTransferContent(row.station_code || row.station_name, row.bay_code, row.id);
  qrReady.value = true;
  generatedQrUrl.value = '';
  rawQrPayload.value = '';
  generateQrPayload();
  showQrModal.value = true;
};

const computedQrUrl = computed(() => {
  if (!qrForm.bankBin || !qrForm.accountNumber) {
    return '';
  }

  const selectedBank = bankCatalog.value.find((bank) => bank.bin === qrForm.bankBin);
  const bankId = selectedBank?.shortName || selectedBank?.code || qrForm.bankBin;
  const params = new URLSearchParams();

  if (qrForm.amount) {
    params.set('amount', String(qrForm.amount).replace(/,/g, ''));
  }

  if (qrForm.content) {
    params.set('addInfo', qrForm.content);
  }

  if (qrForm.accountName) {
    params.set('accountName', qrForm.accountName);
  }

  return `https://img.vietqr.io/image/${bankId}-${qrForm.accountNumber}-${qrForm.template}.jpg?${params.toString()}`;
});

const generateQrPayload = () => {
  if (!qrForm.bankBin || !qrForm.accountNumber) {
    ElMessage.warning('Vui lòng chọn ngân hàng và nhập số tài khoản');
    return;
  }

  generatedQrUrl.value = computedQrUrl.value;
  rawQrPayload.value = buildRawPayload();
};

watch(
  () => [qrForm.bankBin, qrForm.accountNumber, qrForm.accountName, qrForm.amount, qrForm.content],
  () => {
    if (!qrReady.value) {
      return;
    }

    if (!qrForm.bankBin || !qrForm.accountNumber) {
      generatedQrUrl.value = '';
      rawQrPayload.value = '';
      return;
    }

    generatedQrUrl.value = computedQrUrl.value;
    rawQrPayload.value = buildRawPayload();
  }
);

const copyQrUrl = async () => {
  if (!generatedQrUrl.value) return;
  await navigator.clipboard.writeText(generatedQrUrl.value);
  ElMessage.success('Đã sao chép link ảnh QR');
};

const openQrInNewTab = () => {
  if (!generatedQrUrl.value) return;
  window.open(generatedQrUrl.value, '_blank', 'noopener,noreferrer');
};

onMounted(fetchData);
</script>

<style scoped>
.page-container {
  padding: 24px;
  background: var(--bg-body);
  min-height: 100%;
  color: var(--text-main);
  transition: background 0.2s ease;
}

.header-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.sub-title {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--text-faint);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 100%;
  max-width: 450px;
}

.agency-cell .primary-text {
  font-weight: 600;
  color: #409eff;
}

.bank-details .account-number {
  font-family: 'Courier New', Courier, monospace;
  font-weight: 700;
  font-size: 15px;
}

.account-name {
  font-size: 12px;
  font-weight: 500;
}

.dialog-footer-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qr-layout {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr;
  gap: 24px;
  min-height: 560px;
}

.qr-form-panel,
.qr-preview-panel {
  min-height: 100%;
}

.required-marker {
  color: #ef4444;
}

.qr-inline-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.qr-generate-action {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.generate-btn {
  min-width: 260px;
}

.qr-preview-card {
  width: 430px;
  min-height: 520px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--bg-surface);
  margin-left: auto;
  margin-right: auto;
}

.qr-image {
  width: 390px;
  height: 390px;
  border-radius: 16px;
  display: block;
  background: var(--bg-card);
  margin: 0 auto;
  object-fit: contain;
}

.qr-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.raw-block {
  margin-top: 20px;
}

:deep(.raw-block .el-textarea__inner) {
  min-height: 52px !important;
}

.raw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

.integration-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .qr-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .qr-inline-fields {
    grid-template-columns: 1fr;
  }

  .qr-preview-card {
    width: 100%;
    min-height: auto;
  }

  .qr-image {
    width: 100%;
    height: auto;
  }
}

:deep(.el-dialog__body) {
  padding-top: 10px;
}
</style>