import { useState } from 'react'
import { Truck, Plus, CheckCircle, Clock, MapPin } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import toast from 'react-hot-toast'

const MOCK_TRANSPORT = [
  { id: 'TR-001', batch_id: 'BATCH-A4F2', crop: 'Tomatoes', weight_kg: 450, origin: 'Musanze', destination: 'Kigali', requested_date: '2025-01-13', preferred_date: '2025-01-15', cold_chain: true, status: 'assigned', transporter: 'Jean Mugisha' },
  { id: 'TR-002', batch_id: 'BATCH-B7D1', crop: 'Avocados', weight_kg: 300, origin: 'Huye', destination: 'Kigali', requested_date: '2025-01-12', preferred_date: '2025-01-14', cold_chain: false, status: 'pending', transporter: null },
  { id: 'TR-003', batch_id: 'BATCH-C1E3', crop: 'Maize', weight_kg: 800, origin: 'Rwamagana', destination: 'Huye', requested_date: '2025-01-11', preferred_date: '2025-01-16', cold_chain: false, status: 'completed', transporter: 'Diane Uwimana' },
]

const STATUS_STYLES = {
  pending: 'bg-warning-50 text-warning-500',
  assigned: 'bg-primary-50 text-primary-500',
  completed: 'bg-success-50 text-success-500',
}

export default function TransportRequests() {
  const [requests, setRequests] = useState(MOCK_TRANSPORT)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ crop: '', weight_kg: '', origin: '', destination: '', preferred_date: '', cold_chain: false })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setRequests(prev => [...prev, {
        ...form,
        weight_kg: Number(form.weight_kg),
        id: `TR-00${prev.length + 1}`,
        batch_id: `BATCH-NEW${prev.length}`,
        requested_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        transporter: null,
      }])
      toast.success('Transport request submitted')
      setShowNew(false)
      setForm({ crop: '', weight_kg: '', origin: '', destination: '', preferred_date: '', cold_chain: false })
      setSaving(false)
    }, 600)
  }

  const columns = [
    { key: 'id', label: 'Request ID', render: v => <span className="font-mono text-sm">{v}</span> },
    { key: 'crop', label: 'Crop / Weight', render: (v, row) => (
      <div>
        <p className="font-medium">{v}</p>
        <p className="text-xs text-gray-500">{row.weight_kg.toLocaleString()} kg {row.cold_chain && '· ❄ Cold chain'}</p>
      </div>
    )},
    { key: 'origin', label: 'Route', render: (v, row) => (
      <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-gray-400" />{v} → {row.destination}</span>
    )},
    { key: 'preferred_date', label: 'Requested date' },
    { key: 'transporter', label: 'Transporter', render: v => v || <span className="text-gray-400 text-sm">Unassigned</span> },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[v]}`}>{v}</span>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Request and track produce transport to distributors.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total requests', value: requests.length, icon: <Truck className="w-5 h-5 text-primary-500" /> },
          { label: 'Pending assignment', value: requests.filter(r => r.status === 'pending').length, icon: <Clock className="w-5 h-5 text-warning-500" /> },
          { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, icon: <CheckCircle className="w-5 h-5 text-success-500" /> },
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

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={requests} emptyMessage="No transport requests." />
      </div>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Transport Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop</label>
              <input className="input" value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} required placeholder="e.g. Tomatoes" />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" className="input" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} required min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Origin</label>
              <input className="input" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} required placeholder="e.g. Musanze" />
            </div>
            <div>
              <label className="label">Destination</label>
              <input className="input" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} required placeholder="e.g. Kigali" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Preferred date</label>
              <input type="date" className="input" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} required />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="cold" checked={form.cold_chain} onChange={e => setForm(f => ({ ...f, cold_chain: e.target.checked }))} className="w-4 h-4 rounded border-gray-300" />
              <label htmlFor="cold" className="text-sm font-medium text-gray-700">Requires cold chain</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
