import apiClient from './client.js'

export const analyticsApi = {
  // National KPIs (MINAGRI)
  getNationalKPIs: (params) => apiClient.get('/analytics/national/', { params }),
  getDistrictKPIs: (params) => apiClient.get('/analytics/districts/', { params }),

  // AI Insights
  getDailyBrief: () => apiClient.get('/ai-insights/daily-brief/'),
  getInsights: (params) => apiClient.get('/ai-insights/', { params }),

  // Reports
  getReports: (params) => apiClient.get('/reports/', { params }),
  requestReport: (data) => apiClient.post('/reports/generate/', data),
  downloadReport: (id) => apiClient.get(`/reports/${id}/download/`, { responseType: 'blob' }),

  // Loss prediction
  getPredictions: (params) => apiClient.get('/predictions/', { params }),
  getOrderRiskAdvisory: (orderId) => apiClient.get(`/predictions/order/${orderId}/advisory/`),

  // Notifications
  getNotifications: (params) => apiClient.get('/notifications/', { params }),
  markRead: (id) => apiClient.post(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post('/notifications/mark-all-read/'),
}
