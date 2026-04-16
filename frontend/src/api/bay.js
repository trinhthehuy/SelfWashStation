import apiClient from './client';

export const bayApi = {
  getBays(stationId = null) {
    const config = stationId ? { params: { station_id: stationId } } : {};
    return apiClient.get('/bays', config);
  },
  
 // thêm trụ
  createBays: async (stationId) => {
    return await apiClient.post('/bays', { station_id: stationId });
  },
  // sửa trụ
  updateBays(id, data) {
    return apiClient.put(`/bays/${id}`, data);
  },

  // xóa trụ
  deleteBays: (id) => apiClient.delete(`/bays/${id}`)
};