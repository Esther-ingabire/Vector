import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, ClipboardList, Shield, Activity, Wifi, Building2, Navigation, Store, Thermometer, Truck, CheckCircle } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import KPICard from '../../components/ui/KPICard.jsx'
import { authApi } from '../../api/auth.js'
import { formatDistanceToNow, subDays, format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const MOCK_SOURCES = [
  { name: 'Cooperative Inputs', icon: Building2,   status: 'ok',      lastSync: new Date(Date.now() - 3 * 60000) },
  { name: 'Transporter GPS',    icon: Navigation,   status: 'ok',      lastSync: new Date(Date.now() - 5 * 60000) },
  { name: 'Distributor Forms',  icon: ClipboardList, status: 'ok',     lastSync: new Date(Date.now() - 8 * 60000) },
  { name: 'Market Agent Forms', icon: Store,         status: 'warning', lastSync: new Date(Date.now() - 45 * 60000) },
  { name: 'Cold Storage IoT',   icon: Thermometer,   status: 'ok',      lastSync: new Date(Date.now() - 2 * 60000) },
  { name: 'Vehicle IoT',        icon: Truck,         status: 'error',   lastSync: new Date(Date.now() - 3 * 3600000) },
]

const STATUS_DOT  = { ok: 'bg-success-500', warning: 'bg-warning-400', error: 'bg-danger-500' }
const STATUS_BADGE = { ok: 'badge-green', warning: 'badge-amber', error: 'badge-red' }

// Palette hex values — kept in sync with tailwind.config.js
const C = {
  primary: '#0b2b18',  // primary-800
  light:   '#72be97',  // primary-300
  info:    '#3b82f6',  // info-500
  warning: '#65a30d',  // warning-500 (lime-olive)
}

const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'EEE dd'))

const ACTIVITY_DATA = {
  labels: last7Days,
  datasets: [
    {
      label: 'Logins',
      data: [18, 24, 21, 30, 27, 15, 22],
      backgroundColor: C.primary + 'D9',  // 85% opacity
      borderRadius: 6,
      borderSkipped: false,
    },
    {
      label: 'Data Events',
      data: [42, 55, 48, 63, 71, 38, 59],
      backgroundColor: C.info + 'BF',     // 75% opacity
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
}

const ACTIVITY_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
    title: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, stepSize: 10 }, beginAtZero: true },
  },
}

const ROLE_DATA = {
  labels: ['Cooperative Managers', 'Distributors', 'Market Agents', 'Transporters'],
  datasets: [{
    data: [8, 5, 12, 19],
    backgroundColor: [C.primary + 'E6', C.info + 'E6', C.warning + 'E6', C.light + 'E6'],
    borderWidth: 2,
    borderColor: '#fff',
    hoverOffset: 6,
  }],
}

const ROLE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 }, padding: 12 } },
  },
  cutout: '62%',
}

function SourceRow({ source }) {
  const Icon = source.icon
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[source.status]}`} />
        <span className="text-sm font-medium text-gray-700 truncate">{source.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400 hidden sm:block">
          {formatDistanceToNow(source.lastSync, { addSuffix: true })}
        </span>
        <span className={STATUS_BADGE[source.status] || 'badge-gray'}>
          {source.status}
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total_users: 0, pending_requests: 0, active_sessions: 0, security_alerts: 0 })
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      authApi.getUsers().catch(() => ({ data: { count: 0 } })),
      authApi.getAccessRequests({ status: 'PENDING' }).catch(() => ({ data: { count: 0 } })),
      authApi.getAuditLogs({ page_size: 20 }).catch(() => ({ data: { results: [] } })),
    ]).then(([users, requests, logs]) => {
      setStats(s => ({ ...s, total_users: users.data?.count || 0, pending_requests: requests.data?.count || 0 }))
      setAuditLogs(logs.data?.results || [])
    }).finally(() => setLoading(false))
  }, [])

  const actionSeverity = {
    FAILED_LOGIN: 'badge-red', PERMISSION_DENIED: 'badge-red', DATA_DELETED: 'badge-red',
    DATA_UPDATED: 'badge-amber', LOGIN: 'badge-green', OTP_VERIFIED: 'badge-green',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">System health, pending approvals, and recent activity.</p>
      </div>

      {/* System health bar */}
      <div className="card bg-primary-600 text-white flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2"><Wifi className="w-4 h-4" /><span className="text-sm font-medium">System Online</span></div>
        <div className="text-sm"><span className="text-primary-200">Uptime</span> <span className="font-semibold">99.8%</span></div>
        <div className="text-sm"><span className="text-primary-200">Active Sessions</span> <span className="font-semibold">{stats.active_sessions || 12}</span></div>
        <div className="text-sm"><span className="text-primary-200">Data Sync</span> <span className="font-semibold text-warning-50">1 source degraded</span></div>
        <div className="text-sm ml-auto"><span className="text-primary-200">Last processed</span> <span className="font-semibold">{new Date().toLocaleTimeString()}</span></div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users"        value={loading ? '…' : stats.total_users}      icon={Users}        color="primary" />
        <KPICard title="Pending Approvals"  value={loading ? '…' : stats.pending_requests} icon={ClipboardList} color={stats.pending_requests > 0 ? 'warning' : 'success'} />
        <KPICard title="Active Sessions"    value={stats.active_sessions || 12}             icon={Activity}     color="primary" />
        <KPICard title="Security Alerts"    value={stats.security_alerts || 0}              icon={Shield}       color={stats.security_alerts > 0 ? 'danger' : 'success'} />
      </div>

      {/* Analytics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-day activity bar chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">System Activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Logins and data events — last 7 days</p>
            </div>
          </div>
          <div className="h-48">
            <Bar data={ACTIVITY_DATA} options={ACTIVITY_OPTIONS} />
          </div>
        </div>

        {/* Users by role doughnut */}
        <div className="card flex flex-col">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Users by Role</h2>
            <p className="text-xs text-gray-400 mt-0.5">Active registered users</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-48 w-full">
              <Doughnut data={ROLE_DATA} options={ROLE_OPTIONS} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration queue */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending Registration Requests</h2>
            <Link to="/admin/registration-requests" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : stats.pending_requests === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success-500" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            <Link to="/admin/registration-requests" className="block text-center py-6 bg-warning-50 rounded-xl border border-warning-500 text-warning-500 hover:bg-warning-50/80 transition-colors">
              <ClipboardList className="w-8 h-8 mx-auto mb-2" />
              <p className="font-semibold text-lg">{stats.pending_requests}</p>
              <p className="text-sm">requests awaiting review</p>
            </Link>
          )}
        </div>

        {/* Data source health */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Data Source Health</h2>
            <Link to="/admin/data-sources" className="text-sm text-primary-600 hover:underline">Details</Link>
          </div>
          <div>{MOCK_SOURCES.map(s => <SourceRow key={s.name} source={s} />)}</div>
        </div>
      </div>

      {/* Audit log */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Audit Log</h2>
          <Link to="/admin/audit-log" className="text-sm text-primary-600 hover:underline">Full log</Link>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No audit events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.slice(0, 10).map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <span className={actionSeverity[log.action] || 'badge-gray'}>{log.action?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{log.user?.phone_number || 'System'}</td>
                    <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">{log.description}</td>
                    <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{log.ip_address || '—'}</td>
                    <td className="py-2 text-gray-400 text-xs whitespace-nowrap">{log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
