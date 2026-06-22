import { useState, useEffect } from 'react'
import { Navigation, MapPin, Truck } from 'lucide-react'
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

function labelStyle(labelDir) {
  return {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    right: { top: '50%', left: '100%', transform: 'translateY(-50%)', marginLeft: 8 },
  }[labelDir]
}

function Label({ children, labelDir }) {
  if (!children) return null
  return (
    <div
      className="bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md border border-gray-100 whitespace-nowrap"
      style={{ position: 'absolute', ...labelStyle(labelDir) }}
    >
      {children}
    </div>
  )
}

/** A proper map pin (teardrop) for a fixed point — pickup, destination, or a stop. */
function PinMarker({ color, label, labelDir = 'bottom', filled = true }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))', transform: 'translateY(-50%)' }}>
        <MapPin
          className="w-8 h-8"
          color={filled ? 'white' : color}
          fill={filled ? color : 'none'}
          strokeWidth={filled ? 1.5 : 2.5}
        />
      </div>
      <Label labelDir={labelDir}>{label}</Label>
    </div>
  )
}

/** The vehicle's current live position — pulsing ring so it reads as "moving/live" at a glance. */
function VehicleMarker({ label, labelDir = 'right' }) {
  return (
    <div style={{ position: 'relative' }}>
      <span className="absolute inset-0 -m-2 rounded-full bg-danger-400 opacity-60 animate-ping" />
      <div className="relative w-7 h-7 rounded-full bg-danger-600 border-2 border-white shadow-lg flex items-center justify-center">
        <Truck className="w-3.5 h-3.5 text-white" />
      </div>
      <Label labelDir={labelDir}>{label}</Label>
    </div>
  )
}

/**
 * Renders pickup → destination with a real road-following route (Mapbox Directions API) plus
 * the latest GPS-tracked position for a trip. `route` and `gpsTracks` come straight from the
 * `/traceability/batches/<id>/iot/` response.
 *
 * Optional `stops`: an array of extra stops beyond `route.destination` for a multi-stop run
 * (each `{ destination, destination_gps_lat, destination_gps_lng, stop_sequence, delivered }`).
 * When provided, the route is drawn as one continuous multi-waypoint path (pickup → stop 1 →
 * stop 2 → ...) instead of a single pickup-to-destination leg.
 */
export default function TripTrackingMap({ route, gpsTracks = [], height = 460, stops = [], useTraffic = false, onRouteInfo = null }) {
  const [drivingRoute, setDrivingRoute] = useState(null)

  const pickupCoords = route?.pickup_gps_lat
    ? [parseFloat(route.pickup_gps_lat), parseFloat(route.pickup_gps_lng)]
    : getCityCoords(route?.pickup_location)
  const destCoords = route?.destination_gps_lat
    ? [parseFloat(route.destination_gps_lat), parseFloat(route.destination_gps_lng)]
    : getCityCoords(route?.destination)

  // All stops in order: the route's own destination first, then any additional multi-stop legs.
  const allStops = [
    { destination: route?.destination, lat: destCoords[0], lng: destCoords[1], delivered: route?.delivered },
    ...stops.map(s => ({
      destination: s.destination,
      lat: s.destination_gps_lat ? parseFloat(s.destination_gps_lat) : getCityCoords(s.destination)[0],
      lng: s.destination_gps_lng ? parseFloat(s.destination_gps_lng) : getCityCoords(s.destination)[1],
      delivered: s.delivered,
    })),
  ]
  const waypointKey = allStops.map(s => `${s.lat},${s.lng}`).join('|')

  useEffect(() => {
    if (!route) return
    let cancelled = false
    const waypoints = [[pickupCoords[1], pickupCoords[0]], ...allStops.map(s => [s.lng, s.lat])]
    fetchDrivingRoute(waypoints, undefined, useTraffic ? 'driving-traffic' : 'driving')
      .then(result => { if (!cancelled) { setDrivingRoute(result); onRouteInfo?.(result) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, pickupCoords[0], pickupCoords[1], waypointKey])

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
    ...allStops.map(s => [s.lng, s.lat]),
  ]

  const routes = [
    { id: 'planned', coordinates: plannedRoute, color: '#60a5fa', width: 5, opacity: 0.9, ...(drivingRoute ? {} : { dashArray: [2, 2] }) },
  ]
  if (gpsTracks.length > 1) {
    routes.push({
      id: 'driven',
      coordinates: gpsTracks.map(t => [parseFloat(t.longitude), parseFloat(t.latitude)]),
      color: '#15803d',
      width: 5,
    })
  }

  const markers = [
    { id: 'pickup', lat: pickupCoords[0], lng: pickupCoords[1], element: <PinMarker color="#1d4ed8" label={route.pickup_location} labelDir="top" /> },
    ...allStops.map((s, i) => ({
      id: `stop-${i}`,
      lat: s.lat, lng: s.lng,
      element: <PinMarker color={s.delivered ? '#15803d' : '#6b7280'}
        label={allStops.length > 1 ? `Stop ${i + 1} — ${s.destination}${s.delivered ? ' ✓' : ''}` : s.destination}
        labelDir="bottom" />,
    })),
  ]
  if (lastTrack) {
    markers.push({
      id: 'current', lat: lastGPS[0], lng: lastGPS[1],
      element: <VehicleMarker label={`Last update: ${new Date(lastTrack.timestamp).toLocaleTimeString()}`} labelDir="right" />,
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
