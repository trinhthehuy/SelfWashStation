import apiClient from './client';

export const bankaccountApi = {
  getBankAccounts(agencyId = null) {
    const config = agencyId ? { params: { agency_id: agencyId } } : {};
    return apiClient.get('/bank-accounts', config);
  },

 // thêm tài khoản ngân hàng
  createBankAccounts(data) {
    return apiClient.post('/bank-accounts', data);
  },

  // sửa tài khoản ngân hàng
  updateBankAccounts(id, data) {
    return apiClient.put(`/bank-accounts/${id}`, data);
  },

  // xóa tài khoản ngân hàng
  deleteBankAccounts: (id) => apiClient.delete(`/bank-accounts/${id}`)
};