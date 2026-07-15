import apiClient from './client.js'

export const traceabilityApi = {
  getBatches: (params) => apiClient.get('/traceability/batches/', { params }),
  getBatch: (id, config) => apiClient.get(`/traceability/batches/${id}/`, config),
  lookupByQR: (batchId) => apiClient.get('/traceability/batches/lookup/', { params: { batch_id: batchId } }),
  createBatch: (data) => apiClient.post('/traceability/batches/', data),
  scanBatch: (id, data) => apiClient.post(`/traceability/batches/${id}/scan/`, data),
  reportMismatch: (id, data) => apiClient.post(`/traceability/batches/${id}/report-mismatch/`, data),
  getBatchIoT: (id, config) => apiClient.get(`/traceability/batches/${id}/iot/`, config),
  getQR: (id, config) => apiClient.get(`/traceability/batches/${id}/qr/`, { responseType: 'blob', ...config }),

  // Public, no-login lookup — what the QR code printed on a batch label points at.
  getPublicTrack: (batchId) => apiClient.get(`/traceability/track/${batchId}/`),
}
