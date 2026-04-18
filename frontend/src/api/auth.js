import apiClient from './client'

export const authApi = {
  login(payload) {
    return apiClient.post('/auth/login', payload)
  },
  forgotPassword(username) {
    return apiClient.post('/auth/forgot-password', { username })
  },
  validateResetPasswordToken(token) {
    return apiClient.get(`/auth/reset-password/${token}`)
  },
  resetPasswordByToken(token, newPassword) {
    return apiClient.post('/auth/reset-password', { token, newPassword })
  },
  getCurrentUser() {
    return apiClient.get('/auth/me')
  },
  getUsers() {
    return apiClient.get('/auth/users')
  },
  createUser(data) {
    return apiClient.post('/auth/users', data)
  },
  updateUser(id, data) {
    return apiClient.put(`/auth/users/${id}`, data)
  },
  deleteUser(id) {
    return apiClient.delete(`/auth/users/${id}`)
  },
  resetPassword(id, newPassword) {
    return apiClient.put(`/auth/users/${id}/password`, { newPassword })
  },
  changeOwnPassword(currentPassword, newPassword) {
    return apiClient.put('/auth/me/password', { currentPassword, newPassword })
  },
  updateProfile(data) {
    return apiClient.put('/auth/me/profile', data)
  },
  getUserScope(id) {
    return apiClient.get(`/auth/users/${id}/scope`)
  },
  setUserScope(id, data) {
    return apiClient.put(`/auth/users/${id}/scope`, data)
  }
}