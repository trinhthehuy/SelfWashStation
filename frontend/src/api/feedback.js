import apiClient from './client';

export const feedbackApi = {
  // Lấy danh sách góp ý (scoped theo role)
  getFeedbacks() {
    return apiClient.get('/feedbacks');
  },

  // Đếm badge notification bell
  getUnreadCount() {
    return apiClient.get('/feedbacks/unread-count');
  },

  // Agency gửi góp ý mới
  createFeedback(data) {
    return apiClient.post('/feedbacks', data);
  },

  // SA/Engineer phản hồi góp ý
  replyFeedback(id, data) {
    return apiClient.put(`/feedbacks/${id}/reply`, data);
  },

  // Agency đánh dấu đã đọc reply
  markRead(id) {
    return apiClient.put(`/feedbacks/${id}/read`);
  },
};
