import apiClient from './client';

export const wardApi = {
  getWards(provinceId = null, keyword = '', limit = 1000) {
    const params = {};
    if (provinceId) params.province_id = provinceId;
    if (keyword) params.keyword = keyword;
    if (limit) params.limit = limit;
    return apiClient.get('/wards', { params });
  },
  getProvinces() {
    return apiClient.get('/wards/provinces');
  }
};