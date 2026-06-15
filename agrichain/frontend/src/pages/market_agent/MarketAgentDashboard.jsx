import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, TrendingDown, Trash2, CheckCircle, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { marketAgentApi } from '../../api/marketAgent.js'

export default function MarketAgentDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [recentCollections, setRecentCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      marketAgentApi.getMyAnalytics(),
      marketAgentApi.getCollections(),
    ]).then(([analyticsRes, collectionsRes]) => {
      setAnalytics(analyticsRes.data)
      setRecentCollections((collectionsRes.data?.results ?? collectionsRes.data ?? []).slice(0, 3))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      label: 'Active Notices',
      value: analytics?.active_notices ?? '—',
      color: 'text-gray-900',
      border: 'border-primary-500',
      icon: Bell,
    },
    {
      label: 'Collection Loss',
      value: analytics ? `${analytics.collection_loss_pct}%` : '—',
      color: analytics?.collection_loss_pct > 5 ? 'text-warning-500' : 'text-gray-900',
      border: 'border-warning-400',
      icon: TrendingDown,
    },
    {
      label: 'Waste Rate',
      value: analytics ? `${analytics.waste_rate_pct}%` : '—',
      color: analytics?.waste_rate_pct > 8 ? 'text-danger-600' : 'text-gray-900',
      border: 'border-danger-400',
      icon: Trash2,
    },
    {
      label: 'Collections (Month)',
      value: analytics?.collections_this_month ?? '—',
      color: 'text-success-600',
      border: 'border-success-500',
      icon: CheckCircle,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Market Agent Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {user?.organization_name || 'My Market'}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`card border-2 ${k.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">{k.label}</p>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>
              {loading ? <span className="animate-pulse text-gray-300">—</span> : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">Recent Activity</h2>
          <Link to="/market-agent/claims" className="text-sm text-primary-600 hover:underline">
            Record new
          </Link>
        </div>
        {recentCollections.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No collections recorded yet.</p>
            <Link to="/market-agent/notices" className="text-sm text-primary-600 hover:underline mt-1 inline-block">
              View available notices
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCollections.map(c => {
              const date = new Date(c.created_at).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })
              const loss = c.self_transport_loss_pct != null ? `${c.self_transport_loss_pct}% loss` : 'loss not recorded'
              return (
                <div key={c.id} className="flex items-center gap-2 text-sm text-gray-600 before:content-['•'] before:text-gray-400">
                  <span>Collection recorded — {c.quantity_collected_kg} kg ({loss}) — {date}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/market-agent/notices',  label: 'View Notices',      desc: 'See available produce from distributors' },
          { to: '/market-agent/claims',   label: 'Record Collection', desc: 'Log a pickup from a distributor' },
          { to: '/market-agent/waste',    label: 'Submit Waste Report', desc: 'Report end-of-day spoilage' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="card hover:shadow-md transition-shadow border border-gray-100 hover:border-primary-200">
            <p className="font-semibold text-gray-900 text-sm">{l.label}</p>
            <p className="text-xs text-gray-400 mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
