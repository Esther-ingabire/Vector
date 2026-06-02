import { Link } from 'react-router-dom'
import { Truck, Thermometer, MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const ACTIVE = {
  batch_id: 'BATCH-A4F2',
  crop: 'Tomatoes',
  weight_kg: 450,
  origin: 'Musanze',
  destination: 'Kigali Central Market',
  cold_chain: true,
  temp: 11.2,
  temp_status: 'ok',
  eta: '10:30',
  progress: 75,
  cooperative: 'Musanze Farmers Cooperative',
}

const STATS = [
  { label: 'Trips this month', value: 8 },
  { label: 'Total kg delivered', value: '3,200 kg' },
  { label: 'On-time rate', value: '94%' },
]

export default function TransporterDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.first_name || 'Transporter'} {user?.last_name || ''}</h1>
            <p className="text-primary-200 text-sm mt-1">Vehicle: RAD 342C · Cold chain equipped</p>
          </div>
          <Truck className="w-8 h-8 text-primary-300" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active shipment */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">Active shipment</h2>
          <Link to="/transporter/active" className="text-sm text-primary-600 hover:underline">Details</Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-semibold text-gray-900">{ACTIVE.crop} — {ACTIVE.weight_kg} kg</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {ACTIVE.origin} → {ACTIVE.destination}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{ACTIVE.cooperative}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">ETA {ACTIVE.eta}</p>
            {ACTIVE.cold_chain && (
              <div className={`flex items-center gap-1 justify-end text-xs mt-1 ${ACTIVE.temp_status === 'ok' ? 'text-success-500' : 'text-danger-500'}`}>
                <Thermometer className="w-3 h-3" /> {ACTIVE.temp}°C
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{ACTIVE.origin}</span>
            <span>{ACTIVE.progress}% complete</span>
            <span>{ACTIVE.destination}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-primary-500" style={{ width: `${ACTIVE.progress}%` }} />
          </div>
        </div>

        {ACTIVE.cold_chain && ACTIVE.temp_status === 'ok' && (
          <div className="mt-3 flex items-center gap-2 text-success-500 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Cold chain temperature within safe range</span>
          </div>
        )}
      </div>

      <div className="card bg-primary-50 border border-primary-200">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-primary-700 text-sm">Reminder</p>
            <p className="text-sm text-primary-600 mt-0.5">Submit a checkpoint update when passing through Muhanga. Log temperature and GPS via the Active Shipment page.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
