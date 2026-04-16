import apiClient from './client';

export const strategyApi = {
  // Lấy danh sách chiến lược
  getStrategies(agencyId = null) {
    const config = agencyId ? { params: { agency_id: agencyId } } : {};
    return apiClient.get('/strategies', config);
  },
  
 // thêm chiến lược
  createStrategies(data) {
    return apiClient.post('/strategies', data);
  },

  // sửa chiến lược
  updateStrategies(id, data) {
    return apiClient.put(`/strategies/${id}`, data);
  },

  // xóa chiến lược
  deleteStrategies: (id) => apiClient.delete(`/strategies/${id}`)
};