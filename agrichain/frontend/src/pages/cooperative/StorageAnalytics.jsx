import { useState } from 'react'
import { Thermometer, Droplets, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

const MOCK_FACILITIES = [
  { id: 1, name: 'Cold Store A', type: 'cold_room', capacity_kg: 5000, used_kg: 3200, temp: 12.4, humidity: 68, status: 'ok', threshold_temp: 15, last_updated: '2 min ago' },
  { id: 2, name: 'Cold Store B', type: 'cold_room', capacity_kg: 3000, used_kg: 1800, temp: 18.1, humidity: 72, status: 'warning', threshold_temp: 15, last_updated: '1 min ago' },
  { id: 3, name: 'Dry Store', type: 'dry_store', capacity_kg: 10000, used_kg: 4500, temp: 24.0, humidity: 55, status: 'ok', threshold_temp: 30, last_updated: '5 min ago' },
  { id: 4, name: 'Refrigeration Unit 1', type: 'refrigeration', capacity_kg: 2000, used_kg: 1900, temp: 6.8, humidity: 80, status: 'ok', threshold_temp: 8, last_updated: '30 sec ago' },
]

const MOCK_HISTORY = [
  { time: '06:00', cs_a: 12.1, cs_b: 17.2 },
  { time: '08:00', cs_a: 12.3, cs_b: 17.5 },
  { time: '10:00', cs_a: 12.4, cs_b: 17.8 },
  { time: '12:00', cs_a: 12.4, cs_b: 18.1 },
]

function GaugeFill({ pct, color }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

function FacilityCard({ f }) {
  const usedPct = Math.round((f.used_kg / f.capacity_kg) * 100)
  const tempPct = (f.temp / (f.threshold_temp * 1.5)) * 100
  const isWarning = f.status === 'warning'

  return (
    <div className={`card border-l-4 ${isWarning ? 'border-l-warning-500' : 'border-l-success-500'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{f.name}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{f.type.replace('_', ' ')} · updated {f.last_updated}</p>
        </div>
        {isWarning
          ? <span className="flex items-center gap-1 text-xs font-medium text-warning-500 bg-warning-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Warning</span>
          : <span className="flex items-center gap-1 text-xs font-medium text-success-500 bg-success-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Normal</span>
        }
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Thermometer className="w-3 h-3" /> Temperature
          </div>
          <p className={`text-2xl font-bold ${isWarning ? 'text-warning-500' : 'text-gray-900'}`}>{f.temp}°C</p>
          <p className="text-xs text-gray-400">Threshold: {f.threshold_temp}°C</p>
          <GaugeFill pct={tempPct} color={isWarning ? 'bg-warning-400' : 'bg-success-400'} />
        </div>
        <div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
            <Droplets className="w-3 h-3" /> Humidity
          </div>
          <p className="text-2xl font-bold text-gray-900">{f.humidity}%</p>
          <p className="text-xs text-gray-400">Target: 60–75%</p>
          <GaugeFill pct={f.humidity} color="bg-primary-400" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Capacity used</span>
          <span className="font-medium">{f.used_kg.toLocaleString()} / {f.capacity_kg.toLocaleString()} kg ({usedPct}%)</span>
        </div>
        <GaugeFill pct={usedPct} color={usedPct > 90 ? 'bg-danger-400' : 'bg-primary-400'} />
      </div>
    </div>
  )
}

export default function StorageAnalytics() {
  const [facilities] = useState(MOCK_FACILITIES)
  const warnings = facilities.filter(f => f.status === 'warning')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live IoT monitoring for cold storage and dry store facilities.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="p-4 bg-warning-50 border border-warning-500 rounded-xl flex items-start gap-3 text-warning-500">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Temperature alert</p>
            <p className="text-sm mt-0.5">{warnings.map(w => w.name).join(', ')} exceed{warnings.length === 1 ? 's' : ''} the safe temperature threshold. Check cooling systems immediately.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {facilities.map(f => <FacilityCard key={f.id} f={f} />)}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Temperature history (today)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Time</th>
                <th className="text-right py-2 text-gray-500 font-medium">Cold Store A</th>
                <th className="text-right py-2 text-gray-500 font-medium">Cold Store B</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map(row => (
                <tr key={row.time} className="border-b border-gray-50">
                  <td className="py-2 text-gray-600">{row.time}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{row.cs_a}°C</td>
                  <td className={`py-2 text-right font-medium ${row.cs_b > 15 ? 'text-warning-500' : 'text-gray-900'}`}>{row.cs_b}°C</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
