import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Building2, Navigation, ClipboardList, Store, Thermometer, Truck, CheckCircle, AlertTriangle, XCircle, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { authApi } from '../../api/auth.js'
import toast from 'react-hot-toast'

// Icon per source name — purely cosmetic, the data itself now comes from the backend.
const ICONS = {
  'Cooperative Inputs': Building2,
  'Distributor Forms':  ClipboardList,
  'Market Agent Forms': Store,
  'Transporter GPS':    Navigation,
  'Cold Storage IoT':   Thermometer,
  'Vehicle IoT':        Truck,
}

const STATUS = {
  ok:      { label: 'Healthy',       dot: 'bg-success-500', badge: 'badge-green', borderL: 'border-2 border-success-500' },
  warning: { label: 'Degraded',      dot: 'bg-warning-400', badge: 'badge-amber', borderL: 'border-2 border-warning-400' },
  error:   { label: 'Error',         dot: 'bg-danger-500',  badge: 'badge-red',   borderL: 'border-2 border-danger-500'  },
  idle:    { label: 'No recent activity', dot: 'bg-gray-300', badge: 'badge-gray', borderL: 'border-2 border-gray-200' },
}

function SourceCard({ source }) {
  const cfg = STATUS[source.status] || STATUS.idle
  const Icon = ICONS[source.name] || Building2
  return (
    <div className={`card p-5 ${cfg.borderL}`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{source.name}</p>
            <span className={cfg.badge}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5 leading-snug">{source.description}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span>
              Last activity{' '}
              <span className="font-medium text-gray-700">
                {source.last_activity ? formatDistanceToNow(new Date(source.last_activity), { addSuffix: true }) : 'never'}
              </span>
            </span>
            <span>Records today <span className="font-medium text-gray-700">{source.records_today.toLocaleString()}</span></span>
          </div>
          {source.detail && (
            <p className={`text-xs mt-2 ${source.status === 'error' ? 'text-danger-600' : 'text-warning-600'}`}>{source.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DataIntegrationMonitor() {
  const [sources, setSources] = useState([])
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    authApi.getDataIntegrationStatus()
      .then(res => {
        setSources(res.data?.sources || [])
        setGeneratedAt(res.data?.generated_at || null)
      })
      .catch(() => toast.error('Could not load data integration status.'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const ok      = sources.filter(s => s.status === 'ok').length
  const warnings = sources.filter(s => s.status === 'warning').length
  const errors   = sources.filter(s => s.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Integration Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real activity and staleness per data source, computed from actual records — not a simulated feed.
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { count: ok,       label: 'Healthy sources',  icon: CheckCircle,   border: 'border-success-400', bg: 'bg-success-50',  text: 'text-success-600', iconColor: 'text-success-500' },
              { count: warnings, label: 'Degraded sources', icon: AlertTriangle, border: 'border-warning-400', bg: 'bg-warning-50',  text: 'text-warning-600', iconColor: 'text-warning-500' },
              { count: errors,   label: 'Error sources',    icon: XCircle,       border: 'border-danger-400',  bg: 'bg-danger-50',   text: 'text-danger-600',  iconColor: 'text-danger-500'  },
            ].map(s => {
              const SIcon = s.icon
              return (
                <div key={s.label} className={`rounded-2xl shadow-sm border p-5 flex items-center gap-4 ${s.border} ${s.bg}`}>
                  <SIcon className={`w-8 h-8 flex-shrink-0 ${s.iconColor}`} />
                  <div>
                    <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            {sources.map(s => <SourceCard key={s.name} source={s} />)}
          </div>

          {generatedAt && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Snapshot generated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
