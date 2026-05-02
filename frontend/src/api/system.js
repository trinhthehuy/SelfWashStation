import apiClient from './client'

export const systemApi = {
  getApiTokens() {
    return apiClient.get('/tokens')
  },
  createApiToken(payload) {
    return apiClient.post('/tokens/create', payload)
  },
  deleteApiToken(tokenId) {
    return apiClient.post('/tokens/delete', { tokenId })
  },
  getDevModeStatus() {
    return apiClient.get('/tokens/dev-mode/status')
  },
  toggleDevMode() {
    return apiClient.post('/tokens/dev-mode/toggle')
  },
  getMqttStatus() {
    return apiClient.get('/mqtt-status')
  },
  refreshMqtt() {
    return apiClient.post('/settings/refresh')
  },
  updateMqtt(payload) {
    return apiClient.post('/settings/mqtt', payload)
  },
  getSmtpSettings() {
    return apiClient.get('/settings/smtp')
  },
  updateSmtpSettings(payload) {
    return apiClient.post('/settings/smtp', payload)
  },
  getSepayWebhookSettings() {
    return apiClient.get('/settings/sepay-webhook')
  },
  updateSepayWebhookSettings(payload) {
    return apiClient.post('/settings/sepay-webhook', payload)
  },
  sendTestWebhook(payload, customUrl) {
    const targetPath = customUrl ? customUrl.replace(/^https?:\/\/[^/]+/, '') : '/webhook/bank-transfer'
    return apiClient.post(targetPath, payload, {
      headers: {
        'X-Dev-Test': 'true'
      }
    })
  },
  getTestTransactions() {
    return apiClient.get('/test-transactions')
  },
  getIntegrationTransactions() {
    return apiClient.get('/integration-transactions')
  },
  getOutgoingTransactions() {
    return apiClient.get('/outgoing-transactions')
  }
}