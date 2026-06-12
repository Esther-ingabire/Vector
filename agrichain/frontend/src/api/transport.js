import apiClient from './client.js'

export const transportApi = {
  // Transport requests
  getMyRequests: (params, config) => apiClient.get('/transport/requests/', { params, ...config }),
  acceptRequest: (id) => apiClient.post(`/transport/requests/${id}/accept/`),
  declineRequest: (id, data) => apiClient.post(`/transport/requests/${id}/decline/`, data),
  createRequest: (data) => apiClient.post('/transport/requests/', data),

  // Trips
  getMyActiveTrip: (config) => apiClient.get('/transport/trips/active/', config),
  getMyTripHistory: (params) => apiClient.get('/transport/trips/', { params }),
  confirmPickup: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-pickup/`, data),
  confirmDelivery: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-delivery/`, data),

  // GPS tracking
  postGPSUpdate: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/gps/`, data),

  // Transporter profile & vehicles
  getMyProfile: (config) => apiClient.get('/transport/transporters/my/', config),
  getMyVehicles: (config) => apiClient.get('/transport/vehicles/', config),
  updateVehicle: (id, data) => apiClient.patch(`/transport/vehicles/${id}/`, data),

  // Transporter directory (for cooperatives and distributors)
  searchTransporters: (params) => apiClient.get('/transport/directory/', { params }),
}
