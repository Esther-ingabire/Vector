import { Link } from 'react-router-dom'
import { TrendingUp, Package, ClipboardList, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const RECENT_PRICES = [
  { crop: 'Tomatoes', price: 850, time: '30 min ago' },
  { crop: 'Avocados', price: 1200, time: '1 hr ago' },
  { crop: 'Beans', price: 900, time: '2 hr ago' },
]

const PENDING_BATCHES = [
  { id: 'BATCH-A4F2', crop: 'Tomatoes', weight_kg: 450, eta: '10:30' },
]

export default function MarketAgentDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="card bg-gradient-to-r from-primary-700 to-primary-600 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.first_name || 'Agent'} {user?.last_name || ''}</h1>
            <p className="text-primary-200 text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Kigali Central Market
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-500 mt-1">Prices recorded today</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-sm text-gray-500 mt-1">Batches received today</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">1</p>
          <p className="text-sm text-gray-500 mt-1">Incoming delivery</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent price records */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Recent prices</h2>
            <Link to="/market-agent/prices" className="text-sm text-primary-600 hover:underline">Record new</Link>
          </div>
          <div className="space-y-3">
            {RECENT_PRICES.map(p => (
              <div key={p.crop} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-900">{p.crop}</span>
                <div className="text-right">
                  <p className="font-bold text-gray-900">RWF {p.price.toLocaleString()}/kg</p>
                  <p className="text-xs text-gray-400">{p.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming batches */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Incoming batches</h2>
            <Link to="/market-agent/batches" className="text-sm text-primary-600 hover:underline">Receive</Link>
          </div>
          {PENDING_BATCHES.length > 0 ? (
            <div className="space-y-3">
              {PENDING_BATCHES.map(b => (
                <div key={b.id} className="p-3 bg-primary-50 rounded-xl border border-primary-200">
                  <p className="font-medium text-primary-700">{b.crop} — {b.weight_kg} kg</p>
                  <p className="text-xs text-primary-500 mt-0.5">Batch {b.id} · ETA {b.eta}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No incoming deliveries</p>
          )}
        </div>
      </div>
    </div>
  )
}
