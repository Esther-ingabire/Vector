import { useState } from 'react'
import { AlertTriangle, XCircle, Bell, CheckCircle, MapPin, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_ALERTS = [
  { id: 1, type: 'Cold chain breach', category: 'logistics', region: 'Huye', severity: 'high', detail: 'Cold Store B in Huye exceeded safe temperature threshold (18.1°C vs 15°C limit) for 45 minutes.', time: '2h ago', resolved: false },
  { id: 2, type: 'Price spike — Tomatoes', category: 'market', region: 'Kigali', severity: 'medium', detail: 'Tomato prices in Kigali Central market jumped 15% in 48 hours. Possible supply bottleneck detected.', time: '4h ago', resolved: false },
  { id: 3, type: 'Supply shortage forecast', category: 'supply', region: 'Western Province', severity: 'medium', detail: 'AI model predicts 22% potato supply shortfall in Western Province within 20 days.', time: '6h ago', resolved: false },
  { id: 4, type: 'Pest outbreak detected', category: 'farm', region: 'Western Province', severity: 'high', detail: 'Field reports indicate pest outbreak in 3 cooperatives in Rubavu. Yield impact estimated at 30%.', time: '1d ago', resolved: false },
  { id: 5, type: 'GPS tracker offline', category: 'logistics', region: 'Eastern Province', severity: 'low', detail: 'Vehicle RAB 556T GPS tracker has been offline for 3+ hours. Last known location: Rwamagana.', time: '3h ago', resolved: true },
]

const SEV_STYLES = {
  high: { bg: 'bg-danger-50 border-danger-500', text: 'text-danger-500', badge: 'bg-danger-50 text-danger-500' },
  medium: { bg: 'bg-warning-50 border-warning-500', text: 'text-warning-500', badge: 'bg-warning-50 text-warning-500' },
  low: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-500' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [filter, setFilter] = useState('active')

  const shown = filter === 'all' ? alerts : filter === 'active' ? alerts.filter(a => !a.resolved) : alerts.filter(a => a.resolved)

  const resolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
    toast.success('Alert marked as resolved')
  }

  const active = alerts.filter(a => !a.resolved)
  const high = active.filter(a => a.severity === 'high')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alerts & Risks</h1>
        <p className="text-sm text-gray-500 mt-0.5">System alerts, risk flags, and incidents requiring attention.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-danger-500" />
          <div><p className="text-xl font-bold">{high.length}</p><p className="text-sm text-gray-500">High severity</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <Bell className="w-6 h-6 text-warning-500" />
          <div><p className="text-xl font-bold">{active.length}</p><p className="text-sm text-gray-500">Open alerts</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{alerts.filter(a => a.resolved).length}</p><p className="text-sm text-gray-500">Resolved today</p></div>
        </div>
      </div>

      <div className="flex gap-2">
        {['active', 'resolved', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.length === 0 && (
          <div className="card text-center py-10 text-gray-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {filter} alerts</p>
          </div>
        )}
        {shown.map(a => {
          const s = SEV_STYLES[a.severity]
          return (
            <div key={a.id} className={`card border-l-4 ${s.bg} ${a.resolved ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{a.severity.toUpperCase()}</span>
                    <span className="text-xs text-gray-400 capitalize">{a.category}</span>
                    {a.resolved && <span className="text-xs text-success-500 font-medium">✓ Resolved</span>}
                  </div>
                  <h3 className={`font-semibold ${s.text}`}>{a.type}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{a.region}
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{a.time}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{a.detail}</p>
                </div>
                {!a.resolved && (
                  <button onClick={() => resolve(a.id)} className="btn-secondary text-sm flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                    <CheckCircle className="w-4 h-4" /> Resolve
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
