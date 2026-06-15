import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, me as apiMe, logout as apiLogout } from '../api/auth';
import {
  setAuthTokens,
  clearAuthTokens,
  loadTokensFromStorage,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await loadTokensFromStorage();
        if (accessToken) {
          const { data } = await apiMe();
          setUser(data);
        }
      } catch {
        // Token invalid/expired — start fresh
        clearAuthTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Login with credential (phone/email) + password.
   * Returns the user object so the caller can inspect must_change_password.
   */
  const login = async (credential, password) => {
    const { data } = await apiLogin({ credential, password });
    // Backend returns { access, refresh, user } or { access, refresh, must_change_password }
    const { access, refresh, user: userData, must_change_password } = data;
    setAuthTokens(access, refresh);

    if (userData) {
      setUser(userData);
      return userData;
    }
    // If the response only has tokens (OTP flow), return partial info
    return { must_change_password };
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Best effort
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  const updateUser = (u) => {
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
