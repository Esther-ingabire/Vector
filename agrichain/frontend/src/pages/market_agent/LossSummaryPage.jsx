import { useEffect, useState } from 'react'
import { TrendingDown, Trash2, AlertTriangle, Truck, CheckCircle } from 'lucide-react'
import { marketAgentApi } from '../../api/marketAgent.js'

export default function LossSummaryPage() {
  const [analytics, setAnalytics] = useState(null)
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      marketAgentApi.getMyAnalytics(),
      marketAgentApi.getCollections(),
    ]).then(([aRes, cRes]) => {
      setAnalytics(aRes.data)
      const all = cRes.data?.results ?? cRes.data ?? []
      // High-risk = loss > 5%
      setCollections(
        all.filter(c => parseFloat(c.self_transport_loss_pct) > 5)
           .sort((a, b) => parseFloat(b.self_transport_loss_pct) - parseFloat(a.self_transport_loss_pct))
           .slice(0, 10)
      )
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      label: 'Collection Loss',
      value: analytics ? `${analytics.collection_loss_pct}%` : '—',
      color: analytics?.collection_loss_pct > 5 ? 'text-warning-500' : 'text-gray-900',
      border: 'border-warning-400',
      icon: TrendingDown,
      desc: '30-day avg transit loss (collected → arrived)',
    },
    {
      label: 'Waste Rate',
      value: analytics ? `${analytics.waste_rate_pct}%` : '—',
      color: analytics?.waste_rate_pct > 8 ? 'text-danger-600' : 'text-gray-900',
      border: 'border-danger-400',
      icon: Trash2,
      desc: '30-day avg market spoilage (discarded / total)',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loss Summary</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your 30-day loss performance across collections and market waste.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`card border-2 ${k.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">{k.label}</p>
            </div>
            <p className={`text-4xl font-bold ${k.color}`}>
              {loading ? <span className="animate-pulse text-gray-300">—</span> : k.value}
            </p>
            <p className="text-xs text-gray-400 mt-2">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* High-risk collections */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-warning-500" />
          <h2 className="text-base font-semibold text-gray-700">High-Risk Collections</h2>
          <span className="text-xs text-gray-400">(transit loss &gt; 5%)</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No high-risk collections in the last 30 days.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {collections.map((c, i) => {
              const date = new Date(c.created_at).toLocaleDateString('en-RW', { day: 'numeric', month: 'short' })
              const lossKg = (parseFloat(c.quantity_collected_kg) - parseFloat(c.quantity_arrived_at_stall_kg)).toFixed(1)
              return (
                <div key={c.id} className="flex items-center gap-2 py-3 border-b border-gray-50 last:border-0 text-sm text-gray-600 before:content-['•'] before:text-warning-400">
                  <span>
                    Collection ({date}) —{' '}
                    <span className="font-semibold text-warning-600">
                      {c.self_transport_loss_pct}% loss
                    </span>
                    {' '}({lossKg} kg in transit)
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transport advisory */}
      {!loading && analytics && (() => {
        const collectionLoss = parseFloat(analytics.collection_loss_pct) || 0
        const wasteLoss = parseFloat(analytics.waste_rate_pct) || 0
        const isHighLoss = collectionLoss > 5
        const isCriticalLoss = collectionLoss > 10

        if (!isHighLoss && wasteLoss <= 8) return null

        return (
          <div className={`card border-2 ${isCriticalLoss ? 'border-danger-300 bg-danger-50' : 'border-warning-300 bg-warning-50'}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isCriticalLoss ? 'bg-danger-100' : 'bg-warning-100'}`}>
                <Truck className={`w-5 h-5 ${isCriticalLoss ? 'text-danger-600' : 'text-warning-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold mb-1 ${isCriticalLoss ? 'text-danger-700' : 'text-warning-700'}`}>
                  {isCriticalLoss
                    ? `⚠ Critical: ${collectionLoss.toFixed(1)}% self-transport loss detected`
                    : `Transport Advisory: ${collectionLoss.toFixed(1)}% loss in self-transport`}
                </h3>
                <p className={`text-sm mb-3 ${isCriticalLoss ? 'text-danger-600' : 'text-warning-600'}`}>
                  {isCriticalLoss
                    ? 'Your self-transport losses are critically high. Switching to distributor-provided transport can significantly reduce these losses and improve your profitability.'
                    : 'Your self-transport loss exceeds the 5% threshold. Using distributor transport for future collections could reduce losses and save costs.'}
                </p>
                <div className={`rounded-lg p-3 ${isCriticalLoss ? 'bg-danger-100' : 'bg-warning-100'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isCriticalLoss ? 'text-danger-700' : 'text-warning-700'}`}>
                    What to do:
                  </p>
                  <ul className={`space-y-1 text-xs ${isCriticalLoss ? 'text-danger-600' : 'text-warning-600'}`}>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Request distributor-arranged delivery when placing your next order — select <strong>Distributor Delivery</strong> on the collection form.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      For routes over 10 km, distributor transport reduces average losses by up to 60%.
                    </li>
                    {wasteLoss > 8 && (
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        Your waste rate ({wasteLoss.toFixed(1)}%) is also high — order smaller quantities more frequently to reduce market spoilage.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
