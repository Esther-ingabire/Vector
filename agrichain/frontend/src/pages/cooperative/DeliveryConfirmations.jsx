import { useState, useEffect } from 'react'
import { CheckCircle, Package, AlertTriangle } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { traceabilityApi } from '../../api/traceability.js'

const MOCK_DELIVERIES = [
  {
    id: 3, batch_id_short: 'C7D4E5F0', crop_name: 'Maize',
    dispatch_weight_kg: 800, current_status: 'AT_DISTRIBUTOR',
    dispatch_timestamp: '2026-06-06T07:00:00Z',
    weight_at_distributor_kg: 783, quality_at_distributor: 'B',
    distributor_receipt_timestamp: '2026-06-07T14:30:00Z',
    transit_loss_leg1_pct: 2.1, total_loss_pct: 2.1,
  },
]

export default function DeliveryConfirmations() {
  const [deliveries, setDeliveries] = useState(MOCK_DELIVERIES)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    traceabilityApi.getBatches()
      .then(res => {
        const all = res.data?.results ?? res.data ?? []
        const confirmed = all.filter(b => b.current_status === 'AT_DISTRIBUTOR')
        if (confirmed.length) setDeliveries(confirmed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openDetail = async (batch) => {
    setSelected(batch)
    setDetail(null)
    setLoadingDetail(true)
    try {
      const res = await traceabilityApi.getBatch(batch.id, { _silent: true })
      setDetail(res.data)
    } catch {
      // keep basic data
    } finally {
      setLoadingDetail(false)
    }
  }

  const totalDispatched = deliveries.reduce((a, b) => a + Number(b.dispatch_weight_kg || 0), 0)
  const totalReceived   = deliveries.reduce((a, b) => a + Number(b.weight_at_distributor_kg || 0), 0)
  const avgLoss = deliveries.length
    ? (deliveries.reduce((a, b) => a + Number(b.transit_loss_leg1_pct || 0), 0) / deliveries.length).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Confirmations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Batches received and confirmed by distributors.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 border-2 border-primary-500">
          <Package className="w-6 h-6 text-primary-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : deliveries.length}</p>
            <p className="text-sm text-gray-500">Confirmed deliveries</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-success-500">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : `${totalReceived.toLocaleString()} kg`}</p>
            <p className="text-sm text-gray-500">Total received</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-warning-500">
          <AlertTriangle className="w-6 h-6 text-warning-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : `${avgLoss}%`}</p>
            <p className="text-sm text-gray-500">Avg transit loss</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading confirmed deliveries…</div>
      ) : deliveries.length === 0 ? (
        <div className="card py-16 text-center">
          <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No confirmed deliveries yet</p>
          <p className="text-gray-400 text-sm mt-1">Deliveries confirmed by distributors will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map(batch => {
            const lossKg = batch.dispatch_weight_kg && batch.weight_at_distributor_kg
              ? Number(batch.dispatch_weight_kg) - Number(batch.weight_at_distributor_kg)
              : null
            return (
              <div key={batch.id} onClick={() => openDetail(batch)}
                className="card cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-success-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {batch.crop_name}
                        <span className="text-gray-400 font-normal"> · dispatched {Number(batch.dispatch_weight_kg).toLocaleString()} kg</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{batch.batch_id_short}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600 flex-shrink-0">
                    Received by distributor
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Received weight</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {batch.weight_at_distributor_kg
                        ? `${Number(batch.weight_at_distributor_kg).toLocaleString()} kg`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Quality at receipt</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {batch.quality_at_distributor ? `Grade ${batch.quality_at_distributor}` : '—'}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${Number(batch.transit_loss_leg1_pct) > 0 ? 'bg-warning-50' : 'bg-success-50'}`}>
                    <p className="text-xs text-gray-500">Transit loss</p>
                    <p className={`text-sm font-semibold mt-0.5 ${Number(batch.transit_loss_leg1_pct) > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                      {batch.transit_loss_leg1_pct != null ? `${batch.transit_loss_leg1_pct}%` : '0%'}
                      {lossKg > 0 && <span className="text-xs font-normal ml-1">({lossKg.toFixed(1)} kg)</span>}
                    </p>
                  </div>
                </div>

                {batch.distributor_receipt_timestamp && (
                  <p className="mt-2 text-xs text-gray-400">
                    Confirmed on {new Date(batch.distributor_receipt_timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal isOpen={!!selected} onClose={() => { setSelected(null); setDetail(null) }}
          title={`Batch ${selected.batch_id_short}`}>
          {loadingDetail ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading batch detail…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Crop', (detail || selected).crop_name],
                  ['Dispatched weight', `${Number((detail || selected).dispatch_weight_kg).toLocaleString()} kg`],
                  ['Grade at dispatch', `Grade ${(detail || selected).quality_grade_at_dispatch || '—'}`],
                  ['Dispatch date', (detail || selected).dispatch_timestamp?.split('T')[0]],
                  ['Received weight', (detail || selected).weight_at_distributor_kg
                    ? `${Number((detail || selected).weight_at_distributor_kg).toLocaleString()} kg` : '—'],
                  ['Quality at receipt', (detail || selected).quality_at_distributor
                    ? `Grade ${(detail || selected).quality_at_distributor}` : '—'],
                  ['Transit loss', `${(detail || selected).transit_loss_leg1_pct ?? 0}%`],
                  ['Confirmed on', (detail || selected).distributor_receipt_timestamp
                    ? new Date((detail || selected).distributor_receipt_timestamp).toLocaleString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-900 mt-0.5">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
