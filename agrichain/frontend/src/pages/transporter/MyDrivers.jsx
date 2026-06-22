import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Truck, CheckCircle, Circle } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { transportApi } from '../../api/transport.js'
import toast from 'react-hot-toast'

const BLANK = { first_name: '', last_name: '', phone_number: '', email: '', operating_districts: '' }

export default function MyDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

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
            <div key={d.id} className="card flex items-center gap-5">
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
              <div className="flex-shrink-0">
                {d.has_active_trip ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-success-50 text-success-600">
                    <CheckCircle className="w-3.5 h-3.5" /> On active trip
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                    <Circle className="w-3.5 h-3.5" /> Idle
                  </span>
                )}
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
    </div>
  )
}
