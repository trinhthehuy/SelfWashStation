import apiClient from './client';

export const strategyApi = {
  // Lấy danh sách chiến lược
  getStrategies(paramsOrAgencyId = null) {
    let params = {};
    if (typeof paramsOrAgencyId === 'object' && paramsOrAgencyId !== null) {
      params = paramsOrAgencyId;
    } else if (paramsOrAgencyId) {
      params.agency_id = paramsOrAgencyId;
    }
    return apiClient.get('/strategies', { params });
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