import apiClient from './client.js'

export const cooperativesApi = {
  // Cooperative profile
  getMyCooperative: () => apiClient.get('/cooperatives/my/'),
  updateCooperative: (id, data) => apiClient.patch(`/cooperatives/${id}/`, data),

  // Directory (for distributors)
  searchDirectory: (params) => apiClient.get('/cooperatives/directory/', { params }),
  getCooperativeDetail: (id) => apiClient.get(`/cooperatives/${id}/`),

  // Stock management
  getMyStock: () => apiClient.get('/cooperatives/stock/'),
  addStock: (data) => apiClient.post('/cooperatives/stock/', data),
  updateStock: (id, data) => apiClient.patch(`/cooperatives/stock/${id}/`, data),

  // Storage facilities
  getMyFacilities: () => apiClient.get('/cooperatives/facilities/'),
  getFacilityIoTReadings: (id, params) => apiClient.get(`/cooperatives/facilities/${id}/iot/`, { params }),

  // QR code generation
  generateBatchQR: (batchId) => apiClient.get(`/traceability/batches/${batchId}/qr/`),
}
