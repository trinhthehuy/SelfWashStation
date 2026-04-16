import apiClient from './client.js'

export const auditApi = {
  getLogs(params = {}) {
    return apiClient.get('/audit-logs', { params })
  }
}
