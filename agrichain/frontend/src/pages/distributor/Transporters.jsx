import { useState, useEffect, useCallback } from 'react'
import { Plus, Users, Truck, CheckCircle, Circle, Thermometer, AlertTriangle } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DistrictPicker from '../../components/ui/DistrictPicker.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const BLANK = { first_name: '', last_name: '', phone_number: '', email: '', operating_districts: '' }

export default function Transporters() {
  const [transporters, setTransporters] = useState([])
  const [monitoring, setMonitoring] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    distributionApi.getMyFleet({ _silent: true })
      .then(res => setTransporters(res.data || []))
      .catch(() => setTransporters([]))
      .finally(() => setLoading(false))
    distributionApi.getFleetMonitoring({ _silent: true })
      .then(res => setMonitoring(res.data || []))
      .catch(() => setMonitoring([]))
  }, [])

  useEffect(() => { load() }, [load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await distributionApi.registerOwnDriver(form)
      const otp = res.data?.otp_code
      toast.success(otp ? `Transporter registered! Share this OTP with them to activate: ${otp}` : 'Transporter registered.', { duration: 12000 })
      setShowForm(false)
      setForm(BLANK)
      load()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not register transporter')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = transporters.filter(t => t.has_active_trip).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transporters</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register and monitor transporters for your own vehicles.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Transporter
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <Users className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : transporters.length}</p><p className="text-sm text-gray-500">Transporters</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : activeCount}</p><p className="text-sm text-gray-500">On an active trip</p></div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : transporters.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No transporters registered yet.</p>
          <p className="text-sm mt-1">If you own your own vehicles, register a transporter so they can run deliveries for you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transporters.map(t => (
            <div key={t.id} className="card flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{t.name}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mt-0.5">
                  <span>{t.phone_number}</span>
                  {t.operating_districts?.length > 0 && <span>{t.operating_districts.join(', ')}</span>}
                  <span>{t.vehicles?.length || 0} vehicle{t.vehicles?.length === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {t.has_active_trip ? (
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

      {monitoring.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live vehicle readings</p>
          {monitoring.map(m => (
            <div key={m.trip_id} className={`card flex items-center gap-4 ${m.is_breach ? 'border-l-4 border-l-danger-500' : ''}`}>
              <Thermometer className={`w-5 h-5 flex-shrink-0 ${m.is_breach ? 'text-danger-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.driver_name} — {m.pickup_location} → {m.destination}</p>
                {m.open_incidents > 0 && (
                  <p className="text-xs text-warning-600 flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> {m.open_incidents} open incident{m.open_incidents > 1 ? 's' : ''} reported</p>
                )}
              </div>
              {m.latest_temperature != null ? (
                <p className={`text-sm font-bold flex-shrink-0 ${m.is_breach ? 'text-danger-600' : 'text-success-600'}`}>{m.latest_temperature}°C</p>
              ) : (
                <p className="text-xs text-gray-400 flex-shrink-0">No reading yet</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Transporter">
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
            <DistrictPicker
              value={Array.isArray(form.operating_districts) ? form.operating_districts : (form.operating_districts || '').split(',').map(s => s.trim()).filter(Boolean)}
              onChange={val => setForm(f => ({ ...f, operating_districts: val }))}
            />
          </div>
          <p className="text-xs text-gray-500">
            They get their own login. They'll receive an OTP to activate their account.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Registering…' : 'Register Transporter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
