import { useEffect, useState } from 'react'
import { MapPin, Eye, Loader } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

const STATUS_STYLE = {
  HIGH:   { badge: 'bg-danger-100 text-danger-700',  lossText: 'text-danger-600'  },
  MEDIUM: { badge: 'bg-warning-50 text-warning-700', lossText: 'text-warning-600' },
  LOW:    { badge: 'bg-success-50 text-success-700', lossText: 'text-success-600' },
}

function complianceBarColor(pct) {
  if (pct >= 95) return 'bg-success-500'
  if (pct >= 88) return 'bg-warning-400'
  return 'bg-danger-500'
}

function heatmapCardStyle(loss) {
  if (loss >= 12) return 'bg-red-50 border border-red-200 text-red-700'
  if (loss >= 7)  return 'bg-yellow-50 border border-yellow-200 text-yellow-700'
  return 'bg-green-50 border border-green-200 text-green-700'
}

export default function DistrictPerformancePage() {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading]     = useState(true)

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
        <p className="text-sm text-gray-500 mt-0.5">Per-district supply chain loss rates and compliance metrics</p>
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
                  {['District', 'Loss Rate', 'Volume (tons)', 'Top Crop', 'Cold Chain Compliance', 'Status', 'Action'].map(h => (
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
                    <tr key={d.district} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 text-sm">{d.district}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`font-bold text-sm ${s.lossText}`}>{d.loss_pct}%</span>
                      </td>
                      <td className="py-4 pr-4 text-sm text-gray-700">{d.volume_tons}</td>
                      <td className="py-4 pr-4 text-sm text-gray-700">{d.top_crop}</td>
                      <td className="py-4 pr-4 w-44">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${complianceBarColor(d.cold_chain_compliance)}`}
                              style={{ width: `${d.cold_chain_compliance}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-9 text-right shrink-0">
                            {d.cold_chain_compliance}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.badge}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <button className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
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

      {/* Loss Rate Heatmap cards */}
      {districts.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Loss Rate Heatmap</h2>
          <div className="grid grid-cols-5 gap-4">
            {districts.slice(0, 10).map(d => (
              <div key={d.district} className={`rounded-2xl p-6 text-center ${heatmapCardStyle(d.loss_pct)}`}>
                <p className="font-semibold text-sm mb-2">{d.district}</p>
                <p className="text-3xl font-bold">{d.loss_pct}%</p>
                <p className="text-xs mt-1 opacity-75">{d.batch_count} batch{d.batch_count !== 1 ? 'es' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
