import apiClient from './client';

export const stationApi = {
  // Lấy danh sách trạm
  getStations(params = {}) {
    return apiClient.get('/stations', { params });
  },
  getFilterStations(params) {
    return apiClient.get('/stations/filter', { params });
  },
  //Hàm tạo mã trạm mới dựa trên mã tỉnh
  // Ví dụ gọi: stationApi.generateCode('NB') -> URL: /stations/generate-code?provinceCode=NB
  generateCode(provinceCode) {
    return apiClient.get('/stations/generate-code', {
      params: { provinceCode }
    });
  },
 
    // thêm trạm
  createStation(data) {
    return apiClient.post('/stations', data);
  },

  // sửa trạm
  updateStation(id, data) {
    return apiClient.put(`/stations/${id}`, data);
  },

  // xóa trạm
  deleteStation: (id) => apiClient.delete(`/stations/${id}`),

  // gán chiến lược cho nhiều trạm
  assignStrategy(data) {
    return apiClient.put('/stations/assign-strategy', data);
  }
};