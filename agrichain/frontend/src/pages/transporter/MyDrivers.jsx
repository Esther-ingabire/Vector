import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Truck, CheckCircle, Circle, Box, Snowflake, X, ChevronRight } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

const BLANK = { first_name: '', last_name: '', phone_number: '', email: '', operating_districts: '' }

const VEHICLE_TYPE_LABELS = {
  REFRIGERATED:   'Refrigerated Truck',
  STANDARD_TRUCK: 'Standard Truck',
  PICKUP:         'Pickup Truck',
  MOTORCYCLE:     'Motorcycle',
  MINIBUS:        'Minibus',
}

const BLANK_VEHICLE = { vehicle_type: 'STANDARD_TRUCK', plate_number: '', capacity_kg: '', operating_districts: '', has_iot_temperature: false }

function DriverProfileModal({ driver, onClose, onVehicleAdded }) {
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vForm, setVForm] = useState(BLANK_VEHICLE)
  const [saving, setSaving] = useState(false)

  if (!driver) return null

  const submitVehicle = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await transportApi.createVehicle({
        vehicle_type: vForm.vehicle_type,
        plate_number: vForm.plate_number,
        capacity_kg: Number(vForm.capacity_kg),
        operating_districts: vForm.operating_districts.split(',').map(s => s.trim()).filter(Boolean),
        has_iot_temperature: vForm.has_iot_temperature,
        transporter: driver.id,
      })
      toast.success(`Vehicle assigned to ${driver.name}`)
      setShowVehicleForm(false)
      setVForm(BLANK_VEHICLE)
      onVehicleAdded()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not assign vehicle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{driver.name}</h3>
              <p className="text-xs text-gray-400">{driver.phone_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Status</span>
            <span className={`font-medium ${driver.has_active_trip ? 'text-success-600' : 'text-gray-700'}`}>
              {driver.has_active_trip ? 'On an active trip' : 'Idle'}
            </span>
          </div>
          {driver.operating_districts?.length > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">Operating districts</span><span className="font-medium text-gray-900">{driver.operating_districts.join(', ')}</span></div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Vehicles</p>
            {!showVehicleForm && (
              <button onClick={() => setShowVehicleForm(true)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Assign Vehicle
              </button>
            )}
          </div>

          {driver.vehicles?.length > 0 ? (
            <div className="space-y-2">
              {driver.vehicles.map(v => (
                <div key={v.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                  <Box className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{v.plate_number} — {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}</p>
                    <p className="text-xs text-gray-500">{Number(v.capacity_kg).toLocaleString()} kg capacity{v.operating_districts?.length > 0 ? ` · ${v.operating_districts.join(', ')}` : ''}</p>
                  </div>
                  {v.has_iot_temperature && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
                      <Snowflake className="w-3 h-3" /> IoT
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : !showVehicleForm && (
            <p className="text-sm text-gray-400 py-2">No vehicle assigned yet.</p>
          )}

          {showVehicleForm && (
            <form onSubmit={submitVehicle} className="space-y-3 mt-3 border-t border-gray-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Vehicle Type</label>
                  <select className="input" value={vForm.vehicle_type}
                    onChange={e => setVForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                    {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Capacity (kg)</label>
                  <input type="number" min="1" required className="input" value={vForm.capacity_kg}
                    onChange={e => setVForm(f => ({ ...f, capacity_kg: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Plate Number</label>
                <input className="input" required placeholder="e.g. RAD 123A" value={vForm.plate_number}
                  onChange={e => setVForm(f => ({ ...f, plate_number: e.target.value }))} />
              </div>
              <div>
                <label className="label">Operating Districts</label>
                <input className="input" placeholder="e.g. Musanze, Kigali" value={vForm.operating_districts}
                  onChange={e => setVForm(f => ({ ...f, operating_districts: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={vForm.has_iot_temperature}
                  onChange={e => setVForm(f => ({ ...f, has_iot_temperature: e.target.checked }))} />
                Equipped with IoT temperature sensor
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowVehicleForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Assigning…' : 'Assign Vehicle'}
                </button>
              </div>
            </form>
          )}
        </div>

        <button onClick={onClose} className="btn-secondary w-full">Close</button>
      </div>
    </div>
  )
}

export default function MyDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState(null)
  const selectedDriver = drivers.find(d => d.id === selectedDriverId) || null

  const load = useCallback(() => {
    setLoading(true)
    setForbidden(false)
    transportApi.getMyDrivers({ _silent: true })
      .then(res => setDrivers(res.data?.results ?? res.data ?? []))
      .catch(err => {
        if (err.response?.status === 403) setForbidden(true)
        else toast.error('Could not load drivers.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await transportApi.registerDriver(form)
      toast.success(res.data?.message || 'Driver registered')
      setShowForm(false)
      setForm(BLANK)
      load()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not register driver')
    } finally {
      setSaving(false)
    }
  }

  if (forbidden) {
    return (
      <div className="card py-16 text-center text-gray-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">This page is only for transport company accounts.</p>
        <p className="text-sm mt-1">Individual drivers don't manage their own sub-accounts.</p>
      </div>
    )
  }

  const activeCount = drivers.filter(d => d.has_active_trip).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Fleet</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register drivers under your company and see who's on an active trip.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Driver
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <Users className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : drivers.length}</p><p className="text-sm text-gray-500">Drivers</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : activeCount}</p><p className="text-sm text-gray-500">On an active trip</p></div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No drivers registered yet.</p>
          <p className="text-sm mt-1">Register a driver so they can accept and run trips under your company.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map(d => (
            <div key={d.id} onClick={() => setSelectedDriverId(d.id)}
              className="card flex items-center gap-5 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mt-0.5">
                  <span>{d.phone_number}</span>
                  {d.operating_districts?.length > 0 && <span>{d.operating_districts.join(', ')}</span>}
                  <span>{d.vehicles?.length || 0} vehicle{d.vehicles?.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {d.has_active_trip ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-success-50 text-success-600">
                    <CheckCircle className="w-3.5 h-3.5" /> On active trip
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                    <Circle className="w-3.5 h-3.5" /> Idle
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Driver">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name *</label>
              <input className="input" required value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last name *</label>
              <input className="input" required value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Phone number *</label>
            <input className="input" required placeholder="+250 7XX XXX XXX" value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email (for OTP)</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Operating districts</label>
            <input className="input" placeholder="e.g. Musanze, Kigali" value={form.operating_districts}
              onChange={e => setForm(f => ({ ...f, operating_districts: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Comma-separated. Defaults to your company's districts if left blank.</p>
          </div>
          <p className="text-xs text-gray-500">
            The driver gets their own login under your company name. They'll receive an OTP to activate their account.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Registering…' : 'Register Driver'}
            </button>
          </div>
        </form>
      </Modal>

      {selectedDriver && (
        <DriverProfileModal driver={selectedDriver} onClose={() => setSelectedDriverId(null)} onVehicleAdded={load} />
      )}
    </div>
  )
}
