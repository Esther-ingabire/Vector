import { Download, TrendingUp } from 'lucide-react'

const WEEKLY = [
  { day: 'Mon', entries: 8, batches: 2 },
  { day: 'Tue', entries: 12, batches: 3 },
  { day: 'Wed', entries: 10, batches: 1 },
  { day: 'Thu', entries: 15, batches: 4 },
  { day: 'Fri', entries: 11, batches: 2 },
  { day: 'Sat', entries: 14, batches: 3 },
  { day: 'Sun', entries: 6, batches: 1 },
]

const TOP_PRICES = [
  { crop: 'Tomatoes', min: 800, max: 900, avg: 850, entries: 14 },
  { crop: 'Avocados', min: 1150, max: 1250, avg: 1200, entries: 10 },
  { crop: 'Beans', min: 820, max: 950, avg: 900, entries: 12 },
  { crop: 'Maize', min: 380, max: 420, avg: 400, entries: 8 },
]

const maxEntries = Math.max(...WEEKLY.map(d => d.entries))

export default function AgentReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Summary of your price recordings and batch activity.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Prices recorded (week)', value: WEEKLY.reduce((a, d) => a + d.entries, 0) },
          { label: 'Batches received (week)', value: WEEKLY.reduce((a, d) => a + d.batches, 0) },
          { label: 'Crops tracked', value: TOP_PRICES.length },
          { label: 'Markets covered', value: 1 },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Daily activity this week</h2>
        <div className="flex items-end gap-3 h-32">
          {WEEKLY.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{d.entries}</span>
              <div className="w-full rounded-t-md bg-primary-400" style={{ height: `${Math.max(8, (d.entries / maxEntries) * 90)}%` }} />
              <span className="text-xs text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Price range this week (RWF/kg)</h2>
        <div className="space-y-0">
          {TOP_PRICES.map(p => (
            <div key={p.crop} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="w-28">
                <p className="font-medium text-gray-900">{p.crop}</p>
                <p className="text-xs text-gray-400">{p.entries} entries</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Min: <strong className="text-gray-900">RWF {p.min.toLocaleString()}</strong></span>
                <span>Avg: <strong className="text-primary-600">RWF {p.avg.toLocaleString()}</strong></span>
                <span>Max: <strong className="text-gray-900">RWF {p.max.toLocaleString()}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
