import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const SOURCES = [
  { id: 1, name: 'Cooperative Inputs', description: 'Dispatch records, stock updates, produce request responses', status: 'ok', lastSync: new Date(Date.now() - 3 * 60000), errorCount: 0, recordsToday: 142 },
  { id: 2, name: 'Transporter GPS', description: 'Location coordinates, pickup & delivery confirmations', status: 'ok', lastSync: new Date(Date.now() - 2 * 60000), errorCount: 0, recordsToday: 3847 },
  { id: 3, name: 'Distributor Forms', description: 'Receipt confirmations, collection notices, order confirmations', status: 'ok', lastSync: new Date(Date.now() - 8 * 60000), errorCount: 0, recordsToday: 89 },
  { id: 4, name: 'Market Agent Forms', description: 'Collection confirmations, arrival quantities, waste reports', status: 'warning', lastSync: new Date(Date.now() - 47 * 60000), errorCount: 3, recordsToday: 56 },
  { id: 5, name: 'Cold Storage IoT', description: 'Temperature (°C), humidity (%) from ESP32/DHT22 sensors', status: 'ok', lastSync: new Date(Date.now() - 60000), errorCount: 0, recordsToday: 2880 },
  { id: 6, name: 'Vehicle IoT', description: 'Cargo temperature from refrigerated transport vehicles', status: 'error', lastSync: new Date(Date.now() - 3 * 3600000), errorCount: 12, recordsToday: 0 },
  { id: 7, name: 'GPS Feeds (All Vehicles)', description: 'Route coordinates from mobile driver GPS', status: 'ok', lastSync: new Date(Date.now() - 90000), errorCount: 0, recordsToday: 5621 },
]

const STATUS_CONFIG = {
  ok: { icon: CheckCircle, label: 'Healthy', className: 'text-success-500', bg: 'bg-success-50', border: 'border-success-500' },
  warning: { icon: AlertTriangle, label: 'Degraded', className: 'text-warning-500', bg: 'bg-warning-50', border: 'border-warning-500' },
  error: { icon: XCircle, label: 'Error', className: 'text-danger-500', bg: 'bg-danger-50', border: 'border-danger-500' },
}

function SourceCard({ source, onRetry }) {
  const cfg = STATUS_CONFIG[source.status]
  const Icon = cfg.icon
  return (
    <div className={`card border-l-4 ${cfg.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${cfg.bg} mt-0.5`}><Icon className={`w-5 h-5 ${cfg.className}`} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{source.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.className}`}>{cfg.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{source.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
              <span>Last sync: <span className="font-medium text-gray-700">{formatDistanceToNow(source.lastSync, { addSuffix: true })}</span></span>
              <span>Records today: <span className="font-medium text-gray-700">{source.recordsToday.toLocaleString()}</span></span>
              {source.errorCount > 0 && <span className="text-danger-500">Errors: <span className="font-semibold">{source.errorCount}</span></span>}
            </div>
          </div>
        </div>
        <button onClick={() => onRetry(source.id)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-4">
          <RefreshCw className="w-4 h-4" />
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
        <div className="card flex items-center gap-3 border-l-4 border-success-500">
          <CheckCircle className="w-8 h-8 text-success-500 flex-shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900">{ok}</p><p className="text-sm text-gray-500">Healthy sources</p></div>
        </div>
        <div className="card flex items-center gap-3 border-l-4 border-warning-500">
          <AlertTriangle className="w-8 h-8 text-warning-500 flex-shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900">{warnings}</p><p className="text-sm text-gray-500">Degraded sources</p></div>
        </div>
        <div className="card flex items-center gap-3 border-l-4 border-danger-500">
          <XCircle className="w-8 h-8 text-danger-500 flex-shrink-0" />
          <div><p className="text-2xl font-bold text-gray-900">{errors}</p><p className="text-sm text-gray-500">Error sources</p></div>
        </div>
      </div>

      {/* Source cards */}
      <div className="space-y-4">
        {sources.map(s => (
          <div key={s.id} className={retrying === s.id ? 'opacity-60 pointer-events-none' : ''}>
            <SourceCard source={s} onRetry={handleRetry} />
          </div>
        ))}
      </div>
    </div>
  )
}
