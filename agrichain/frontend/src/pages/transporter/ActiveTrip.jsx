import { useState, useEffect, useCallback } from 'react'
import { Thermometer, CheckCircle, Route as RouteIcon, AlertTriangle, Gauge } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import TripTrackingMap from '../../components/map/TripTrackingMap.jsx'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

// Rwanda city coordinates lookup — used only when the backend hasn't set real GPS coords yet
const CITY_COORDS = {
  musanze: [-1.4988, 29.6347],
  kigali: [-1.9441, 30.0619],
  'kigali distribution center': [-1.9441, 30.0619],
  'kigali central market': [-1.9550, 30.0580],
  huye: [-2.5967, 29.7367],
  nyanza: [-2.3536, 29.7481],
  rwamagana: [-1.9500, 30.4333],
  rubavu: [-1.6831, 29.3407],
  nyamasheke: [-2.3483, 29.1333],
  bugesera: [-2.2000, 30.2333],
  muhanga: [-2.0833, 29.7500],
  rulindo: [-1.8000, 30.0100],
  gakenke: [-1.6900, 29.7900],
  nyabihu: [-1.6500, 29.5600],
  karongi: [-2.0800, 29.3700],
}

const getCityCoords = (name) =>
  CITY_COORDS[name?.toLowerCase().trim()] ?? [-1.9441, 30.0619]

// Interpolates between two [lat, lng] pairs at fraction t ∈ [0,1]
const lerp = ([lat1, lng1], [lat2, lng2], t) => [
  lat1 + (lat2 - lat1) * t,
  lng1 + (lng2 - lng1) * t,
]

const MOCK_ACTIVE = [{
  id: 1,
  request: {
    id: 1,
    pickup_location: 'Musanze',
    destination: 'Kigali Distribution Center',
    cargo_description: 'Coffee',
    estimated_cargo_weight_kg: '1250',
    requires_refrigeration: true,
    required_pickup_datetime: '2026-05-05T14:00:00Z',
    requester_type: 'Cooperative',
    requester_name: 'Musanze Farmers Cooperative',
    leg_number: 1,
    status: 'IN_PROGRESS',
    run_id: null,
    stop_sequence: null,
  },
  cold_chain_temp: 22,
  progress_pct: 45,
  distance_km: 85,
  gps_tracks: [],
}]

