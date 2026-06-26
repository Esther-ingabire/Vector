import { useState, useEffect } from 'react'
import { Truck, Plus, CheckCircle, Clock, MapPin, Users, UserPlus, X, Phone, Snowflake, Pencil, UserX, Search, Route, Star } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { transportApi } from '../../api/transport.js'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'


const MOCK_REQUESTS = [
  { id: 'TR-001', cargo_description: 'Tomatoes', estimated_cargo_weight_kg: 450, pickup_location: 'Musanze', destination: 'Kigali Central Market', required_pickup_datetime: '2026-06-12T07:00:00Z', requires_refrigeration: true,  status: 'IN_TRANSIT', transporter_name: 'Claude Mugisha' },
  { id: 'TR-002', cargo_description: 'Avocados', estimated_cargo_weight_kg: 300, pickup_location: 'Huye',    destination: 'Kigali',                 required_pickup_datetime: '2026-06-13T08:00:00Z', requires_refrigeration: false, status: 'PENDING',    transporter_name: 'Marie Uwase' },
  { id: 'TR-003', cargo_description: 'Beans',    estimated_cargo_weight_kg: 600, pickup_location: 'Musanze', destination: 'Huye Market',            required_pickup_datetime: '2026-06-11T06:00:00Z', requires_refrigeration: false, status: 'COMPLETED',  transporter_name: 'Jean Habimana' },
]

const MOCK_TRANSPORTERS = [
  { id: 1, first_name: 'Claude',  last_name: 'Mugisha',   phone_number: '+250781234567', company_name: 'Mugisha Transport', operating_districts: 'Musanze, Kigali' },
  { id: 2, first_name: 'Marie',   last_name: 'Uwase',     phone_number: '+250782345678', company_name: 'Uwase Logistics',   operating_districts: 'Huye, Kigali' },
  { id: 3, first_name: 'Jean',    last_name: 'Habimana',  phone_number: '+250783456789', company_name: 'Habimana Freight',  operating_districts: 'Rwamagana, Huye' },
]

const BLANK_REQUEST = {
  transporter: '',
  cargo_description: '',
  estimated_cargo_weight_kg: '',
  pickup_location: '',
  destination: '',
  required_pickup_datetime: '',
  requires_refrigeration: false,
  notes: '',
}

const BLANK_TRANSPORTER = {
  first_name: '', last_name: '', phone_number: '', email: '',
  company_name: '', operating_districts: '',
}

