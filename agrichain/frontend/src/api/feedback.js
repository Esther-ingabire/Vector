import apiClient from './client.js'

export const feedbackApi = {
  submit:  (data)   => apiClient.post('/feedback/', data),
  list:    (params) => apiClient.get('/feedback/', { params }),
  resolve: (id, admin_note) => apiClient.patch(`/feedback/${id}/resolve/`, { admin_note }),
}
