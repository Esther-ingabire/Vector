import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Clock, Truck, History, Box, FileDown, Users, Thermometer } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import TransporterDashboard from './TransporterDashboard.jsx'
import PendingRequests from './PendingRequests.jsx'
import ActiveTrip from './ActiveTrip.jsx'
import TripHistory from './TripHistory.jsx'
import VehicleProfile from './VehicleProfile.jsx'
import MyDrivers from './MyDrivers.jsx'
import FleetMonitoring from './FleetMonitoring.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const BASE_NAV = [
  { to: '/transporter',          label: 'Dashboard',        icon: LayoutDashboard, end: true },
  { to: '/transporter/pending',  label: 'Pending Requests', icon: Clock },
  { to: '/transporter/active',   label: 'Active Trip',      icon: Truck },
  { to: '/transporter/history',  label: 'Trip History',     icon: History },
  { to: '/transporter/vehicle',  label: 'Vehicle Profile',  icon: Box },
  { to: '/transporter/monitoring', label: 'Fleet Monitoring', icon: Thermometer },
  { to: '/transporter/reports',  label: 'Reports',          icon: FileDown },
]

export default function TransporterLayout() {
  // "My Fleet" (driver registration) only makes sense for a Transport Company account —
  // an individual driver (role TRANSPORTER) can't register sub-drivers of their own.
  const { user } = useAuth()
  const isCompany = user?.role === 'TRANSPORT_COMPANY'

  const navItems = isCompany
    ? [...BASE_NAV.slice(0, 5), { to: '/transporter/drivers', label: 'My Fleet', icon: Users }, ...BASE_NAV.slice(5)]
    : BASE_NAV

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Transporter" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<TransporterDashboard />} />
            <Route path="pending" element={<PendingRequests />} />
            <Route path="active"  element={<ActiveTrip />} />
            <Route path="history" element={<TripHistory />} />
            <Route path="vehicle" element={<VehicleProfile />} />
            <Route path="drivers" element={<MyDrivers />} />
            <Route path="monitoring" element={<FleetMonitoring />} />
            <Route path="reports" element={<RoleReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/transporter" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

