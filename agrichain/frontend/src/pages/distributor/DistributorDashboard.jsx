import { useState, useEffect } from 'react'
import { ShoppingCart, Truck, Package, TrendingDown, Search, ChevronRight, Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { distributionApi } from '../../api/distribution.js'
import { cooperativesApi } from '../../api/cooperatives.js'

const CROP_IMAGES = {
  coffee:          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=160&fit=crop',
  tea:             'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=160&fit=crop',
  maize:           'https://images.unsplash.com/photo-1500622944204-b135684e99fd?w=400&h=160&fit=crop',
  corn:            'https://images.unsplash.com/photo-1500622944204-b135684e99fd?w=400&h=160&fit=crop',
  potatoes:        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=160&fit=crop',
  'sweet potatoes':'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&h=160&fit=crop',
  beans:           'https://images.unsplash.com/photo-1628451657124-26726ca61d75?w=400&h=160&fit=crop',
  avocados:        'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=160&fit=crop',
  tomatoes:        'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400&h=160&fit=crop',
  bananas:         'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=160&fit=crop',
  sorghum:         'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400&h=160&fit=crop',
}

// Diverse fallbacks — picked by coop ID so every card looks different
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=160&fit=crop', // vegetables market
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=160&fit=crop', // farm landscape
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=160&fit=crop', // colorful produce
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=160&fit=crop', // market baskets
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=160&fit=crop', // harvest field
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=160&fit=crop', // tropical fruits
]

function getCropImage(crops = [], coopId = 0) {
  const list = typeof crops === 'string'
    ? crops.split(',').map(s => s.trim())
    : crops
  for (const c of list) {
    const img = CROP_IMAGES[(c || '').toLowerCase()]
    if (img) return img
  }
  return FALLBACK_IMAGES[Math.abs(coopId) % FALLBACK_IMAGES.length]
}

export default function DistributorDashboard() {
  const navigate = useNavigate()
  const [coops, setCoops] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [stats, setStats] = useState({ active_orders: 0, pending_deliveries: 0, stock_tons: 0, loss_rate: 0 })
  const [searchQ, setSearchQ] = useState('')
  const [pendingAgentOrders, setPendingAgentOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      cooperativesApi.searchDirectory({}),
      distributionApi.getMyProduceRequests({}),
      distributionApi.getMyOrders({}),
    ]).then(([coopRes, reqRes, ordRes]) => {
      const coopList = coopRes.status === 'fulfilled' ? (coopRes.value.data?.results ?? coopRes.value.data ?? []) : []
      setCoops(coopList.slice(0, 3))

      const reqs = reqRes.status === 'fulfilled' ? (reqRes.value.data?.results ?? reqRes.value.data ?? []) : []
      setStats(s => ({ ...s, active_orders: reqs.length }))

      const orders = ordRes.status === 'fulfilled' ? (ordRes.value.data?.results ?? ordRes.value.data ?? []) : []
      setPendingAgentOrders(orders.filter(o => o.status === 'PENDING').length)
    }).finally(() => setLoading(false))
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
        <div className="card">
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
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-success-500" />
            <p className="text-sm text-gray-500">Stock on Hand</p>
          </div>
          <p className="text-3xl font-bold text-success-600">{stats.stock_tons} tons</p>
        </div>
        <div className="card">
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
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : coops.length === 0 ? (
            <div className="col-span-3 py-10 text-center text-gray-400 text-sm">No cooperatives in the directory yet.</div>
          ) : null}
          {!loading && coops.map(coop => (
            <div key={coop.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-primary-300 hover:shadow-md transition-all">
              <div className="w-full h-28 overflow-hidden bg-gray-100">
                <img
                  src={coop.image_url || getCropImage(coop.crops_specialised, coop.id)}
                  alt={coop.crops_specialised?.[0] || 'Produce'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGES[Math.abs(coop.id || 0) % FALLBACK_IMAGES.length] }}
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
                  className="block w-full text-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 transition-colors">
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
                    className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 transition-colors">
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
