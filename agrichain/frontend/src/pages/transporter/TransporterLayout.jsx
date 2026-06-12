import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Clock, Truck, History, Box } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import TransporterDashboard from './TransporterDashboard.jsx'
import PendingRequests from './PendingRequests.jsx'
import ActiveTrip from './ActiveTrip.jsx'
import TripHistory from './TripHistory.jsx'
import VehicleProfile from './VehicleProfile.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'

const navItems = [
  { to: '/transporter',         label: 'Dashboard',        icon: LayoutDashboard, end: true },
  { to: '/transporter/pending', label: 'Pending Requests', icon: Clock },
  { to: '/transporter/active',  label: 'Active Trip',      icon: Truck },
  { to: '/transporter/history', label: 'Trip History',     icon: History },
  { to: '/transporter/vehicle', label: 'Vehicle Profile',  icon: Box },
]

export default function TransporterLayout() {
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
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/transporter" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
