import { useState } from 'react'
import { Trash2, CheckCircle } from 'lucide-react'
import { marketAgentApi } from '../../api/marketAgent.js'
import toast from 'react-hot-toast'

const REASONS = [
  { value: 'SPOILAGE',  label: 'Spoilage — natural deterioration' },
  { value: 'NO_DEMAND', label: 'No demand — not sold before spoilage' },
  { value: 'DAMAGE',    label: 'Physical damage at stall' },
  { value: 'OTHER',     label: 'Other' },
]

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  reporting_period_start: today(),
  reporting_period_end: today(),
  quantity_sold_kg: '',
  quantity_discarded_kg: '',
  discard_reason: 'SPOILAGE',
  discard_notes: '',
}

export default function WasteReportPage() {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState([])

  const wasteRate = () => {
    const sold = parseFloat(form.quantity_sold_kg)
    const disc = parseFloat(form.quantity_discarded_kg)
    if (!isNaN(sold) && !isNaN(disc) && (sold + disc) > 0) {
      return ((disc / (sold + disc)) * 100).toFixed(1)
    }
    return null
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const sold = parseFloat(form.quantity_sold_kg)
    const disc = parseFloat(form.quantity_discarded_kg)
    if (isNaN(sold) || sold < 0) { toast.error('Enter quantity sold'); return }
    if (isNaN(disc) || disc < 0) { toast.error('Enter quantity discarded'); return }
    if (!form.reporting_period_start || !form.reporting_period_end) { toast.error('Select dates'); return }

    setLoading(true)
    try {
      const res = await marketAgentApi.submitWasteReport({
        reporting_period_start: form.reporting_period_start,
        reporting_period_end: form.reporting_period_end,
        quantity_sold_kg: sold,
        quantity_discarded_kg: disc,
        discard_reason: form.discard_reason,
        discard_notes: form.discard_notes,
      })
      setSubmitted(prev => [res.data, ...prev])
      toast.success('Waste report submitted.')
      setForm(EMPTY)
    } catch {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Waste Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record end-of-day or end-of-week market spoilage.</p>
      </div>

      <div className="card max-w-2xl">
        <h2 className="text-base font-semibold text-gray-700 mb-5">Record Waste</h2>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Period start</label>
              <input
                type="date" className="input"
                value={form.reporting_period_start}
                onChange={e => setForm(f => ({ ...f, reporting_period_start: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Period end</label>
              <input
                type="date" className="input"
                value={form.reporting_period_end}
                onChange={e => setForm(f => ({ ...f, reporting_period_end: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity Sold (kg)</label>
              <input
                type="number" min="0" step="0.1" className="input"
                placeholder="0"
                value={form.quantity_sold_kg}
                onChange={e => setForm(f => ({ ...f, quantity_sold_kg: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Quantity Discarded (kg)</label>
              <input
                type="number" min="0" step="0.1" className="input"
                placeholder="0"
                value={form.quantity_discarded_kg}
                onChange={e => setForm(f => ({ ...f, quantity_discarded_kg: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Live waste rate preview */}
          {wasteRate() !== null && (
            <div className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${
              parseFloat(wasteRate()) > 15
                ? 'bg-danger-50 text-danger-700'
                : parseFloat(wasteRate()) > 8
                ? 'bg-warning-50 text-warning-700'
                : 'bg-success-50 text-success-700'
            }`}>
              Waste rate: {wasteRate()}%
            </div>
          )}

          <div>
            <label className="label">Reason for Waste</label>
            <select
              className="input"
              value={form.discard_reason}
              onChange={e => setForm(f => ({ ...f, discard_reason: e.target.value }))}
            >
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input min-h-[70px] resize-none"
              placeholder="Any additional context…"
              value={form.discard_notes}
              onChange={e => setForm(f => ({ ...f, discard_notes: e.target.value }))}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Submitting…' : 'Submit Waste Record'}
          </button>
        </form>
      </div>

      {submitted.length > 0 && (
        <div className="card max-w-2xl">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Submitted this session</h2>
          <div className="space-y-2">
            {submitted.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.reporting_period_start} → {r.reporting_period_end}
                  </p>
                  <p className="text-xs text-gray-400">
                    Sold: {r.quantity_sold_kg} kg · Discarded: {r.quantity_discarded_kg} kg
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.market_spoilage_loss_pct != null && (
                    <span className={`text-sm font-bold ${parseFloat(r.market_spoilage_loss_pct) > 10 ? 'text-warning-500' : 'text-success-600'}`}>
                      {r.market_spoilage_loss_pct}% waste
                    </span>
                  )}
                  <CheckCircle className="w-4 h-4 text-success-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
