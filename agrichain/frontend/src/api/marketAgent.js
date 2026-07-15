import apiClient from './client.js'

export const marketAgentApi = {
  getMyProfile:       ()     => apiClient.get('/market-agents/agents/my/'),
  updateMyProfile:    (data) => apiClient.patch('/market-agents/agents/my/', data),
  getMyAnalytics:     ()     => apiClient.get('/market-agents/agents/my-analytics/'),
  getNotices:         (params) => apiClient.get('/market-agents/notices/', { params }),
  getCollections:     ()     => apiClient.get('/market-agents/collections/'),
  recordCollection:   (data) => apiClient.post('/market-agents/collections/', data),
  getWasteReports:    ()     => apiClient.get('/market-agents/waste-reports/'),
  submitWasteReport:  (data) => apiClient.post('/market-agents/waste-reports/', data),
  submitWasteReportBatch: (data) => apiClient.post('/market-agents/waste-reports/create-batch/', data),
  // Orders — agent places orders against distributor stock listings
  getMyOrders:        ()              => apiClient.get('/distribution/orders/'),
  placeOrder:         (data)          => apiClient.post('/distribution/orders/', data),
  // Distributor discovery & linking
  getAllDistributors:  ()              => apiClient.get('/distribution/distributors/'),
  getNearbyDistributors: (params)      => apiClient.get('/distribution/distributors/nearby/', { params }),
  getMyLinks:         ()              => apiClient.get('/distribution/market-agents/my-links/'),
  requestLink:        (distributorId) => apiClient.post('/distribution/market-agents/request-link/', { distributor_id: distributorId }),
}
