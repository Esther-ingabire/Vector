import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Bell, ClipboardList, Trash2, BarChart2, Settings, FileDown } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import MarketAgentDashboard from './MarketAgentDashboard.jsx'
import NoticesPage from './NoticesPage.jsx'
import ClaimsPage from './ClaimsPage.jsx'
import WasteReportPage from './WasteReportPage.jsx'
import LossSummaryPage from './LossSummaryPage.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'

const navItems = [
  { to: '/market-agent',          label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/market-agent/notices',  label: 'Notices',      icon: Bell },
  { to: '/market-agent/claims',   label: 'Claims',       icon: ClipboardList },
  { to: '/market-agent/waste',    label: 'Waste Report', icon: Trash2 },
  { to: '/market-agent/losses',   label: 'Loss Summary', icon: BarChart2 },
  { to: '/market-agent/reports',  label: 'Reports',      icon: FileDown },
  { to: '/market-agent/settings', label: 'Settings',     icon: Settings },
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
            <Route path="notices"  element={<NoticesPage />} />
            <Route path="claims"   element={<ClaimsPage />} />
            <Route path="waste"    element={<WasteReportPage />} />
            <Route path="losses"   element={<LossSummaryPage />} />
            <Route path="reports"  element={<RoleReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/market-agent" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

