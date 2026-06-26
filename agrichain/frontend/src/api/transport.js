import apiClient from './client.js'

export const transportApi = {
  // Transport requests
  getMyRequests: (params, config) => apiClient.get('/transport/requests/', { params, ...config }),
  acceptRequest: (id) => apiClient.post(`/transport/requests/${id}/accept/`),
  declineRequest: (id, data) => apiClient.post(`/transport/requests/${id}/decline/`, data),
  assignDriver: (id, data) => apiClient.post(`/transport/requests/${id}/assign-driver/`, data),
  rateRequest: (id, data) => apiClient.post(`/transport/requests/${id}/rate/`, data),
  createRequest: (data) => apiClient.post('/transport/requests/', data),
  createMultiStopRequest: (data) => apiClient.post('/transport/requests/create-multi-stop/', data),

  // Trips
  getMyActiveTrip: (config) => apiClient.get('/transport/trips/active/', config),
  getMyTripHistory: (params) => apiClient.get('/transport/trips/', { params }),
  confirmPickup: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-pickup/`, data),
  confirmDelivery: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/confirm-delivery/`, data),

  // GPS tracking
  postGPSUpdate: (tripId, data) => apiClient.post(`/transport/trips/${tripId}/gps/`, data),

  // Transporter profile & vehicles
  getMyProfile: (config) => apiClient.get('/transport/transporters/my/', config),
  updateMyProfile: (data) => apiClient.patch('/transport/transporters/my/', data),
  getMyVehicles: (config) => apiClient.get('/transport/vehicles/', config),
  createVehicle: (data) => apiClient.post('/transport/vehicles/', data),
  updateVehicle: (id, data) => apiClient.patch(`/transport/vehicles/${id}/`, data),

  // Transporter directory (for cooperatives and distributors)
  searchTransporters: (params) => apiClient.get('/transport/directory/', { params }),

  // Transport Company → Driver sub-accounts
  getMyDrivers: (config) => apiClient.get('/transport/transporters/my-drivers/', config),
  registerDriver: (data) => apiClient.post('/transport/transporters/register-driver/', data),
  getMyRatings: (config) => apiClient.get('/transport/transporters/my-ratings/', config),

  // Fleet IoT monitoring + incident alerts
  getFleetMonitoring: (config) => apiClient.get('/transport/trips/fleet-monitoring/', config),
  reportIncident: (data) => apiClient.post('/transport/incidents/', data),
  getMyIncidents: (params, config) => apiClient.get('/transport/incidents/', { params, ...config }),
  resolveIncident: (id) => apiClient.patch(`/transport/incidents/${id}/`, { resolved: true }),
}
