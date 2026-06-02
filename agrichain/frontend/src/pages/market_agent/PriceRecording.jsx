import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'

const CROPS = ['Tomatoes', 'Avocados', 'Maize', 'Beans', 'Potatoes', 'Onions', 'Carrots', 'Cabbage']
const MARKETS = ['Kigali Central Market', 'Kigali Kimironko', 'Huye Market', 'Musanze Market', 'Rubavu Market']

const RECENT = [
  { id: 1, crop: 'Tomatoes', price: 850, prev: 808, market: 'Kigali Central Market', recorded_at: '09:30', quality: 'A' },
  { id: 2, crop: 'Avocados', price: 1200, prev: 1225, market: 'Kigali Central Market', recorded_at: '09:00', quality: 'A' },
  { id: 3, crop: 'Beans', price: 900, prev: 831, market: 'Kigali Central Market', recorded_at: '08:30', quality: 'B' },
]

export default function PriceRecording() {
  const [records, setRecords] = useState(RECENT)
  const [form, setForm] = useState({ crop: '', price: '', market: 'Kigali Central Market', quality: 'A', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setTimeout(() => {
      const prev = records.find(r => r.crop === form.crop)?.price || null
      setRecords(r => [{ id: Date.now(), crop: form.crop, price: Number(form.price), prev, market: form.market, recorded_at: time, quality: form.quality }, ...r])
      toast.success('Price recorded')
      setForm(f => ({ ...f, crop: '', price: '', notes: '' }))
      setSaving(false)
    }, 500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Market Prices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Submit current prices from your market. Data feeds into the national analytics system.</p>
      </div>

      {/* Form */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">New price entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop</label>
              <select className="input" value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} required>
                <option value="">Select crop…</option>
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (RWF/kg)</label>
              <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required min="1" placeholder="e.g. 850" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Market</label>
              <select className="input" value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}>
                {MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quality observed</label>
              <select className="input" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}>
                <option value="A">Grade A — Excellent</option>
                <option value="B">Grade B — Good</option>
                <option value="C">Grade C — Fair</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Prices rising due to low supply" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Plus className="w-4 h-4" /> {saving ? 'Recording…' : 'Record Price'}
          </button>
        </form>
      </div>

      {/* Today's records */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Today's records</h2>
        <div className="space-y-0">
          {records.map(r => {
            const change = r.prev ? ((r.price - r.prev) / r.prev * 100) : null
            return (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{r.crop}</p>
                  <p className="text-xs text-gray-400">{r.market} · {r.recorded_at} · Grade {r.quality}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">RWF {r.price.toLocaleString()}/kg</p>
                  {change !== null && (
                    <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${change > 0 ? 'text-success-500' : change < 0 ? 'text-danger-500' : 'text-gray-400'}`}>
                      {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : 'No change'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
