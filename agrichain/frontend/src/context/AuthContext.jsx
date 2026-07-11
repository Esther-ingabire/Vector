/**
 * Authentication context — manages user session, role, and JWT tokens.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me()
        .then(res => setUser(res.data))
        .catch(() => { localStorage.clear(); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (credential, password) => {
    const res = await authApi.login({ credential, password })
    if (res.data.mfa_required) {
      return { mfaRequired: true, credential: res.data.credential || credential }
    }
    const { access, refresh, user: userData, must_change_password } = res.data
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    setUser(userData)
    if (must_change_password) {
      navigate('/set-password')
    } else {
      navigateByRole(userData.role, navigate)
    }
    return userData
  }, [navigate])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
    navigate('/login')
  }, [navigate])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function navigateByRole(role, navigate) {
  const routes = {
    ADMIN: '/admin',
    COOPERATIVE_MANAGER: '/cooperative',
    TRANSPORTER: '/transporter',
    TRANSPORT_COMPANY: '/transporter',
    DISTRIBUTOR: '/distributor',
    MARKET_AGENT: '/market-agent',
    MINAGRI_OFFICER: '/minagri',
    WAREHOUSE_MANAGER: '/warehouse',
  }
  navigate(routes[role] || '/login')
}
