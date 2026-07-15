import { useState, useEffect } from 'react'
import { Trash2, CheckCircle, Plus, X } from 'lucide-react'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'

const OTHER_CROP = '__other__'

const REASONS = [
  { value: 'SPOILAGE',  label: 'Spoilage — natural deterioration' },
  { value: 'NO_DEMAND', label: 'No demand — not requested by distributors before spoilage' },
  { value: 'DAMAGE',    label: 'Physical/handling damage in storage' },
  { value: 'OTHER',     label: 'Other' },
]

const today = () => new Date().toISOString().slice(0, 10)

const blankRow = () => ({
  crop: '', customCropName: '', quantity_dispatched_kg: '', quantity_discarded_kg: '',
  discard_reason: 'SPOILAGE', discard_notes: '',
})

function rowWasteRate(row) {
  const dispatched = parseFloat(row.quantity_dispatched_kg)
  const disc = parseFloat(row.quantity_discarded_kg)
  if (!isNaN(dispatched) && !isNaN(disc) && (dispatched + disc) > 0) {
    return ((disc / (dispatched + disc)) * 100).toFixed(1)
  }
  return null
}

function rateClass(rate) {
  if (rate === null) return ''
  return parseFloat(rate) > 15 ? 'bg-danger-50 text-danger-700' : parseFloat(rate) > 8 ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700'
}

export default function WasteReportPage() {
  const [periodStart, setPeriodStart] = useState(today())
  const [periodEnd, setPeriodEnd] = useState(today())
  const [rows, setRows] = useState([blankRow()])
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    cooperativesApi.getCrops()
      .then(res => setCrops(res.data?.results ?? res.data ?? []))
      .catch(() => {})
    cooperativesApi.getWasteReports()
      .then(res => setReports(res.data?.results ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  const updateRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  const addRow = () => setRows(prev => [...prev, blankRow()])
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!periodStart || !periodEnd) { toast.error('Select the reporting period'); return }

    for (const [i, row] of rows.entries()) {
      const isOther = row.crop === OTHER_CROP
      if (!row.crop || (isOther && !row.customCropName.trim())) { toast.error(`Row ${i + 1}: select or name a crop`); return }
      const dispatched = parseFloat(row.quantity_dispatched_kg)
      const disc = parseFloat(row.quantity_discarded_kg)
      if (isNaN(dispatched) || dispatched < 0) { toast.error(`Row ${i + 1}: enter quantity dispatched`); return }
      if (isNaN(disc) || disc < 0) { toast.error(`Row ${i + 1}: enter quantity discarded`); return }
      if (row.discard_reason === 'OTHER' && !row.discard_notes.trim()) { toast.error(`Row ${i + 1}: describe what "Other" means`); return }
    }

    setLoading(true)
    try {
      const res = await cooperativesApi.submitWasteReportBatch({
        reporting_period_start: periodStart,
        reporting_period_end: periodEnd,
        rows: rows.map(row => {
          const isOther = row.crop === OTHER_CROP
          return {
            ...(isOther ? { crop_name: row.customCropName.trim() } : { crop: Number(row.crop) }),
            quantity_dispatched_kg: Number(row.quantity_dispatched_kg),
            quantity_discarded_kg: Number(row.quantity_discarded_kg),
            discard_reason: row.discard_reason,
            discard_notes: row.discard_notes,
          }
        }),
      })
      setReports(prev => [...res.data, ...prev])
      toast.success(`Submitted ${res.data.length} crop record${res.data.length !== 1 ? 's' : ''}.`)
      setRows([blankRow()])
    } catch (err) {
      const data = err.response?.data
      toast.error(data?.errors ? `Row ${data.row}: ${JSON.stringify(data.errors)}` : 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Waste Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record, per crop, what spoiled or was discarded before it was ever dispatched to a distributor.</p>
      </div>

      <div className="card max-w-3xl">
        <h2 className="text-base font-semibold text-gray-700 mb-5">Record Pre-Dispatch Waste</h2>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Period start</label>
              <input type="date" className="input" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required />
            </div>
            <div>
              <label className="label">Period end</label>
              <input type="date" className="input" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-4">
            {rows.map((row, i) => {
              const rate = rowWasteRate(row)
              return (
                <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Crop {i + 1}</p>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-danger-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="label">Crop *</label>
                    <select className="input" value={row.crop} onChange={e => updateRow(i, 'crop', e.target.value)} required>
                      <option value="">Select crop…</option>
                      {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value={OTHER_CROP}>Other…</option>
                    </select>
                    {row.crop === OTHER_CROP && (
                      <input className="input mt-2" value={row.customCropName}
                        onChange={e => updateRow(i, 'customCropName', e.target.value)}
                        required placeholder="Type the crop name" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Quantity dispatched (kg)</label>
                      <input type="number" min="0" step="0.1" className="input" placeholder="0"
                        value={row.quantity_dispatched_kg} onChange={e => updateRow(i, 'quantity_dispatched_kg', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label">Quantity discarded (kg)</label>
                      <input type="number" min="0" step="0.1" className="input" placeholder="0"
                        value={row.quantity_discarded_kg} onChange={e => updateRow(i, 'quantity_discarded_kg', e.target.value)} required />
                    </div>
                  </div>

                  {rate !== null && (
                    <div className={`rounded-lg px-3 py-1.5 text-xs font-medium ${rateClass(rate)}`}>
                      Pre-dispatch spoilage rate: {rate}%
                    </div>
                  )}

                  <div>
                    <label className="label">Reason for waste</label>
                    <select className="input" value={row.discard_reason} onChange={e => updateRow(i, 'discard_reason', e.target.value)}>
                      {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label">{row.discard_reason === 'OTHER' ? 'Describe the reason *' : 'Notes (optional)'}</label>
                    <textarea className="input min-h-[60px] resize-none"
                      placeholder={row.discard_reason === 'OTHER' ? 'What actually happened to this produce?' : 'Any additional context…'}
                      required={row.discard_reason === 'OTHER'}
                      value={row.discard_notes} onChange={e => updateRow(i, 'discard_notes', e.target.value)} />
                  </div>
                </div>
              )
            })}
          </div>

          <button type="button" onClick={addRow} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus className="w-3.5 h-3.5" /> Add another crop
          </button>

          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Submitting…' : `Submit ${rows.length} Crop Record${rows.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>

      <div className="card max-w-3xl">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Submitted Reports</h2>
        {loadingHistory ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Trash2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No waste reports submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r, i) => (
              <div key={r.id ?? i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.crop_name || 'Unspecified crop'} <span className="text-gray-400 font-normal">· {r.reporting_period_start} → {r.reporting_period_end}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Dispatched: {r.quantity_dispatched_kg} kg · Discarded: {r.quantity_discarded_kg} kg
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.storage_spoilage_loss_pct != null && (
                    <span className={`text-sm font-bold ${parseFloat(r.storage_spoilage_loss_pct) > 10 ? 'text-warning-500' : 'text-success-600'}`}>
                      {r.storage_spoilage_loss_pct}% waste
                    </span>
                  )}
                  <CheckCircle className="w-4 h-4 text-success-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