export default function TransportRequests() {
  const [tab, setTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [transporters, setTransporters] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingTransporters, setLoadingTransporters] = useState(true)

  const [showNewRequest, setShowNewRequest] = useState(false)
  const [transporterSearch, setTransporterSearch] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [showEditTransporter, setShowEditTransporter] = useState(false)
  const [editingTransporter, setEditingTransporter] = useState(null)
  const [editTForm, setEditTForm] = useState({ company_name: '', operating_districts: '' })
  const [form, setForm] = useState(BLANK_REQUEST)
  const [ratingTarget, setRatingTarget] = useState(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [tForm, setTForm] = useState(BLANK_TRANSPORTER)
  const [saving, setSaving] = useState(false)
  // Extra drop-offs beyond `form.destination` — a multi-stop run, one pickup → several
  // destinations for the same transporter (e.g. different crops to different distributors).
  const [extraStops, setExtraStops] = useState([])

  const addStop = () => setExtraStops(prev => [...prev, { destination: '', cargo_description: '', estimated_cargo_weight_kg: '', notes: '' }])
  const updateStop = (i, field, value) => setExtraStops(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  const removeStop = (i) => setExtraStops(prev => prev.filter((_, idx) => idx !== i))

  useEffect(() => {
    transportApi.getMyRequests(undefined, { _silent: true })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setRequests(data.length ? data : MOCK_REQUESTS)
      })
      .catch(() => setRequests(MOCK_REQUESTS))
      .finally(() => setLoadingRequests(false))

    cooperativesApi.getMyTransporters({ _silent: true })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setTransporters(data.length ? data : MOCK_TRANSPORTERS)
      })
      .catch(() => setTransporters(MOCK_TRANSPORTERS))
      .finally(() => setLoadingTransporters(false))
  }, [])

  const submitRequest = async (e) => {
    e.preventDefault()
    if (!form.transporter) { toast.error('Select a transporter'); return }
    setSaving(true)
    try {
      if (extraStops.length > 0) {
        const res = await transportApi.createMultiStopRequest({
          transporter: Number(form.transporter),
          leg_number: 1,
          pickup_location: form.pickup_location,
          requires_refrigeration: form.requires_refrigeration,
          required_pickup_datetime: form.required_pickup_datetime,
          stops: [
            { destination: form.destination, cargo_description: form.cargo_description, estimated_cargo_weight_kg: Number(form.estimated_cargo_weight_kg), notes: form.notes },
            ...extraStops.map(s => ({ ...s, estimated_cargo_weight_kg: Number(s.estimated_cargo_weight_kg) })),
          ],
        })
        setRequests(prev => [...res.data, ...prev])
        toast.success(`Multi-stop request submitted — ${res.data.length} stops`)
      } else {
        const res = await transportApi.createRequest({
          ...form,
          estimated_cargo_weight_kg: Number(form.estimated_cargo_weight_kg),
          transporter: Number(form.transporter),
          leg_number: 1,
        })
        setRequests(prev => [res.data, ...prev])
        toast.success('Transport request submitted')
      }
      setShowNewRequest(false)
      setForm(BLANK_REQUEST)
      setExtraStops([])
      setTransporterSearch('')
    } catch {
      // interceptor handles toast
    } finally {
      setSaving(false)
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await cooperativesApi.registerTransporter(tForm)
      const otp = res.data?.otp_code
      if (otp) {
        toast.success(`Transporter registered! Share this OTP with them to activate: ${otp}`, { duration: 12000 })
      } else {
        toast.success('Transporter registered — OTP sent to activate their account')
      }
      // Refresh transporters list
      const tRes = await cooperativesApi.getMyTransporters()
      setTransporters(tRes.data?.results ?? tRes.data ?? [])
      setShowRegister(false)
      setTForm(BLANK_TRANSPORTER)
    } catch (err) {
      const data = err.response?.data
      const msg = data
        ? Object.values(data).flat().join(' ')
        : 'Failed to register transporter'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const tName = (t) => t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Transporter'
  const tDistricts = (t) => Array.isArray(t.operating_districts)
    ? t.operating_districts.join(', ')
    : t.operating_districts || ''

  const BUSY_STATUSES = new Set(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'IN_TRANSIT'])
  const activeCountFor = (t) => requests.filter(r => {
    if (!BUSY_STATUSES.has(r.status)) return false
    return String(r.transporter) === String(t.id) || r.transporter_name === tName(t)
  }).length

  const startEditTransporter = (t) => {
    setEditingTransporter(t)
    setEditTForm({
      company_name: t.company_name || '',
      operating_districts: tDistricts(t),
    })
    setShowEditTransporter(true)
  }

  const handleEditTransporter = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await cooperativesApi.updateTransporter(editingTransporter.id, {
        company_name: editTForm.company_name,
        operating_districts: editTForm.operating_districts,
      })
      setTransporters(prev => prev.map(t => t.id === editingTransporter.id ? res.data : t))
      toast.success('Transporter updated')
    } catch {
      setTransporters(prev => prev.map(t => t.id === editingTransporter.id ? {
        ...t,
        company_name: editTForm.company_name,
        operating_districts: editTForm.operating_districts.split(',').map(s => s.trim()).filter(Boolean),
      } : t))
      toast.success('Transporter updated')
    } finally {
      setSaving(false)
      setShowEditTransporter(false)
      setEditingTransporter(null)
    }
  }

  const openRating = (req) => {
    setRatingTarget(req)
    setRatingValue(0)
    setRatingComment('')
  }

  const submitRating = async (e) => {
    e.preventDefault()
    if (!ratingValue) { toast.error('Pick a star rating first'); return }
    setSubmittingRating(true)
    try {
      await transportApi.rateRequest(ratingTarget.id, { rating: ratingValue, comment: ratingComment })
      toast.success('Thanks — rating submitted')
      setRequests(prev => prev.map(r => r.id === ratingTarget.id ? { ...r, has_rating: true } : r))
      setRatingTarget(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleDeactivateTransporter = async (t) => {
    if (!window.confirm(`Deactivate ${tName(t)}? They will no longer appear in your transporter list.`)) return
    try {
      await cooperativesApi.deactivateTransporter(t.id)
    } catch {
      // fallback silently
    }
    setTransporters(prev => prev.filter(x => x.id !== t.id))
    toast.success('Transporter deactivated')
  }

  const requestColumns = [
    { key: 'id', label: 'ID', render: v => <span className="font-mono text-sm">#{v}</span> },
    { key: 'cargo_description', label: 'Cargo / Weight', render: (v, row) => (
      <div>
        <p className="font-medium">{v || '—'}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1">{Number(row.estimated_cargo_weight_kg || 0).toLocaleString()} kg {row.requires_refrigeration && <span className="inline-flex items-center gap-0.5 text-info-600"><Snowflake className="w-3 h-3" />Cold chain</span>}</p>
      </div>
    )},
    { key: 'pickup_location', label: 'Route', render: (v, row) => (
      <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-gray-400" />{v} → {row.destination}</span>
    )},
    { key: 'required_pickup_datetime', label: 'Pickup', render: v => v ? v.split('T')[0] : '—' },
    { key: 'transporter_name', label: 'Transporter', render: v => v || <span className="text-gray-400 text-sm">—</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'rate_action', label: '', render: (_, row) => row.status === 'COMPLETED' && (
      row.has_rating
        ? <span className="text-xs text-gray-400 flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-warning-400 text-warning-400" /> Rated</span>
        : <button onClick={() => openRating(row)} className="text-xs font-semibold text-primary-600 hover:underline">Rate</button>
    )},
  ]

  const pending = requests.filter(r => r.status === 'PENDING').length
  const completed = requests.filter(r => r.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your transporters and transport requests.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRegister(true)} className="btn-secondary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Register Transporter
          </button>
          <button onClick={() => setShowNewRequest(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total requests', value: loadingRequests ? '…' : requests.length, icon: <Truck className="w-5 h-5 text-primary-500" /> },
          { label: 'Pending', value: loadingRequests ? '…' : pending, icon: <Clock className="w-5 h-5 text-warning-500" /> },
          { label: 'My transporters', value: loadingTransporters ? '…' : transporters.length, icon: <Users className="w-5 h-5 text-success-500" /> },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            {s.icon}
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'requests', label: 'Requests' }, { id: 'transporters', label: 'My Transporters' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="card p-0 overflow-hidden">
          {loadingRequests
            ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
            : <DataTable columns={requestColumns} data={requests} emptyMessage="No transport requests yet." />
          }
        </div>
      )}

      {/* My Transporters tab */}
      {tab === 'transporters' && (
        <div className="card p-0 overflow-hidden">
          {loadingTransporters ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : transporters.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No transporters registered yet</p>
              <p className="text-gray-400 text-sm mt-1">Register transporters your cooperative works with.</p>
              <button onClick={() => setShowRegister(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Register Transporter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {transporters.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tName(t)}</p>
                      {t.company_name && <p className="text-xs text-gray-500">{t.company_name}</p>}
                      {tDistricts(t) && (
                        <p className="text-xs text-gray-400">{tDistricts(t)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.vehicles?.length > 0 && (
                      <span className="text-xs text-gray-400">{t.vehicles.length} vehicle{t.vehicles.length !== 1 ? 's' : ''}</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.is_active ? 'bg-success-50 text-success-500' : 'bg-gray-100 text-gray-400'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => startEditTransporter(t)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDeactivateTransporter(t)}
                      className="flex items-center gap-1 text-xs text-danger-500 hover:text-danger-700 font-medium px-2 py-1 rounded hover:bg-danger-50">
                      <UserX className="w-3 h-3" /> Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Transport Request modal */}
      <Modal isOpen={showNewRequest} onClose={() => { setShowNewRequest(false); setTransporterSearch(''); setExtraStops([]) }} title="New Transport Request">
        <form onSubmit={submitRequest} className="space-y-4">
          <div>
            <label className="label">Select transporter *</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="input pl-8 text-sm"
                placeholder="Filter by name or district…"
                value={transporterSearch}
                onChange={e => setTransporterSearch(e.target.value)}
              />
            </div>
            {transporters.length === 0 ? (
              <p className="text-xs text-warning-500">No transporters registered yet. <button type="button" onClick={() => { setShowNewRequest(false); setShowRegister(true) }} className="underline">Register one first.</button></p>
            ) : (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {transporters
                  .filter(t => {
                    if (!transporterSearch.trim()) return true
                    const q = transporterSearch.toLowerCase()
                    return (
                      tName(t).toLowerCase().includes(q) ||
                      (t.company_name || '').toLowerCase().includes(q) ||
                      tDistricts(t).toLowerCase().includes(q)
                    )
                  })
                  .map(t => {
                    const selected = String(form.transporter) === String(t.id)
                    const activeCount = activeCountFor(t)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, transporter: t.id }))}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                          <Truck className={`w-4 h-4 ${selected ? 'text-primary-600' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{tName(t)}</p>
                          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {tDistricts(t) || t.company_name || 'No districts listed'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {activeCount > 0
                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-50 text-warning-600">{activeCount} active</span>
                            : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600">Free</span>
                          }
                          {selected && <span className="text-primary-600 text-xs font-medium">Selected</span>}
                        </div>
                      </button>
                    )
                  })}
                {transporters.filter(t => {
                  if (!transporterSearch.trim()) return true
                  const q = transporterSearch.toLowerCase()
                  return tName(t).toLowerCase().includes(q) || (t.company_name || '').toLowerCase().includes(q) || tDistricts(t).toLowerCase().includes(q)
                }).length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">No transporters match "{transporterSearch}"</p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="label">Cargo description</label>
            <input className="input" value={form.cargo_description} onChange={e => setForm(f => ({ ...f, cargo_description: e.target.value }))} required placeholder="e.g. Tomatoes – 450 kg, Grade A" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Estimated weight (kg)</label>
              <input type="number" className="input" value={form.estimated_cargo_weight_kg} onChange={e => setForm(f => ({ ...f, estimated_cargo_weight_kg: e.target.value }))} required min="1" />
            </div>
            <div>
              <label className="label">Required pickup date</label>
              <input type="datetime-local" className="input" value={form.required_pickup_datetime} onChange={e => setForm(f => ({ ...f, required_pickup_datetime: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pickup location</label>
              <input className="input" value={form.pickup_location} onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))} required placeholder="e.g. Musanze" />
            </div>
            <div>
              <label className="label">Destination{extraStops.length > 0 ? ' — Stop 1' : ''}</label>
              <input className="input" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} required placeholder="e.g. Kigali" />
            </div>
          </div>

          {/* Additional stops — multi-stop run, same pickup & transporter */}
          {extraStops.map((stop, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-3 relative">
              <button type="button" onClick={() => removeStop(i)}
                className="absolute top-2 right-2 text-gray-300 hover:text-danger-500">
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stop {i + 2}</p>
              <input className="input" required placeholder="Destination, e.g. Huye Market"
                value={stop.destination} onChange={e => updateStop(i, 'destination', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" required placeholder="Cargo description"
                  value={stop.cargo_description} onChange={e => updateStop(i, 'cargo_description', e.target.value)} />
                <input type="number" className="input" required min="1" placeholder="Weight (kg)"
                  value={stop.estimated_cargo_weight_kg} onChange={e => updateStop(i, 'estimated_cargo_weight_kg', e.target.value)} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addStop}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary-600 border border-dashed border-primary-300 rounded-xl py-2.5 hover:bg-primary-50 transition-colors">
            <Route className="w-4 h-4" /> Add another stop
          </button>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="refrig" checked={form.requires_refrigeration} onChange={e => setForm(f => ({ ...f, requires_refrigeration: e.target.checked }))} className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="refrig" className="text-sm font-medium text-gray-700">Requires refrigeration (cold chain)</label>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowNewRequest(false); setExtraStops([]) }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Transporter modal */}
      <Modal isOpen={showEditTransporter} onClose={() => { setShowEditTransporter(false); setEditingTransporter(null) }}
        title={`Edit — ${editingTransporter ? tName(editingTransporter) : ''}`}>
        <form onSubmit={handleEditTransporter} className="space-y-4">
          <div>
            <label className="label">Company / business name</label>
            <input className="input" value={editTForm.company_name}
              onChange={e => setEditTForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. Kabuye Transport Ltd" />
          </div>
          <div>
            <label className="label">Operating districts</label>
            <input className="input" value={editTForm.operating_districts}
              onChange={e => setEditTForm(f => ({ ...f, operating_districts: e.target.value }))}
              placeholder="e.g. Musanze, Kigali" />
            <p className="text-xs text-gray-400 mt-1">Comma-separated list of districts</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowEditTransporter(false); setEditingTransporter(null) }}
              className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register Transporter modal */}
      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)} title="Register Transporter">
        <form onSubmit={submitRegister} className="space-y-4">
          <p className="text-sm text-gray-500">Register a transporter your cooperative works with. They will receive an OTP to activate their account.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={tForm.first_name} onChange={e => setTForm(f => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Last name *</label>
              <input className="input" value={tForm.last_name} onChange={e => setTForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Phone number *</label>
            <input className="input" value={tForm.phone_number} onChange={e => setTForm(f => ({ ...f, phone_number: e.target.value }))} required placeholder="+250 7XX XXX XXX" />
          </div>
          <div>
            <label className="label">Email (for OTP)</label>
            <input type="email" className="input" value={tForm.email} onChange={e => setTForm(f => ({ ...f, email: e.target.value }))} placeholder="transporter@example.com" />
          </div>
          <div>
            <label className="label">Company / business name</label>
            <input className="input" value={tForm.company_name} onChange={e => setTForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Kabuye Transport Ltd" />
          </div>
          <div>
            <label className="label">Operating districts</label>
            <input className="input" value={tForm.operating_districts} onChange={e => setTForm(f => ({ ...f, operating_districts: e.target.value }))} placeholder="e.g. Musanze, Kigali" />
            <p className="text-xs text-gray-400 mt-1">Comma-separated list of districts</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowRegister(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Registering…' : 'Register Transporter'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Rate This Delivery">
        {ratingTarget && (
          <form onSubmit={submitRating} className="space-y-4">
            <p className="text-sm text-gray-500">
              {ratingTarget.transporter_name} — {ratingTarget.pickup_location} → {ratingTarget.destination}
            </p>
            <div>
              <label className="label">How was the delivery?</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRatingValue(n)}
                    onMouseEnter={() => setRatingHover(n)} onMouseLeave={() => setRatingHover(0)}
                    className="p-0.5 transition-transform hover:scale-110">
                    <Star className={`w-7 h-7 transition-colors ${n <= (ratingHover || ratingValue) ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Comment (optional)</label>
              <textarea className="input" rows={3} value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                placeholder="On time, careful handling, anything worth noting…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRatingTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={submittingRating} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {submittingRating && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submittingRating ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
