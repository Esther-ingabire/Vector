import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Truck, MapPin, Thermometer, History } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import TransporterDashboard from './TransporterDashboard.jsx'
import ActiveShipment from './ActiveShipment.jsx'
import TripHistory from './TripHistory.jsx'

const navItems = [
  { to: '/transporter', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transporter/active', label: 'Active Shipment', icon: Truck },
  { to: '/transporter/history', label: 'Trip History', icon: History },
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
            <Route path="active" element={<ActiveShipment />} />
            <Route path="history" element={<TripHistory />} />
            <Route path="*" element={<Navigate to="/transporter" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
