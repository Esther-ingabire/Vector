import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { AlertTriangle, Clock, Loader } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const PRIORITY_STYLE = {
  HIGH:   { badge: 'bg-red-100 text-red-700',       trendColor: 'text-danger-600'  },
  MEDIUM: { badge: 'bg-yellow-100 text-yellow-700',  trendColor: 'text-warning-600' },
  LOW:    { badge: 'bg-green-100 text-green-700',    trendColor: 'text-gray-500'    },
}

const ROOT_CAUSES = [
  { label: 'Road infrastructure issues',   detail: 'Poor road conditions on key routes',          pct: 42 },
  { label: 'Storage capacity constraints', detail: 'Distribution hubs near maximum capacity',      pct: 28 },
  { label: 'Documentation delays',         detail: 'Average 2hr delay in paperwork processing',    pct: 18 },
  { label: 'Vehicle breakdowns',           detail: 'Fleet maintenance and unplanned downtime',     pct: 12 },
]

export default function BottleneckDetectionPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.getMinagriBottlenecks()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const hotspots    = data?.hotspots         || []
  const monthLabels = data?.monthly_delays?.months  || []
  const monthDelays = data?.monthly_delays?.delays  || []

  const delayChartData = {
    labels: monthLabels,
    datasets: [{
      label: 'Avg Delay (hrs)',
      data: monthDelays,
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220,38,38,0.06)',
      pointBackgroundColor: '#dc2626',
      pointRadius: 4,
      tension: 0.3,
      fill: false,
    }],
  }

  const maxDelay = Math.max(8, ...monthDelays) + 1
  const delayChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw} hrs` } },
    },
    scales: {
      y: {
        min: 0, max: maxDelay,
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 } },
        title: { display: true, text: 'Avg Delay (hrs)', font: { size: 11 }, color: '#6b7280' },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" /> Analysing transport delays…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bottleneck Detection</h1>
        <p className="text-sm text-gray-500 mt-0.5">Delay hotspots and root causes identified by the AI engine</p>
      </div>

      {/* Delay Hotspots */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Delay Hotspots</h2>
          <AlertTriangle className="w-5 h-5 text-warning-500" />
        </div>
        {hotspots.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No completed trip data available yet. Hotspots appear once transport jobs are completed.
          </p>
        ) : (
          <div className="space-y-3">
            {hotspots.map((h, i) => {
              const s = PRIORITY_STYLE[h.priority] || PRIORITY_STYLE.LOW
              return (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.badge}`}>{h.priority}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{h.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{h.count} trip{h.count !== 1 ? 's' : ''} analysed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-danger-500" />
                    <p className="font-bold text-danger-600">{h.avg_delay_hrs} hrs delay</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Root Cause Analysis + Seasonal Delay Patterns */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Root Cause Analysis</h2>
          <div className="space-y-4">
            {ROOT_CAUSES.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.detail}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-700 ml-4 shrink-0">{r.pct}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary-600 transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">↗</span>
            <h2 className="font-semibold text-gray-900">Monthly Delay Patterns</h2>
          </div>
          <div className="h-52">
            {monthLabels.length > 0
              ? <Line data={delayChartData} options={delayChartOptions} />
              : <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  No completed trip data available
                </div>
            }
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">
            Average delay above 4-hour baseline per trip
          </p>
        </div>
      </div>
    </div>
  )
}
