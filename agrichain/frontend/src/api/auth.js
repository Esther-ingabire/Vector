import apiClient from './client.js'

export const authApi = {
  login: (data) => apiClient.post('/auth/login/', data, { _silent: true }),
  verifyOtp: (data) => apiClient.post('/auth/otp/verify/', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password/', data),
  resendOtp: (data) => apiClient.post('/auth/otp/resend/', data),
  setPassword: (data) => apiClient.post('/auth/set-password/', data),
  refreshToken: (data) => apiClient.post('/auth/token/refresh/', data),
  requestAccess: (data) => apiClient.post('/auth/request-access/', data),
  me: () => apiClient.get('/auth/me/'),
  updateProfile: (data) => apiClient.patch('/auth/me/', data),
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('avatar', file)
    return apiClient.patch('/auth/me/avatar/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  logout: () => { localStorage.clear() },
  requestMfaOtp: () => apiClient.post('/auth/mfa/request-otp/'),
  enableMfa: (data) => apiClient.post('/auth/mfa/enable/', data),
  disableMfa: (data) => apiClient.post('/auth/mfa/disable/', data),

  // Admin only
  createUser: (data) => apiClient.post('/auth/users/create/', data),
  getAccessRequests: (params) => apiClient.get('/auth/access-requests/', { params }),
  approveRequest: (id, data) => apiClient.post(`/auth/access-requests/${id}/approve/`, data),
  rejectRequest: (id, data) => apiClient.post(`/auth/access-requests/${id}/reject/`, data),
  getUsers: (params) => apiClient.get('/auth/users/', { params }),
  updateUser: (id, data) => apiClient.patch(`/auth/users/${id}/`, data),
  getAuditLogs: (params) => apiClient.get('/auth/audit-logs/', { params }),
  getDataIntegrationStatus: () => apiClient.get('/auth/data-integration-status/'),
}
