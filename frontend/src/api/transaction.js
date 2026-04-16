import apiClient from './client';

export const transactionApi = {
  // Lấy danh sách phiên rửa
  gettransactions(params) {
    // Truyền params vào object cấu hình của axios
    return apiClient.get('/transactions', { params: params });
  },
};