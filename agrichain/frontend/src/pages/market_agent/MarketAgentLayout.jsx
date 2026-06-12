import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, Package, ClipboardList, Settings } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import MarketAgentDashboard from './MarketAgentDashboard.jsx'
import PriceRecording from './PriceRecording.jsx'
import BatchReceiving from './BatchReceiving.jsx'
import AgentReports from './AgentReports.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'

const navItems = [
  { to: '/market-agent', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/market-agent/prices', label: 'Record Prices', icon: TrendingUp },
  { to: '/market-agent/batches', label: 'Receive Batches', icon: Package },
  { to: '/market-agent/reports', label: 'Reports', icon: ClipboardList },
  { to: '/market-agent/settings', label: 'Settings', icon: Settings },
]

export default function MarketAgentLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Market Agent" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<MarketAgentDashboard />} />
            <Route path="prices" element={<PriceRecording />} />
            <Route path="batches" element={<BatchReceiving />} />
            <Route path="reports" element={<AgentReports />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/market-agent" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
