import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, CheckCircle, TrendingUp, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyticsApi } from '../../api/analytics.js'

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Musanze District Exceeds Loss Threshold',
    body: 'Loss rate of 15.5% exceeds national threshold of 12%. Immediate intervention recommended.',
    time: 'May 3, 2026 · 08:30 AM',
    type: 'CRITICAL',
    unread: true,
  },
  {
    id: 2,
    title: 'High Loss Prediction: Nyanza District',
    body: 'ML model predicts 13.2% loss rate for next month (86% confidence). Proactive measures advised.',
    time: 'May 2, 2026 · 02:15 PM',
    type: 'WARNING',
    unread: true,
  },
  {
    id: 3,
    title: 'Cold Chain Violation - Kigali Storage',
    body: 'Temperature exceeded safe range (>28°C) for 4 hours. Quality inspection required.',
    time: 'May 2, 2026 · 09:45 AM',
    type: 'CRITICAL',
    unread: false,
  },
  {
    id: 4,
    title: 'Monthly Report Available',
    body: 'National Supply Chain KPI Report for April 2026 is ready for download.',
    time: 'May 1, 2026 · 08:00 AM',
    type: 'INFO',
    unread: false,
  },
  {
    id: 5,
    title: 'Bottleneck Detected: Musanze-Kigali Route',
    body: 'Average delay increased to 4.2 hours (up from 3.1 hours last week).',
    time: 'Apr 30, 2026 · 11:20 AM',
    type: 'WARNING',
    unread: false,
  },
  {
    id: 6,
    title: 'Compliance Milestone Achieved',
    body: 'National cold chain compliance reached 92.8%, exceeding Q1 target of 90%.',
    time: 'Apr 30, 2026 · 09:00 AM',
    type: 'SUCCESS',
    unread: false,
  },
  {
    id: 7,
    title: 'New Data Integration Active',
    body: 'IoT sensors from Rubavu warehouse now feeding real-time data to the system.',
    time: 'Apr 28, 2026 · 03:30 PM',
    type: 'INFO',
    unread: false,
  },
]

const TYPE_CONFIG = {
  CRITICAL: {
    badge: 'bg-red-100 text-red-700',
    iconEl: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
  },
  WARNING: {
    badge: 'bg-yellow-100 text-yellow-700',
    iconEl: AlertTriangle,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-50',
  },
  SUCCESS: {
    badge: 'bg-green-100 text-green-700',
    iconEl: CheckCircle,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
  },
  INFO: {
    badge: 'bg-blue-100 text-blue-700',
    iconEl: TrendingUp,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
  },
}

const NOTIF_SETTINGS = [
  { label: 'District Threshold Alerts',  desc: 'Notify when district loss rate exceeds 12%' },
  { label: 'High-Risk Predictions',      desc: 'Notify on ML predictions with confidence > 80%' },
  { label: 'Cold Chain Violations',      desc: 'Notify on temperature/humidity deviations' },
  { label: 'Monthly Reports',            desc: 'Notify when new reports are available' },
]

export default function AlertsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [settings, setSettings] = useState([true, true, true, true])

  useEffect(() => {
    analyticsApi.getMinagriAlerts()
      .then(r => {
        const live = (r.data?.alerts || []).map((a, i) => ({
          id: `live-${i}`,
          title: a.title,
          body: a.body,
          time: new Date(a.created_at).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' }),
          type: a.type,
          unread: a.unread,
        }))
        if (live.length > 0) {
          setNotifications([...live, ...INITIAL_NOTIFICATIONS])
        }
      })
      .catch(() => {})
  }, [])

  const unread   = notifications.filter(n => n.unread).length
  const critical = notifications.filter(n => n.type === 'CRITICAL').length
  const warnings = notifications.filter(n => n.type === 'WARNING').length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
    toast.success('All notifications marked as read')
  }

  const toggleSetting = (i) => {
    setSettings(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">System alerts and notifications from ChainSight AI</p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card border-2 border-success-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Bell className="w-3.5 h-3.5 text-success-600" /> Total Alerts
          </div>
          <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
        </div>
        <div className="card border-2 border-blue-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Bell className="w-3.5 h-3.5 text-blue-500" /> Unread
          </div>
          <p className="text-3xl font-bold text-blue-600">{unread}</p>
        </div>
        <div className="card border-2 border-danger-400">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-danger-500" /> Critical
          </div>
          <p className="text-3xl font-bold text-danger-600">{critical}</p>
        </div>
        <div className="card border-2 border-warning-400">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-500" /> Warnings
          </div>
          <p className="text-3xl font-bold text-warning-600">{warnings}</p>
        </div>
      </div>

      {/* Notifications list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Notifications</h2>
          <button
            onClick={markAllRead}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Mark All as Read
          </button>
        </div>
        <div className="space-y-3">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type]
            const Icon = cfg.iconEl
            return (
              <div
                key={n.id}
                className={`flex gap-4 p-4 rounded-xl border transition-colors ${
                  n.unread ? 'bg-blue-50/40 border-blue-100' : 'bg-white border-gray-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                  <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                      {n.unread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0 ${cfg.badge}`}>
                      {n.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <div className="space-y-3">
          {NOTIF_SETTINGS.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
              <button
                onClick={() => toggleSetting(i)}
                className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                  settings[i]
                    ? 'bg-warning-500 border-warning-500'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
                aria-label={settings[i] ? 'Disable' : 'Enable'}
              >
                {settings[i] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
