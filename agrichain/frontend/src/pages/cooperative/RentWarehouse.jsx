import { useState, useEffect, useCallback } from 'react'
import { Warehouse, MapPin, Navigation, Plus, CheckCircle, List, Map as MapIcon, Star, Sparkles, Cpu, Landmark } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import MapboxMap from '../../components/map/MapboxMap.jsx'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'

// Well-known reference points — not rentable, just geographic orientation so a cooperative
// can see a facility's location relative to markets/hubs they already know.
const RWANDA_LANDMARKS = [
  { name: 'Kimironko Market',        lat: -1.9397, lng: 30.1245 },
  { name: 'Nyabugogo Market & Bus Park', lat: -1.9397, lng: 30.0511 },
  { name: 'Remera Market',           lat: -1.9540, lng: 30.1050 },
  { name: 'Kigali City Market (Downtown)', lat: -1.9495, lng: 30.0588 },
  { name: 'Musanze Town Market',     lat: -1.4988, lng: 29.6347 },
  { name: 'Huye (Butare) Market',    lat: -2.5967, lng: 29.7367 },
]

const STATUS_STYLE = {
  PENDING: 'bg-warning-50 text-warning-600',
  ACCEPTED: 'bg-success-50 text-success-600',
  DECLINED: 'bg-danger-50 text-danger-600',
  ENDED: 'bg-gray-100 text-gray-500',
}

// A facility only counts as "suggested" once it has enough of a track record to trust —
// otherwise a single lucky 5-star would outrank well-established, merely-good facilities.
const SUGGESTED_MIN_RATING = 4
const SUGGESTED_MIN_REVIEWS = 2

function RatingStars({ value, count, size = 'w-3.5 h-3.5' }) {
  if (value == null) return <span className="text-xs text-gray-400">Not yet rated</span>
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <Star className={`${size} fill-warning-400 text-warning-400`} />
      <span className="font-semibold text-gray-700">{value}</span>
      <span>({count})</span>
    </span>
  )
}

function FacilityCard({ f, alreadyRequested, onRequest }) {
  return (
    <div className="card flex items-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Warehouse className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{f.name}</p>
          <RatingStars value={f.manager_rating} count={f.manager_rating_count} />
          {f.has_iot_sensor && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              <Cpu className="w-3 h-3" /> IoT Monitored
            </span>
          )}
        </div>
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
          onClick={onRequest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Request to Rent
        </button>
      )}
    </div>
  )
}

