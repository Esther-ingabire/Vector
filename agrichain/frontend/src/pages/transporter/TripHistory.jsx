import { useState, useEffect } from 'react'
import { CheckCircle, Truck, Thermometer, AlertTriangle } from 'lucide-react'
import { transportApi } from '../../api/transport.js'

const MOCK_TRIPS = [
  { id: 1, date: '2026-05-01', pickup: 'Musanze',  dest: 'Kigali',  cargo: 'Maize',    weight_kg: 10000, cold_chain: false, breach: false, loss_pct: 0.2, status: 'COMPLETED' },
  { id: 2, date: '2026-04-28', pickup: 'Kigali',   dest: 'Nyanza',  cargo: 'Potatoes', weight_kg: 15000, cold_chain: false, breach: false, loss_pct: 0.5, status: 'COMPLETED' },
  { id: 3, date: '2026-04-25', pickup: 'Musanze',  dest: 'Kigali',  cargo: 'Coffee',   weight_kg: 8000,  cold_chain: true,  breach: false, loss_pct: 0.1, status: 'COMPLETED' },
  { id: 4, date: '2026-04-20', pickup: 'Huye',     dest: 'Kigali',  cargo: 'Beans',    weight_kg: 6000,  cold_chain: false, breach: false, loss_pct: 0.3, status: 'COMPLETED' },
  { id: 5, date: '2026-04-15', pickup: 'Rubavu',   dest: 'Kigali',  cargo: 'Tomatoes', weight_kg: 4500,  cold_chain: true,  breach: true,  loss_pct: 1.8, status: 'COMPLETED' },
]

function normaliseTrip(t) {
  return {
    id: t.id,
    date: t.actual_delivery_datetime?.split('T')[0] ?? t.date ?? '—',
    pickup: t.pickup_location ?? t.pickup ?? '—',
    dest:   t.destination     ?? t.dest   ?? '—',
    cargo:  t.cargo_description ?? t.cargo ?? '—',
    weight_kg: Number(t.estimated_cargo_weight_kg ?? t.weight_kg ?? 0),
    cold_chain: t.requires_refrigeration ?? t.cold_chain ?? false,
    breach: t.breach ?? false,
    loss_pct: t.loss_pct ?? 0,
    status: 'COMPLETED',
  }
}

export default function TripHistory() {
  const [trips, setTrips]     = useState(MOCK_TRIPS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    transportApi.getMyTripHistory({ _silent: true })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        if (data.length) setTrips(data.map(normaliseTrip))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalKg      = trips.reduce((a, t) => a + t.weight_kg, 0)
  const breachCount  = trips.filter(t => t.breach).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trip History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All completed deliveries.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 border-2 border-primary-500">
          <Truck className="w-6 h-6 text-primary-500" />
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : trips.length}</p>
            <p className="text-sm text-gray-500">Total trips</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-success-500">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : `${(totalKg / 1000).toFixed(1)} t`}</p>
            <p className="text-sm text-gray-500">Total delivered</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-warning-500">
          <AlertTriangle className="w-6 h-6 text-warning-500" />
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : breachCount}</p>
            <p className="text-sm text-gray-500">Cold chain breaches</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading trip history…</div>
        ) : trips.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No completed trips yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-3 px-6 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Route</th>
                  <th className="py-3 px-4 font-medium">Cargo</th>
                  <th className="py-3 px-4 font-medium">Delivery Status</th>
                  <th className="py-3 px-6 font-medium text-right">Loss %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-6 text-gray-500">
                      {trip.date !== '—'
                        ? new Date(trip.date).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      {trip.pickup} → {trip.dest}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      {trip.cargo}, {(trip.weight_kg / 1000).toFixed(1)} tons
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-success-600 bg-success-50 px-2.5 py-1 rounded-full w-fit">
                        <CheckCircle className="w-3 h-3" /> Delivered
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className={`text-sm font-medium ${trip.loss_pct > 1 ? 'text-danger-500' : trip.loss_pct > 0 ? 'text-warning-500' : 'text-success-600'}`}>
                        {trip.loss_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
