import { useState, useEffect } from 'react'
import { CheckCircle, Package, AlertTriangle, Clock } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { distributionApi } from '../../api/distribution.js'

export default function DeliveryConfirmations() {
  const [confirmations, setConfirmations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    distributionApi.getCollectionConfirmations()
      .then(res => setConfirmations(res.data?.results ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const arrived = confirmations.filter(c => c.quantity_arrived_at_stall_kg != null)
  const totalCollected = confirmations.reduce((a, c) => a + Number(c.quantity_collected_kg || 0), 0)
  const avgLoss = arrived.length
    ? (arrived.reduce((a, c) => a + Number(c.self_transport_loss_pct || 0), 0) / arrived.length).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Confirmations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Produce collected and confirmed by market agents from your warehouse.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4 border-2 border-primary-500">
          <Package className="w-6 h-6 text-primary-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : confirmations.length}</p>
            <p className="text-sm text-gray-500">Confirmed collections</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-success-500">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : `${totalCollected.toLocaleString()} kg`}</p>
            <p className="text-sm text-gray-500">Total collected</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-2 border-warning-500">
          <AlertTriangle className="w-6 h-6 text-warning-500" />
          <div>
            <p className="text-xl font-bold">{loading ? '…' : `${avgLoss}%`}</p>
            <p className="text-sm text-gray-500">Avg self-transport loss</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading confirmed collections…</div>
      ) : confirmations.length === 0 ? (
        <div className="card py-16 text-center">
          <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No confirmed collections yet</p>
          <p className="text-gray-400 text-sm mt-1">Collections confirmed by market agents will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {confirmations.map(c => {
            const hasArrived = c.quantity_arrived_at_stall_kg != null
            const lossKg = hasArrived ? Number(c.quantity_collected_kg) - Number(c.quantity_arrived_at_stall_kg) : null
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                className="card cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-success-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {c.crop_name || 'Produce'}
                        <span className="text-gray-400 font-normal"> · collected {Number(c.quantity_collected_kg).toLocaleString()} kg</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.market_agent_name} · Order #{c.order}</p>
                    </div>
                  </div>
                  {hasArrived ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600 flex-shrink-0">
                      Arrived at stall
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-50 text-warning-600 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" /> Awaiting stall arrival
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Arrived at stall</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {hasArrived ? `${Number(c.quantity_arrived_at_stall_kg).toLocaleString()} kg` : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Condition on arrival</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {c.condition_display || (hasArrived ? 'Good' : '—')}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${Number(c.self_transport_loss_pct) > 0 ? 'bg-warning-50' : 'bg-success-50'}`}>
                    <p className="text-xs text-gray-500">Self-transport loss</p>
                    <p className={`text-sm font-semibold mt-0.5 ${Number(c.self_transport_loss_pct) > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                      {c.self_transport_loss_pct != null ? `${c.self_transport_loss_pct}%` : '0%'}
                      {lossKg > 0 && <span className="text-xs font-normal ml-1">({lossKg.toFixed(1)} kg)</span>}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Collected on {new Date(c.collected_at).toLocaleString()}
                  {hasArrived && c.arrived_at && ` · Arrived ${new Date(c.arrived_at).toLocaleString()}`}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Collection #${selected.id}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Crop', selected.crop_name || '—'],
                ['Market agent', selected.market_agent_name],
                ['Collected weight', `${Number(selected.quantity_collected_kg).toLocaleString()} kg`],
                ['Collected on', new Date(selected.collected_at).toLocaleString()],
                ['Arrived weight', selected.quantity_arrived_at_stall_kg
                  ? `${Number(selected.quantity_arrived_at_stall_kg).toLocaleString()} kg` : '—'],
                ['Condition on arrival', selected.condition_display || '—'],
                ['Self-transport loss', `${selected.self_transport_loss_pct ?? 0}%`],
                ['Arrived on', selected.arrived_at ? new Date(selected.arrived_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>
            {selected.condition_notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selected.condition_notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
