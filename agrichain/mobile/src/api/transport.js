import client from './client';

export const getMyRequests = (params) =>
  client.get('/transport/requests/', { params });

export const acceptRequest = (id) =>
  client.post(`/transport/requests/${id}/accept/`);

export const declineRequest = (id, data) =>
  client.post(`/transport/requests/${id}/decline/`, data);

export const getMyActiveTrip = () =>
  client.get('/transport/trips/active/');

export const confirmDelivery = (tripId, data) =>
  client.post(`/transport/trips/${tripId}/confirm_delivery/`, data);

export const confirmPickup = (tripId) =>
  client.post(`/transport/trips/${tripId}/confirm_pickup/`);

export const getMyTripHistory = (params) =>
  client.get('/transport/trips/', { params });

export const reportIncident = (data) =>
  client.post('/transport/incidents/', data);

export const getVehicleIotReadings = (tripId) =>
  client.get('/iot/vehicle/', { params: { trip: tripId } });
