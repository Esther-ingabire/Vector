import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, ShoppingCart, Truck, BarChart2, Settings } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import DistributorDashboard from './DistributorDashboard.jsx'
import OrderManagement from './OrderManagement.jsx'
import MarketAgentOrders from './MarketAgentOrders.jsx'
import IncomingDeliveries from './IncomingDeliveries.jsx'
import DistributionAnalytics from './DistributionAnalytics.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'

const navItems = [
  { to: '/distributor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/distributor/orders', label: 'Orders & Cooperatives', icon: ClipboardList },
  { to: '/distributor/agent-orders', label: 'Market Agent Orders', icon: ShoppingCart },
  { to: '/distributor/deliveries', label: 'Incoming Deliveries', icon: Truck },
  { to: '/distributor/analytics', label: 'Distribution Analytics', icon: BarChart2 },
  { to: '/distributor/settings', label: 'Settings', icon: Settings },
]

export default function DistributorLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Distributor" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<DistributorDashboard />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="agent-orders" element={<MarketAgentOrders />} />
            <Route path="deliveries" element={<IncomingDeliveries />} />
            <Route path="analytics" element={<DistributionAnalytics />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/distributor" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
