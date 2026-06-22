import { useState, useEffect, useCallback } from 'react'
import { Warehouse, MapPin, Navigation, Plus, Clock, CheckCircle, X, List, Map as MapIcon } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import MapboxMap from '../../components/map/MapboxMap.jsx'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  PENDING: 'bg-warning-50 text-warning-600',
  ACCEPTED: 'bg-success-50 text-success-600',
  DECLINED: 'bg-danger-50 text-danger-600',
  ENDED: 'bg-gray-100 text-gray-500',
}

export default function RentWarehouse() {
  const [facilities, setFacilities] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [target, setTarget] = useState(null)
  const [capacity, setCapacity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('list')

  const load = useCallback((nearby = false) => {
    setLoading(true)
    Promise.allSettled([
      cooperativesApi.searchWarehouses(nearby ? { nearby: 'true' } : {}),
      cooperativesApi.getMyRentalRequests(),
    ]).then(([fRes, rRes]) => {
      if (fRes.status === 'fulfilled') setFacilities(fRes.value.data?.results ?? fRes.value.data ?? [])
      if (rRes.status === 'fulfilled') setRequests(rRes.value.data?.results ?? rRes.value.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(nearbyOnly) }, [load, nearbyOnly])

  const requestedFacilityIds = new Set(requests.filter(r => r.status !== 'DECLINED').map(r => r.facility))

  const openRequest = (facility) => {
    setTarget(facility)
    setCapacity('')
    setNotes('')
  }

  const submitRequest = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await cooperativesApi.requestWarehouseRental({
        facility: target.id,
        requested_capacity_kg: Number(capacity),
        notes,
      })
      setRequests(prev => [res.data, ...prev])
      toast.success(`Request sent to ${target.warehouse_manager_name}`)
      setTarget(null)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not send request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rent Warehouse Space</h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse cold storage facilities available to rent if you don't have your own.</p>
        </div>
        <button
          onClick={() => setNearbyOnly(v => !v)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-colors ${nearbyOnly ? 'bg-primary-500 text-white border-primary-500' : 'btn-secondary'}`}>
          <Navigation className="w-3.5 h-3.5" /> Near Me
        </button>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('list')}
            className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setView('map')}
            className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'map' ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </div>

      {view === 'map' ? (
        <MapboxMap
          height={480}
          fitToMarkers
          showSearch
          markers={facilities
            .filter(f => f.gps_latitude != null && f.gps_longitude != null)
            .map(f => ({
              id: f.id,
              lat: parseFloat(f.gps_latitude),
              lng: parseFloat(f.gps_longitude),
              color: requestedFacilityIds.has(f.id) ? '#15803d' : '#228b52',
              onClick: () => !requestedFacilityIds.has(f.id) && openRequest(f),
            }))}
        />
      ) : (
        <>
      {requests.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Rental Requests</p>
          {requests.map(r => (
            <div key={r.id} className="card py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">{r.facility_name}</p>
                <p className="text-xs text-gray-500">{Number(r.requested_capacity_kg).toLocaleString()} kg requested · {r.warehouse_manager_name}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {nearbyOnly ? 'Nearest Available Facilities' : 'Available Facilities'}
        </p>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
        ) : facilities.length === 0 ? (
          <div className="card py-16 text-center text-gray-400">
            <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No warehouses currently listed for rent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.map(f => {
              const alreadyRequested = requestedFacilityIds.has(f.id)
              return (
                <div key={f.id} className="card flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{f.name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mt-0.5">
                      <span>{Number(f.capacity_kg).toLocaleString()} kg capacity</span>
                      {f.location_description && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location_description}</span>
                      )}
                      {f.distance_km != null && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{f.distance_km} km away</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Managed by {f.warehouse_manager_name}
                      {f.rental_price_per_month && <span className="text-gray-700 font-medium"> · RWF {Number(f.rental_price_per_month).toLocaleString()}/mo</span>}
                    </p>
                  </div>
                  {alreadyRequested ? (
                    <span className="text-xs font-medium text-success-600 flex items-center gap-1 flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Requested
                    </span>
                  ) : (
                    <button
                      onClick={() => openRequest(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Request to Rent
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
        </>
      )}

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title={`Request Space — ${target?.name || ''}`}>
        {target && (
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-900">{target.name}</p>
              <p className="text-gray-500">Managed by {target.warehouse_manager_name} · {Number(target.capacity_kg).toLocaleString()} kg total capacity</p>
            </div>
            <div>
              <label className="label">Capacity needed (kg) *</label>
              <input type="number" className="input" required min="1" max={target.capacity_kg}
                value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Need space starting next week, mostly for potatoes…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
