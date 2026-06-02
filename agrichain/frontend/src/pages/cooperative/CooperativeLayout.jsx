import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Package, Inbox, Truck, Thermometer, QrCode, Bell } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import CooperativeDashboard from './CooperativeDashboard.jsx'
import StockManagement from './StockManagement.jsx'
import ProduceRequests from './ProduceRequests.jsx'
import TransportRequests from './TransportRequests.jsx'
import ActiveBatches from './ActiveBatches.jsx'
import StorageAnalytics from './StorageAnalytics.jsx'
import TraceabilityView from './TraceabilityView.jsx'

const navItems = [
  { to: '/cooperative', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cooperative/stock', label: 'Stock Management', icon: Package },
  { to: '/cooperative/produce-requests', label: 'Produce Requests', icon: Inbox },
  { to: '/cooperative/transport-requests', label: 'Transport Requests', icon: Truck },
  { to: '/cooperative/batches', label: 'Active Batches', icon: QrCode },
  { to: '/cooperative/storage', label: 'Storage Analytics', icon: Thermometer },
  { to: '/cooperative/traceability', label: 'Traceability', icon: QrCode },
]

export default function CooperativeLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Cooperative Manager" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<CooperativeDashboard />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="produce-requests" element={<ProduceRequests />} />
            <Route path="transport-requests" element={<TransportRequests />} />
            <Route path="batches" element={<ActiveBatches />} />
            <Route path="storage" element={<StorageAnalytics />} />
            <Route path="traceability" element={<TraceabilityView />} />
            <Route path="*" element={<Navigate to="/cooperative" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
