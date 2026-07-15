import { useState, useEffect } from 'react'
import { ShoppingCart, Truck, Package, TrendingDown, Search, ChevronRight, Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { distributionApi } from '../../api/distribution.js'
import { cooperativesApi } from '../../api/cooperatives.js'
import { traceabilityApi } from '../../api/traceability.js'

const CROP_POOLS = {
  maize:            ['https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=160&fit=crop'],
  corn:             ['https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=160&fit=crop'],
  tomatoes:         ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1561136594-7f68813d8f56?w=400&h=160&fit=crop'],
  tomato:           ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1561136594-7f68813d8f56?w=400&h=160&fit=crop'],
  potatoes:         ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1585164279323-bc69a7a60db6?w=400&h=160&fit=crop'],
  'sweet potatoes': ['https://images.unsplash.com/photo-1508702438698-8a7d24e2f90e?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=400&h=160&fit=crop'],
  beans:            ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=160&fit=crop'],
  avocados:         ['https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=160&fit=crop'],
  avocado:          ['https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=160&fit=crop'],
  bananas:          ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=160&fit=crop'],
  banana:           ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=160&fit=crop'],
  coffee:           ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=160&fit=crop'],
  tea:              ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=160&fit=crop'],
  sorghum:          ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=160&fit=crop'],
  rice:             ['https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=160&fit=crop'],
  cassava:          ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=160&fit=crop',
                     'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=160&fit=crop'],
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=400&h=160&fit=crop',
  'https://images.unsplash.com/photo-1435373996065-9a5e9e8e5e4f?w=400&h=160&fit=crop',
]

const PRIMARY_CROP_OVERRIDE = {
  101: 'coffee',   // Rubavu Farmers Union — Coffee, Bananas
}

function getCropImage(crops = [], coopId = 0) {
  const list = typeof crops === 'string'
    ? crops.split(',').map(s => s.trim())
    : (Array.isArray(crops) ? crops : [])

  const forcedKey = PRIMARY_CROP_OVERRIDE[coopId]
  if (forcedKey) {
    const pool = CROP_POOLS[forcedKey]
      || CROP_POOLS[Object.keys(CROP_POOLS).find(k => forcedKey.includes(k) || k.includes(forcedKey))]
    if (pool) return pool[Math.abs(coopId) % pool.length]
  }

  for (const c of list) {
    const key = (c?.name || c || '').toLowerCase().trim()
    const pool = CROP_POOLS[key]
      || CROP_POOLS[Object.keys(CROP_POOLS).find(k => key.includes(k) || k.includes(key))]
    if (pool) return pool[Math.abs(coopId) % pool.length]
  }
  return FALLBACK_IMAGES[Math.abs(coopId) % FALLBACK_IMAGES.length]
}

export default function DistributorDashboard() {
  const navigate = useNavigate()
  const [coops, setCoops] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [stats, setStats] = useState({ active_orders: 0, pending_deliveries: 0, stock_kg: 0, loss_rate: 0 })
  const [searchQ, setSearchQ] = useState('')
  const [pendingAgentOrders, setPendingAgentOrders] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      cooperativesApi.searchDirectory({}),
      distributionApi.getMyProduceRequests({}),
      distributionApi.getMyOrders({}),
      traceabilityApi.getBatches(),
    ]).then(([coopRes, reqRes, ordRes, batchRes]) => {
      const coopList = coopRes.status === 'fulfilled' ? (coopRes.value.data?.results ?? coopRes.value.data ?? []) : []
      setCoops(coopList.slice(0, 3))

      const reqs = reqRes.status === 'fulfilled' ? (reqRes.value.data?.results ?? reqRes.value.data ?? []) : []
      setStats(s => ({ ...s, active_orders: reqs.length }))

      const orders = ordRes.status === 'fulfilled' ? (ordRes.value.data?.results ?? ordRes.value.data ?? []) : []
      setPendingAgentOrders(orders.filter(o => o.status === 'PENDING').length)

      // Incoming deliveries — batches in transit to or already received by this distributor
      const batches = batchRes.status === 'fulfilled' ? (batchRes.value.data?.results ?? batchRes.value.data ?? []) : []
      const incoming = batches
        .filter(b => ['IN_TRANSIT_LEG1', 'AT_DISTRIBUTOR'].includes(b.current_status))
        .map(b => ({
          id:          b.batch_id_short || String(b.id).slice(0, 8).toUpperCase(),
          cooperative: b.cooperative_name || '—',
          crop:        b.crop_name || '—',
          shipped_qty: b.dispatch_weight_kg
            ? `${Number(b.dispatch_weight_kg).toLocaleString()} kg`
            : '—',
          eta: b.dispatch_timestamp
            ? new Date(new Date(b.dispatch_timestamp).getTime() + 2 * 24 * 60 * 60 * 1000)
                .toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })
            : '—',
          status: b.current_status,
          batch_id: b.id,
        }))
      setDeliveries(incoming.slice(0, 5))
      const stockKg = batches
        .filter(b => b.current_status === 'AT_DISTRIBUTOR')
        .reduce((sum, b) => sum + Number(b.weight_at_distributor_kg ?? b.dispatch_weight_kg ?? 0), 0)
      setStats(s => ({
        ...s,
        pending_deliveries: incoming.filter(b => b.status === 'IN_TRANSIT_LEG1').length,
        stock_kg: stockKg,
      }))
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
        <Link to="/distributor/agents?tab=orders"
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
          <p className="text-3xl font-bold text-success-600">{stats.stock_kg.toLocaleString()} kg</p>
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
                  {coop.composite_score != null
                    ? `${Math.round(coop.composite_score * 100)}% reliability · ${coop.total_batches_dispatched || 0} batches`
                    : `${coop.total_batches_dispatched || 0} batches dispatched`}
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
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-3 ${
                    d.status === 'AT_DISTRIBUTOR'
                      ? 'bg-success-50 text-success-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {d.status === 'AT_DISTRIBUTOR' ? 'Arrived' : 'In Transit'}
                  </span>
                  {d.status === 'AT_DISTRIBUTOR' ? (
                    <Link to="/distributor/deliveries"
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 transition-colors">
                      Confirm Receipt
                    </Link>
                  ) : (
                    <Link to={`/distributor/traceability?batch=${d.batch_id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-primary-600 border border-primary-300 hover:bg-primary-50 transition-colors">
                      Track on map
                    </Link>
                  )}
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
