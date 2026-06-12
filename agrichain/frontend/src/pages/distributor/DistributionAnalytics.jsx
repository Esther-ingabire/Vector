import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, Truck, ShoppingBag, Download, Info } from 'lucide-react'
import { distributionApi } from '../../api/distribution.js'

const MOCK_COMPARISON = {
  self_collect_avg_loss_pct: 3.5,
  transporter_avg_loss_pct: 0.8,
  self_collect_batches: 14,
  transporter_batches: 22,
}

const MOCK_MONTHLY = [
  { month: 'Jan 2026', self_collect: 4.2, transporter: 0.9 },
  { month: 'Feb 2026', self_collect: 3.8, transporter: 1.1 },
  { month: 'Mar 2026', self_collect: 3.1, transporter: 0.7 },
  { month: 'Apr 2026', self_collect: 4.5, transporter: 0.8 },
  { month: 'May 2026', self_collect: 3.9, transporter: 0.6 },
  { month: 'Jun 2026', self_collect: 3.5, transporter: 0.8 },
]

const MOCK_CROP_LOSS = [
  { crop: 'Tomatoes',  batches: 8,  avg_loss_pct: 5.2, total_loss_kg: 2400 },
  { crop: 'Avocados',  batches: 6,  avg_loss_pct: 2.1, total_loss_kg: 840  },
  { crop: 'Coffee',    batches: 10, avg_loss_pct: 0.4, total_loss_kg: 120  },
  { crop: 'Potatoes',  batches: 5,  avg_loss_pct: 3.8, total_loss_kg: 950  },
  { crop: 'Beans',     batches: 7,  avg_loss_pct: 1.9, total_loss_kg: 380  },
]

