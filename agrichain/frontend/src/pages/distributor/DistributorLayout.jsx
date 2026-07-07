import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, ShoppingCart, Settings, FileDown, QrCode, Trash2, Users, Building2, UserCheck, Thermometer } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import DistributorDashboard from './DistributorDashboard.jsx'
import OrderManagement from './OrderManagement.jsx'
import MarketAgentOrders from './MarketAgentOrders.jsx'
import MarketAgents from './MarketAgents.jsx'
import IncomingDeliveries from './IncomingDeliveries.jsx'
import DistributorTraceability from './DistributorTraceability.jsx'
import DistributorProfilePage from './DistributorProfilePage.jsx'
import DistributorFleetMonitoring from './DistributorFleetMonitoring.jsx'
import WasteReportPage from './WasteReportPage.jsx'
import Transporters from './Transporters.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'

const navItems = [
  { to: '/distributor',              label: 'Dashboard',             icon: LayoutDashboard, end: true },
  { to: '/distributor/orders',       label: 'Orders & Cooperatives', icon: ClipboardList },
  { to: '/distributor/agent-orders', label: 'Market Agent Orders',   icon: ShoppingCart },
  { to: '/distributor/agents',       label: 'Market Agents',         icon: UserCheck },
  { to: '/distributor/transporters',    label: 'Transporters',     icon: Users },
  { to: '/distributor/fleet-monitoring',label: 'Fleet Monitoring', icon: Thermometer },
  { to: '/distributor/traceability',    label: 'Traceability',     icon: QrCode },
  { to: '/distributor/waste',        label: 'Waste Report',          icon: Trash2 },
  { to: '/distributor/reports',      label: 'Reports',               icon: FileDown },
  { to: '/distributor/profile',      label: 'Organisation Profile',  icon: Building2 },
  { to: '/distributor/settings',     label: 'Settings',              icon: Settings },
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
            <Route path="orders"       element={<OrderManagement />} />
            <Route path="agent-orders" element={<MarketAgentOrders />} />
            <Route path="agents"       element={<MarketAgents />} />
            <Route path="deliveries"   element={<IncomingDeliveries />} />
            <Route path="transporters"     element={<Transporters />} />
            <Route path="fleet-monitoring" element={<DistributorFleetMonitoring />} />
            <Route path="traceability" element={<DistributorTraceability />} />
            <Route path="waste"        element={<WasteReportPage />} />
            <Route path="reports"      element={<RoleReportsPage />} />
            <Route path="profile"      element={<DistributorProfilePage />} />
            <Route path="settings"     element={<SettingsPage />} />
            <Route path="*"            element={<Navigate to="/distributor" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
