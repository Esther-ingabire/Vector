import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

// Module-level token cache — avoids async reads on every request
let _accessToken = null;
let _refreshToken = null;

// Navigation ref — set this from the NavigationContainer ref so we can
// redirect to Login after a failed token refresh
let _navigationRef = null;

export function setNavigationRef(ref) {
  _navigationRef = ref;
}

export function setAuthTokens(access, refresh) {
  _accessToken = access;
  _refreshToken = refresh;
  AsyncStorage.setItem('access_token', access);
  if (refresh) AsyncStorage.setItem('refresh_token', refresh);
}

export function clearAuthTokens() {
  _accessToken = null;
  _refreshToken = null;
  AsyncStorage.multiRemove(['access_token', 'refresh_token']);
}

export function getAccessToken() {
  return _accessToken;
}

export async function loadTokensFromStorage() {
  const [access, refresh] = await AsyncStorage.multiGet(['access_token', 'refresh_token']);
  _accessToken = access[1] ?? null;
  _refreshToken = refresh[1] ?? null;
  return { accessToken: _accessToken, refreshToken: _refreshToken };
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',  // localtunnel bypass
  },
});

// ── Request interceptor ────────────────────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────────
let _isRefreshing = false;
let _failedQueue = [];

function processQueue(error, token = null) {
  _failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  _failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (_isRefreshing) {
        // Queue up any requests that come in while refresh is happening
        return new Promise((resolve, reject) => {
          _failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const refresh = _refreshToken;
        if (!refresh) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh,
        });

        const newAccess = data.access;
        setAuthTokens(newAccess, refresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthTokens();
        // Navigate to Login screen
        if (_navigationRef?.isReady()) {
          _navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default client;
