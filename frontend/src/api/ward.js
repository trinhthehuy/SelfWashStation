import apiClient from './client';

export const wardApi = {
  getWards(provinceId = null) {
    const config = provinceId ? { params: { province_id: provinceId } } : {};
    return apiClient.get('/wards', config);
  },
  getProvinces() {
    return apiClient.get('/wards/provinces');
  }
};