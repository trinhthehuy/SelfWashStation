import apiClient from './client';

export const notificationApi = {
  getNotifications(params = {}) {
    return apiClient.get('/notifications', { params });
  },

  getUnreadCount() {
    return apiClient.get('/notifications/unread-count');
  },

  markRead(id) {
    return apiClient.put(`/notifications/${id}/read`);
  },

  markAllRead(data = {}) {
    return apiClient.put('/notifications/mark-all-read', data);
  },
};
