import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Clock, Truck, History, Box, FileDown, Users, Thermometer, Building2 } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import TransporterDashboard from './TransporterDashboard.jsx'
import PendingRequests from './PendingRequests.jsx'
import ActiveTrip from './ActiveTrip.jsx'
import TripHistory from './TripHistory.jsx'
import VehicleProfile from './VehicleProfile.jsx'
import MyDrivers from './MyDrivers.jsx'
import FleetMonitoring from './FleetMonitoring.jsx'
import CompanyProfile from './CompanyProfile.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function TransporterLayout() {
  // A Transport Company dispatches jobs to its drivers — it isn't the one physically driving
  // or marking deliveries, so "Active Trip" (driver-only) is swapped for fleet-wide management;
  // "Fleet Monitoring" already covers GPS + IoT across every driver's active trip instead.
  const { user } = useAuth()
  const isCompany = user?.role === 'TRANSPORT_COMPANY'

  const navItems = [
    { to: '/transporter',          label: 'Dashboard',        icon: LayoutDashboard, end: true },
    { to: '/transporter/pending',  label: 'Pending Requests', icon: Clock },
    ...(isCompany ? [] : [{ to: '/transporter/active', label: 'Active Trip', icon: Truck }]),
    ...(isCompany ? [{ to: '/transporter/drivers', label: 'My Fleet', icon: Users }] : []),
    { to: '/transporter/history',  label: 'Trip History',     icon: History },
    { to: '/transporter/monitoring', label: 'Fleet Monitoring', icon: Thermometer },
    { to: '/transporter/vehicle',  label: 'Vehicle Profile',  icon: Box },
    ...(isCompany ? [{ to: '/transporter/company', label: 'Company Profile', icon: Building2 }] : []),
    { to: '/transporter/reports',  label: 'Reports',          icon: FileDown },
  ]

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
            <Route path="company" element={<CompanyProfile />} />
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