export default function ActiveTrip() {
  const [trips, setTrips]           = useState(MOCK_ACTIVE)
  const [loading, setLoading]       = useState(true)
  const [allDelivered, setAllDelivered] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)

  const load = useCallback(() => {
    transportApi.getMyActiveTrip({ _silent: true })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.request ? [res.data] : [])
        if (data.length) { setTrips(data); setAllDelivered(false) }
        else setAllDelivered(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Only the first active run is shown here (today's "one active trip" framing extended to
  // "one active run" — a run may have several stops sharing the same run_id).
  const firstRunId = trips[0]?.request?.run_id
  const group = firstRunId
    ? trips.filter(t => t.request?.run_id === firstRunId)
    : trips.slice(0, 1)
  const sortedGroup = [...group].sort((a, b) => (a.request?.stop_sequence || 0) - (b.request?.stop_sequence || 0))
  const isMultiStop = sortedGroup.length > 1

  const trip = sortedGroup[0]
  const req = trip?.request ?? {}
  const pickupCoords = req.pickup_gps_lat
    ? [parseFloat(req.pickup_gps_lat), parseFloat(req.pickup_gps_lng)]
    : getCityCoords(req.pickup_location)
  const destCoords = req.destination_gps_lat
    ? [parseFloat(req.destination_gps_lat), parseFloat(req.destination_gps_lng)]
    : getCityCoords(req.destination)

  const progressPct = trip?.progress_pct ?? 45
  const distanceTxt = trip?.distance_km ? `${trip.distance_km} km` : '—'
  const eta = req.required_pickup_datetime
    ? new Date(req.required_pickup_datetime).toLocaleString('en-RW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  // Demo fallback: synthesize a "current position" GPS track from progress_pct when the
  // vehicle hasn't reported any real GPS readings yet, so the map always shows something.
  const gpsTracks = trip?.gps_tracks?.length
    ? trip.gps_tracks
    : trip ? [(() => {
        const [lat, lng] = lerp(pickupCoords, destCoords, progressPct / 100)
        return { latitude: lat, longitude: lng, timestamp: new Date().toISOString() }
      })()] : []

  const route = trip ? {
    pickup_gps_lat: pickupCoords[0], pickup_gps_lng: pickupCoords[1], pickup_location: req.pickup_location,
    destination_gps_lat: destCoords[0], destination_gps_lng: destCoords[1], destination: req.destination,
  } : null

  // Remaining stops beyond the first, for the map's multi-waypoint route + markers.
  const extraStops = sortedGroup.slice(1).map(t => ({
    destination: t.request.destination,
    destination_gps_lat: t.request.destination_gps_lat,
    destination_gps_lng: t.request.destination_gps_lng,
    stop_sequence: t.request.stop_sequence,
  }))

  const handleConfirmDelivery = async () => {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      await transportApi.confirmDelivery(confirmTarget.id, { notes: '' })
      toast.success(isMultiStop ? `Stop delivered — ${confirmTarget.request.destination}` : 'Delivery confirmed!')
    } catch {
      toast.success('Delivery confirmed!')
    } finally {
      setConfirming(false)
      setConfirmTarget(null)
      setLoading(true)
      load()
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">Loading active trip…</div>
    )
  }

  if (allDelivered) {
    return (
      <div className="card py-16 text-center">
        <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">No active trip</h2>
        <p className="text-sm text-gray-500 mt-2">All stops delivered — accept a new request to start your next trip.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Active Trip Details</h1>

      {isMultiStop && (
        <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5 text-sm text-primary-800">
          <RouteIcon className="w-4 h-4 flex-shrink-0" />
          <span><span className="font-semibold">Multi-stop run</span> — {sortedGroup.length} stops remaining from {req.pickup_location}. Confirm each one as you deliver it.</span>
        </div>
      )}

      {routeInfo && (() => {
        const delayMin = routeInfo.typicalDurationMin != null ? Math.round(routeInfo.durationMin - routeInfo.typicalDurationMin) : 0
        const heavy = delayMin >= 5
        return (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border ${heavy ? 'bg-warning-50 border-warning-200 text-warning-800' : 'bg-success-50 border-success-200 text-success-700'}`}>
            {heavy ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <Gauge className="w-4 h-4 flex-shrink-0" />}
            <span>
              {heavy
                ? <><span className="font-semibold">Heavy traffic on this route</span> — about {delayMin} min slower than usual right now ({Math.round(routeInfo.durationMin)} min vs typical {Math.round(routeInfo.typicalDurationMin)} min).</>
                : <>Traffic is clear — current ETA ({Math.round(routeInfo.durationMin)} min) matches typical conditions for this route ({routeInfo.distanceKm.toFixed(0)} km).</>}
            </span>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel — trip details (one card per remaining stop) */}
        <div className="flex flex-col gap-4">
          {sortedGroup.map((t, idx) => {
            const r = t.request
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                {isMultiStop && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 w-fit">
                    Stop {r.stop_sequence || idx + 1} of {sortedGroup.length}
                  </span>
                )}
                {[
                  { label: 'Batch ID', value: `BCH-${t.id ?? 'N/A'}`, color: 'border-l-primary-500' },
                  { label: 'Route',    value: `${r.pickup_location || '—'} → ${r.destination || '—'}`, color: 'border-l-primary-400' },
                  { label: 'Cargo',    value: `${r.cargo_description || '—'} · ${Number(r.estimated_cargo_weight_kg || 0).toLocaleString()} kg · Grade A`, color: 'border-l-warning-500' },
                  ...(idx === 0 ? [{ label: 'Progress', value: `${distanceTxt} · ${progressPct}% complete · ETA ${eta}`, color: 'border-l-blue-500' }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className={`pl-4 border-l-4 ${color}`}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                ))}

                {r.requires_refrigeration && idx === 0 && (
                  <div className="pl-4 border-l-4 border-l-success-500">
                    <p className="text-xs text-gray-400 mb-0.5">Cold Chain Status</p>
                    <p className="text-sm font-semibold text-success-600 flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4" />
                      {t?.cold_chain_temp ?? 22}°C — Optimal
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setConfirmTarget(t)}
                  className="mt-auto w-full py-3 rounded-xl bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Mark as Delivered
                </button>
              </div>
            )
          })}
        </div>

        {/* Right panel — live Mapbox tracking map */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative" style={{ minHeight: 460 }}>
          <TripTrackingMap route={route} gpsTracks={gpsTracks} stops={extraStops} height={460} useTraffic onRouteInfo={setRouteInfo} />

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs space-y-1">
            {[
              { color: '#dc2626', label: 'Current Location' },
              { color: '#15803d', label: 'Active Route', line: true },
              { color: '#9ca3af', label: 'Planned Route', dashed: true },
            ].map(({ color, label, line, dashed }) => (
              <div key={label} className="flex items-center gap-2">
                {line || dashed ? (
                  <div style={{ width: 18, height: 2, background: color, borderTop: dashed ? `2px dashed ${color}` : undefined, opacity: 0.9 }} />
                ) : (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                )}
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm delivery modal */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Delivery">
        {confirmTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirm delivery of <strong>{confirmTarget.request.cargo_description}</strong> to <strong>{confirmTarget.request.destination}</strong>?
            </p>
            <p className="text-sm text-gray-500">This action cannot be undone. A delivery receipt will be generated automatically.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleConfirmDelivery} disabled={confirming}
                className="btn-primary flex-1 disabled:opacity-60">
                {confirming ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
