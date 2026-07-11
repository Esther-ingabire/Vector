import { Routes, Route, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, TrendingUp, Activity,
  Award, FileText, Settings,
} from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import MinagriDashboard       from './MinagriDashboard.jsx'
import DistrictPerformancePage from './DistrictPerformancePage.jsx'
import LossPredictionPage     from './LossPredictionPage.jsx'
import BottleneckDetectionPage from './BottleneckDetectionPage.jsx'
import OrgRankingsPage        from './OrgRankingsPage.jsx'
import ColdChainPage          from './ColdChainPage.jsx'
import NationalReports        from './NationalReports.jsx'
import CustomReportsPage      from './CustomReportsPage.jsx'
import SettingsPage           from '../shared/SettingsPage.jsx'
import MinagriChatbot         from '../../components/MinagriChatbot.jsx'

// Notifications live solely in the TopBar bell (it already merges the real MINAGRI rule-based
// alerts in) — no separate sidebar page/route for it, to avoid two disagreeing notification lists.
const navItems = [
  { to: '/minagri',                  label: 'Dashboard',            icon: LayoutDashboard, end: true },
  { to: '/minagri/districts',        label: 'District Performance', icon: MapPin },
  { to: '/minagri/loss-prediction',  label: 'Loss Prediction',      icon: TrendingUp },
  { to: '/minagri/bottlenecks',      label: 'Bottleneck Detection', icon: Activity },
  { to: '/minagri/rankings',         label: 'Performance Rankings', icon: Award },
  { to: '/minagri/reports',          label: 'Reports',              icon: FileText },
  { to: '/minagri/settings',         label: 'Settings',             icon: Settings },
]

export default function MinagriLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="MINAGRI Officer" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index                    element={<MinagriDashboard />}        />
            <Route path="districts"         element={<DistrictPerformancePage />} />
            <Route path="loss-prediction"   element={<LossPredictionPage />}      />
            <Route path="bottlenecks"       element={<BottleneckDetectionPage />} />
            <Route path="rankings"          element={<OrgRankingsPage />}         />
            <Route path="cold-chain"        element={<ColdChainPage />}           />
            <Route path="reports"           element={<NationalReports />}         />
            <Route path="custom-reports"    element={<CustomReportsPage />}       />
            <Route path="settings"          element={<SettingsPage />}            />
            <Route path="*"                 element={<Navigate to="/minagri" replace />} />
          </Routes>
        </main>
      </div>
      <MinagriChatbot />
    </div>
  )
}

