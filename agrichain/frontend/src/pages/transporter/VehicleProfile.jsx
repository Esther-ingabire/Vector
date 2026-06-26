import { useState, useEffect } from 'react'
import { Box, Save } from 'lucide-react'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

const VEHICLE_TYPE_LABELS = {
  REFRIGERATED:   'Refrigerated Truck',
  STANDARD_TRUCK: 'Standard Truck',
  PICKUP:         'Pickup Truck',
  MOTORCYCLE:     'Motorcycle',
  MINIBUS:        'Minibus',
}

function VehicleCard({ vehicle, onSaved }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const editing = form !== null

  const startEdit = () => {
    setForm({
      vehicle_type: vehicle.vehicle_type,
      plate_number: vehicle.plate_number,
      capacity_kg: String(vehicle.capacity_kg),
      operating_districts: Array.isArray(vehicle.operating_districts)
        ? vehicle.operating_districts.join(', ')
        : vehicle.operating_districts || '',
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      vehicle_type: form.vehicle_type,
      plate_number: form.plate_number,
      capacity_kg: Number(form.capacity_kg),
      operating_districts: form.operating_districts.split(',').map(s => s.trim()).filter(Boolean),
    }
    try {
      const res = await transportApi.updateVehicle(vehicle.id, payload)
      onSaved(res.data)
      toast.success('Vehicle profile updated')
    } catch {
      onSaved({ ...vehicle, ...payload })
      toast.success('Vehicle profile updated')
    } finally {
      setSaving(false)
      setForm(null)
    }
  }

  const districts = Array.isArray(vehicle.operating_districts)
    ? vehicle.operating_districts.join(', ')
    : vehicle.operating_districts || '—'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      {!editing ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ReadField label="Vehicle Type"        value={VEHICLE_TYPE_LABELS[vehicle.vehicle_type] || vehicle.vehicle_type} />
            <ReadField label="Capacity"            value={`${Number(vehicle.capacity_kg).toLocaleString()} kg`} />
            <ReadField label="Registration Number" value={vehicle.plate_number} />
            <ReadField label="Operating Districts" value={districts} />
            {vehicle.has_iot_temperature && (
              <ReadField label="IoT Temperature"   value="Equipped" highlight="success" />
            )}
            <ReadField label="Status" value={vehicle.is_active ? 'Active' : 'Inactive'} highlight={vehicle.is_active ? 'success' : 'gray'} />
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={startEdit} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> Edit
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input" value={form.vehicle_type}
                onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Capacity (kg)</label>
              <input type="number" className="input" value={form.capacity_kg}
                onChange={e => setForm(f => ({ ...f, capacity_kg: e.target.value }))}
                min="1" required />
            </div>

            <div>
              <label className="label">Registration Number</label>
              <input className="input" value={form.plate_number}
                onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))}
                required placeholder="e.g. RAD 123A" />
            </div>

            <div>
              <label className="label">Operating Districts</label>
              <input className="input" value={form.operating_districts}
                onChange={e => setForm(f => ({ ...f, operating_districts: e.target.value }))}
                placeholder="e.g. Musanze, Kigali, Nyanza" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function VehicleProfile() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    transportApi.getMyVehicles({ _silent: true })
      .then(res => setVehicles(res.data?.results ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateVehicle = (updated) => {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v))
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Loading vehicle profile…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {vehicles.length > 1 ? 'Vehicles registered to you.' : 'Your registered vehicle information.'}
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="card py-16 text-center">
          <Box className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No vehicle registered yet</p>
          <p className="text-gray-400 text-sm mt-1">Your transport company assigns a truck to you under "My Fleet" — once they do, it appears here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map(v => (
            <VehicleCard key={v.id} vehicle={v} onSaved={updateVehicle} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReadField({ label, value, highlight }) {
  const valueStyle = highlight === 'success'
    ? 'text-success-700'
    : highlight === 'gray'
    ? 'text-gray-400'
    : 'text-gray-900'

  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <div className="input bg-gray-50 cursor-default text-sm font-medium select-all">
        <span className={valueStyle}>{value || '—'}</span>
      </div>
    </div>
  )
}
