import apiClient from './client';

export const bankaccountApi = {
  getBankAccounts(paramsOrAgencyId = null) {
    let params = {};
    if (typeof paramsOrAgencyId === 'object' && paramsOrAgencyId !== null) {
      params = paramsOrAgencyId;
    } else if (paramsOrAgencyId) {
      params.agency_id = paramsOrAgencyId;
    }
    return apiClient.get('/bank-accounts', { params });
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