/**
 * App root — routing and auth provider setup.
 * Routes are protected by role. Each role sees only its own dashboard.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import PublicRoute from './components/layout/PublicRoute.jsx'

// Landing page
import LandingPage from './pages/LandingPage.jsx'

// Auth pages
import LoginPage from './pages/auth/LoginPage.jsx'
import OTPPage from './pages/auth/OTPPage.jsx'
import SetPasswordPage from './pages/auth/SetPasswordPage.jsx'
import RequestAccessPage from './pages/auth/RequestAccessPage.jsx'

// Role dashboards
import AdminLayout from './pages/admin/AdminLayout.jsx'
import CooperativeLayout from './pages/cooperative/CooperativeLayout.jsx'
import DistributorLayout from './pages/distributor/DistributorLayout.jsx'
import MinagriLayout from './pages/minagri/MinagriLayout.jsx'

// Transporter and Market Agent are in the mobile app (React Native)
// But we provide a fallback web view for browser access
import TransporterLayout from './pages/transporter/TransporterLayout.jsx'
import MarketAgentLayout from './pages/market_agent/MarketAgentLayout.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/verify-otp" element={<PublicRoute><OTPPage /></PublicRoute>} />
        <Route path="/set-password" element={<ProtectedRoute><SetPasswordPage /></ProtectedRoute>} />
        <Route path="/request-access" element={<PublicRoute><RequestAccessPage /></PublicRoute>} />

        {/* Admin dashboard */}
        <Route path="/admin/*" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>} />

        {/* Cooperative Manager dashboard */}
        <Route path="/cooperative/*" element={<ProtectedRoute roles={['COOPERATIVE_MANAGER']}><CooperativeLayout /></ProtectedRoute>} />

        {/* Distributor dashboard */}
        <Route path="/distributor/*" element={<ProtectedRoute roles={['DISTRIBUTOR']}><DistributorLayout /></ProtectedRoute>} />

        {/* MINAGRI Officer dashboard */}
        <Route path="/minagri/*" element={<ProtectedRoute roles={['MINAGRI_OFFICER']}><MinagriLayout /></ProtectedRoute>} />

        {/* Field roles — primarily mobile app, but web fallback available */}
        <Route path="/transporter/*" element={<ProtectedRoute roles={['TRANSPORTER']}><TransporterLayout /></ProtectedRoute>} />
        <Route path="/market-agent/*" element={<ProtectedRoute roles={['MARKET_AGENT']}><MarketAgentLayout /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
