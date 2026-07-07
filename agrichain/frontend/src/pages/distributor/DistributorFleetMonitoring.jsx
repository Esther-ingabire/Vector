import { useState, useEffect, useCallback } from 'react'
import { Thermometer, AlertTriangle, CheckCircle, Truck, Navigation, Loader } from 'lucide-react'
import MapboxMap from '../../components/map/MapboxMap.jsx'
import { distributionApi } from '../../api/distribution.js'

// Pulsing marker for a live vehicle position
function BlinkingVehicle({ color, label }) {
  return (
    <div style={{ position: 'relative' }}>
      <span className="absolute inset-0 -m-2.5 rounded-full opacity-60 animate-ping" style={{ background: color }} />
      <div className="relative w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style={{ background: color }}>
        <Truck className="w-3 h-3 text-white" />
      </div>
      {label && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-lg px-2 py-1 text-xs font-medium shadow-md border border-gray-100 whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  )
}

export default function DistributorFleetMonitoring() {
  const [trips, setTrips]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    distributionApi.getFleetMonitoring({ _silent: true })
      .then(res => setTrips(res.data || []))
      .catch(() => setTrips([]))
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  // Poll every 10s for live GPS/temperature updates
  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  const breachCount   = trips.filter(t => t.is_breach).length
  const activeCount   = trips.length
  const incidentCount = trips.reduce((n, t) => n + (t.open_incidents || 0), 0)

  // Build Mapbox markers from GPS data
  const markers = trips
    .filter(t => t.latest_gps_lat && t.latest_gps_lng)
    .map(t => ({
      id: t.trip_id,
      lng: parseFloat(t.latest_gps_lng),
      lat: parseFloat(t.latest_gps_lat),
      element: (
        <BlinkingVehicle
          color={t.is_breach ? '#dc2626' : '#15803d'}
          label={t.driver_name}
        />
      ),
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Live GPS positions and cold-chain temperature for your registered vehicles currently on active trips.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{loading ? '…' : activeCount}</p>
            <p className="text-sm text-gray-500">Active trips</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${breachCount > 0 ? 'bg-danger-50' : 'bg-success-50'}`}>
            <Thermometer className={`w-5 h-5 ${breachCount > 0 ? 'text-danger-500' : 'text-success-500'}`} />
          </div>
          <div>
            <p className={`text-xl font-bold ${breachCount > 0 ? 'text-danger-600' : 'text-gray-900'}`}>{loading ? '…' : breachCount}</p>
            <p className="text-sm text-gray-500">Temperature breaches</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${incidentCount > 0 ? 'bg-warning-50' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${incidentCount > 0 ? 'text-warning-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-xl font-bold ${incidentCount > 0 ? 'text-warning-600' : 'text-gray-900'}`}>{loading ? '…' : incidentCount}</p>
            <p className="text-sm text-gray-500">Open incidents</p>
          </div>
        </div>
      </div>

      {/* Live map */}
      {markers.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-gray-900">Live Vehicle Positions</span>
            <span className="ml-auto text-xs text-gray-400">Updates every 10 seconds</span>
          </div>
          <MapboxMap markers={markers} style={{ height: 380 }} />
        </div>
      )}

      {/* Trip list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader className="w-5 h-5 animate-spin mr-2" /> Loading fleet data…
        </div>
      ) : trips.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No active trips right now</p>
          <p className="text-sm mt-1">
            Your registered vehicles will appear here when they have an accepted trip in progress.
            Register drivers and vehicles under <strong>Transporters</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(t => (
            <div key={t.trip_id} className={`card flex items-center gap-5 ${t.is_breach ? 'border-l-4 border-l-danger-500' : ''}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${t.is_breach ? 'bg-danger-50' : 'bg-primary-50'}`}>
                <Truck className={`w-5 h-5 ${t.is_breach ? 'text-danger-600' : 'text-primary-600'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{t.driver_name || '—'}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3 h-3" />
                  {t.pickup_location} → {t.destination}
                </p>
              </div>

              {/* Temperature */}
              <div className="text-right flex-shrink-0">
                {t.latest_temperature != null ? (
                  <>
                    <p className={`text-xl font-bold ${t.is_breach ? 'text-danger-600' : 'text-success-600'}`}>
                      {t.latest_temperature}°C
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.is_breach ? `${t.breach_count} breach${t.breach_count !== 1 ? 'es' : ''}` : 'Within threshold'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No IoT sensor</p>
                )}
              </div>

              {/* Status badges */}
              <div className="flex-shrink-0 flex flex-col gap-1 items-end">
                {t.is_breach ? (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-danger-50 text-danger-600 border border-danger-200">
                    <AlertTriangle className="w-3 h-3" /> Breach
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600 border border-success-200">
                    <CheckCircle className="w-3 h-3" /> Normal
                  </span>
                )}
                {t.open_incidents > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 border border-warning-200">
                    <AlertTriangle className="w-3 h-3" /> {t.open_incidents} incident{t.open_incidents !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
