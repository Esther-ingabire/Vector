import { useState, useEffect } from 'react'
import { Navigation } from 'lucide-react'
import MapboxMap from './MapboxMap.jsx'
import { fetchDrivingRoute } from '../../lib/mapbox.js'

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

const getCityCoords = (name) => CITY_COORDS[name?.toLowerCase().trim()] ?? [-1.9441, 30.0619]

function Dot({ color, size = 14, label, labelDir = 'bottom' }) {
  const labelPos = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    right: { top: '50%', left: '100%', transform: 'translateY(-50%)', marginLeft: 8 },
  }[labelDir]

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: color,
        border: '2.5px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      }} />
      {label && (
        <div
          className="bg-white rounded px-2 py-1 text-xs font-medium shadow border border-gray-100 whitespace-nowrap"
          style={{ position: 'absolute', ...labelPos }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

/**
 * Renders pickup → destination with a real road-following route (Mapbox Directions API) plus
 * the latest GPS-tracked position for a trip. `route` and `gpsTracks` come straight from the
 * `/traceability/batches/<id>/iot/` response.
 */
export default function TripTrackingMap({ route, gpsTracks = [], height = 320 }) {
  const [drivingRoute, setDrivingRoute] = useState(null)

  const pickupCoords = route?.pickup_gps_lat
    ? [parseFloat(route.pickup_gps_lat), parseFloat(route.pickup_gps_lng)]
    : getCityCoords(route?.pickup_location)
  const destCoords = route?.destination_gps_lat
    ? [parseFloat(route.destination_gps_lat), parseFloat(route.destination_gps_lng)]
    : getCityCoords(route?.destination)

  useEffect(() => {
    if (!route) return
    let cancelled = false
    fetchDrivingRoute([pickupCoords[1], pickupCoords[0]], [destCoords[1], destCoords[0]])
      .then(result => { if (!cancelled) setDrivingRoute(result) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, pickupCoords[0], pickupCoords[1], destCoords[0], destCoords[1]])

  if (!route) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-xl text-sm text-gray-400" style={{ height }}>
        No active route to display.
      </div>
    )
  }

  const lastTrack = gpsTracks[gpsTracks.length - 1]
  const lastGPS = lastTrack
    ? [parseFloat(lastTrack.latitude), parseFloat(lastTrack.longitude)]
    : pickupCoords

  // Real road-following route if the Directions API resolved one, else a straight fallback line.
  const plannedRoute = drivingRoute?.coordinates ?? [
    [pickupCoords[1], pickupCoords[0]],
    [destCoords[1], destCoords[0]],
  ]

  const routes = [
    { id: 'planned', coordinates: plannedRoute, color: '#9ca3af', width: 3, opacity: 0.7, ...(drivingRoute ? {} : { dashArray: [2, 2] }) },
  ]
  if (gpsTracks.length > 1) {
    routes.push({
      id: 'driven',
      coordinates: gpsTracks.map(t => [parseFloat(t.longitude), parseFloat(t.latitude)]),
      color: '#15803d',
      width: 3,
    })
  }

  const markers = [
    { id: 'pickup', lat: pickupCoords[0], lng: pickupCoords[1], element: <Dot color="#1d4ed8" label={route.pickup_location} labelDir="top" /> },
    { id: 'dest', lat: destCoords[0], lng: destCoords[1], element: <Dot color="#6b7280" size={12} label={route.destination} labelDir="bottom" /> },
  ]
  if (lastTrack) {
    markers.push({
      id: 'current', lat: lastGPS[0], lng: lastGPS[1],
      element: <Dot color="#dc2626" size={18} label={`Last update: ${new Date(lastTrack.timestamp).toLocaleTimeString()}`} labelDir="right" />,
    })
  }

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
        <Navigation className="w-3.5 h-3.5 text-success-600" />
        <span className="text-xs font-semibold text-gray-700">{lastTrack ? 'Live' : 'No GPS yet'}</span>
      </div>
      <MapboxMap markers={markers} routes={routes} height={height} fitToMarkers />
    </div>
  )
}
