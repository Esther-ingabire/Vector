import { useEffect, useState } from 'react'
import { MapPin, Eye, Loader, X, TrendingDown, TrendingUp, Package, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

const STATUS_STYLE = {
  HIGH:   { badge: 'bg-danger-100 text-danger-700',  lossText: 'text-danger-600',  border: 'border-danger-300'  },
  MEDIUM: { badge: 'bg-warning-50 text-warning-700', lossText: 'text-warning-600', border: 'border-warning-300' },
  LOW:    { badge: 'bg-success-50 text-success-700', lossText: 'text-success-600', border: 'border-success-300' },
}

function heatmapCardStyle(loss) {
  if (loss >= 12) return 'bg-red-50 border border-red-200 text-red-700'
  if (loss >= 7)  return 'bg-yellow-50 border border-yellow-200 text-yellow-700'
  return 'bg-green-50 border border-green-200 text-green-700'
}

function districtNarrative(d) {
  const loss = d.loss_pct
  const cc   = d.cold_chain_compliance
  if (d.status === 'HIGH') {
    return `${d.district} is recording critical post-harvest loss levels at ${loss}% — nearly double the national target of 7%. With only ${cc}% cold chain compliance, produce is being exposed to temperature breaks during transit. ${d.top_crop} is the most-affected commodity based on recorded batch volume. Immediate field investigation and targeted intervention are recommended.`
  }
  if (d.status === 'MEDIUM') {
    return `${d.district} is showing above-average post-harvest losses at ${loss}%, which exceeds the 7% warning threshold. Cold chain compliance sits at ${cc}%, indicating some temperature monitoring gaps. ${d.top_crop} is the primary commodity tracked through this district. Closer monitoring and targeted extension support may help bring loss rates within range.`
  }
  return `${d.district} is performing within acceptable parameters with a ${loss}% post-harvest loss rate — below the 7% warning threshold. Cold chain compliance is strong at ${cc}%. ${d.top_crop} is the most-tracked commodity. Continue current practices and use this district as a benchmark for lower-performing areas.`
}

function districtRecommendations(d) {
  const recs = []
  if (d.loss_pct >= 12) {
    recs.push({ icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-50',
      text: `Dispatch extension officers to investigate cooperative dispatch and handover procedures in ${d.district}. A ${d.loss_pct}% loss rate requires immediate attention.` })
    recs.push({ icon: TrendingDown,  color: 'text-danger-600', bg: 'bg-danger-50',
      text: 'Review transporter vehicle conditions and loading practices on routes out of this district — transit loss is the most common driver at this loss level.' })
  } else if (d.loss_pct >= 7) {
    recs.push({ icon: TrendingDown, color: 'text-warning-600', bg: 'bg-warning-50',
      text: `Loss rate is above the 7% warning threshold. Set a 60-day improvement target to bring ${d.district} below 7% through targeted cooperative support.` })
    recs.push({ icon: AlertTriangle, color: 'text-warning-600', bg: 'bg-warning-50',
      text: 'Check whether losses are concentrated in one or two cooperatives or spread across the district — use Performance Rankings to find the specific drivers.' })
  } else {
    recs.push({ icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-50',
      text: `${d.district} is performing well below the warning threshold. Document what's working and share those practices with higher-loss districts.` })
  }
  recs.push({ icon: Package, color: 'text-primary-600', bg: 'bg-primary-50',
    text: `${d.top_crop} is the most-tracked commodity here. Ensure seasonal storage and transport capacity are planned ahead of peak harvest periods.` })
  recs.push({ icon: Lightbulb, color: 'text-indigo-600', bg: 'bg-indigo-50',
    text: 'Open Performance Rankings and filter by this district to see exactly which cooperatives are pulling the average up or down.' })
  return recs
}

function DistrictDetailPanel({ district, onClose }) {
  const s    = STATUS_STYLE[district.status] || STATUS_STYLE.LOW
  const recs = districtRecommendations(district)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4 sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-primary-600 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900">{district.district} District</h2>
            </div>
            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${s.badge}`}>
              {district.status} RISK
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 border-2 ${s.border} bg-white`}>
              <p className="text-xs text-gray-500 mb-1 font-medium">Post-Harvest Loss</p>
              <p className={`text-3xl font-bold ${s.lossText}`}>{district.loss_pct}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {district.loss_pct >= 12 ? 'Critical — above 12%' : district.loss_pct >= 7 ? 'Elevated — above 7%' : 'Within safe range'}
              </p>
            </div>
            <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1 font-medium">Volume Dispatched</p>
              <p className="text-3xl font-bold text-gray-800">{district.volume_tons}</p>
              <p className="text-xs text-gray-400 mt-1">tons across {district.batch_count} batch{district.batch_count !== 1 ? 'es' : ''}</p>
            </div>
            <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1 font-medium">Primary Commodity</p>
              <p className="text-lg font-bold text-gray-800">{district.top_crop}</p>
              <p className="text-xs text-gray-400 mt-1">Highest batch count in this district</p>
            </div>
            <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1 font-medium">Batches Recorded</p>
              <p className="text-3xl font-bold text-gray-800">{district.batch_count}</p>
              <p className="text-xs text-gray-400 mt-1">Total dispatches tracked</p>
            </div>
          </div>

          {/* Narrative analysis */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Analysis</p>
            <p className="text-sm text-gray-700 leading-relaxed">{districtNarrative(district)}</p>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Recommended Actions</p>
            <div className="space-y-2.5">
              {recs.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${r.bg}`}>
                  <r.icon className={`w-4 h-4 shrink-0 mt-0.5 ${r.color}`} />
                  <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Loss rate visual context */}
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Loss Rate in Context</p>
            <div className="space-y-2">
              {[
                { label: `${district.district} (this district)`, value: district.loss_pct, highlight: true },
                { label: 'National warning threshold', value: 7,   color: '#f39c12' },
                { label: 'National critical threshold', value: 12,  color: '#C00000' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-44 shrink-0">{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (row.value / 20) * 100)}%`,
                        backgroundColor: row.color ?? (row.value >= 12 ? '#C00000' : row.value >= 7 ? '#e67e22' : '#228b52'),
                        opacity: row.highlight ? 1 : 0.5,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-10 text-right shrink-0">{row.value}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function DistrictPerformancePage() {
  const [districts, setDistricts]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)

  useEffect(() => {
    analyticsApi.getMinagriDistricts()
      .then(r => setDistricts(r.data))
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" /> Loading district data…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">District Performance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Per-district supply chain loss rates and compliance metrics · click any row for a full breakdown</p>
      </div>

      {/* Performance table */}
      <div className="card overflow-hidden">
        <h2 className="font-semibold text-gray-900 mb-4">District Performance Overview</h2>
        {districts.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            No batch data available yet. District performance will populate as batches are dispatched.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['District', 'Loss Rate', 'Volume (tons)', 'Batches', 'Top Commodity', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {districts.map(d => {
                  const s = STATUS_STYLE[d.status] || STATUS_STYLE.LOW
                  return (
                    <tr
                      key={d.district}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelected(d)}
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 text-sm">{d.district}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`font-bold text-sm ${s.lossText}`}>{d.loss_pct}%</span>
                      </td>
                      <td className="py-4 pr-4 text-sm text-gray-700">{d.volume_tons} tons</td>
                      <td className="py-4 pr-4 text-sm text-gray-500">{d.batch_count}</td>
                      <td className="py-4 pr-4 text-sm text-gray-700">{d.top_crop}</td>
                      <td className="py-4 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.badge}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(d) }}
                          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* District Risk Overview */}
      {districts.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">District Risk Overview</h2>
          <p className="text-xs text-gray-400 mb-4">Colour indicates loss rate severity — click any card to see the full breakdown</p>
          <div className="grid grid-cols-5 gap-4">
            {districts.slice(0, 10).map(d => (
              <div
                key={d.district}
                className={`rounded-2xl p-6 text-center cursor-pointer hover:opacity-90 transition-opacity ${heatmapCardStyle(d.loss_pct)}`}
                onClick={() => setSelected(d)}
              >
                <p className="font-semibold text-sm mb-2">{d.district}</p>
                <p className="text-3xl font-bold">{d.loss_pct}%</p>
                <p className="text-xs mt-1 opacity-75">{d.batch_count} batch{d.batch_count !== 1 ? 'es' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DistrictDetailPanel district={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
