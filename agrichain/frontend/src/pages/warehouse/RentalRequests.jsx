import { useState, useEffect, useCallback } from 'react'
import { Inbox, CheckCircle, X, Clock } from 'lucide-react'
import DeclineReasonPicker from '../../components/ui/DeclineReasonPicker.jsx'
import { warehouseApi } from '../../api/warehouse.js'
import toast from 'react-hot-toast'

const RENTAL_DECLINE_REASONS = ['No availability on these dates', 'Capacity insufficient', 'Prior booking', 'Facility under maintenance']

const STATUS_STYLE = {
  PENDING: 'bg-warning-50 text-warning-600',
  ACCEPTED: 'bg-success-50 text-success-600',
  DECLINED: 'bg-danger-50 text-danger-600',
  ENDED: 'bg-gray-100 text-gray-500',
}

export default function RentalRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    warehouseApi.getRentalRequests()
      .then(res => setRequests(res.data?.results ?? res.data ?? []))
      .catch(() => toast.error('Could not load rental requests.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAccept = async (r) => {
    setActing(r.id)
    try {
      const res = await warehouseApi.acceptRentalRequest(r.id)
      setRequests(prev => prev.map(x => x.id === r.id ? res.data : x))
      toast.success(`Accepted — ${r.cooperative_name} now has access to ${r.facility_name}.`)
    } catch {
      toast.error('Could not accept request')
    } finally {
      setActing(null)
    }
  }

  const [decliningId, setDecliningId] = useState(null)

  const handleDecline = async (r, reason) => {
    setActing(r.id)
    setDecliningId(null)
    try {
      const res = await warehouseApi.declineRentalRequest(r.id, { reason: reason || 'Declined' })
      setRequests(prev => prev.map(x => x.id === r.id ? res.data : x))
      toast.success('Request declined')
    } catch {
      toast.error('Could not decline request')
    } finally {
      setActing(null)
    }
  }

  const pending = requests.filter(r => r.status === 'PENDING')
  const resolved = requests.filter(r => r.status !== 'PENDING')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rental Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cooperatives requesting to rent space in your facilities.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rental requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending ({pending.length})
              </p>
              {pending.map(r => (
                <div key={r.id}>
                  <div className="card flex items-center gap-5 border-warning-200 bg-warning-50/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{r.cooperative_name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Requested {Number(r.requested_capacity_kg).toLocaleString()} kg in <span className="font-medium">{r.facility_name}</span>
                      </p>
                      {r.requires_iot_monitoring && (
                        <p className="text-xs font-medium text-blue-600 mt-1">Requires IoT temperature/humidity monitoring</p>
                      )}
                      {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(r)}
                        disabled={acting === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      {decliningId !== r.id && (
                        <button
                          onClick={() => setDecliningId(r.id)}
                          disabled={acting === r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60">
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      )}
                    </div>
                  </div>
                  {decliningId === r.id && (
                    <div className="mt-2">
                      <DeclineReasonPicker
                        quickReasons={RENTAL_DECLINE_REASONS}
                        busy={acting === r.id}
                        onConfirm={reason => handleDecline(r, reason)}
                        onCancel={() => setDecliningId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">History</p>
              {resolved.map(r => (
                <div key={r.id} className="card flex items-center gap-5">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{r.cooperative_name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {Number(r.requested_capacity_kg).toLocaleString()} kg in <span className="font-medium">{r.facility_name}</span>
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
