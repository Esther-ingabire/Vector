import { useState } from 'react'
import { Truck, MapPin, Thermometer, Clock, CheckCircle } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

const MOCK_DELIVERIES = [
  {
    id: 'DEL-501', order_id: 'ORD-201', crop: 'Tomatoes', weight_kg: 500,
    transporter: 'Jean Mugisha', vehicle: 'RAD 342C', phone: '+250 788 123 456',
    origin: 'Musanze', destination: 'Kigali Central Market',
    dispatched: '2025-01-13 08:00', eta: '10:30',
    cold_chain: true, temp: 11.2, temp_status: 'ok',
    gps: 'Kigali – Nyabugogo area',
    status: 'in_transit',
    progress: 75,
  },
  {
    id: 'DEL-502', order_id: 'ORD-203', crop: 'Beans', weight_kg: 200,
    transporter: 'Marie Uwase', vehicle: 'RAC 108A', phone: '+250 722 654 321',
    origin: 'Rwamagana', destination: 'Kigali Kimironko Market',
    dispatched: '2025-01-13 07:00', eta: null,
    cold_chain: false, temp: null, temp_status: null,
    gps: 'Kigali Kimironko',
    status: 'delivered',
    progress: 100,
  },
]

function ProgressBar({ pct, color = 'bg-primary-500' }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function DeliveryTracking() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? MOCK_DELIVERIES : MOCK_DELIVERIES.filter(d => d.status === filter)
  const inTransit = MOCK_DELIVERIES.filter(d => d.status === 'in_transit').length
  const delivered = MOCK_DELIVERIES.filter(d => d.status === 'delivered').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time tracking for all incoming deliveries.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{inTransit}</p><p className="text-sm text-gray-500">In transit</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{delivered}</p><p className="text-sm text-gray-500">Delivered today</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Clock className="w-6 h-6 text-warning-500" />
          <div><p className="text-xl font-bold">0</p><p className="text-sm text-gray-500">Delayed</p></div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'in_transit', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(del => (
          <div key={del.id} className="card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-500">{del.id}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">Order {del.order_id}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{del.crop} — {del.weight_kg.toLocaleString()} kg</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{del.origin} → {del.destination}</span>
                </div>
              </div>
              <StatusBadge status={del.status} />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{del.origin}</span>
                <span>{del.status === 'delivered' ? 'Delivered ✓' : `ETA ${del.eta}`}</span>
                <span>{del.destination}</span>
              </div>
              <ProgressBar pct={del.progress} color={del.status === 'delivered' ? 'bg-success-500' : 'bg-primary-500'} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Transporter</p>
                <p className="font-medium text-gray-900 mt-0.5">{del.transporter}</p>
                <p className="text-xs text-gray-400">{del.vehicle}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">GPS location</p>
                <p className="font-medium text-gray-900 mt-0.5">{del.gps}</p>
              </div>
              {del.cold_chain ? (
                <div className={`rounded-lg p-3 ${del.temp_status === 'ok' ? 'bg-success-50' : 'bg-danger-50'}`}>
                  <p className={`text-xs ${del.temp_status === 'ok' ? 'text-success-500' : 'text-danger-500'}`}>Cold chain</p>
                  <p className={`font-medium mt-0.5 flex items-center gap-1 ${del.temp_status === 'ok' ? 'text-success-500' : 'text-danger-500'}`}>
                    <Thermometer className="w-3 h-3" /> {del.temp}°C
                  </p>
                  <p className="text-xs mt-0.5">{del.temp_status === 'ok' ? 'Within range' : 'Alert!'}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Cold chain</p>
                  <p className="font-medium text-gray-900 mt-0.5">Not required</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
