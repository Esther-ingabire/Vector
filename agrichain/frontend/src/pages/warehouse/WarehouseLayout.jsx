import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Warehouse, Inbox, Settings } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import WarehouseDashboard from './WarehouseDashboard.jsx'
import MyFacilities from './MyFacilities.jsx'
import RentalRequests from './RentalRequests.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'

const navItems = [
  { to: '/warehouse', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/warehouse/facilities', label: 'My Facilities', icon: Warehouse },
  { to: '/warehouse/rentals', label: 'Rental Requests', icon: Inbox },
  { to: '/warehouse/settings', label: 'Settings', icon: Settings },
]

export default function WarehouseLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Warehouse Manager" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<WarehouseDashboard />} />
            <Route path="facilities" element={<MyFacilities />} />
            <Route path="rentals" element={<RentalRequests />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/warehouse" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
