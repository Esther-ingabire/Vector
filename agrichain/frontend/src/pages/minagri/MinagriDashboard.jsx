import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { TrendingDown, TrendingUp, Package, AlertTriangle, MapPin, FileText, Loader, Brain, ShieldCheck, ShieldAlert, Zap } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'
import DistrictLossMap from '../../components/map/DistrictLossMap.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

// Parse "Stage: Xt | Stage: Xt" pattern from STAGE_BREAKDOWN content
function parseStages(content) {
  // Matches "Stage Name: 4.2tons" or legacy "Stage Name: 4.2t"
  const matches = [...content.matchAll(/([\w\s\(\)]+):\s*([\d.]+)tons?/g)]
  return matches.map(m => ({ name: m[1].trim(), tons: parseFloat(m[2]) }))
}

// Extract "worse/better than last week by X%" from NATIONAL_LOSS content
function parseTrend(content) {
  const m = content.match(/(better|worse) than last week by ([\d.]+)%/)
  if (!m) return null
  return { dir: m[1], pct: parseFloat(m[2]) }
}

// Extract total loss pct from NATIONAL_LOSS content
function parseLossPct(content) {
  const m = content.match(/representing ([\d.]+)%/)
  return m ? parseFloat(m[1]) : null
}

function DailyBriefCard({ brief, kpis, routeAlerts }) {
  const allInsights = brief.insights ?? []
  const stageInsight = allInsights.find(i => i.insight_type === 'STAGE_BREAKDOWN')
  const lossInsight  = allInsights.find(i => i.insight_type === 'NATIONAL_LOSS')
  const otherInsights = allInsights.filter(i => !['STAGE_BREAKDOWN','NATIONAL_LOSS','ROUTE_ALERT'].includes(i.insight_type))

  const stages = stageInsight ? parseStages(stageInsight.content) : []
  const maxTons = stages.length ? Math.max(...stages.map(s => s.tons), 0.001) : 1
  const trend = lossInsight ? parseTrend(lossInsight.content) : null
  const lossPct = lossInsight ? parseLossPct(lossInsight.content) : null

  const hasCritical = [...allInsights, ...routeAlerts].some(i => i.is_critical)
  const hasAlerts   = routeAlerts.length > 0

  const statusCfg = hasCritical
    ? { label: 'CRITICAL', dot: 'bg-danger-500', text: 'text-danger-600', bg: 'bg-danger-50', icon: ShieldAlert }
    : hasAlerts
    ? { label: 'ELEVATED', dot: 'bg-warning-500', text: 'text-warning-600', bg: 'bg-warning-50', icon: ShieldAlert }
    : { label: 'NORMAL',   dot: 'bg-success-500', text: 'text-success-700', bg: 'bg-success-50', icon: ShieldCheck }

  const StatusIcon = statusCfg.icon

  const briefDate = (() => {
    try {
      return new Date(brief.brief_date + 'T06:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return brief.brief_date }
  })()

  const STAGE_COLORS = ['#c0392b','#e67e22','#2980b9','#8e44ad']
  const STAGE_LABELS = {
    'Transit (Leg 1)': 'Coop → Distributor',
    'Self-transport':  'Agent Self-Collect',
    'Market spoilage': 'Market Spoilage',
    'Cold storage':    'Cold Storage',
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">

      {/* ── Top header bar ── */}
      <div className="flex items-center gap-4 px-6 py-4" style={{ background: 'linear-gradient(135deg, #228b52 0%, #1a5c34 100%)' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-white/70 uppercase">Daily Intelligence Brief</p>
            <p className="text-sm font-semibold text-white mt-0.5">{briefDate}</p>
          </div>
        </div>
        {/* System status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusCfg.bg} border-opacity-50`}
          style={{ borderColor: hasCritical ? '#f87171' : hasAlerts ? '#fbbf24' : '#4ade80' }}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.dot}`} />
          <StatusIcon className={`w-3.5 h-3.5 ${statusCfg.text}`} />
          <span className={`text-xs font-bold tracking-wide ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>
      </div>

      {/* ── 4 headline KPIs ── */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        {[
          {
            label: 'National Loss Rate', icon: TrendingDown, iconColor: 'text-danger-500',
            value: kpis.loss_rate_pct !== '—' ? `${kpis.loss_rate_pct}%` : '—',
            sub: lossPct !== null
              ? (lossPct === 0 ? 'No losses recorded' : lossPct > 10 ? 'Above safe threshold' : 'Within acceptable range')
              : 'All recorded batches',
            valueColor: kpis.loss_rate_pct > 10 ? 'text-danger-600' : 'text-gray-900',
          },
          {
            label: 'Volume Dispatched', icon: Package, iconColor: 'text-primary-600',
            value: kpis.total_volume_tons !== '—' ? `${kpis.total_volume_tons} tons` : '—',
            sub: 'Across all cooperatives', valueColor: 'text-gray-900',
          },
          {
            label: 'Districts at Risk', icon: MapPin, iconColor: 'text-warning-500',
            value: kpis.high_risk_districts !== '—' ? String(kpis.high_risk_districts) : '—',
            sub: 'Loss rate ≥ 10%',
            valueColor: kpis.high_risk_districts > 0 ? 'text-warning-600' : 'text-gray-900',
          },
          {
            label: 'Cold Chain Compliance', icon: ShieldCheck, iconColor: 'text-success-600',
            value: kpis.cold_chain_compliance_pct !== '—' ? `${kpis.cold_chain_compliance_pct}%` : '—',
            sub: 'Across all facilities', valueColor: 'text-success-700',
          },
        ].map(k => (
          <div key={k.label} className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <k.icon className={`w-3.5 h-3.5 ${k.iconColor}`} />
              <span className="text-xs text-gray-400 font-medium">{k.label}</span>
            </div>
            <p className={`text-2xl font-bold ${k.valueColor}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Findings section ── */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">Yesterday's Findings</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Stage breakdown visual */}
          {stages.length > 0 ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Where Losses Occurred</p>
              <div className="grid grid-cols-4 gap-2">
                {stages.map((s, idx) => {
                  const pct = Math.round((s.tons / maxTons) * 100)
                  const isHighest = s.tons === Math.max(...stages.map(x => x.tons))
                  return (
                    <div key={s.name} className="flex flex-col items-center gap-1.5">
                      <div className="w-full h-20 bg-white rounded-lg border border-gray-200 flex flex-col justify-end overflow-hidden">
                        <div
                          className="w-full rounded-b-lg transition-all"
                          style={{
                            height: `${Math.max(pct, s.tons > 0 ? 8 : 0)}%`,
                            backgroundColor: isHighest ? '#c0392b' : STAGE_COLORS[idx],
                            opacity: s.tons === 0 ? 0.15 : 0.85,
                          }}
                        />
                      </div>
                      <p className="text-xs font-bold text-gray-700">{s.tons} tons</p>
                      <p className="text-[10px] text-gray-400 text-center leading-tight">
                        {STAGE_LABELS[s.name] || s.name}
                      </p>
                      {isHighest && s.tons > 0 && (
                        <span className="text-[9px] font-bold text-danger-600 bg-danger-50 px-1.5 py-0.5 rounded-full">HIGHEST</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center h-32">
              <p className="text-sm text-gray-400">No stage data for yesterday</p>
            </div>
          )}

          {/* National loss summary */}
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">National Summary</p>
            {lossInsight ? (
              <>
                <div className="flex items-end gap-3">
                  <p className={`text-4xl font-bold ${(lossPct ?? 0) > 10 ? 'text-danger-600' : 'text-gray-900'}`}>
                    {lossPct !== null ? `${lossPct}%` : '—'}
                  </p>
                  <div className="pb-1">
                    <p className="text-xs font-semibold text-gray-500">total post-harvest loss</p>
                    {trend ? (
                      <div className={`flex items-center gap-1 mt-0.5 ${trend.dir === 'better' ? 'text-success-600' : 'text-danger-500'}`}>
                        {trend.dir === 'better'
                          ? <TrendingDown className="w-3.5 h-3.5" />
                          : <TrendingUp className="w-3.5 h-3.5" />
                        }
                        <span className="text-xs font-bold">{trend.pct}% {trend.dir} vs last week</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">No week-on-week comparison available</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-200 pt-3">
                  {/* Extract the meaningful part of the content */}
                  {lossInsight.content.replace(/This is (better|worse) than last week by [\d.]+%\.?/, '').trim()}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No national loss data for yesterday.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Area loss alerts + other insights ── */}
      {(routeAlerts.length > 0 || otherInsights.length > 0) && (
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {routeAlerts.length > 0 && (
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Area Loss Alerts</p>
          )}
          {routeAlerts.map(a => (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl ${a.is_critical ? 'bg-danger-50 border border-danger-200' : 'bg-warning-50 border border-warning-200'}`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.is_critical ? 'text-danger-500' : 'text-warning-500'}`} />
              <div>
                <p className={`text-xs font-bold ${a.is_critical ? 'text-danger-700' : 'text-warning-700'}`}>{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{a.content}</p>
              </div>
              {a.is_critical && <span className="ml-auto shrink-0 text-[10px] font-bold bg-danger-500 text-white px-2 py-0.5 rounded-full">CRITICAL</span>}
            </div>
          ))}
          {otherInsights.map(i => (
            <div key={i.id} className="flex items-start gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100">
              <Zap className="w-4 h-4 shrink-0 mt-0.5 text-primary-500" />
              <div>
                <p className="text-xs font-bold text-primary-800">{i.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{i.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50">
        <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
        <p className="text-xs text-gray-400">
          {hasCritical
            ? 'Critical issues require immediate attention — review area loss alerts above.'
            : hasAlerts
            ? 'Elevated risk detected — monitor district performance today.'
            : 'All supply chain indicators within normal ranges. No immediate action required.'
          }
        </p>
        <span className="ml-auto text-xs text-gray-300">Generated from live data · {brief.brief_date}</span>
      </div>
    </div>
  )
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
        <DailyBriefCard brief={brief} kpis={kpis} routeAlerts={routeAlerts} />
      )}

      {/* 4 KPI cards — shown when no brief is available */}
      {!brief && (
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
      )}

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

      {/* District Loss Map */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
          <MapPin className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-gray-900">District Loss Map</h2>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success-500 inline-block" /> Low (&lt;7%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warning-400 inline-block" /> Medium (7–12%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-danger-500 inline-block" /> High (&gt;12%)</span>
            <span className="text-gray-300">· Circle size = volume</span>
          </div>
        </div>
        <div className="h-96">
          {districts.length > 0
            ? <DistrictLossMap districts={districts} />
            : <div className="flex items-center justify-center h-full text-sm text-gray-400">No district data available</div>
          }
        </div>
      </div>

      {/* Top Loss Crops */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Top Loss Crops</h2>
        <div className="h-48">
          {topCrops.length > 0
            ? <Bar data={barData} options={barOptions} />
            : <div className="flex items-center justify-center h-full text-sm text-gray-400">No crop data available</div>
          }
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
