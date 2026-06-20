import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { TrendingDown, TrendingUp, Package, AlertTriangle, MapPin, FileText, Loader, Brain, Route } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

function lossBarColor(pct) {
  if (pct >= 13) return 'bg-danger-500'
  if (pct >= 10) return 'bg-warning-400'
  return 'bg-success-500'
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => ` ${ctx.raw}%` } },
  },
  scales: {
    y: {
      min: 0, max: 20,
      grid: { color: '#f1f5f9' },
      ticks: { callback: v => `${v}%`, font: { size: 11 } },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% loss` } },
  },
  scales: {
    y: {
      min: 0, max: 20,
      grid: { color: '#f1f5f9' },
      ticks: { callback: v => `${v}%`, font: { size: 11 } },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
}

export default function MinagriDashboard() {
  const [data, setData]       = useState(null)
  const [brief, setBrief]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.getMinagriExecutive()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
    analyticsApi.getDailyBrief()
      .then(r => setBrief(r.data?.id ? r.data : null))
      .catch(() => setBrief(null))
  }, [])

  const routeAlerts = (brief?.insights ?? []).filter(i => i.insight_type === 'ROUTE_ALERT')
  const otherInsights = (brief?.insights ?? []).filter(i => i.insight_type !== 'ROUTE_ALERT')

  const kpis = {
    loss_rate_pct:            data?.loss_rate_pct            ?? '—',
    total_volume_tons:        data?.total_volume_tons        ?? '—',
    high_risk_districts:      data?.high_risk_districts      ?? '—',
    cold_chain_compliance_pct:data?.cold_chain_compliance_pct ?? '—',
  }

  const districts = data?.district_loss ?? []
  const trend     = data?.monthly_trend  ?? []
  const topCrops  = data?.top_loss_crops ?? []

  const lineData = {
    labels: trend.map(m => m.month),
    datasets: [{
      label: 'Loss %',
      data: trend.map(m => m.loss_pct),
      borderColor: '#c0392b',
      backgroundColor: 'rgba(192,57,43,0.06)',
      pointBackgroundColor: '#c0392b',
      pointRadius: 4,
      tension: 0.3,
      fill: false,
    }],
  }

  const barData = {
    labels: topCrops.map(c => c.crop),
    datasets: [{
      label: 'Loss %',
      data: topCrops.map(c => c.loss_pct),
      backgroundColor: '#2d6a4f',
      borderRadius: 4,
    }],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" /> Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MINAGRI Officer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">National agricultural supply chain overview · Rwanda</p>
      </div>

      {/* AI Daily Intelligence Brief */}
      {brief && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2 bg-gradient-to-br from-primary-50 to-white border-primary-100">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-gray-900">AI Daily Intelligence Brief</h2>
              <span className="text-xs text-gray-400 ml-auto">{brief.brief_date}</span>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-4">{brief.summary_text}</p>
            <div className="space-y-3">
              {otherInsights.map(insight => (
                <div key={insight.id} className="pl-3 border-l-2 border-primary-200">
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{insight.content}</p>
                </div>
              ))}
              {otherInsights.length === 0 && (
                <p className="text-sm text-gray-400">No narrative insights in this brief.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Route className="w-4 h-4 text-warning-500" />
              <h2 className="font-semibold text-gray-900">Route Alerts</h2>
            </div>
            {routeAlerts.length === 0 ? (
              <p className="text-sm text-gray-400">No active route alerts.</p>
            ) : (
              <div className="space-y-3">
                {routeAlerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded-xl ${alert.is_critical ? 'bg-danger-50' : 'bg-warning-50'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className={`w-3.5 h-3.5 ${alert.is_critical ? 'text-danger-500' : 'text-warning-500'}`} />
                      <p className={`text-sm font-semibold ${alert.is_critical ? 'text-danger-600' : 'text-warning-600'}`}>{alert.title}</p>
                    </div>
                    <p className="text-xs text-gray-500">{alert.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card border-2 border-danger-400">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-danger-500" /> National Loss Rate
          </div>
          <p className="text-3xl font-bold text-danger-500">
            {kpis.loss_rate_pct !== '—' ? `${kpis.loss_rate_pct}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Across all recorded batches</p>
        </div>
        <div className="card border-2 border-primary-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Package className="w-3.5 h-3.5 text-primary-600" /> Total Volume Tracked
          </div>
          <p className="text-3xl font-bold text-primary-700">
            {kpis.total_volume_tons !== '—' ? kpis.total_volume_tons.toLocaleString() : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">tons dispatched (all-time)</p>
        </div>
        <div className="card border-2 border-warning-400">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-500" /> High-Risk Districts
          </div>
          <p className="text-3xl font-bold text-warning-500">{kpis.high_risk_districts}</p>
          <p className="text-xs text-gray-400 mt-1">Loss rate ≥ 10%</p>
        </div>
        <div className="card border-2 border-success-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-success-600" /> Cold Chain Compliance
          </div>
          <p className="text-3xl font-bold text-success-600">
            {kpis.cold_chain_compliance_pct !== '—' ? `${kpis.cold_chain_compliance_pct}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Across all facilities</p>
        </div>
      </div>

      {/* National Loss Trend */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-1">National Loss Trend (Last 6 Months)</h2>
        <p className="text-xs text-gray-400 mb-4">Average total loss % per batch by dispatch month</p>
        <div className="h-56">
          {trend.length > 0
            ? <Line data={lineData} options={lineOptions} />
            : <div className="flex items-center justify-center h-full text-sm text-gray-400">No trend data yet</div>
          }
        </div>
      </div>

      {/* District Heatmap + Top Loss Crops */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900">District Loss Heatmap</h2>
          </div>
          {districts.length > 0 ? (
            <div className="space-y-3">
              {districts.map(d => (
                <div key={d.district} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-700 font-medium shrink-0 truncate">{d.district}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${lossBarColor(d.loss_pct)} transition-all`}
                      style={{ width: `${Math.min(100, (d.loss_pct / 20) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold text-gray-700 shrink-0">
                    {d.loss_pct}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No district data available</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Top Loss Crops</h2>
          <div className="h-48">
            {topCrops.length > 0
              ? <Bar data={barData} options={barOptions} />
              : <div className="flex items-center justify-center h-full text-sm text-gray-400">No crop data available</div>
            }
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="card bg-primary-50 border border-primary-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Data Source</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          All figures are computed live from the ChainSight database. Loss rates reflect batches with completed
          handovers. Navigate to <strong>Pre-Generated Reports</strong> or <strong>Custom Reports</strong> to download
          detailed exports.
        </p>
      </div>
    </div>
  )
}