// Simple SVG bar chart — no external dependency
function SimpleBarChart({ data }) {
  const maxVal = Math.max(...data.flatMap(d => [d.self_collect, d.transporter])) + 1
  const barW = 18
  const gap = 4
  const groupW = barW * 2 + gap + 20
  const chartW = data.length * groupW
  const chartH = 180

  return (
    <div className="overflow-x-auto">
      <svg width={chartW + 40} height={chartH + 50} className="block mx-auto">
        {/* Y axis labels */}
        {[0, 1, 2, 3, 4, 5].map(v => {
          const y = chartH - (v / maxVal) * chartH
          return (
            <g key={v}>
              <line x1={30} x2={chartW + 30} y1={y} y2={y} stroke="#f3f4f6" />
              <text x={26} y={y + 4} fontSize={9} fill="#9ca3af" textAnchor="end">{v}%</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const x = 30 + i * groupW
          const selfH = (d.self_collect / maxVal) * chartH
          const transH = (d.transporter / maxVal) * chartH
          return (
            <g key={i}>
              <rect x={x} y={chartH - selfH} width={barW} height={selfH} fill="rgba(245,158,11,0.75)" rx={3} />
              <rect x={x + barW + gap} y={chartH - transH} width={barW} height={transH} fill="rgba(11,43,24,0.8)" rx={3} />
              <text x={x + barW + gap / 2} y={chartH + 14} fontSize={8} fill="#6b7280" textAnchor="middle">
                {d.month.slice(0, 3)}
              </text>
            </g>
          )
        })}
        {/* Legend */}
        <rect x={30} y={chartH + 28} width={10} height={10} fill="rgba(245,158,11,0.75)" rx={2} />
        <text x={44} y={chartH + 37} fontSize={9} fill="#6b7280">Self-Collection</text>
        <rect x={130} y={chartH + 28} width={10} height={10} fill="rgba(11,43,24,0.8)" rx={2} />
        <text x={144} y={chartH + 37} fontSize={9} fill="#6b7280">Transporter</text>
      </svg>
    </div>
  )
}

function LossCard({ label, pct, batches, icon: Icon, color, textColor, borderColor, recommendation }) {
  return (
    <div className={`rounded-2xl border-2 p-6 space-y-3 ${borderColor}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="font-semibold text-gray-700">{label}</p>
      </div>
      <p className={`text-5xl font-bold ${textColor}`}>{pct}%</p>
      <p className="text-sm text-gray-500">Average loss across {batches} batches</p>
      {recommendation && (
        <p className="text-xs text-gray-600 border-t border-gray-100 pt-3 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
          {recommendation}
        </p>
      )}
    </div>
  )
}

export default function DistributionAnalytics() {
  const [comparison, setComparison] = useState(MOCK_COMPARISON)
  const [monthly] = useState(MOCK_MONTHLY)
  const [cropLoss] = useState(MOCK_CROP_LOSS)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await distributionApi.getDeliveryMethodComparison()
      const data = res.data
      if (data?.self_collect_avg_loss_pct !== undefined) setComparison(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const selfLoss = Number(comparison.self_collect_avg_loss_pct || 0).toFixed(1)
  const transLoss = Number(comparison.transporter_avg_loss_pct || 0).toFixed(1)
  const selfBetter = parseFloat(selfLoss) < parseFloat(transLoss)
  const diff = Math.abs(parseFloat(selfLoss) - parseFloat(transLoss)).toFixed(1)

  const exportCSV = () => {
    const rows = [
      ['Month', 'Self-Collection Loss %', 'Transporter Loss %'],
      ...monthly.map(m => [m.month, m.self_collect, m.transporter]),
      [],
      ['Crop', 'Batches', 'Avg Loss %', 'Total Loss (kg)'],
      ...cropLoss.map(r => [r.crop, r.batches, r.avg_loss_pct, r.total_loss_kg]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loss-comparison-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribution Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Loss comparison across delivery methods and crop performance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Loss Comparison cards — Figma layout */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Loss Comparison Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <LossCard
            label="Self-Collection Average Loss"
            pct={selfLoss}
            batches={comparison.self_collect_batches || 14}
            icon={ShoppingBag}
            color="bg-amber-50 text-amber-600"
            textColor="text-amber-500"
            borderColor="border-amber-200"
            recommendation={
              parseFloat(selfLoss) > parseFloat(transLoss)
                ? `${diff}% higher loss than transporter deliveries. Consider using transporters for longer routes.`
                : `Performing well — ${diff}% less loss than transporter method.`
            }
          />
          <LossCard
            label="Transporter Delivery Average Loss"
            pct={transLoss}
            batches={comparison.transporter_batches || 22}
            icon={Truck}
            color="bg-success-50 text-success-600"
            textColor="text-success-600"
            borderColor="border-success-200"
            recommendation={
              parseFloat(transLoss) <= parseFloat(selfLoss)
                ? `Transporter deliveries show ${diff}% less loss. Preferred for high-value or long-distance batches.`
                : `Slightly higher loss than self-collection. Review transporter performance.`
            }
          />
        </div>

        {/* Recommendation banner */}
        <div className="rounded-2xl bg-primary-50 border border-primary-200 p-5">
          <p className="text-sm font-semibold text-primary-800 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Recommendation:{' '}
            {selfBetter
              ? `Self-collection is performing better by ${diff}%. This may reflect shorter distances or better handling practices. Continue monitoring transporter routes.`
              : `Transporter deliveries result in ${diff}% less average loss. Prioritize transporter use for high-value crops like Coffee and Avocados to reduce spoilage.`}
          </p>
        </div>
      </section>

      {/* Monthly trend chart (SVG — no external dep) */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Monthly Loss Trend (2026)</h2>
          <span className="text-xs text-gray-400">Loss % by delivery method</span>
        </div>
        <SimpleBarChart data={monthly} />
      </section>

      {/* Crop-level loss table */}
      <section className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Loss by Crop</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              {['Crop', 'Batches', 'Avg Loss %', 'Total Loss (kg)', 'Risk'].map(h => (
                <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cropLoss.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{row.crop}</td>
                <td className="px-6 py-4 text-gray-600">{row.batches}</td>
                <td className={`px-6 py-4 font-bold ${row.avg_loss_pct > 4 ? 'text-warning-600' : row.avg_loss_pct > 2 ? 'text-amber-500' : 'text-success-600'}`}>
                  {row.avg_loss_pct}%
                </td>
                <td className="px-6 py-4 text-gray-700">{row.total_loss_kg.toLocaleString()} kg</td>
                <td className="px-6 py-4">
                  {row.avg_loss_pct > 4
                    ? <span className="badge badge-red">High</span>
                    : row.avg_loss_pct > 2
                    ? <span className="badge badge-amber">Medium</span>
                    : <span className="badge badge-green">Low</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
