import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Clock, Truck, History, Box, FileDown, Users, Thermometer, Building2, User } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import TransporterDashboard from './TransporterDashboard.jsx'
import PendingRequests from './PendingRequests.jsx'
import ActiveTrip from './ActiveTrip.jsx'
import TripHistory from './TripHistory.jsx'
import VehicleProfile from './VehicleProfile.jsx'
import DriverProfilePage from './DriverProfilePage.jsx'
import MyDrivers from './MyDrivers.jsx'
import FleetMonitoring from './FleetMonitoring.jsx'
import CompanyProfile from './CompanyProfile.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { transportApi } from '../../api/transport.js'

export default function TransporterLayout() {
  const { user } = useAuth()
  const isCompany = user?.role === 'TRANSPORT_COMPANY'
  // For individual drivers: check if they work for a transport company (parent_company set)
  // vs. registered independently by a cooperative or distributor (no parent_company).
  // Company-employed drivers don't register their own vehicles; coop/distributor-registered
  // drivers and independent drivers do.
  const [hasParentCompany, setHasParentCompany] = useState(null) // null = loading

  useEffect(() => {
    if (isCompany) { setHasParentCompany(false); return }
    transportApi.getMyProfile({ _silent: true })
      .then(res => setHasParentCompany(!!res.data?.parent_company))
      .catch(() => setHasParentCompany(false))
  }, [isCompany])

  // Driver owns their own vehicle if they have NO parent transport company
  const driverOwnsVehicle = !isCompany && hasParentCompany === false

  const navItems = [
    { to: '/transporter',            label: 'Dashboard',        icon: LayoutDashboard, end: true },
    { to: '/transporter/pending',    label: 'Pending Requests', icon: Clock },
    ...(!isCompany ? [{ to: '/transporter/active', label: 'Active Trip', icon: Truck }] : []),
    ...(isCompany  ? [{ to: '/transporter/drivers',  label: 'My Drivers',      icon: Users     }] : []),
    ...(isCompany  ? [{ to: '/transporter/vehicle',  label: 'Vehicle Fleet',   icon: Box       }] : []),
    ...(isCompany  ? [{ to: '/transporter/company',  label: 'Company Profile', icon: Building2 }] : []),
    // Vehicle Profile only for drivers who own their own truck (coop/distributor-registered or independent)
    ...(driverOwnsVehicle ? [{ to: '/transporter/vehicle',  label: 'My Vehicle', icon: Box  }] : []),
    // Driver Profile for everyone who is an individual driver
    ...(!isCompany ? [{ to: '/transporter/profile',  label: 'My Profile',  icon: User  }] : []),
    { to: '/transporter/history',    label: 'Trip History',     icon: History },
    { to: '/transporter/monitoring', label: 'Fleet Monitoring', icon: Thermometer },
    { to: '/transporter/reports',    label: 'Reports',          icon: FileDown },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="Transporter" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<TransporterDashboard />} />
            <Route path="pending" element={<PendingRequests />} />
            <Route path="active"   element={<ActiveTrip />} />
            <Route path="history"  element={<TripHistory />} />
            <Route path="vehicle"  element={<VehicleProfile />} />
            <Route path="profile"  element={<DriverProfilePage />} />
            <Route path="drivers" element={<MyDrivers />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="monitoring" element={<FleetMonitoring />} />
            <Route path="reports" element={<RoleReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/transporter" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