export default function RentWarehouse() {
  const [facilities, setFacilities] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [target, setTarget] = useState(null)
  const [capacity, setCapacity] = useState('')
  const [requiresIot, setRequiresIot] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('list')
  const [ratingTarget, setRatingTarget] = useState(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

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

  // Facilities already come back sorted best-first (backend orders by manager rating desc),
  // so this is just a display split, not a re-sort.
  const suggested = facilities.filter(f => f.manager_rating >= SUGGESTED_MIN_RATING && f.manager_rating_count >= SUGGESTED_MIN_REVIEWS)
  const suggestedIds = new Set(suggested.map(f => f.id))
  const others = facilities.filter(f => !suggestedIds.has(f.id))

  const openRequest = (facility) => {
    setTarget(facility)
    setCapacity('')
    setRequiresIot(false)
    setNotes('')
  }

  const submitRequest = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await cooperativesApi.requestWarehouseRental({
        facility: target.id,
        requested_capacity_kg: Number(capacity),
        requires_iot_monitoring: requiresIot,
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

  const openRating = (req) => {
    setRatingTarget(req)
    setRatingValue(0)
    setRatingComment('')
  }

  const submitRating = async (e) => {
    e.preventDefault()
    if (!ratingValue) { toast.error('Pick a star rating first'); return }
    setSubmittingRating(true)
    try {
      await cooperativesApi.rateWarehouseRental(ratingTarget.id, { rating: ratingValue, comment: ratingComment })
      toast.success('Thanks — rating submitted')
      setRequests(prev => prev.map(r => r.id === ratingTarget.id ? { ...r, has_rating: true } : r))
      setRatingTarget(null)
      load(nearbyOnly)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit rating')
    } finally {
      setSubmittingRating(false)
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
        <>
        <MapboxMap
          height={480}
          fitToMarkers
          showSearch
          markers={[
            ...facilities
              .filter(f => f.gps_latitude != null && f.gps_longitude != null)
              .map(f => ({
                id: `facility-${f.id}`,
                lat: parseFloat(f.gps_latitude),
                lng: parseFloat(f.gps_longitude),
                color: requestedFacilityIds.has(f.id) ? '#15803d' : '#228b52',
                popup: (
                  <div className="text-xs">
                    <p className="font-semibold text-gray-900">{f.name}</p>
                    <p className="text-gray-500">{f.district}</p>
                  </div>
                ),
                onClick: () => !requestedFacilityIds.has(f.id) && openRequest(f),
              })),
            ...RWANDA_LANDMARKS.map(l => ({
              id: `landmark-${l.name}`,
              lat: l.lat,
              lng: l.lng,
              element: (
                <div className="flex flex-col items-center gap-0.5" title={l.name}>
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400 border border-white shadow" />
                </div>
              ),
              popup: (
                <div className="text-xs flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-700">{l.name}</span>
                </div>
              ),
            })),
          ]}
        />
        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> Grey dots are known market landmarks for orientation — click a green pin to request a warehouse.
        </p>
        </>
      ) : (
        <>
      {requests.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Rental Requests</p>
          {requests.map(r => (
            <div key={r.id} className="card py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{r.facility_name}</p>
                  <p className="text-xs text-gray-500">
                    {Number(r.requested_capacity_kg).toLocaleString()} kg requested · {r.warehouse_manager_name}
                    {r.requires_iot_monitoring && <span className="text-blue-600"> · IoT monitoring required</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {r.status === 'ENDED' && (
                    r.has_rating ? (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-warning-400 text-warning-400" /> Rated
                      </span>
                    ) : (
                      <button onClick={() => openRating(r)} className="text-xs font-semibold text-primary-600 hover:underline">Rate</button>
                    )
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </div>
              </div>
              {/* Show warehouse manager's decline reason when request was declined */}
              {r.status === 'DECLINED' && r.decline_reason && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-danger-600 mb-0.5">Reason for declining</p>
                  <p className="text-xs text-danger-700">{r.decline_reason}</p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Available Facilities</p>
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
        </section>
      ) : facilities.length === 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Available Facilities</p>
          <div className="card py-16 text-center text-gray-400">
            <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No warehouses currently listed for rent.</p>
          </div>
        </section>
      ) : (
        <>
          {suggested.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Suggested For You — Highly Rated
              </p>
              <div className="space-y-3">
                {suggested.map(f => (
                  <FacilityCard key={f.id} f={f} alreadyRequested={requestedFacilityIds.has(f.id)} onRequest={() => openRequest(f)} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {nearbyOnly ? 'Nearest Available Facilities' : suggested.length > 0 ? 'Other Available Facilities' : 'Available Facilities'}
            </p>
            <div className="space-y-3">
              {others.map(f => (
                <FacilityCard key={f.id} f={f} alreadyRequested={requestedFacilityIds.has(f.id)} onRequest={() => openRequest(f)} />
              ))}
            </div>
          </section>
        </>
      )}
        </>
      )}

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title={`Request Space — ${target?.name || ''}`}>
        {target && (
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-900">{target.name}</p>
              <p className="text-gray-500">Managed by {target.warehouse_manager_name} · {Number(target.capacity_kg).toLocaleString()} kg total capacity</p>
              {target.has_iot_sensor && (
                <p className="text-blue-600 flex items-center gap-1 mt-1"><Cpu className="w-3.5 h-3.5" /> This facility already has IoT monitoring installed</p>
              )}
            </div>
            <div>
              <label className="label">Capacity needed (kg) *</label>
              <input type="number" className="input" required min="0.01" step="0.01" max={target.capacity_kg}
                value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <label className="flex items-start gap-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={requiresIot}
                onChange={e => setRequiresIot(e.target.checked)} />
              <span className="text-sm text-gray-700">
                <span className="font-medium">I need IoT temperature/humidity monitoring</span> in the space I rent.
                {!target.has_iot_sensor && (
                  <span className="block text-xs text-gray-500 mt-0.5">This facility doesn't have IoT installed yet — the manager will see this requirement before accepting.</span>
                )}
              </span>
            </label>
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

      <Modal isOpen={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Rate This Warehouse">
        {ratingTarget && (
          <form onSubmit={submitRating} className="space-y-4">
            <p className="text-sm text-gray-500">
              {ratingTarget.warehouse_manager_name} — {ratingTarget.facility_name}
            </p>
            <div>
              <label className="label">How was the storage experience?</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRatingValue(n)}
                    onMouseEnter={() => setRatingHover(n)} onMouseLeave={() => setRatingHover(0)}
                    className="p-0.5 transition-transform hover:scale-110">
                    <Star className={`w-7 h-7 transition-colors ${n <= (ratingHover || ratingValue) ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Comment (optional)</label>
              <textarea className="input" rows={3} value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                placeholder="Cleanliness, temperature control, ease of access, anything worth noting…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRatingTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submittingRating} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {submittingRating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submittingRating ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
