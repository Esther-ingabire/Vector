import apiClient from './client.js'

export const distributionApi = {
  // Produce requests (distributor → cooperative)
  getMyProduceRequests: (params) => apiClient.get('/distribution/produce-requests/', { params }),
  createProduceRequest: (data) => apiClient.post('/distribution/produce-requests/', data),
  getProduceRequestDetail: (id) => apiClient.get(`/distribution/produce-requests/${id}/`),
  acceptProduceRequest: (id, data) => apiClient.post(`/distribution/produce-requests/${id}/accept/`, data || {}),
  declineProduceRequest: (id, data) => apiClient.post(`/distribution/produce-requests/${id}/decline/`, data || {}),

  // Market agent links
  getMyMarketAgents: () => apiClient.get('/distribution/market-agents/'),
  addMarketAgentLink: (data) => apiClient.post('/distribution/market-agents/link/', data),
  removeMarketAgentLink: (id) => apiClient.delete(`/distribution/market-agents/link/${id}/`),

  // Collection notices
  getMyNotices: (params) => apiClient.get('/distribution/notices/', { params }),
  createNotice: (data) => apiClient.post('/distribution/notices/', data),
  updateNotice: (id, data) => apiClient.patch(`/distribution/notices/${id}/`, data),
  deactivateNotice: (id) => apiClient.post(`/distribution/notices/${id}/deactivate/`),

  // Orders
  getMyOrders: (params) => apiClient.get('/distribution/orders/', { params }),
  confirmOrder: (id, data) => apiClient.post(`/distribution/orders/${id}/confirm/`, data),
  declineOrder: (id, data) => apiClient.post(`/distribution/orders/${id}/decline/`, data),

  // Receipt confirmation
  confirmReceipt: (batchId, data) => apiClient.post(`/traceability/batches/${batchId}/confirm-receipt/`, data),

  // Warehouse waste / loss reports
  getMyWasteReports: (params) => apiClient.get('/distribution/waste-reports/', { params }),
  submitWasteReport: (data) => apiClient.post('/distribution/waste-reports/', data),

  // My Fleet — drivers the distributor owns and registers directly (no Transport Company in between)
  registerOwnDriver: (data) => apiClient.post('/distribution/register-own-driver/', data),
  getMyProfile: (config) => apiClient.get('/distribution/distributors/my/', config),
  getMyFleet: (config) => apiClient.get('/distribution/distributors/my-fleet/', config),
  getFleetMonitoring: (config) => apiClient.get('/distribution/distributors/fleet-monitoring/', config),

  // Analytics
  getDeliveryMethodComparison: (params) => apiClient.get('/analytics/delivery-comparison/', { params }),
  getDistributionAnalytics: (params) => apiClient.get('/analytics/distribution/', { params }),
  // Agent link request management (distributor approves/rejects)
  getPendingAgentRequests: () => apiClient.get('/distribution/market-agents/?include_pending=true'),
  approveLinkRequest: (linkId) => apiClient.post(`/distribution/market-agents/link/${linkId}/approve/`),
  rejectLinkRequest:  (linkId) => apiClient.delete(`/distribution/market-agents/link/${linkId}/approve/`),
}
