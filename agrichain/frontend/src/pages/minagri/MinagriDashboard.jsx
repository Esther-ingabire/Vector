import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle, Package, Truck, BarChart2, MapPin } from 'lucide-react'
import KPICard from '../../components/ui/KPICard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import RiskBadge from '../../components/ui/RiskBadge.jsx'

const NATIONAL_KPI = [
  { title: 'Total produce tracked (tons)', value: '12,450', trend: '+8.2%', up: true },
  { title: 'Active cooperatives', value: '47', trend: '+3', up: true },
  { title: 'Active batches', value: '128', trend: '-5', up: false },
  { title: 'Open risk alerts', value: '6', trend: '+2', up: false },
]

const REGIONAL_DATA = [
  { region: 'Kigali', produce_tons: 3200, cooperatives: 8, risk: 'low' },
  { region: 'Northern (Musanze)', produce_tons: 4100, cooperatives: 12, risk: 'low' },
  { region: 'Southern (Huye)', produce_tons: 2800, cooperatives: 11, risk: 'medium' },
  { region: 'Eastern (Rwamagana)', produce_tons: 1950, cooperatives: 9, risk: 'low' },
  { region: 'Western (Rubavu)', produce_tons: 400, cooperatives: 7, risk: 'high' },
]

const RECENT_ALERTS = [
  { id: 1, type: 'Cold chain breach', region: 'Huye', severity: 'high', time: '2h ago' },
  { id: 2, type: 'Price spike — Tomatoes', region: 'Kigali', severity: 'medium', time: '4h ago' },
  { id: 3, type: 'Supply shortage forecast', region: 'Western Province', severity: 'medium', time: '6h ago' },
]

export default function MinagriDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="card bg-gradient-to-r from-primary-700 to-primary-900 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm">National Overview</p>
            <h1 className="text-2xl font-bold mt-0.5">Agricultural Supply Chain Monitor</h1>
            <p className="text-primary-200 text-sm mt-1">MINAGRI · Rwanda · {new Date().toLocaleDateString('en-RW', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-200 text-sm">Signed in as</p>
            <p className="font-semibold">{user?.first_name || 'Officer'} {user?.last_name || ''}</p>
          </div>
        </div>
      </div>

      {/* National KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {NATIONAL_KPI.map(k => (
          <div key={k.title} className="card">
            <p className="text-xs text-gray-500 mb-2">{k.title}</p>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${k.up ? 'text-success-500' : 'text-danger-500'}`}>
              {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {k.trend} vs last month
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Regional breakdown */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Regional breakdown</h2>
            <Link to="/minagri/reports" className="text-sm text-primary-600 hover:underline">Full report</Link>
          </div>
          <div className="space-y-0">
            {REGIONAL_DATA.map(r => (
              <div key={r.region} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{r.region}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{r.produce_tons.toLocaleString()} tons</span>
                  <span className="text-gray-400">{r.cooperatives} coops</span>
                  <RiskBadge risk={r.risk} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Recent alerts</h2>
            <Link to="/minagri/alerts" className="text-sm text-primary-600 hover:underline">All alerts</Link>
          </div>
          <div className="space-y-3">
            {RECENT_ALERTS.map(a => (
              <div key={a.id} className={`p-3 rounded-xl border-l-4 ${a.severity === 'high' ? 'bg-danger-50 border-l-danger-500' : 'bg-warning-50 border-l-warning-500'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${a.severity === 'high' ? 'text-danger-500' : 'text-warning-500'}`}>{a.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{a.region}</p>
                  </div>
                  <span className="text-xs text-gray-400">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
