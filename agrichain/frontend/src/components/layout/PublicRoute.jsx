import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

// Role → dashboard path (keep in sync with navigateByRole in AuthContext)
const ROLE_HOME = {
  ADMIN:               '/admin',
  COOPERATIVE_MANAGER: '/cooperative',
  TRANSPORTER:         '/transporter',
  TRANSPORT_COMPANY:   '/transporter',
  DISTRIBUTOR:         '/distributor',
  MARKET_AGENT:        '/market-agent',
  MINAGRI_OFFICER:     '/minagri',
  WAREHOUSE_MANAGER:   '/warehouse',
}

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  // While the session token is being validated server-side, show a branded
  // loading screen rather than returning null.  Returning null caused a visible
  // blank flash followed by a sudden redirect, which looked like an accidental
  // "login without credentials" to users who still had a valid session token.
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{
          backgroundImage: "url('/images/auth-bg.jpg')",
          backgroundColor: '#0b2b18',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Checking your session…</p>
        </div>
      </div>
    )
  }

  // Already authenticated — redirect to their own dashboard
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />

  return children
}
