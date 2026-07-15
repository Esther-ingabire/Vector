import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const CONFIRM_BLANK = {
  received_qty_kg: '', quality_grade_received: 'A',
  shortfall_type: '',           // 'TRANSIT_LOSS' | 'NOT_DISPATCHED'
  transit_loss_reason: '',      // reason when produce left coop but was lost en route
  transit_loss_other: '',       // free-text specification when transit_loss_reason === 'OTHER'
  not_dispatched_reason: '',    // reason when coop never loaded the missing quantity
  not_dispatched_other: '',     // free-text specification when not_dispatched_reason === 'OTHER'
  notes: '',
}
const GRADE_OPTIONS = ['A', 'B', 'C']

/**
 * Confirm-receipt modal for a single incoming batch. Shared by IncomingDeliveries (list view)
 * and TraceabilityExplorer (batch detail/map view) so a distributor can confirm receipt from
 * wherever they're already looking at the batch, instead of being sent to a different page
 * to re-find it.
 * `target` needs: batch_id (numeric Batch pk), batch_id_short, cooperative_name, crop_name,
 * shipped_qty_kg.
 */
export default function ConfirmReceiptModal({ target, onClose, onConfirmed }) {
  const [form, setForm] = useState(CONFIRM_BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target) setForm({ ...CONFIRM_BLANK, received_qty_kg: target.shipped_qty_kg })
  }, [target?.batch_id])

  const receivedNum = Number(form.received_qty_kg) || 0
  const shippedNum = Number(target?.shipped_qty_kg) || 0
  const lossKg = Math.max(0, shippedNum - receivedNum)
  const lossPct = shippedNum > 0 ? ((lossKg / shippedNum) * 100).toFixed(1) : '0.0'

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!target) return
    if (lossKg > 0 && form.shortfall_type === 'TRANSIT_LOSS' && form.transit_loss_reason === 'OTHER' && !form.transit_loss_other.trim()) {
      toast.error('Describe what actually happened in transit.')
      return
    }
    if (lossKg > 0 && form.shortfall_type === 'NOT_DISPATCHED' && form.not_dispatched_reason === 'OTHER' && !form.not_dispatched_other.trim()) {
      toast.error('Describe why this quantity was not dispatched.')
      return
    }
    setSaving(true)
    try {
      let loss_reason = ''
      if (lossKg > 0) {
        if (form.shortfall_type === 'TRANSIT_LOSS') {
          const cause = form.transit_loss_reason === 'OTHER' ? form.transit_loss_other.trim() : form.transit_loss_reason
          loss_reason = `IN_TRANSIT: ${cause}`
        } else if (form.shortfall_type === 'NOT_DISPATCHED') {
          const cause = form.not_dispatched_reason === 'OTHER' ? form.not_dispatched_other.trim() : form.not_dispatched_reason
          loss_reason = `NOT_DISPATCHED: ${cause} — ${lossKg}kg of ${target.crop_name} not sent by cooperative`
        }
      }
      const res = await distributionApi.confirmReceipt(target.batch_id, {
        received_qty_kg: receivedNum,
        quality_grade_received: form.quality_grade_received,
        loss_kg: lossKg,
        loss_pct: parseFloat(lossPct),
        loss_reason,
        notes: form.notes,
        shortfall_type: form.shortfall_type || null,
      })
      toast.success('Receipt confirmed successfully')
      onConfirmed?.(res.data)
      onClose()
    } catch (err) {
      const data = err.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Could not confirm receipt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={!!target} onClose={onClose}
      title={`Confirm Receipt — ${target?.batch_id_short || target?.batch_id || ''}`}>
      {target && (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Cooperative</span>
              <span className="font-medium text-gray-900">{target.cooperative_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Crop</span>
              <span className="font-medium text-gray-900">{target.crop_name}</span>
            </div>
            {target.ordered_qty_kg != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ordered (agreed with cooperative)</span>
                <span className="font-medium text-gray-900">{Number(target.ordered_qty_kg).toLocaleString()} kg</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Dispatched (what they sent)</span>
              <span className="font-medium text-gray-900">{Number(target.shipped_qty_kg).toLocaleString()} kg</span>
            </div>
          </div>

          {target.ordered_qty_kg != null && Number(target.ordered_qty_kg) !== Number(target.shipped_qty_kg) && (
            <div className="rounded-xl p-3 text-xs bg-blue-50 border border-blue-200 text-blue-700">
              The cooperative dispatched {Number(target.shipped_qty_kg) < Number(target.ordered_qty_kg) ? 'less' : 'more'} than
              {' '}agreed — {Math.abs(Number(target.ordered_qty_kg) - Number(target.shipped_qty_kg)).toLocaleString()} kg difference from the order,
              before transit is even accounted for below.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Received qty (kg) *</label>
              <input type="number" className="input" required min="0"
                value={form.received_qty_kg}
                onChange={e => setForm(f => ({ ...f, received_qty_kg: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quality grade received</label>
              <select className="input" value={form.quality_grade_received}
                onChange={e => setForm(f => ({ ...f, quality_grade_received: e.target.value }))}>
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
          </div>

          {/* Quantity summary */}
          {receivedNum > 0 && (
            <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${lossKg > 0 ? 'bg-warning-50 border border-warning-200' : 'bg-success-50 border border-success-200'}`}>
              {lossKg > 0
                ? <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                : <CheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />}
              <div>
                {lossKg > 0 ? (
                  <>
                    <p className="font-semibold text-warning-800">
                      {lossKg.toLocaleString()} kg of <strong>{target?.crop_name}</strong> unaccounted — {lossPct}% of expected quantity.
                    </p>
                    <p className="text-warning-700 text-xs mt-0.5">Specify below exactly what happened to these {lossKg.toLocaleString()} kg.</p>
                  </>
                ) : (
                  <p className="font-semibold text-success-700">Full quantity received — no shortfall.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Structured shortfall documentation ─────────────────── */}
          {lossKg > 0 && (
            <div className="space-y-4 border border-warning-200 rounded-xl p-4 bg-warning-50/30">
              <div>
                <label className="label text-sm font-semibold">What happened to the missing {lossKg.toLocaleString()} kg of {target?.crop_name}? *</label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'TRANSIT_LOSS', label: 'Lost during transport', desc: 'The cooperative dispatched the full quantity — it was lost, damaged, or spoiled between pickup and here.' },
                    { value: 'NOT_DISPATCHED', label: 'Never dispatched by cooperative', desc: 'The cooperative did not load this quantity — it was not ready, rejected at loading, or still at the cooperative.' },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        form.shortfall_type === opt.value
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <input type="radio" name="shortfall_type" value={opt.value} required
                        checked={form.shortfall_type === opt.value}
                        onChange={e => setForm(f => ({ ...f, shortfall_type: e.target.value }))}
                        className="mt-0.5 flex-shrink-0 accent-primary-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Path A: Transit loss */}
              {form.shortfall_type === 'TRANSIT_LOSS' && (
                <div>
                  <label className="label">Specific cause of loss during transport *</label>
                  <select className="input" required value={form.transit_loss_reason}
                    onChange={e => setForm(f => ({ ...f, transit_loss_reason: e.target.value }))}>
                    <option value="">Select cause…</option>
                    <option value="SPOILAGE">Spoilage / Rot — temperature or time exceeded safe threshold</option>
                    <option value="SPILLAGE">Spillage — produce spilled from packaging or vehicle</option>
                    <option value="PHYSICAL_DAMAGE">Physical damage — bruising, crushing during handling</option>
                    <option value="THEFT">Theft — produce stolen en route</option>
                    <option value="MOISTURE_LOSS">Moisture loss — natural weight reduction over transit time</option>
                    <option value="WEIGHT_DISCREPANCY">Weight discrepancy — dispatched weight does not match received weight on scale</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {form.transit_loss_reason === 'OTHER' && (
                    <textarea className="input mt-2" rows={2} required
                      placeholder="Describe what actually happened in transit…"
                      value={form.transit_loss_other}
                      onChange={e => setForm(f => ({ ...f, transit_loss_other: e.target.value }))} />
                  )}
                </div>
              )}

              {/* Path B: Not dispatched by cooperative */}
              {form.shortfall_type === 'NOT_DISPATCHED' && (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-600">
                    <p className="font-semibold text-gray-800 mb-1">Shortfall being reported to cooperative:</p>
                    <p><strong>{target?.crop_name}</strong> — <strong>{lossKg.toLocaleString()} kg</strong> not delivered</p>
                    <p className="text-xs text-gray-400 mt-1">A formal notification will be sent to the cooperative with these specifics.</p>
                  </div>
                  <div>
                    <label className="label">Why was this quantity not dispatched? *</label>
                    <select className="input" required value={form.not_dispatched_reason}
                      onChange={e => setForm(f => ({ ...f, not_dispatched_reason: e.target.value }))}>
                      <option value="">Select reason…</option>
                      <option value="STOCK_UNAVAILABLE">Stock unavailable — cooperative did not have the quantity ready</option>
                      <option value="QUALITY_REJECTED_AT_LOADING">Quality rejected at loading — our driver refused this quantity due to quality below agreed grade</option>
                      <option value="NOT_LOADED_BY_COOPERATIVE">Not loaded — cooperative failed to load this quantity before departure</option>
                      <option value="PARTIAL_AGREEMENT">Partial agreement — cooperative and driver agreed to send a reduced quantity</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {form.not_dispatched_reason === 'OTHER' && (
                      <textarea className="input mt-2" rows={2} required
                        placeholder="Why was this quantity not dispatched?"
                        value={form.not_dispatched_other}
                        onChange={e => setForm(f => ({ ...f, not_dispatched_other: e.target.value }))} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional observations about this delivery…" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving}
              className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Confirming…' : 'Confirm Receipt'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
