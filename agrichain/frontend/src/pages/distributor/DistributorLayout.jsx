import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Truck, BarChart2, ClipboardList, MapPin } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import DistributorDashboard from './DistributorDashboard.jsx'
import OrderManagement from './OrderManagement.jsx'
import DeliveryTracking from './DeliveryTracking.jsx'
import MarketPrices from './MarketPrices.jsx'
import DistributorReports from './DistributorReports.jsx'

const navItems = [
  { to: '/distributor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/distributor/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/distributor/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/distributor/prices', label: 'Market Prices', icon: BarChart2 },
  { to: '/distributor/reports', label: 'Reports', icon: ClipboardList },
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
            <Route path="deliveries" element={<DeliveryTracking />} />
            <Route path="prices" element={<MarketPrices />} />
            <Route path="reports" element={<DistributorReports />} />
            <Route path="*" element={<Navigate to="/distributor" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
