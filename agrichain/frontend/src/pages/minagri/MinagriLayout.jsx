import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, BarChart2, TrendingUp, FileText, Bell, Settings } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import MinagriDashboard from './MinagriDashboard.jsx'
import NationalReports from './NationalReports.jsx'
import PredictionsPage from './PredictionsPage.jsx'
import MarketAnalytics from './MarketAnalytics.jsx'
import AlertsPage from './AlertsPage.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'

const navItems = [
  { to: '/minagri', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/minagri/reports', label: 'National Reports', icon: FileText },
  { to: '/minagri/predictions', label: 'Predictions & AI', icon: TrendingUp },
  { to: '/minagri/market', label: 'Market Analytics', icon: BarChart2 },
  { to: '/minagri/alerts', label: 'Alerts & Risks', icon: Bell },
  { to: '/minagri/settings', label: 'Settings', icon: Settings },
]

export default function MinagriLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="MINAGRI Officer" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<MinagriDashboard />} />
            <Route path="reports" element={<NationalReports />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="market" element={<MarketAnalytics />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/minagri" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
