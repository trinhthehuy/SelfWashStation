import apiClient from './client';

export const revenueApi = {
  /**
   * Lấy báo cáo doanh thu phân cấp
   * @param {Object} params - level, time_unit, start_date, end_date, keyword, location_path
   */
  getRevenueReport(params) {
    return apiClient.get('/revenue', { params });
  },

  /**
   * Doanh thu theo giờ × ngày trong tuần (cho heatmap)
   * @param {Object} params - start_date, end_date, station_id (optional)
   */
  getHourlyReport(params) {
    return apiClient.get('/revenue/hourly', { params });
  },

  /**
   * Tổng quan hệ thống: số đại lý, trạm, trụ, doanh thu hôm qua, trạng thái trụ
   */
  getStats() {
    return apiClient.get('/revenue/stats');
  },

  exportRevenueExcel(params) {
    return apiClient.get('/revenue/export', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * Top 6 trạm doanh thu 30 ngày gần nhất + "Các trạm còn lại"
   */
  getStationPie() {
    return apiClient.get('/revenue/station-pie');
  }
};