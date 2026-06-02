import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { navigateByRole } from '../../context/AuthContext.jsx'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    const routes = { ADMIN:'/admin', COOPERATIVE_MANAGER:'/cooperative', TRANSPORTER:'/transporter', DISTRIBUTOR:'/distributor', MARKET_AGENT:'/market-agent', MINAGRI_OFFICER:'/minagri' }
    return <Navigate to={routes[user.role] || '/login'} replace />
  }
  return children
}
