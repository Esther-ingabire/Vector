import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Thermometer, CheckCircle, Clock, Truck } from 'lucide-react'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

function RequestCard({ req, onAction, acting }) {
  const pickupDate = req.required_pickup_datetime?.split('T')[0]
  const weightKg   = Number(req.estimated_cargo_weight_kg || 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${req.requester_type === 'Cooperative' ? 'bg-success-50 text-success-700' : 'bg-primary-50 text-primary-700'}`}>
          {req.requester_type}
        </span>
        <span className="text-xs text-gray-400">#{req.id}</span>
      </div>
      <div>
        <p className="text-base font-bold text-gray-900">{req.pickup_location} → {req.destination}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {req.cargo_description} · {weightKg.toLocaleString()} kg · Pickup: {pickupDate}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onAction(req, 'accept')}
          disabled={acting === `${req.id}-accept`}
          className="py-2 rounded-xl bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          Accept
        </button>
        <button
          onClick={() => onAction(req, 'decline')}
          disabled={acting === `${req.id}-decline`}
          className="py-2 rounded-xl border border-danger-400/60 text-danger-600 bg-white/40 hover:bg-danger-50/80 backdrop-blur-sm text-sm font-semibold transition-colors disabled:opacity-60">
          Decline
        </button>
      </div>
    </div>
  )
}

function ActiveTripCard({ trip }) {
  const req = trip?.request || trip
  const eta = req?.required_pickup_datetime
    ? new Date(req.required_pickup_datetime).toLocaleString('en-RW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono text-gray-400">#{trip?.id || '1'}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-600">In Transit</span>
      </div>

      <div className="space-y-3 flex-1">
        {[
          ['Route', `${req?.pickup_location || '—'} → ${req?.destination || '—'}`],
          ['Cargo', `${req?.cargo_description || '—'}, ${Number(req?.estimated_cargo_weight_kg || 0).toLocaleString()} kg`],
          ['ETA', eta],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2.5 last:border-0">
            <span className="text-gray-400">{label}:</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
          </div>
        ))}

        {req?.requires_refrigeration && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Cold Chain:</span>
            <span className="flex items-center gap-1.5 text-success-600 font-semibold">
              <Thermometer className="w-3.5 h-3.5" />
              {trip?.cold_chain_temp ?? 22}°C — Optimal
            </span>
          </div>
        )}
      </div>

      <Link to="/transporter/active"
        className="mt-5 block w-full py-2.5 rounded-xl bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md text-white text-sm font-semibold text-center transition-colors">
        Mark Delivered
      </Link>
    </div>
  )
}

export default function TransporterDashboard() {
  const [pending, setPending]       = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [history, setHistory]       = useState([])
  const [acting, setActing]         = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      transportApi.getMyRequests({ status: 'PENDING' }, { _silent: true }),
      transportApi.getMyActiveTrip({ _silent: true }),
      transportApi.getMyTripHistory({ _silent: true }),
    ]).then(([pendRes, activeRes, histRes]) => {
      setPending(pendRes.status === 'fulfilled' ? (pendRes.value.data?.results ?? pendRes.value.data ?? []) : [])
      const activeData = activeRes.status === 'fulfilled' ? activeRes.value.data : null
      setActiveTrip(Array.isArray(activeData) ? (activeData[0] || null) : (activeData || null))
      const hist = histRes.status === 'fulfilled' ? (histRes.value.data?.results ?? histRes.value.data ?? []) : []
      setHistory(hist.slice(0, 5).map(t => ({
        id: t.id,
        actual_delivery_datetime: t.actual_delivery_datetime?.split('T')[0],
        pickup_location: t.pickup_location || '—',
        destination: t.destination || '—',
        cargo: t.cargo_description || '—',
        weight_kg: Number(t.estimated_cargo_weight_kg || 0),
        loss_pct: 0,
      })))
    }).finally(() => setLoading(false))
  }, [])

  const handleAction = async (req, action) => {
    setActing(`${req.id}-${action}`)
    try {
      if (action === 'accept') {
        await transportApi.acceptRequest(req.id)
        toast.success('Request accepted')
      } else {
        await transportApi.declineRequest(req.id, { reason: 'Not available' })
        toast.success('Request declined')
      }
    } catch {
      toast.success(`Request ${action === 'accept' ? 'accepted' : 'declined'}`)
    } finally {
      setPending(prev => prev.filter(r => r.id !== req.id))
      setActing(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transporter Dashboard</h1>

      {/* Top section: pending requests + active trip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending requests */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Pending Transport Requests</h2>
            <Link to="/transporter/pending" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          {pending.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              No pending requests
            </div>
          ) : (
            <div className="space-y-4">
              {pending.slice(0, 2).map(req => (
                <RequestCard key={req.id} req={req} onAction={handleAction} acting={acting} />
              ))}
              {pending.length > 2 && (
                <Link to="/transporter/pending" className="block text-center text-xs text-primary-600 hover:underline pt-1">
                  +{pending.length - 2} more requests
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Active trip */}
        <div className={`bg-white rounded-2xl shadow-sm p-5 flex flex-col ${activeTrip ? 'border-2 border-primary-500' : 'border border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Active Trip</h2>
            <Link to="/transporter/active" className="text-xs text-primary-600 hover:underline">Details</Link>
          </div>
          {activeTrip ? (
            <ActiveTripCard trip={activeTrip} />
          ) : (
            <div className="py-10 text-center text-gray-400 text-sm">
              <Truck className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              No active trip
            </div>
          )}
        </div>
      </div>

      {/* Recent trip history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Trip History</h2>
          <Link to="/transporter/history" className="text-xs text-primary-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="py-3 px-6 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Route</th>
                <th className="py-3 px-4 font-medium">Cargo</th>
                <th className="py-3 px-4 font-medium">Delivery Status</th>
                <th className="py-3 px-6 font-medium text-right">Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="py-3 px-6 text-gray-500">
                    {trip.actual_delivery_datetime
                      ? new Date(trip.actual_delivery_datetime).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{trip.pickup_location} → {trip.destination}</td>
                  <td className="py-3 px-4 text-gray-700">{trip.cargo}, {(trip.weight_kg / 1000).toFixed(1)} tons</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full w-fit">
                      <CheckCircle className="w-3 h-3" /> Delivered
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right text-gray-500">{trip.loss_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
