import apiClient from './client.js'

export const transportApi = {
  // Transport requests
  getMyRequests: (params) => apiClient.get('/transport/requests/', { params }),
  acceptRequest: (id) => apiClient.post(`/transport/requests/${id}/accept/`),
  declineRequest: (id, data) => apiClient.post(`/transport/requests/${id}/decline/`, data),
  createRequest: (data) => apiClient.post('/transport/requests/', data),

  // Trips
  getMyActiveTrip: () => apiClient.get('/transport/trips/active/'),
  getMyTripHistory: (params) => apiClient.get('/transport/trips/', { params }),
  confirmPickup: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-pickup/`, data),
  confirmDelivery: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-delivery/`, data),

  // GPS tracking
  postGPSUpdate: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/gps/`, data),

  // Transporter directory (for cooperatives and distributors)
  searchTransporters: (params) => apiClient.get('/transport/directory/', { params }),
}
