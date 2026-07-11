import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, TrendingDown, Trash2, CheckCircle, MapPin, ShoppingBag, Plus, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { marketAgentApi } from '../../api/marketAgent.js'

export default function MarketAgentDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [recentCollections, setRecentCollections] = useState([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [activeListings, setActiveListings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      marketAgentApi.getMyAnalytics(),
      marketAgentApi.getCollections(),
      marketAgentApi.getMyOrders(),
      marketAgentApi.getNotices(),
    ]).then(([analyticsRes, collectionsRes, ordersRes, noticesRes]) => {
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data)
      if (collectionsRes.status === 'fulfilled')
        setRecentCollections((collectionsRes.value.data?.results ?? collectionsRes.value.data ?? []).slice(0, 3))
      if (ordersRes.status === 'fulfilled') {
        const orders = ordersRes.value.data?.results ?? ordersRes.value.data ?? []
        setPendingOrders(orders.filter(o => o.status === 'PENDING_CONFIRMATION').length)
      }
      if (noticesRes.status === 'fulfilled') {
        const notices = noticesRes.value.data?.results ?? noticesRes.value.data ?? []
        setActiveListings(notices.length)
      }
    }).finally(() => setLoading(false))
  }, [])

  const kpis = [
    {
      label: 'Available Listings',
      value: loading ? '—' : activeListings,
      color: 'text-gray-900',
      border: 'border-primary-500',
      icon: Bell,
      to: '/market-agent/stock',
    },
    {
      label: 'Pending Orders',
      value: loading ? '—' : pendingOrders,
      color: pendingOrders > 0 ? 'text-amber-600' : 'text-gray-900',
      border: 'border-amber-400',
      icon: Clock,
      to: '/market-agent/orders',
    },
    {
      label: 'Collection Loss',
      value: analytics ? `${analytics.collection_loss_pct}%` : '—',
      color: analytics?.collection_loss_pct > 5 ? 'text-warning-500' : 'text-gray-900',
      border: 'border-warning-400',
      icon: TrendingDown,
      to: null,
    },
    {
      label: 'Waste Rate',
      value: analytics ? `${analytics.waste_rate_pct}%` : '—',
      color: analytics?.waste_rate_pct > 8 ? 'text-danger-600' : 'text-gray-900',
      border: 'border-danger-400',
      icon: Trash2,
      to: '/market-agent/waste',
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

      {/* Ready to Order — placed above KPIs so the agent's primary action is the first thing they see */}
      <div
        className="rounded-2xl text-white p-5 flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #228b52 0%, #1a5c34 100%)' }}
      >
        <div>
          <p className="font-bold text-lg">Ready to order?</p>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Browse stock listings from your linked distributors and place orders directly.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to="/market-agent/stock"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold transition-colors hover:bg-green-50"
            style={{ color: '#1a5c34' }}>
            <Bell className="w-4 h-4" /> Browse Stock
          </Link>
          <Link to="/market-agent/orders"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors border"
            style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            <ShoppingBag className="w-4 h-4" /> My Orders
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => {
          const inner = (
            <div key={k.label} className={`card border-2 ${k.border} ${k.to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <k.icon className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-500">{k.label}</p>
              </div>
              <p className={`text-3xl font-bold ${k.color}`}>
                {loading ? <span className="animate-pulse text-gray-300">—</span> : k.value}
              </p>
            </div>
          )
          return k.to ? <Link key={k.label} to={k.to}>{inner}</Link> : <div key={k.label}>{inner}</div>
        })}
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">Recent Collections</h2>
          <Link to="/market-agent/claims" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            Record new <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentCollections.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No collections recorded yet.</p>
            <Link to="/market-agent/stock" className="text-sm text-primary-600 hover:underline mt-1 inline-block">
              Browse available stock →
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/market-agent/stock',   icon: Bell,         label: 'Browse Stock',      desc: 'See what distributors have available' },
          { to: '/market-agent/orders',  icon: ShoppingBag,  label: 'My Orders',         desc: 'Track your order status' },
          { to: '/market-agent/claims',  icon: CheckCircle,  label: 'Record Collection', desc: 'Log a pickup' },
          { to: '/market-agent/waste',   icon: Trash2,       label: 'Waste Report',      desc: 'Report end-of-day spoilage' },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="card hover:shadow-md transition-shadow border border-gray-100 hover:border-primary-200 flex items-start gap-3">
            <l.icon className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">{l.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
