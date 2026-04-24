<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="header-content">
        <div class="title-group">
          <h2 class="page-title">Quản lý Tài khoản Ngân hàng</h2>
        </div>
        <el-button type="primary" :icon="Plus" @click="handleAddNew" class="mobile-add-btn">
          Thêm mới
        </el-button>
      </div>

      <div class="filter-section">
        <el-input
          v-model="keyword"
          placeholder="Tìm nhanh toàn bộ dữ liệu..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />

        <div v-if="isSystemAdmin" class="advanced-filter-row">
          <el-select
            v-model="fieldFilters.agencyName"
            placeholder="Lọc theo Đại lý"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in agencyFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-select
            v-model="fieldFilters.accountNumber"
            placeholder="Lọc theo Số tài khoản"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in accountNumberFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-select
            v-model="fieldFilters.accountName"
            placeholder="Lọc theo Tên tài khoản"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in accountNameFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-select
            v-model="fieldFilters.bankName"
            placeholder="Lọc theo Ngân hàng"
            clearable
            filterable
            class="filter-item"
          >
            <el-option
              v-for="item in bankFilterOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <el-button class="clear-filter-btn" @click="resetFilters">Xóa bộ lọc</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-main">
        <el-table
          :data="visibleList"
          v-loading="loading"
          style="width: 100%"
          height="100%"
          border
          stripe
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        >
          <el-table-column prop="id" label="ID" width="70" align="right" header-align="right" />
  
          <el-table-column label="Thông tin Đại lý" min-width="200">
            <template #default="{ row }">
              <div class="agency-cell">
                <div class="font-bold primary-text">{{ row.agency_name }}</div>
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
      </div>

      <div class="pagination-footer" v-if="filteredList.length > pageSize">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="filteredList.length"
          :page-size="pageSize"
          v-model:current-page="page"
          @current-change="handlePageChange"
        />
      </div>
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
            placeholder="Tìm theo ID, tên đại lý, CCCD, số điện thoại"
            @select="handleSelectName"
            clearable
            :disabled="isAutoCreate"
            style="width: 100%"
          >
            <template #default="{ item }">
              <div class="agency-dual">
                <div class="agency-dual-name">{{ item.agency_name }}</div>
                <div class="agency-dual-id">ID: {{ item.identity_number || 'N/A' }}</div>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>

        <el-form-item label="ID (CCCD)" prop="identity_number">
          <el-select
            v-model="formData.identity_number"
            placeholder="Chọn ID (CCCD)"
            :disabled="isAutoCreate || !availableIdentities.length"
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
import { ElMessage } from "element-plus";
import { bankaccountApi } from "@/api/bank-account";
import { agencyApi } from "@/api/agency";
import { useRoute, useRouter } from "vue-router";
import { authStore } from '@/stores/auth';
import { confirmPopup } from '@/utils/popup'

const route = useRoute();
const router = useRouter();
const isSystemAdmin = computed(() => authStore.hasAnyRole(['sa']));

const keyword = ref("");
const fieldFilters = reactive({
  agencyName: '',
  accountNumber: '',
  accountName: '',
  bankName: ''
});
const list = ref([]);
const loading = ref(false);
const showModal = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const isAutoCreate = ref(false);
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
  identity_number: [{ required: true, message: 'Vui lòng chọn ID (CCCD)', trigger: 'change' }],
  bank_name: [{ required: true, message: 'Vui lòng chọn ngân hàng', trigger: 'change' }],
  account_number: [{ required: true, message: 'Vui lòng nhập số tài khoản', trigger: 'blur' }],
  account_name: [{ required: true, message: 'Vui lòng nhập tên chủ tài khoản', trigger: 'blur' }]
});

const normalizeFilterValue = (value) => String(value || '').toLowerCase().trim();
const uniqueSortedBy = (selector) => {
  return Array.from(
    new Set(
      list.value
        .map(selector)
        .filter((value) => String(value || '').trim())
    )
  ).sort((a, b) => String(a).localeCompare(String(b), 'vi'));
};

const agencyFilterOptions = computed(() => uniqueSortedBy((item) => item.agency_name));
const accountNumberFilterOptions = computed(() => uniqueSortedBy((item) => item.account_number));
const accountNameFilterOptions = computed(() => uniqueSortedBy((item) => item.account_name));
const bankFilterOptions = computed(() => uniqueSortedBy((item) => item.bank_name));

const page = ref(1);
const pageSize = ref(15);

const filteredList = computed(() => {
  const search = normalizeFilterValue(keyword.value);
  const agencyNameFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.agencyName) : '';
  const accountNumberFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.accountNumber) : '';
  const accountNameFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.accountName) : '';
  const bankNameFilter = isSystemAdmin.value ? normalizeFilterValue(fieldFilters.bankName) : '';

  const filtered = list.value.filter((item) => {
    const matchesQuickSearch = !search || Object.values(item).some((val) => String(val).toLowerCase().includes(search));
    const matchesAgencyName = !agencyNameFilter || normalizeFilterValue(item.agency_name) === agencyNameFilter;
    const matchesAccountNumber = !accountNumberFilter || normalizeFilterValue(item.account_number) === accountNumberFilter;
    const matchesAccountName = !accountNameFilter || normalizeFilterValue(item.account_name) === accountNameFilter;
    const matchesBankName = !bankNameFilter || normalizeFilterValue(item.bank_name) === bankNameFilter;

    return matchesQuickSearch && matchesAgencyName && matchesAccountNumber && matchesAccountName && matchesBankName;
  });
  return filtered;
});

const visibleList = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredList.value.slice(start, end);
});

const handlePageChange = (p) => {
  page.value = p;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};


