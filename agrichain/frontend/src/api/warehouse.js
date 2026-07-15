import apiClient from './client.js'

export const warehouseApi = {
  getMyProfile: () => apiClient.get('/cooperatives/warehouse-managers/my/'),
  updateMyProfile: (data) => apiClient.patch('/cooperatives/warehouse-managers/my/', data),

  // Facilities I own/manage
  getMyFacilities: () => apiClient.get('/cooperatives/facilities/'),
  createFacility: (data) => apiClient.post('/cooperatives/facilities/', data),
  updateFacility: (id, data) => apiClient.patch(`/cooperatives/facilities/${id}/`, data),

  // IoT readings for a facility I manage
  getFacilityReadings: (facilityId, params) => apiClient.get('/iot/storage/', { params: { ...params, facility: facilityId } }),

  // Rental requests from cooperatives
  getRentalRequests: () => apiClient.get('/cooperatives/warehouse-rentals/'),
  acceptRentalRequest: (id) => apiClient.post(`/cooperatives/warehouse-rentals/${id}/accept/`),
  declineRentalRequest: (id, data) => apiClient.post(`/cooperatives/warehouse-rentals/${id}/decline/`, data),
}
