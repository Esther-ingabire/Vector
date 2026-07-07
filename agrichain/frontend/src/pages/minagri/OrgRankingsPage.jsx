import { useEffect, useState } from 'react'
import { Star, Building2, Truck, Loader } from 'lucide-react'
import { analyticsApi } from '../../api/analytics.js'

const TIER_BADGE = {
  HIGH:   'bg-success-50 text-success-700',
  MEDIUM: 'bg-warning-50 text-warning-700',
  LOW:    'bg-danger-100 text-danger-700',
}

function StarScore({ score }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(score) ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-sm font-bold text-gray-900">{score}</span>
    </div>
  )
}

function RankTable({ rows, columns }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No data available yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">#</th>
            {columns.map(c => (
              <th key={c.key} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 last:pr-0">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 pr-4 text-sm text-gray-400 font-medium">{i + 1}</td>
              {columns.map(c => (
                <td key={c.key} className="py-4 pr-4">{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function OrgRankingsPage() {
  const [data, setData] = useState({ cooperatives: [], distributors: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('cooperatives')

  useEffect(() => {
    analyticsApi.getMinagriRankings()
      .then(r => setData(r.data))
      .catch(() => setData({ cooperatives: [], distributors: [] }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" /> Loading performance rankings…
      </div>
    )
  }

  const coopColumns = [
    { key: 'name', label: 'Cooperative', render: r => (
      <div>
        <p className="font-medium text-gray-800 text-sm">{r.name}</p>
        <p className="text-xs text-gray-400">{r.district}</p>
      </div>
    )},
    { key: 'score', label: 'Reliability', render: r => <StarScore score={r.score} /> },
    { key: 'on_time_dispatch_rate', label: 'On-Time Dispatch', render: r => `${r.on_time_dispatch_rate}%` },
    { key: 'quality_consistency_rate', label: 'Quality Consistency', render: r => `${r.quality_consistency_rate}%` },
    { key: 'avg_loss_pct', label: 'Avg Loss', render: r => (
      <span className={r.avg_loss_pct >= 10 ? 'text-danger-600 font-semibold' : r.avg_loss_pct >= 5 ? 'text-warning-600' : 'text-success-600'}>
        {r.avg_loss_pct}%
      </span>
    )},
    { key: 'batch_count', label: 'Batches' },
    { key: 'tier', label: 'Tier', render: r => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_BADGE[r.tier]}`}>{r.tier}</span>
    )},
  ]

  const distColumns = [
    { key: 'name', label: 'Distributor', render: r => (
      <div>
        <p className="font-medium text-gray-800 text-sm">{r.name}</p>
        <p className="text-xs text-gray-400">{r.district}</p>
      </div>
    )},
    { key: 'score', label: 'Performance', render: r => <StarScore score={r.score} /> },
    { key: 'fulfillment_rate', label: 'Order Fulfillment', render: r => `${r.fulfillment_rate}%` },
    { key: 'avg_transit_loss_pct', label: 'Avg Transit Loss', render: r => (
      <span className={r.avg_transit_loss_pct >= 10 ? 'text-danger-600 font-semibold' : r.avg_transit_loss_pct >= 5 ? 'text-warning-600' : 'text-success-600'}>
        {r.avg_transit_loss_pct}%
      </span>
    )},
    { key: 'avg_spoilage_loss_pct', label: 'Avg Spoilage', render: r => `${r.avg_spoilage_loss_pct}%` },
    { key: 'order_count', label: 'Orders' },
    { key: 'tier', label: 'Tier', render: r => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_BADGE[r.tier]}`}>{r.tier}</span>
    )},
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance Rankings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Which cooperatives and distributors are driving — or reducing — national loss, ranked by name rather than by district or crop.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'cooperatives', label: 'Cooperatives', icon: Building2, count: data.cooperatives.length },
          { id: 'distributors', label: 'Distributors', icon: Truck, count: data.distributors.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label} <span className="text-xs text-gray-400">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <h2 className="font-semibold text-gray-900 mb-4">
          {tab === 'cooperatives' ? 'Cooperative Reliability Ranking' : 'Distributor Performance Ranking'}
        </h2>
        {tab === 'cooperatives'
          ? <RankTable rows={data.cooperatives} columns={coopColumns} />
          : <RankTable rows={data.distributors} columns={distColumns} />}
      </div>

      <p className="text-xs text-gray-400">
        Cooperative reliability is recalculated weekly from on-time dispatch, quality consistency, and response rate.
        Distributor performance is computed live from order fulfillment, leg-1 transit loss on received batches, and warehouse spoilage.
      </p>
    </div>
  )
}