const resetFilters = () => {
  keyword.value = '';
  fieldFilters.agencyName = '';
  fieldFilters.accountNumber = '';
  fieldFilters.accountName = '';
  fieldFilters.bankName = '';
};

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

const normalizeSearchValue = (value) => String(value || '').toLowerCase().trim();
const agencySearchText = (agency) => normalizeSearchValue(`${agency?.id || ''} ${agency?.agency_name || ''} ${agency?.identity_number || ''} ${agency?.phone || ''}`);

const querySearchName = (queryString, cb) => {
  const query = normalizeSearchValue(queryString);
  const results = query
    ? agencyList.value.filter((agency) => agencySearchText(agency).includes(query))
    : agencyList.value;
  const suggestions = results.map((agency) => ({
    value: agency.agency_name,
    agencyId: agency.id,
    agency_name: agency.agency_name,
    identity_number: agency.identity_number
  }));
  cb(suggestions);
};

const handleSelectName = (item) => {
  const agency = agencyList.value.find((a) => a.id === item.agencyId);
  availableIdentities.value = agency ? [agency] : [];
  if (!agency) {
    formData.value.identity_number = "";
    formData.value.agency_id = "";
    return;
  }

  formData.value.agency_name = agency.agency_name;
  formData.value.identity_number = agency.identity_number;
  formData.value.agency_id = agency.id;
};

const handleSelectIdentity = (val) => {
  const agency = availableIdentities.value.find(a => a.identity_number === val);
  if (agency) {
    formData.value.agency_id = agency.id;
    formData.value.agency_name = agency.agency_name;
  }
};

const handleAddNew = async () => {
  isEdit.value = false;
  isAutoCreate.value = false;
  formData.value = { id: null, agency_id: "", agency_name: "", identity_number: "", bank_name: "", account_number: "", account_name: "" };
  availableIdentities.value = [];
  await fetchAgencies();
  showModal.value = true;
};

const openCreateModalFromQuery = async () => {
  if (route.query.autoCreate !== '1') {
    return;
  }

  await fetchAgencies();

  const queryAgencyId = Number(route.query.agencyId);
  const queryAgencyName = String(route.query.agencyName || '');
  const queryIdentityNumber = String(route.query.identityNumber || '');
  const matchedAgency = agencyList.value.find((item) => item.id === queryAgencyId);

  isEdit.value = false;
  isAutoCreate.value = true;
  formData.value = {
    id: null,
    agency_id: "",
    agency_name: "",
    identity_number: "",
    bank_name: "",
    account_number: "",
    account_name: ""
  };

  if (matchedAgency) {
    availableIdentities.value = [matchedAgency];
    formData.value.agency_id = matchedAgency.id;
    formData.value.agency_name = matchedAgency.agency_name;
    formData.value.identity_number = matchedAgency.identity_number;
  } else if (queryAgencyId) {
    // Nếu không tìm thấy trong list (có thể do cache hoặc mới tạo), 
    // vẫn lấy thông tin từ query để người dùng có thể lưu ngay.
    const virtualAgency = {
      id: queryAgencyId,
      agency_name: queryAgencyName,
      identity_number: queryIdentityNumber
    };
    availableIdentities.value = [virtualAgency];
    formData.value.agency_id = queryAgencyId;
    formData.value.agency_name = queryAgencyName;
    formData.value.identity_number = queryIdentityNumber;
  } else {
    availableIdentities.value = [];
    formData.value.agency_name = queryAgencyName;
    formData.value.identity_number = queryIdentityNumber;
    ElMessage.warning('Không tìm thấy đại lý từ dữ liệu chuyển trang, vui lòng chọn lại đại lý trước khi lưu.');
  }

  showModal.value = true;

  const nextQuery = { ...route.query };
  delete nextQuery.autoCreate;
  delete nextQuery.agencyId;
  delete nextQuery.agencyName;
  delete nextQuery.identityNumber;

  await router.replace({ query: nextQuery });
};

const handleEdit = async (item) => {
  isEdit.value = true;
  isAutoCreate.value = false;
  formData.value = { ...item, agency_name: item.agency_name };
  await fetchAgencies();
  availableIdentities.value = agencyList.value.filter(a => a.id === item.agency_id);
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
  const confirmed = await confirmPopup(
    `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của ${formData.value.account_name}?`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xóa ngay', cancelButtonText: 'Hủy', type: 'warning' }
  )
  if (!confirmed) return

  try {
    await bankaccountApi.deleteBankAccounts(formData.value.id);
    ElMessage.success("Đã xóa tài khoản");
    showModal.value = false;
    fetchData();
  } catch {
    ElMessage.error("Lỗi khi xóa dữ liệu");
  }
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

onMounted(async () => {
  await fetchData();
  await openCreateModalFromQuery();
});
</script>

<style scoped>
.page-container {
  padding: 16px 24px;
  background: var(--bg-body);
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-main);
  transition: background 0.2s ease;
  overflow: hidden;
  box-sizing: border-box;
}

.header-card {
  margin-bottom: 16px;
  border-radius: 8px;
  flex-shrink: 0;
}
:deep(.header-card .el-card__body) { padding: 12px 20px; }

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

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advanced-filter-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
}

.filter-item {
  width: 100%;
}

.clear-filter-btn {
  width: 100%;
}

.agency-dual {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.agency-dual-name {
  font-weight: 600;
}

.agency-dual-id {
  font-size: 12px;
  color: var(--text-faint);
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
  .advanced-filter-row {
    grid-template-columns: 1fr;
  }

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
.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
}
:deep(.table-card .el-card__body) { 
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}

.table-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pagination-footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
</style>