import { useState } from 'react'
import { Package, CheckCircle, AlertTriangle, QrCode, Snowflake } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import toast from 'react-hot-toast'

const INCOMING = [
  { id: 'BATCH-A4F2', crop: 'Tomatoes', weight_kg: 450, grade: 'A', cooperative: 'Musanze Farmers Coop', transporter: 'Jean Mugisha', eta: '10:30', cold_chain: true },
]

const RECEIVED_TODAY = [
  { id: 'BATCH-Z9A1', crop: 'Beans', weight_kg: 300, grade: 'B', cooperative: 'Huye Highlands Coop', received_at: '08:15', condition: 'good' },
  { id: 'BATCH-Y3B2', crop: 'Avocados', weight_kg: 250, grade: 'A', cooperative: 'Musanze Farmers Coop', received_at: '07:45', condition: 'good' },
]

export default function BatchReceiving() {
  const [incoming, setIncoming] = useState(INCOMING)
  const [received, setReceived] = useState(RECEIVED_TODAY)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ actual_weight: '', condition: 'good', notes: '' })

  const handleReceive = (e) => {
    e.preventDefault()
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setReceived(prev => [...prev, { ...selected, received_at: time, condition: form.condition, actual_weight: form.actual_weight || selected.weight_kg }])
    setIncoming(prev => prev.filter(b => b.id !== selected.id))
    toast.success(`Batch ${selected.id} received`)
    setSelected(null)
    setForm({ actual_weight: '', condition: 'good', notes: '' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receive Batches</h1>
        <p className="text-sm text-gray-500 mt-0.5">Confirm arrival and quality check of incoming produce batches.</p>
      </div>

      {/* Incoming */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Incoming deliveries</h2>
        {incoming.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No incoming deliveries expected</p>
          </div>
        ) : (
          incoming.map(b => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-gray-400 mb-1">{b.id}</p>
                  <h3 className="font-semibold text-gray-900">{b.crop} — {b.weight_kg} kg (Grade {b.grade})</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{b.cooperative} · {b.transporter}</p>
                  {b.cold_chain && <p className="inline-flex items-center gap-1 text-xs text-info-600 mt-0.5"><Snowflake className="w-3 h-3" />Cold chain</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm text-gray-500">
                    <p className="font-medium text-gray-900">ETA {b.eta}</p>
                  </div>
                  <button onClick={() => { setSelected(b); setForm({ actual_weight: String(b.weight_kg), condition: 'good', notes: '' }) }}
                    className="btn-primary text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Receive
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Received today */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Received today</h2>
        <div className="space-y-2">
          {received.map(b => (
            <div key={b.id} className="card flex items-center justify-between bg-success-50 border border-success-200">
              <div>
                <p className="text-xs font-mono text-gray-400">{b.id}</p>
                <p className="font-medium text-gray-900">{b.crop} — {b.weight_kg} kg</p>
                <p className="text-xs text-gray-500">{b.cooperative} · received {b.received_at}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.condition === 'good' ? 'bg-success-100 text-success-500' : 'bg-warning-50 text-warning-500'}`}>
                  {b.condition}
                </span>
                <CheckCircle className="w-5 h-5 text-success-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Receive batch ${selected.id}`}>
          <form onSubmit={handleReceive} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p><span className="text-gray-500">Crop:</span> <strong>{selected.crop}</strong></p>
              <p><span className="text-gray-500">Expected weight:</span> <strong>{selected.weight_kg} kg</strong></p>
              <p><span className="text-gray-500">Cooperative:</span> {selected.cooperative}</p>
            </div>
            <div>
              <label className="label">Actual weight received (kg)</label>
              <input type="number" className="input" value={form.actual_weight} onChange={e => setForm(f => ({ ...f, actual_weight: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Condition on arrival</label>
              <select className="input" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                <option value="good">Good — meets expected quality</option>
                <option value="acceptable">Acceptable — minor issues</option>
                <option value="damaged">Damaged — significant quality loss</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any observations…" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Confirm Receipt</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
