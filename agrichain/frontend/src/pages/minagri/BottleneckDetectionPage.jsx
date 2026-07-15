import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  AlertTriangle, Loader, MapPin, Wrench, Construction,
  FileClock, HelpCircle, TrendingUp, Route, Warehouse, PackageX,
  Store, Thermometer, LayoutGrid,
} from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const PRIORITY_STYLE = {
  HIGH:   { badge: 'bg-red-100 text-red-700',       ring: 'ring-red-100' },
  MEDIUM: { badge: 'bg-yellow-100 text-yellow-700',  ring: 'ring-yellow-100' },
  LOW:    { badge: 'bg-green-100 text-green-700',    ring: 'ring-green-100' },
}
const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 }

// One entry per pipeline stage the AI engine actually scans for constraints — this is what
// makes bottleneck detection "whole system" rather than transit-only. Colors validated
// colorblind-safe as a set (dataviz skill validator, light mode). Order here also fixes tab order.
const STAGE_META = {
  STORAGE:    { label: 'Storage',    icon: Warehouse,   color: 'text-blue-600',    bg: 'bg-blue-50',   hex: '#2563eb' },
  DISPATCH:   { label: 'Dispatch',   icon: PackageX,    color: 'text-orange-600',  bg: 'bg-orange-50', hex: '#ea580c' },
  TRANSIT:    { label: 'Transit',    icon: Route,        color: 'text-danger-600',  bg: 'bg-red-50',    hex: '#dc2626' },
  MARKET:     { label: 'Market',     icon: Store,        color: 'text-purple-600',  bg: 'bg-purple-50', hex: '#9333ea' },
  COLD_CHAIN: { label: 'Cold Chain', icon: Thermometer,  color: 'text-cyan-600',    bg: 'bg-cyan-50',   hex: '#0891b2' },
}
const DEFAULT_STAGE_META = { label: 'Other', icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-50', hex: '#6b7280' }

// Maps backend cause labels to an icon + severity color so the highest-impact cause is
// visually obvious at a glance, without the reader needing to read every percentage.
const CAUSE_STYLE = {
  'Vehicle breakdowns':          { icon: Wrench,       color: 'bg-danger-600',  text: 'text-danger-700' },
  'Road infrastructure issues':  { icon: Construction, color: 'bg-warning-500', text: 'text-warning-700' },
  'Late dispatch':               { icon: FileClock,    color: 'bg-primary-600', text: 'text-primary-700' },
  'In-transit delays':           { icon: HelpCircle,   color: 'bg-gray-400',    text: 'text-gray-600' },
}
const DEFAULT_CAUSE_STYLE = { icon: HelpCircle, color: 'bg-gray-400', text: 'text-gray-600' }

// Renders a same-style % breakdown for stages that don't have a per-cause icon mapping
// (Market/Cold Chain only have 2-4 fixed reasons, so a single stage color reads fine).
function CauseBreakdown({ causes, barClass, textClass, emptyText }) {
  if (causes.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>
  }
  return (
    <div className="space-y-4">
      {causes.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
              <p className="text-xs text-gray-400 truncate">{r.detail}</p>
            </div>
            <span className={`text-sm font-bold ml-4 shrink-0 ${textClass}`}>{r.pct}%</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${barClass}`} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// One config builder shared by all three monthly trend charts — each stays single-axis/single-hue
// per the dataviz "one axis" rule; different units (hrs / count / %) get separate small-multiple
// charts rather than being forced onto one dual-axis chart.
function trendConfig(labels, series, hex, rgba, unitSuffix, yTitle, minCeiling) {
  const max = Math.max(minCeiling, ...series) + 1
  return {
    data: {
      labels,
      datasets: [{
        data: series,
        borderColor: hex,
        backgroundColor: rgba,
        pointBackgroundColor: hex,
        pointRadius: 4,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw}${unitSuffix}` } },
      },
      scales: {
        y: {
          min: 0, max,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: yTitle, font: { size: 11 }, color: '#6b7280' },
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  }
}

