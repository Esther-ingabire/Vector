/**
 * Axios API client — pre-configured with JWT auth and error handling.
 * All API calls go through this client.
 */
import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — refresh token or redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return apiClient(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    const data = error.response?.data
    const message = data?.error
      || data?.detail
      || data?.non_field_errors?.[0]
      || (data && typeof data === 'object' ? Object.values(data).flat().find(v => typeof v === 'string') : null)
      || 'An error occurred'
    const isWrite = ['post', 'put', 'patch', 'delete'].includes(original?.method?.toLowerCase())
    if (error.response?.status !== 401 && !original?._silent && isWrite) {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

export default apiClient
