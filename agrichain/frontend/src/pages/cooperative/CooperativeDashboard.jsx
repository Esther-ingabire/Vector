import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Inbox, Truck, Thermometer, AlertTriangle, CheckCircle, MapPin, Star } from 'lucide-react'
import KPICard from '../../components/ui/KPICard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { cooperativesApi } from '../../api/cooperatives.js'
import { formatDistanceToNow } from 'date-fns'

const MOCK_STORAGE = [
  { name: 'Cold Store A', temp: 12.4, humidity: 68, status: 'ok', threshold: 15 },
  { name: 'Cold Store B', temp: 18.1, humidity: 72, status: 'warning', threshold: 15 },
]

const MOCK_BATCHES = [
  { id: 'A4F2...', crop: 'Tomatoes', weight: 450, transporter: 'Jean Mugisha', eta: '2h 30m', coldChain: true, temp: 11.2, gps: 'Kigali – Musanze' },
  { id: 'B7D1...', crop: 'Avocados', weight: 320, transporter: 'Marie Uwase', eta: '4h 15m', coldChain: false, temp: null, gps: 'Huye – Kigali' },
]

function StorageGauge({ facility }) {
  const pct = Math.min(100, (facility.temp / 30) * 100)
  const color = facility.status === 'ok' ? 'bg-success-500' : facility.status === 'warning' ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{facility.name}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${facility.status === 'ok' ? 'bg-success-50 text-success-500' : 'bg-warning-50 text-warning-500'}`}>{facility.status === 'ok' ? 'Normal' : 'Warning'}</span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-3xl font-bold text-gray-900">{facility.temp}°C</p>
          <p className="text-xs text-gray-500 mt-0.5">Humidity: {facility.humidity}%</p>
        </div>
        <div className="flex-1 pb-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Threshold: {facility.threshold}°C</p>
        </div>
      </div>
    </div>
  )
}

export default function CooperativeDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ stock_kg: 0, pending_requests: 0, active_batches: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cooperativesApi.getDashboardStats?.()
      .then(res => setStats(res.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="card bg-gradient-to-r from-success-500 to-success-600 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-success-100 text-sm">Cooperative</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.organization_name || 'My Cooperative'}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-success-100">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user?.district || 'District'}</span>
              <span className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? 'text-yellow-300 fill-yellow-300' : 'text-success-300'}`} />)}
                <span className="ml-1">4.0 reliability</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-success-100 text-xs">Total stock available</p>
            <p className="text-3xl font-bold">{loading ? '…' : (stats.stock_kg || 2840).toLocaleString()} kg</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Stock Available" value={loading ? '…' : (stats.stock_kg || 2840).toLocaleString()} unit="kg" icon={Package} color="success" />
        <KPICard title="Produce Requests" value={loading ? '…' : stats.pending_requests || 3} icon={Inbox} color="warning" />
        <KPICard title="Batches in Transit" value={loading ? '…' : stats.active_batches || 2} icon={Truck} color="primary" />
        <KPICard title="Storage Status" value="OK" icon={Thermometer} color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Incoming Produce Requests</h2>
            <Link to="/cooperative/produce-requests" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {[
              { distributor: 'Kigali Fresh Distributors', crop: 'Tomatoes', qty: '500 kg', grade: 'A', date: 'Jun 5', reliability: 4.5 },
              { distributor: 'Southern Produce Ltd', crop: 'Avocados', qty: '300 kg', grade: 'B', date: 'Jun 6', reliability: 3.8 },
              { distributor: 'Musanze Wholesalers', crop: 'Potatoes', qty: '1000 kg', grade: 'A', date: 'Jun 7', reliability: 4.2 },
            ].map((req, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{req.distributor}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.crop} · {req.qty} · Grade {req.grade} · Due {req.date}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= Math.floor(req.reliability) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                    <span className="text-xs text-gray-400 ml-1">{req.reliability}</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3 flex-shrink-0">
                  <button className="px-2.5 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600">Accept</button>
                  <button className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storage conditions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Storage Conditions</h2>
            <Link to="/cooperative/storage" className="text-sm text-primary-600 hover:underline">Full analytics</Link>
          </div>
          <div className="space-y-3">
            {MOCK_STORAGE.map(s => <StorageGauge key={s.name} facility={s} />)}
          </div>
          {MOCK_STORAGE.some(s => s.status !== 'ok') && (
            <div className="mt-3 p-3 bg-warning-50 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-warning-500">Cold Store B is above the Amber threshold. Monitor closely and reduce entry/exit cycles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Active batches */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Active Batches in Transit</h2>
          <Link to="/cooperative/batches" className="text-sm text-primary-600 hover:underline">All batches</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 border-b">
              <tr><th className="pb-2 pr-4">Batch ID</th><th className="pb-2 pr-4">Crop</th><th className="pb-2 pr-4">Weight</th><th className="pb-2 pr-4">Transporter</th><th className="pb-2 pr-4">Route</th><th className="pb-2 pr-4">ETA</th><th className="pb-2">Cold Chain</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_BATCHES.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-mono text-xs text-primary-600">{b.id}</td>
                  <td className="py-2.5 pr-4 font-medium">{b.crop}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{b.weight} kg</td>
                  <td className="py-2.5 pr-4 text-gray-600">{b.transporter}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{b.gps}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{b.eta}</td>
                  <td className="py-2.5">
                    {b.coldChain
                      ? <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{b.temp}°C</span>
                      : <span className="text-xs text-gray-400">Standard</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