export default function BottleneckDetectionPage() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [stageFilter, setStageFilter] = useState('ALL')

  useEffect(() => {
    analyticsApi.getMinagriBottlenecks()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const hotspots          = data?.hotspots            || []
  const rootCauses        = data?.root_causes         || []
  const dispatchCauses    = data?.dispatch_root_causes || []
  const marketCauses      = data?.market_root_causes  || []
  const coldChainCauses   = data?.coldchain_root_causes || []
  const monthLabels       = data?.monthly_delays?.months || []
  const monthDelays       = data?.monthly_delays?.delays || []
  const coldChainMonths   = data?.monthly_coldchain_breaches?.months  || []
  const coldChainBreaches = data?.monthly_coldchain_breaches?.counts  || []
  const marketMonths      = data?.monthly_market_no_demand?.months || []
  const marketNoDemandPct = data?.monthly_market_no_demand?.pct    || []
  const systemBottlenecks = data?.system_bottlenecks || []
  const stageSummary      = data?.stage_summary || {}
  const topCause          = rootCauses[0]

  // Transit hotspots reshaped into the same generic {stage, name, priority, metric_label,
  // metric_value, detail} shape as the other stages, so the whole system can be ranked and
  // filtered together instead of transit getting special treatment.
  const allBottlenecks = useMemo(() => {
    const transitItems = hotspots.map(h => ({
      stage: 'TRANSIT',
      name: h.name,
      priority: h.priority,
      metric_label: 'Avg delay',
      metric_value: `${h.avg_delay_hrs} hrs`,
      detail: `${h.count} trip${h.count !== 1 ? 's' : ''} analysed`,
    }))
    return [...transitItems, ...systemBottlenecks]
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3))
  }, [hotspots, systemBottlenecks])

  const worstOverall = allBottlenecks[0]
  const visibleBottlenecks = stageFilter === 'ALL'
    ? allBottlenecks
    : allBottlenecks.filter(b => b.stage === stageFilter)

  const transitTrend   = trendConfig(monthLabels, monthDelays, STAGE_META.TRANSIT.hex, 'rgba(220,38,38,0.06)', ' hrs', 'Avg Delay (hrs)', 8)
  const coldChainTrend = trendConfig(coldChainMonths, coldChainBreaches, STAGE_META.COLD_CHAIN.hex, 'rgba(8,145,178,0.06)', '', 'Breaches', 5)
  const marketTrend    = trendConfig(marketMonths, marketNoDemandPct, STAGE_META.MARKET.hex, 'rgba(147,51,234,0.06)', '%', 'No-Demand Loss (%)', 20)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" /> Scanning the supply chain for bottlenecks…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bottleneck Detection</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Constraints across the whole chain — storage, dispatch, transit, market and cold chain — computed from real records
        </p>
      </div>

      {/* Stage overview strip — proves this covers the whole system, not just transit, and doubles as the filter */}
      <div className="grid grid-cols-5 divide-x divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden">
        {Object.entries(STAGE_META).map(([stage, meta]) => {
          const Icon = meta.icon
          const count = stageSummary[stage] ?? 0
          const active = stageFilter === stage
          return (
            <button
              key={stage}
              onClick={() => setStageFilter(active ? 'ALL' : stage)}
              className={`px-4 py-4 text-left transition-colors ${active ? meta.bg : 'hover:bg-gray-50'}`}
            >
              <div className={`flex items-center gap-2 mb-1 ${meta.color}`}>
                <Icon className="w-4 h-4" />
                <p className="text-xs font-medium uppercase tracking-wide">{meta.label}</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">active {count === 1 ? 'bottleneck' : 'bottlenecks'}</p>
            </button>
          )
        })}
      </div>

      {/* At-a-glance summary — worst bottleneck across the whole system + the leading transit cause */}
      {(worstOverall || topCause) && (
        <div className="grid grid-cols-2 gap-6">
          {worstOverall && (() => {
            const meta = STAGE_META[worstOverall.stage] || DEFAULT_STAGE_META
            const Icon = meta.icon
            return (
              <div className="card border-2 border-danger-500 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Worst bottleneck right now · {meta.label}
                  </p>
                  <p className="font-semibold text-gray-900 text-sm truncate" title={worstOverall.name}>{worstOverall.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {worstOverall.metric_label}: <span className="font-bold text-danger-600">{worstOverall.metric_value}</span>
                    {' — '}{worstOverall.detail}
                  </p>
                </div>
              </div>
            )
          })()}
          {topCause && (
            <div className="card border-2 border-primary-500 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                {(() => { const Icon = (CAUSE_STYLE[topCause.label] || DEFAULT_CAUSE_STYLE).icon; return <Icon className="w-4.5 h-4.5 text-primary-600" /> })()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leading transit delay cause</p>
                <p className="font-semibold text-gray-900 text-sm truncate">{topCause.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Behind <span className="font-bold text-primary-700">{topCause.pct}%</span> of delayed trips ({topCause.count})
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Bottlenecks — every stage, ranked by priority, filterable via the strip above */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-semibold text-gray-900">
              {stageFilter === 'ALL' ? 'All Bottlenecks' : `${STAGE_META[stageFilter]?.label} Bottlenecks`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Ranked worst first, across the whole supply chain</p>
          </div>
          <div className="flex items-center gap-2">
            {stageFilter !== 'ALL' && (
              <button
                onClick={() => setStageFilter('ALL')}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Show all stages
              </button>
            )}
            <AlertTriangle className="w-5 h-5 text-warning-500" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 mt-3 mb-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> High priority</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium priority</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Low priority</span>
        </div>
        {visibleBottlenecks.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            {stageFilter === 'ALL'
              ? 'No active bottlenecks detected across the supply chain right now.'
              : `No active ${STAGE_META[stageFilter]?.label.toLowerCase()} bottlenecks right now.`}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleBottlenecks.map((b, i) => {
              const s = PRIORITY_STYLE[b.priority] || PRIORITY_STYLE.LOW
              const meta = STAGE_META[b.stage] || DEFAULT_STAGE_META
              const Icon = meta.icon
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors ${i === 0 ? `border-transparent ring-2 ${s.ring} bg-gray-50/60` : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${s.badge}`}>{b.priority}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <p className="font-semibold text-gray-800 text-sm truncate">{b.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{b.detail}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-gray-400">{b.metric_label}</p>
                    <p className="font-bold text-gray-900">{b.metric_value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Root Causes by Stage — one card per stage that has real causal signal behind the metric.
          Storage is intentionally excluded: its bottleneck IS the metric (utilization %) with no
          deeper cause data to break down without fabricating it. */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Root Causes by Stage</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-danger-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Transit Delays</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">From reported incidents and dispatch timing</p>
            {rootCauses.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No delayed trips to analyse yet.</p>
            ) : (
              <div className="space-y-4">
                {rootCauses.map((r, i) => {
                  const cs = CAUSE_STYLE[r.label] || DEFAULT_CAUSE_STYLE
                  const Icon = cs.icon
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${cs.text}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
                            <p className="text-xs text-gray-400 truncate">{r.detail}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ml-4 shrink-0 ${cs.text}`}>{r.pct}%</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${cs.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <PackageX className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Dispatch Losses</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Why produce spoils before ever leaving the cooperative</p>
            <CauseBreakdown
              causes={dispatchCauses}
              barClass="bg-orange-600"
              textClass="text-orange-700"
              emptyText="No cooperative waste reports to analyse yet."
            />
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Market Losses</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Distributor warehouse + market stall combined</p>
            <CauseBreakdown
              causes={marketCauses}
              barClass="bg-purple-600"
              textClass="text-purple-700"
              emptyText="No distributor/market agent waste reports to analyse yet."
            />
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-cyan-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Cold Chain Breaches</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Temperature vs humidity, last 30 days</p>
            <CauseBreakdown
              causes={coldChainCauses}
              barClass="bg-cyan-600"
              textClass="text-cyan-700"
              emptyText="No sensor breaches recorded in the last 30 days."
            />
          </div>
        </div>
      </div>

      {/* Monthly Trends — one small-multiple chart per stage with real time-series data (Storage
          and Dispatch are snapshot-only, so they have no monthly history to plot). Each chart keeps
          its own single axis/unit rather than forcing hrs, count and % onto one dual-axis chart. */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Monthly Trends</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-danger-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Transit Delay</h3>
            </div>
            <div className="h-48">
              {monthLabels.length > 0
                ? <Line data={transitTrend.data} options={transitTrend.options} />
                : <div className="flex items-center justify-center h-full text-sm text-gray-400">No completed trip data available</div>}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">Avg delay above 4hr baseline per trip</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-cyan-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Cold Chain Breaches</h3>
            </div>
            <div className="h-48">
              {coldChainMonths.length > 0
                ? <Line data={coldChainTrend.data} options={coldChainTrend.options} />
                : <div className="flex items-center justify-center h-full text-sm text-gray-400">No sensor data available</div>}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">Temperature/humidity readings outside safe range</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Market No-Demand Loss</h3>
            </div>
            <div className="h-48">
              {marketMonths.length > 0
                ? <Line data={marketTrend.data} options={marketTrend.options} />
                : <div className="flex items-center justify-center h-full text-sm text-gray-400">No waste reports available</div>}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">Share of distributor produce discarded for lack of buyers</p>
          </div>
        </div>
      </div>
    </div>
  )
}
