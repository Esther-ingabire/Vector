import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, FileText, Activity, Megaphone, Settings, Inbox, FileDown } from 'lucide-react'
import Sidebar from '../../components/layout/Sidebar.jsx'
import TopBar from '../../components/layout/TopBar.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import UserManagement from './UserManagement.jsx'
import RegistrationQueue from './RegistrationQueue.jsx'
import AuditLogPage from './AuditLogPage.jsx'
import DataIntegrationMonitor from './DataIntegrationMonitor.jsx'
import SystemAnnouncements from './SystemAnnouncements.jsx'
import FeedbackInbox from './FeedbackInbox.jsx'
import SettingsPage from '../shared/SettingsPage.jsx'
import RoleReportsPage from '../shared/RoleReportsPage.jsx'

const navItems = [
  { to: '/admin',                    label: 'Dashboard',           icon: LayoutDashboard, end: true },
  { to: '/admin/users',              label: 'User Management',     icon: Users },
  { to: '/admin/registration-requests', label: 'Registration Queue', icon: ClipboardList },
  { to: '/admin/audit-log',          label: 'Audit Log',           icon: FileText },
  { to: '/admin/data-sources',       label: 'Data Integration',    icon: Activity },
  { to: '/admin/feedback',           label: 'Feedback & Support',  icon: Inbox },
  { to: '/admin/announcements',      label: 'Announcements',       icon: Megaphone },
  { to: '/admin/reports',            label: 'Reports',              icon: FileDown },
  { to: '/admin/settings',           label: 'Settings',            icon: Settings },
]

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar navItems={navItems} title="System Administrator" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="registration-requests" element={<RegistrationQueue />} />
            <Route path="registration-requests/:id" element={<RegistrationQueue />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="data-sources" element={<DataIntegrationMonitor />} />
            <Route path="feedback" element={<FeedbackInbox />} />
            <Route path="announcements" element={<SystemAnnouncements />} />
            <Route path="reports" element={<RoleReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

