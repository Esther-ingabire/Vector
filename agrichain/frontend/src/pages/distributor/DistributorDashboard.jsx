import { useState, useEffect } from 'react'
import { ShoppingCart, Truck, Package, TrendingDown, Search, ChevronRight, Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { distributionApi } from '../../api/distribution.js'
import { cooperativesApi } from '../../api/cooperatives.js'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

const CROP_IMAGES = {
  coffee:   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=160&fit=crop',
  tea:      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=160&fit=crop',
  maize:    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=160&fit=crop',
  potatoes: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=160&fit=crop',
  beans:    'https://images.unsplash.com/photo-1628451657124-26726ca61d75?w=400&h=160&fit=crop',
  avocados: 'https://images.unsplash.com/photo-1523049673857-eb18f1dca2aa?w=400&h=160&fit=crop',
  tomatoes: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400&h=160&fit=crop',
  default:  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=160&fit=crop',
}
function getCropImage(crops = []) {
  return CROP_IMAGES[(crops[0] || '').toLowerCase()] || CROP_IMAGES.default
}

const MOCK_COOPS = [
  { id: 1, name: 'Musanze Coffee Coop', crops_specialised: ['Coffee', 'Maize'], stock_tons: 24.5 },
  { id: 2, name: 'Nyanza Potato Growers', crops_specialised: ['Potatoes', 'Beans'], stock_tons: 18.0 },
  { id: 3, name: 'Kigali Tea Collective', crops_specialised: ['Tea', 'Maize'], stock_tons: 30.0 },
]

const MOCK_DELIVERIES = [
  { id: 'BCH-2026-001', cooperative: 'Musanze Coffee Coop', crop: 'Coffee', shipped_qty: '12.5 tons', eta: 'Jun 13, 14:00', status: 'IN_TRANSIT' },
  { id: 'BCH-2026-002', cooperative: 'Huye Highlands Coop', crop: 'Avocados', shipped_qty: '8.0 tons', eta: 'Jun 14, 10:00', status: 'IN_TRANSIT' },
]

const MOCK_STATS = { active_orders: 18, pending_deliveries: 7, stock_tons: 35.2, loss_rate: 1.2 }

export default function DistributorDashboard() {
  const navigate = useNavigate()
  const [coops, setCoops] = useState(MOCK_COOPS)
  const [deliveries] = useState(MOCK_DELIVERIES)
  const [stats, setStats] = useState(MOCK_STATS)
  const [searchQ, setSearchQ] = useState('')
  const [pendingAgentOrders, setPendingAgentOrders] = useState(2)

  useEffect(() => {
    cooperativesApi.searchDirectory({}).then(res => {
      const list = res.data?.results ?? res.data ?? []
      if (list.length >= 3) setCoops(list.slice(0, 3).map(c => ({ ...c, stock_tons: c.stock_tons || Math.random() * 40 + 10 })))
    }).catch(() => {})

    distributionApi.getMyProduceRequests({}).then(res => {
      const list = res.data?.results ?? res.data ?? []
      setStats(s => ({ ...s, active_orders: list.length || s.active_orders }))
    }).catch(() => {})

    distributionApi.getMyOrders({}).then(res => {
      const list = res.data?.results ?? res.data ?? []
      const pending = list.filter(o => o.status === 'PENDING').length
      if (pending) setPendingAgentOrders(pending)
    }).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/distributor/orders?q=${encodeURIComponent(searchQ)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Distributor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Pending agent orders banner */}
      {pendingAgentOrders > 0 && (
        <Link to="/distributor/agent-orders"
          className="flex items-center gap-4 px-5 py-4 bg-warning-50 border border-warning-200 rounded-2xl hover:bg-warning-100 transition-colors">
          <Bell className="w-5 h-5 text-warning-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-warning-800 flex-1">
            {pendingAgentOrders} market agent order{pendingAgentOrders > 1 ? 's' : ''} awaiting your response
          </p>
          <ChevronRight className="w-4 h-4 text-warning-400" />
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-2 border-primary-500">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-5 h-5 text-primary-500" />
            <p className="text-sm text-gray-500">Active Orders</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.active_orders}</p>
        </div>
        <div className="card border-2 border-blue-400">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-gray-500">Pending Deliveries</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending_deliveries}</p>
        </div>
        <div className="card border-2 border-success-500">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-success-500" />
            <p className="text-sm text-gray-500">Stock on Hand</p>
          </div>
          <p className="text-3xl font-bold text-success-600">{stats.stock_tons} tons</p>
        </div>
        <div className="card border-2 border-warning-400">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-warning-400" />
            <p className="text-sm text-gray-500">Loss Rate</p>
          </div>
          <p className="text-3xl font-bold text-warning-600">{stats.loss_rate}%</p>
        </div>
      </div>

      {/* Cooperative Directory Quick Search */}
      <div className="card space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Cooperative Directory <span className="text-gray-400 font-normal">(Quick Search)</span></h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} className="input flex-1" placeholder="Search cooperatives..." />
          <button type="submit" className="btn-primary px-4 flex items-center gap-2">
            <Search className="w-4 h-4" />
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coops.map(coop => (
            <div key={coop.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-primary-300 hover:shadow-md transition-all">
              <div className="w-full h-28 overflow-hidden bg-gray-100">
                <img
                  src={coop.image_url || getCropImage(coop.crops_specialised)}
                  alt={coop.crops_specialised?.[0] || 'Produce'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = CROP_IMAGES.default }}
                />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-semibold text-gray-900">{coop.name}</p>
                <p className="text-sm text-gray-500">{coop.crops_specialised?.slice(0, 3).join(', ')}</p>
                <p className="text-sm font-medium text-success-600">
                  Stock: {typeof coop.stock_tons === 'number' ? coop.stock_tons.toFixed(1) : '—'} tons
                </p>
                <Link
                  to={`/distributor/orders?coop=${coop.id}`}
                  className="block w-full text-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                  Send Request
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-right">
          <Link to="/distributor/orders" className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1 justify-end">
            View full cooperative directory <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Incoming Deliveries table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Incoming Deliveries</h2>
          <Link to="/distributor/deliveries" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              {['Batch ID', 'Cooperative', 'Crop', 'Quantity', 'ETA', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deliveries.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{d.id}</td>
                <td className="px-6 py-4 text-gray-700">{d.cooperative}</td>
                <td className="px-6 py-4 text-gray-700">{d.crop}</td>
                <td className="px-6 py-4 text-gray-700">{d.shipped_qty}</td>
                <td className="px-6 py-4 text-gray-500">{d.eta}</td>
                <td className="px-6 py-4">
                  <Link to="/distributor/deliveries"
                    className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                    Confirm Receipt
                  </Link>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No incoming deliveries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
