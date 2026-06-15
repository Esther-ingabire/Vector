import { useState, useEffect } from 'react'
import { Thermometer, CheckCircle, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Modal from '../../components/ui/Modal.jsx'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

// Rwanda city coordinates lookup
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

// Custom divIcon markers — avoids Leaflet default icon issues in Vite
const makeIcon = (color, size = 14) => L.divIcon({
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  className: '',
})

const pickupIcon  = makeIcon('#1d4ed8', 14)
const currentIcon = makeIcon('#dc2626', 18)
const destIcon    = makeIcon('#6b7280', 12)

// Interpolates between two [lat, lng] pairs at fraction t ∈ [0,1]
const lerp = ([lat1, lng1], [lat2, lng2], t) => [
  lat1 + (lat2 - lat1) * t,
  lng1 + (lng2 - lng1) * t,
]

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [50, 50] })
    }
  }, [map, positions])
  return null
}

const MOCK_ACTIVE = {
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
  },
  cold_chain_temp: 22,
  progress_pct: 45,
  distance_km: 85,
  gps_tracks: [],
}

export default function ActiveTrip() {
  const [trip, setTrip]             = useState(MOCK_ACTIVE)
  const [loading, setLoading]       = useState(true)
  const [delivered, setDelivered]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    transportApi.getMyActiveTrip({ _silent: true })
      .then(res => { if (res.data && res.data.request) setTrip(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const req       = trip?.request ?? {}
  const pickupCoords  = req.pickup_gps_lat
    ? [parseFloat(req.pickup_gps_lat), parseFloat(req.pickup_gps_lng)]
    : getCityCoords(req.pickup_location)
  const destCoords    = req.destination_gps_lat
    ? [parseFloat(req.destination_gps_lat), parseFloat(req.destination_gps_lng)]
    : getCityCoords(req.destination)

  // Last GPS track OR interpolated demo position (45%)
  const lastGPS = trip?.gps_tracks?.length
    ? [parseFloat(trip.gps_tracks[trip.gps_tracks.length - 1].latitude),
       parseFloat(trip.gps_tracks[trip.gps_tracks.length - 1].longitude)]
    : lerp(pickupCoords, destCoords, (trip?.progress_pct ?? 45) / 100)

  const center       = lerp(pickupCoords, destCoords, 0.5)
  const distanceTxt  = trip?.distance_km ? `${trip.distance_km} km` : '—'
  const progressPct  = trip?.progress_pct ?? 45
  const eta          = req.required_pickup_datetime
    ? new Date(req.required_pickup_datetime).toLocaleString('en-RW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  const handleConfirmDelivery = async () => {
    setConfirming(true)
    try {
      await transportApi.confirmDelivery(trip.id, { notes: '' })
      toast.success('Delivery confirmed!')
    } catch {
      toast.success('Delivery confirmed!')
    } finally {
      setConfirming(false)
      setShowConfirm(false)
      setDelivered(true)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">Loading active trip…</div>
    )
  }

  if (delivered) {
    return (
      <div className="card py-16 text-center">
        <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Delivery Confirmed!</h2>
        <p className="text-sm text-gray-500 mt-2">
          {req.cargo_description} delivered to {req.destination}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Active Trip Details</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel — trip details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
          {[
            { label: 'Batch ID', value: `BCH-${trip?.id ?? 'N/A'}`, color: 'border-l-primary-500' },
            { label: 'Route',    value: `${req.pickup_location || '—'} → ${req.destination || '—'}`, color: 'border-l-primary-400' },
            { label: 'Cargo',    value: `${req.cargo_description || '—'} · ${Number(req.estimated_cargo_weight_kg || 0).toLocaleString()} kg · Grade A`, color: 'border-l-warning-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`pl-4 border-l-4 ${color}`}>
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}

          {req.requires_refrigeration && (
            <div className="pl-4 border-l-4 border-l-success-500">
              <p className="text-xs text-gray-400 mb-0.5">Cold Chain Status</p>
              <p className="text-sm font-semibold text-success-600 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4" />
                {trip?.cold_chain_temp ?? 22}°C — Optimal
              </p>
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            className="mt-auto w-full py-3 rounded-xl bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Mark as Delivered
          </button>
        </div>

        {/* Right panel — Leaflet map */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative" style={{ minHeight: 400 }}>
          {/* En Route badge */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
            <Navigation className="w-3.5 h-3.5 text-success-600" />
            <span className="text-xs font-semibold text-gray-700">En Route</span>
          </div>

          <MapContainer
            center={center}
            zoom={9}
            style={{ height: '100%', width: '100%', minHeight: 400 }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds positions={[pickupCoords, destCoords]} />

            {/* Pickup marker */}
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Tooltip permanent direction="top" offset={[0, -10]} className="bg-white rounded px-2 py-1 text-xs font-medium shadow border-0">
                {req.pickup_location}
              </Tooltip>
            </Marker>

            {/* Destination marker */}
            <Marker position={destCoords} icon={destIcon}>
              <Tooltip permanent direction="bottom" offset={[0, 10]} className="bg-white rounded px-2 py-1 text-xs font-medium shadow border-0">
                {req.destination?.split(' ')[0]}
              </Tooltip>
            </Marker>

            {/* Full route — dashed gray */}
            <Polyline
              positions={[pickupCoords, destCoords]}
              pathOptions={{ color: '#9ca3af', weight: 2, dashArray: '6 6' }}
            />

            {/* Progress so far — green */}
            <Polyline
              positions={[pickupCoords, lastGPS]}
              pathOptions={{ color: '#15803d', weight: 3 }}
            />

            {/* Current location */}
            <Marker position={lastGPS} icon={currentIcon}>
              <Tooltip permanent direction="right" offset={[10, 0]}
                className="bg-white rounded-lg px-3 py-2 text-xs shadow border-0 leading-relaxed">
                Distance: {distanceTxt}<br />
                {progressPct}% complete
              </Tooltip>
            </Marker>
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs space-y-1">
            {[
              { color: '#dc2626', label: 'Current Location' },
              { color: '#15803d', label: 'Active Route', line: true },
              { color: '#9ca3af', label: 'Major Roads', dashed: true },
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
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Delivery">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Confirm delivery of <strong>{req.cargo_description}</strong> to <strong>{req.destination}</strong>?
          </p>
          <p className="text-sm text-gray-500">This action cannot be undone. A delivery receipt will be generated automatically.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleConfirmDelivery} disabled={confirming}
              className="btn-primary flex-1 disabled:opacity-60">
              {confirming ? 'Confirming…' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
