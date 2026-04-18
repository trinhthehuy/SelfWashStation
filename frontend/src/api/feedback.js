import apiClient from './client';

export const feedbackApi = {
  // Lấy danh sách góp ý (scoped theo role)
  getFeedbacks() {
    return apiClient.get('/feedbacks');
  },

  // Lấy chi tiết một góp ý
  getFeedbackById(id) {
    return apiClient.get(`/feedbacks/${id}`);
  },

  // Người dùng gửi góp ý mới
  createFeedback(data) {
    return apiClient.post('/feedbacks', data);
  },

  // SA phản hồi góp ý
  replyFeedback(id, data) {
    return apiClient.put(`/feedbacks/${id}/reply`, data);
  },

  // Creator đánh dấu đã đọc reply
  markRead(id) {
    return apiClient.put(`/feedbacks/${id}/read`);
  },
};
