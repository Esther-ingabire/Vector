import { useState, useEffect } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

const MOCK_REQUESTS = [
  { id: 1, requester_type: 'Cooperative', requester_name: 'Musanze Farmers Coop',     pickup_location: 'Musanze',   destination: 'Kigali',              cargo_description: 'Coffee',   estimated_cargo_weight_kg: '1250', required_pickup_datetime: '2026-05-05T09:00:00Z', requires_refrigeration: false },
  { id: 2, requester_type: 'Distributor', requester_name: 'Kigali Fresh Distributors', pickup_location: 'Kigali',    destination: 'Nyanza',              cargo_description: 'Maize',    estimated_cargo_weight_kg: '800',  required_pickup_datetime: '2026-05-06T08:00:00Z', requires_refrigeration: false },
  { id: 3, requester_type: 'Cooperative', requester_name: 'Rubavu Farmers Coop',       pickup_location: 'Rubavu',    destination: 'Kigali',              cargo_description: 'Potatoes', estimated_cargo_weight_kg: '1500', required_pickup_datetime: '2026-05-07T07:00:00Z', requires_refrigeration: false },
  { id: 4, requester_type: 'Cooperative', requester_name: 'Bugesera Agri Coop',        pickup_location: 'Bugesera',  destination: 'Nyabugogo Market',    cargo_description: 'Rice',     estimated_cargo_weight_kg: '1000', required_pickup_datetime: '2026-05-08T09:00:00Z', requires_refrigeration: false },
  { id: 5, requester_type: 'Cooperative', requester_name: 'Rwamagana Farmers',         pickup_location: 'Rwamagana', destination: 'Kimironko Market',    cargo_description: 'Beans',    estimated_cargo_weight_kg: '600',  required_pickup_datetime: '2026-05-09T06:00:00Z', requires_refrigeration: false },
  { id: 6, requester_type: 'Cooperative', requester_name: 'Nyamasheke Coop',           pickup_location: 'Nyamasheke',destination: 'Kigali',              cargo_description: 'Tea',      estimated_cargo_weight_kg: '1800', required_pickup_datetime: '2026-05-10T08:00:00Z', requires_refrigeration: false },
]

function RequestCard({ req, onAction, acting }) {
  const pickupDate = req.required_pickup_datetime
    ? new Date(req.required_pickup_datetime).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const weightKg = Number(req.estimated_cargo_weight_kg || 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${req.requester_type === 'Cooperative' ? 'bg-success-50 text-success-700' : 'bg-primary-50 text-primary-700'}`}>
          {req.requester_type}
        </span>
        <span className="text-xs text-gray-400 font-mono">REQ-TR-{String(req.id).padStart(3, '0')}</span>
      </div>

      <div>
        <p className="text-base font-bold text-gray-900">{req.pickup_location} → {req.destination}</p>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {req.cargo_description} · {weightKg.toLocaleString()} kg · Pickup: {pickupDate}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onAction(req, 'accept')}
          disabled={!!acting}
          className="py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {acting === `${req.id}-accept` ? 'Accepting…' : 'Accept'}
        </button>
        <button
          onClick={() => onAction(req, 'decline')}
          disabled={!!acting}
          className="py-2.5 rounded-xl border-2 border-danger-500 text-danger-500 hover:bg-danger-50 text-sm font-semibold transition-colors disabled:opacity-60">
          {acting === `${req.id}-decline` ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </div>
  )
}

export default function PendingRequests() {
  const [requests, setRequests] = useState(MOCK_REQUESTS)
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null)

  useEffect(() => {
    transportApi.getMyRequests({ status: 'PENDING' }, { _silent: true })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        if (data.length) setRequests(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
      setRequests(prev => prev.filter(r => r.id !== req.id))
      setActing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Transport requests awaiting your response.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="card py-16 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No pending requests</p>
          <p className="text-gray-400 text-sm mt-1">New transport requests will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map(req => (
            <RequestCard key={req.id} req={req} onAction={handleAction} acting={acting} />
          ))}
        </div>
      )}
    </div>
  )
}
