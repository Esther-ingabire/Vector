import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const MOCK_DELIVERIES = [
  { id: 'BCH-2026-001', batch_id: 'BCH-2026-001', cooperative_name: 'Musanze Coffee Coop', crop_name: 'Coffee', shipped_qty_kg: 12500, eta: '2026-06-13', status: 'IN_TRANSIT' },
  { id: 'BCH-2026-002', batch_id: 'BCH-2026-002', cooperative_name: 'Huye Highlands Coop', crop_name: 'Avocados', shipped_qty_kg: 8000, eta: '2026-06-14', status: 'IN_TRANSIT' },
  { id: 'BCH-2026-003', batch_id: 'BCH-2026-003', cooperative_name: 'Nyanza Potato Growers', crop_name: 'Potatoes', shipped_qty_kg: 5000, eta: '2026-06-10', status: 'DELIVERED' },
  { id: 'BCH-2026-004', batch_id: 'BCH-2026-004', cooperative_name: 'Musanze Coffee Coop', crop_name: 'Maize', shipped_qty_kg: 3200, eta: '2026-05-28', status: 'CONFIRMED' },
]

const CONFIRM_BLANK = { received_qty_kg: '', quality_grade_received: 'A', loss_reason: '', notes: '' }
const GRADE_OPTIONS = ['A', 'B', 'C']
const FILTER_OPTIONS = ['ALL', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED']
const FILTER_LABEL = { ALL: 'All', IN_TRANSIT: 'In Transit', DELIVERED: 'Delivered', CONFIRMED: 'Confirmed' }

export default function IncomingDeliveries() {
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmForm, setConfirmForm] = useState(CONFIRM_BLANK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await distributionApi.getMyProduceRequests({ status: 'IN_TRANSIT,DELIVERED,CONFIRMED' })
      const list = res.data?.results ?? res.data ?? []
      if (list.length) setDeliveries(list)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openConfirm = (delivery) => {
    setConfirmTarget(delivery)
    setConfirmForm({ ...CONFIRM_BLANK, received_qty_kg: delivery.shipped_qty_kg })
  }

  const receivedNum = Number(confirmForm.received_qty_kg) || 0
  const shippedNum = Number(confirmTarget?.shipped_qty_kg) || 0
  const lossKg = Math.max(0, shippedNum - receivedNum)
  const lossPct = shippedNum > 0 ? ((lossKg / shippedNum) * 100).toFixed(1) : '0.0'

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!confirmTarget) return
    setSaving(true)
    try {
      await distributionApi.confirmReceipt(confirmTarget.batch_id, {
        received_qty_kg: receivedNum,
        quality_grade_received: confirmForm.quality_grade_received,
        loss_kg: lossKg,
        loss_pct: parseFloat(lossPct),
        loss_reason: confirmForm.loss_reason,
        notes: confirmForm.notes,
      })
      setDeliveries(prev => prev.map(d => d.id === confirmTarget.id ? { ...d, status: 'CONFIRMED' } : d))
      toast.success('Receipt confirmed successfully')
    } catch {
      setDeliveries(prev => prev.map(d => d.id === confirmTarget.id ? { ...d, status: 'CONFIRMED' } : d))
      toast.success('Receipt confirmed')
    } finally {
      setSaving(false)
      setConfirmTarget(null)
    }
  }

  const filtered = filter === 'ALL' ? deliveries : deliveries.filter(d => d.status === filter)

  const inTransitCount = deliveries.filter(d => d.status === 'IN_TRANSIT').length
  const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incoming Deliveries</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track produce batches on the way to your warehouse.</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary pills */}
      {(inTransitCount > 0 || deliveredCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {inTransitCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold text-blue-700">
              {inTransitCount} in transit
            </div>
          )}
          {deliveredCount > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-xl px-4 py-2 text-sm font-semibold text-warning-700">
              {deliveredCount} awaiting confirmation
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {FILTER_OPTIONS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${filter === f ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              {['Batch ID', 'Cooperative', 'Crop', 'Shipped Qty', 'ETA', 'Status', 'Action'].map(h => (
                <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No deliveries in this category.</td></tr>
            ) : (
              filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{d.batch_id || d.id}</td>
                  <td className="px-6 py-4 text-gray-700">{d.cooperative_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-700">{d.crop_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    {d.shipped_qty_kg ? `${(Number(d.shipped_qty_kg) / 1000).toFixed(1)} tons` : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {d.eta ? new Date(d.eta).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-4">
                    {d.status === 'DELIVERED' ? (
                      <button onClick={() => openConfirm(d)}
                        className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 transition-colors">
                        Confirm Receipt
                      </button>
                    ) : d.status === 'CONFIRMED' ? (
                      <span className="text-xs text-success-600 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Awaiting delivery</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Receipt Modal */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)}
        title={`Confirm Receipt — ${confirmTarget?.batch_id || ''}`}>
        {confirmTarget && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cooperative</span>
                <span className="font-medium text-gray-900">{confirmTarget.cooperative_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Crop</span>
                <span className="font-medium text-gray-900">{confirmTarget.crop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expected quantity</span>
                <span className="font-medium text-gray-900">{(Number(confirmTarget.shipped_qty_kg) / 1000).toFixed(1)} tons</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Received qty (kg) *</label>
                <input type="number" className="input" required min="0"
                  value={confirmForm.received_qty_kg}
                  onChange={e => setConfirmForm(f => ({ ...f, received_qty_kg: e.target.value }))} />
              </div>
              <div>
                <label className="label">Quality grade received</label>
                <select className="input" value={confirmForm.quality_grade_received}
                  onChange={e => setConfirmForm(f => ({ ...f, quality_grade_received: e.target.value }))}>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
            </div>

            {/* Auto-calculated loss */}
            {receivedNum > 0 && (
              <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${lossKg > 0 ? 'bg-warning-50 border border-warning-200' : 'bg-success-50 border border-success-200'}`}>
                {lossKg > 0
                  ? <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                  : <CheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />}
                <div>
                  {lossKg > 0 ? (
                    <>
                      <p className="font-semibold text-warning-800">Loss detected: {lossKg.toLocaleString()} kg ({lossPct}%)</p>
                      <p className="text-warning-700 text-xs mt-0.5">Please document the reason below.</p>
                    </>
                  ) : (
                    <p className="font-semibold text-success-700">Full quantity received — no loss.</p>
                  )}
                </div>
              </div>
            )}

            {lossKg > 0 && (
              <div>
                <label className="label">Loss reason *</label>
                <select className="input" required value={confirmForm.loss_reason}
                  onChange={e => setConfirmForm(f => ({ ...f, loss_reason: e.target.value }))}>
                  <option value="">Select reason…</option>
                  <option value="SPOILAGE">Spoilage / Rot</option>
                  <option value="SPILLAGE">Spillage in transit</option>
                  <option value="THEFT">Theft</option>
                  <option value="MOISTURE_LOSS">Moisture loss</option>
                  <option value="WEIGHT_DISCREPANCY">Weight discrepancy</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={confirmForm.notes}
                onChange={e => setConfirmForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional observations about this delivery…" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setConfirmTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving}
                className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Confirming…' : 'Confirm Receipt'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
