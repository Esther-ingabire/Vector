import apiClient from './client.js'

export const marketAgentApi = {
  getMyProfile:       ()     => apiClient.get('/market-agents/agents/my/'),
  getMyAnalytics:     ()     => apiClient.get('/market-agents/agents/my-analytics/'),
  getNotices:         ()     => apiClient.get('/market-agents/notices/'),
  getCollections:     ()     => apiClient.get('/market-agents/collections/'),
  recordCollection:   (data) => apiClient.post('/market-agents/collections/', data),
  getWasteReports:    ()     => apiClient.get('/market-agents/waste-reports/'),
  submitWasteReport:  (data) => apiClient.post('/market-agents/waste-reports/', data),
}
