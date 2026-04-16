import apiClient from './client';

export const agencyApi = {
  // Lấy danh sách đại lý
  getAgencies(params = {}) {
    return apiClient.get('/agencies', { params });
  },
  
 // thêm agency
  createAgency(data) {
    return apiClient.post('/agencies', data);
  },

  // sửa đại lý
  updateAgency(id, data) {
    return apiClient.put(`/agencies/${id}`, data);
  },

  // xóa đại lý
  deleteAgency: (id) => apiClient.delete(`/agencies/${id}`)
};