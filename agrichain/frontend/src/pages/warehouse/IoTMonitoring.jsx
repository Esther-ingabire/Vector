import { useState, useEffect, useCallback } from 'react'
import { Thermometer, Droplets, AlertTriangle, Warehouse } from 'lucide-react'
import { warehouseApi } from '../../api/warehouse.js'

export default function IoTMonitoring() {
  const [facilities, setFacilities] = useState([])
  const [readingsByFacility, setReadingsByFacility] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await warehouseApi.getMyFacilities()
      const list = res.data?.results ?? res.data ?? []
      setFacilities(list)
      const entries = await Promise.all(list.map(async f => {
        try {
          const r = await warehouseApi.getFacilityReadings(f.id, { _silent: true })
          return [f.id, r.data?.results ?? r.data ?? []]
        } catch {
          return [f.id, []]
        }
      }))
      setReadingsByFacility(Object.fromEntries(entries))
    } catch {
      setFacilities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const breachCount = facilities.filter(f => {
    const readings = readingsByFacility[f.id] || []
    return readings[0]?.is_temperature_breach || readings[0]?.is_humidity_breach
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IoT Monitoring</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live temperature and humidity readings across your facilities — keep them within safe range for the produce stored there.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Warehouse className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : facilities.length}</p><p className="text-sm text-gray-500">Facilities</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <AlertTriangle className={`w-6 h-6 ${breachCount > 0 ? 'text-danger-500' : 'text-gray-300'}`} />
          <div><p className="text-xl font-bold">{loading ? '…' : breachCount}</p><p className="text-sm text-gray-500">Out of range now</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Thermometer className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : facilities.length - breachCount}</p><p className="text-sm text-gray-500">Within range</p></div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}</div>
      ) : facilities.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No facilities registered yet.</p>
          <p className="text-sm mt-1">Add a facility under "My Facilities" to start monitoring its sensors.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {facilities.map(f => {
            const readings = readingsByFacility[f.id] || []
            const latest = readings[0]
            const breach = latest?.is_temperature_breach || latest?.is_humidity_breach
            return (
              <div key={f.id} className={`card border-l-4 ${breach ? 'border-l-danger-500' : 'border-l-success-500'}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-900">{f.name || f.facility_name}</p>
                    <p className="text-xs text-gray-500">{f.address || f.district}</p>
                  </div>
                  {!latest ? (
                    <span className="text-xs text-gray-400">No readings yet</span>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${latest.is_temperature_breach ? 'text-danger-600' : 'text-gray-800'}`}>
                        <Thermometer className="w-4 h-4" /> {latest.temperature_celsius}°C
                      </div>
                      {latest.humidity_percent != null && (
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${latest.is_humidity_breach ? 'text-danger-600' : 'text-gray-800'}`}>
                          <Droplets className="w-4 h-4" /> {latest.humidity_percent}%
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{new Date(latest.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {breach && (
                  <div className="mt-3 flex items-center gap-2 bg-danger-50 text-danger-700 text-sm font-medium px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Out of safe range — check the unit or adjust thresholds under "My Facilities".
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
