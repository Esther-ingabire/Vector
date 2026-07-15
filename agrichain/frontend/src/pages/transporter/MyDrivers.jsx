import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Truck, CheckCircle, Circle, ChevronRight, X, Phone, Mail, MapPin, Home, Pencil, Ban, RotateCcw } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DistrictPicker from '../../components/ui/DistrictPicker.jsx'
import LocationSelect from '../../components/ui/LocationSelect.jsx'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

const BLANK = { first_name: '', last_name: '', phone_number: '', email: '', base_location: '', operating_districts: [] }

// Driver detail panel — view, edit contact/location details, and suspend/reactivate.
// No vehicle management here — vehicles are registered in Vehicle Profile and assigned
// per-job in Pending Requests.
function DriverDetailModal({ driver, onClose, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [suspending, setSuspending] = useState(false)

  if (!driver) return null
  const districts = Array.isArray(driver.operating_districts)
    ? driver.operating_districts.join(', ')
    : driver.operating_districts || '—'

  const startEdit = () => {
    setForm({
      first_name: driver.name?.split(' ')[0] || '',
      last_name: driver.name?.split(' ').slice(1).join(' ') || '',
      phone_number: driver.phone_number || '',
      email: driver.email || '',
      base_location: driver.base_location || '',
      operating_districts: Array.isArray(driver.operating_districts) ? driver.operating_districts : [],
    })
    setEditing(true)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await transportApi.updateDriver(driver.id, form)
      toast.success('Driver details updated')
      onSaved(res.data)
      setEditing(false)
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not update driver')
    } finally {
      setSaving(false)
    }
  }

  const toggleSuspend = async () => {
    setSuspending(true)
    try {
      if (driver.is_active) {
        await transportApi.suspendDriver(driver.id)
        toast.success('Driver suspended')
        onSaved({ ...driver, is_active: false })
      } else {
        const res = await transportApi.updateDriver(driver.id, { is_active: true })
        toast.success('Driver reactivated')
        onSaved(res.data)
      }
    } catch {
      toast.error('Could not update driver status')
    } finally {
      setSuspending(false)
    }
  }

  if (editing) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Edit Driver</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={saveEdit} className="space-y-4">
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
              <input className="input" required value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Base location</label>
              <LocationSelect value={form.base_location} onChange={val => setForm(f => ({ ...f, base_location: val }))} placeholder="Select base district…" />
            </div>
            <div>
              <label className="label">Operating districts</label>
              <DistrictPicker value={form.operating_districts} onChange={val => setForm(f => ({ ...f, operating_districts: val }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{driver.name}</h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {!driver.is_active && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-danger-50 text-danger-700">
                    Suspended
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  driver.has_active_trip
                    ? 'bg-success-50 text-success-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {driver.has_active_trip ? <><CheckCircle className="w-3 h-3" /> On active trip</> : <><Circle className="w-3 h-3" /> Idle</>}
                </span>
                {!driver.has_logged_in && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-warning-50 text-warning-700">
                    Not yet activated
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm">
          {driver.phone_number && (
            <div className="flex items-center gap-2.5 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {driver.phone_number}
            </div>
          )}
          {driver.email && (
            <div className="flex items-center gap-2.5 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {driver.email}
            </div>
          )}
          {driver.base_location && (
            <div className="flex items-center gap-2.5 text-gray-600">
              <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {driver.base_location}
            </div>
          )}
          {districts !== '—' && (
            <div className="flex items-start gap-2.5 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              {districts}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={startEdit} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={toggleSuspend} disabled={suspending}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold py-2.5 border transition-colors disabled:opacity-60 ${
              driver.is_active
                ? 'border-danger-300 text-danger-600 hover:bg-danger-50'
                : 'border-success-300 text-success-700 hover:bg-success-50'
            }`}>
            {suspending ? '…' : driver.is_active ? <><Ban className="w-4 h-4" /> Suspend</> : <><RotateCcw className="w-4 h-4" /> Reactivate</>}
          </button>
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

  const handleDriverSaved = (updated) => {
    setDrivers(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        base_location: form.base_location || undefined,
        operating_districts: Array.isArray(form.operating_districts)
          ? form.operating_districts
          : form.operating_districts.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await transportApi.registerDriver(payload)
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
  const idleCount   = drivers.filter(d => d.is_active !== false && !d.has_active_trip).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Drivers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Register and manage the drivers working under your company.
            Vehicles are assigned per job in Pending Requests.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Driver
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Users className="w-6 h-6 text-primary-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : drivers.length}</p>
            <p className="text-sm text-gray-500">Total drivers</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : activeCount}</p>
            <p className="text-sm text-gray-500">On active trip</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <Circle className="w-6 h-6 text-gray-400" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : idleCount}</p>
            <p className="text-sm text-gray-500">Idle / available</p>
          </div>
        </div>
      </div>

      {/* Driver list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}
        </div>
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
              className={`card flex items-center gap-5 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all ${d.is_active === false ? 'opacity-60' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{d.name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap mt-0.5">
                  {d.phone_number && <span>{d.phone_number}</span>}
                  {d.operating_districts?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {d.operating_districts.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {d.is_active === false && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger-50 text-danger-700">
                    Suspended
                  </span>
                )}
                {!d.has_logged_in && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-50 text-warning-700">
                    Not yet activated
                  </span>
                )}
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

      {/* Register driver modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setForm(BLANK) }} title="Register Driver">
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
            <label className="label">Email (for OTP activation)</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Base location</label>
            <LocationSelect value={form.base_location} onChange={val => setForm(f => ({ ...f, base_location: val }))} placeholder="Select base district…" />
          </div>
          <div>
            <label className="label">Operating districts</label>
            <DistrictPicker
              value={form.operating_districts}
              onChange={val => setForm(f => ({ ...f, operating_districts: val }))}
            />
          </div>
          <p className="text-xs text-gray-500">
            The driver gets their own login under your company name and receives an OTP to activate their account.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); setForm(BLANK) }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Registering…' : 'Register Driver'}
            </button>
          </div>
        </form>
      </Modal>

      {selectedDriver && (
        <DriverDetailModal driver={selectedDriver} onClose={() => setSelectedDriverId(null)} onSaved={handleDriverSaved} />
      )}
    </div>
  )
}
