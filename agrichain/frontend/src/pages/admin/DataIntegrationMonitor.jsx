import { useState } from 'react'
import { RefreshCw, Building2, Navigation, ClipboardList, Store, Thermometer, Truck, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const SOURCES = [
  { id: 1, icon: Building2,    name: 'Cooperative Inputs',    description: 'Dispatch records, stock updates, produce request responses', status: 'ok',      lastSync: new Date(Date.now() - 3 * 60000),     errorCount: 0,  recordsToday: 142  },
  { id: 2, icon: Navigation,   name: 'Transporter GPS',       description: 'Location coordinates, pickup & delivery confirmations',     status: 'ok',      lastSync: new Date(Date.now() - 2 * 60000),     errorCount: 0,  recordsToday: 3847 },
  { id: 3, icon: ClipboardList,name: 'Distributor Forms',     description: 'Receipt confirmations, collection notices, order confirmations', status: 'ok', lastSync: new Date(Date.now() - 8 * 60000),     errorCount: 0,  recordsToday: 89   },
  { id: 4, icon: Store,        name: 'Market Agent Forms',    description: 'Collection confirmations, arrival quantities, waste reports', status: 'warning', lastSync: new Date(Date.now() - 47 * 60000),  errorCount: 3,  recordsToday: 56   },
  { id: 5, icon: Thermometer,  name: 'Cold Storage IoT',      description: 'Temperature (°C), humidity (%) from ESP32/DHT22 sensors',  status: 'ok',      lastSync: new Date(Date.now() - 60000),         errorCount: 0,  recordsToday: 2880 },
  { id: 6, icon: Truck,        name: 'Vehicle IoT',           description: 'Cargo temperature from refrigerated transport vehicles',    status: 'error',   lastSync: new Date(Date.now() - 3 * 3600000),   errorCount: 12, recordsToday: 0    },
  { id: 7, icon: Navigation,   name: 'GPS Feeds (All)',       description: 'Route coordinates from mobile driver GPS',                  status: 'ok',      lastSync: new Date(Date.now() - 90000),         errorCount: 0,  recordsToday: 5621 },
]

const STATUS = {
  ok:      { label: 'Healthy',  dot: 'bg-success-500', badge: 'badge-green', borderL: 'border-2 border-success-500' },
  warning: { label: 'Degraded', dot: 'bg-warning-400', badge: 'badge-amber', borderL: 'border-2 border-warning-400' },
  error:   { label: 'Error',    dot: 'bg-danger-500',  badge: 'badge-red',   borderL: 'border-2 border-danger-500'  },
}

function SourceCard({ source, retrying, onRetry }) {
  const cfg = STATUS[source.status]
  const Icon = source.icon
  return (
    <div className={`card p-5 ${cfg.borderL}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
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
              <span>Last sync <span className="font-medium text-gray-700">{formatDistanceToNow(source.lastSync, { addSuffix: true })}</span></span>
              <span>Records today <span className="font-medium text-gray-700">{source.recordsToday.toLocaleString()}</span></span>
              {source.errorCount > 0 && (
                <span className="text-danger-600 font-medium">{source.errorCount} error{source.errorCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => onRetry(source.id)} disabled={retrying}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors ml-3 flex-shrink-0">
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}

export default function DataIntegrationMonitor() {
  const [sources, setSources] = useState(SOURCES)
  const [retrying, setRetrying] = useState(null)

  const handleRetry = async (id) => {
    setRetrying(id)
    await new Promise(r => setTimeout(r, 1500))
    setSources(prev => prev.map(s => s.id === id ? { ...s, lastSync: new Date(), errorCount: 0, status: 'ok' } : s))
    setRetrying(null)
  }

  const ok = sources.filter(s => s.status === 'ok').length
  const warnings = sources.filter(s => s.status === 'warning').length
  const errors = sources.filter(s => s.status === 'error').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Integration Monitor</h1>
        <p className="text-sm text-gray-500 mt-0.5">Health status of all data sources feeding the supply chain analytics pipeline.</p>
      </div>

      {/* Summary bar */}
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

      {/* Source cards */}
      <div className="space-y-3">
        {sources.map(s => (
          <div key={s.id} className={retrying === s.id ? 'opacity-50 pointer-events-none' : ''}>
            <SourceCard source={s} retrying={retrying === s.id} onRetry={handleRetry} />
          </div>
        ))}
      </div>
    </div>
  )
}
