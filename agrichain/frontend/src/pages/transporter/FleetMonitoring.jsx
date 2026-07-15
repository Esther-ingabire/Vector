import { useState, useEffect, useCallback } from 'react'
import { Thermometer, AlertTriangle, CheckCircle, Truck, Clock, Navigation } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import MapboxMap from '../../components/map/MapboxMap.jsx'
import { transportApi } from '../../api/transport.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const INCIDENT_TYPES = [
  { value: 'FLAT_TIRE', label: 'Flat Tire' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'BREAKDOWN', label: 'Vehicle Breakdown' },
  { value: 'ROAD_CLOSURE', label: 'Road Closure / Detour' },
  { value: 'OTHER', label: 'Other' },
]

// A live GPS fix blinks — it's the visual cue that this vehicle is actually reporting
// position right now, not a static pin.
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

export default function FleetMonitoring() {
  const { user } = useAuth()
  const isCompany = user?.role === 'TRANSPORT_COMPANY'

  const [trips, setTrips] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportTarget, setReportTarget] = useState(null)
  const [incidentType, setIncidentType] = useState('FLAT_TIRE')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resolving, setResolving] = useState(null)

  // `silent` skips the loading-state toggle so periodic polling doesn't flicker
  // the whole list — only the very first load shows the loading skeleton.
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    transportApi.getFleetMonitoring({ _silent: true })
      .then(res => setTrips(res.data || []))
      .catch(() => setTrips([]))
      .finally(() => { if (!silent) setLoading(false) })
    if (isCompany) {
      transportApi.getMyIncidents({}, { _silent: true })
        .then(res => {
          const all = res.data?.results ?? res.data ?? []
          setIncidents(all.filter(i => !i.resolved))
        })
        .catch(() => setIncidents([]))
    }
  }, [isCompany])

  useEffect(() => { load() }, [load])

  // Poll for fresh trip/temperature data every 10s so breaches show up live.
  useEffect(() => {
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  const submitIncident = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await transportApi.reportIncident({
        trip: reportTarget.trip_id,
        incident_type: incidentType,
        description,
      })
      toast.success('Reported — the cooperative/distributor has been notified.')
      setReportTarget(null)
      setDescription('')
      setIncidentType('FLAT_TIRE')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit incident report')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async (incident) => {
    setResolving(incident.id)
    try {
      await transportApi.resolveIncident(incident.id)
      toast.success('Marked resolved')
      setIncidents(prev => prev.filter(i => i.id !== incident.id))
      load()
    } catch {
      toast.error('Could not mark resolved')
    } finally {
      setResolving(null)
    }
  }

  const breachCount = trips.filter(t => t.is_breach).length
  const incidentCount = isCompany ? incidents.length : trips.reduce((sum, t) => sum + t.open_incidents, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isCompany
            ? 'Live GPS position and temperature readings across every driver\'s active trip, and incidents your drivers have reported.'
            : 'Live GPS position and temperature readings across active trips, and a quick way to alert the cooperative or distributor if something goes wrong on the road.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : trips.length}</p><p className="text-sm text-gray-500">Active trips</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Thermometer className={`w-6 h-6 ${breachCount > 0 ? 'text-danger-500' : 'text-success-500'}`} />
          <div><p className="text-xl font-bold">{loading ? '…' : breachCount}</p><p className="text-sm text-gray-500">Temperature breaches</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <AlertTriangle className={`w-6 h-6 ${incidentCount > 0 ? 'text-warning-500' : 'text-gray-300'}`} />
          <div><p className="text-xl font-bold">{loading ? '…' : incidentCount}</p><p className="text-sm text-gray-500">Open incidents</p></div>
        </div>
      </div>

      {!loading && trips.some(t => t.latest_gps_lat != null) && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5" /> Live Vehicle Locations
          </p>
          <MapboxMap
            height={400}
            fitToMarkers
            markers={trips
              .filter(t => t.latest_gps_lat != null && t.latest_gps_lng != null)
              .map(t => ({
                id: t.trip_id,
                lat: parseFloat(t.latest_gps_lat),
                lng: parseFloat(t.latest_gps_lng),
                element: <BlinkingVehicle color={t.is_breach ? '#dc2626' : '#15803d'} label={t.driver_name} />,
              }))}
          />
        </div>
      )}

      {isCompany && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Incidents Reported by Drivers</p>
          {incidents.length === 0 ? (
            <div className="card py-8 text-center text-gray-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No open incidents — your fleet is running clean.</p>
            </div>
          ) : (
          <div className="space-y-2">
            {incidents.map(inc => {
              const trip = trips.find(t => t.trip_id === inc.trip)
              return (
                <div key={inc.id} className="card flex items-center gap-4 border-l-4 border-l-warning-400">
                  <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{inc.incident_type_display}{trip ? ` — ${trip.driver_name}` : ''}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trip ? `${trip.pickup_location} → ${trip.destination} · ` : ''}{new Date(inc.reported_at).toLocaleString()}
                    </p>
                    {inc.description && <p className="text-xs text-gray-600 mt-1">{inc.description}</p>}
                  </div>
                  <button onClick={() => handleResolve(inc)} disabled={resolving === inc.id}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border border-success-300 text-success-700 hover:bg-success-50 transition-colors disabled:opacity-60">
                    {resolving === inc.id ? 'Resolving…' : 'Mark Resolved'}
                  </button>
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
      ) : trips.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No active trips right now.</p>
          <p className="text-sm mt-1">Vehicle readings will appear here once a trip is accepted and underway.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(t => (
            <div key={t.trip_id} className="card flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${t.is_breach ? 'bg-danger-50' : 'bg-primary-50'}`}>
                <Thermometer className={`w-5 h-5 ${t.is_breach ? 'text-danger-600' : 'text-primary-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{t.pickup_location} → {t.destination}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mt-0.5">
                  <span>{t.driver_name}</span>
                  {t.requires_refrigeration && <span className="text-info-600">Cold chain</span>}
                  {t.latest_temperature_at && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(t.latest_temperature_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {t.latest_temperature != null ? (
                  <p className={`text-lg font-bold ${t.is_breach ? 'text-danger-600' : 'text-success-600'}`}>{t.latest_temperature}°C</p>
                ) : (
                  <p className="text-xs text-gray-400">No reading yet</p>
                )}
                {t.breach_count > 0 && <p className="text-xs text-danger-500">{t.breach_count} breach{t.breach_count > 1 ? 'es' : ''} this trip</p>}
              </div>
              {t.open_incidents > 0 && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning-50 text-warning-700 flex items-center gap-1 flex-shrink-0">
                  <AlertTriangle className="w-3 h-3" /> {t.open_incidents} open
                </span>
              )}
              {!isCompany && (
                <button onClick={() => setReportTarget(t)}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border border-danger-300 text-danger-600 hover:bg-danger-50 transition-colors">
                  Report Issue
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!reportTarget} onClose={() => setReportTarget(null)} title="Report an Issue">
        {reportTarget && (
          <form onSubmit={submitIncident} className="space-y-4">
            <p className="text-sm text-gray-500">
              Reporting on the trip to <strong>{reportTarget.destination}</strong>. The cooperative or distributor who requested this leg will be notified immediately.
            </p>
            <div>
              <label className="label">Issue type</label>
              <div className="grid grid-cols-2 gap-2">
                {INCIDENT_TYPES.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setIncidentType(opt.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors text-left ${incidentType === opt.value ? 'bg-danger-500 text-white border-danger-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What happened, and any details that help them plan around the delay…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setReportTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Sending…' : 'Send Alert'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
