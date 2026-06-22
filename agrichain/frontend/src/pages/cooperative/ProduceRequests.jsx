import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Eye, Truck, Package, QrCode, Download } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { distributionApi } from '../../api/distribution.js'
import { transportApi } from '../../api/transport.js'
import { traceabilityApi } from '../../api/traceability.js'
import toast from 'react-hot-toast'

const statusStyles = {
  PENDING: 'bg-warning-50 text-warning-500',
  ACCEPTED: 'bg-success-50 text-success-500',
  DECLINED: 'bg-danger-50 text-danger-500',
}

const statusLabel = { PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined' }

const MOCK_REQUESTS = [
  { id: 101, distributor_name: 'Kigali Fresh Distributors', crop_name: 'Tomatoes', quantity_kg: 500,  quality_grade_required: 'A', required_delivery_date: '2026-06-15', status: 'PENDING',  created_at: '2026-06-09T08:00:00Z', additional_notes: 'Prefer early morning delivery.' },
  { id: 102, distributor_name: 'Southern Produce Ltd',      crop_name: 'Avocados', quantity_kg: 300,  quality_grade_required: 'B', required_delivery_date: '2026-06-16', status: 'PENDING',  created_at: '2026-06-09T10:00:00Z', additional_notes: '' },
  { id: 103, distributor_name: 'Musanze Wholesalers',       crop_name: 'Potatoes', quantity_kg: 1000, quality_grade_required: 'A', required_delivery_date: '2026-06-17', status: 'ACCEPTED', created_at: '2026-06-08T07:00:00Z', additional_notes: '' },
  { id: 104, distributor_name: 'Huye Agro Traders',         crop_name: 'Beans',    quantity_kg: 450,  quality_grade_required: 'A', required_delivery_date: '2026-06-12', status: 'DECLINED', created_at: '2026-06-07T09:00:00Z', additional_notes: 'Urgent order.' },
  { id: 105, distributor_name: 'Rwamagana Fresh Co.',       crop_name: 'Maize',    quantity_kg: 800,  quality_grade_required: 'B', required_delivery_date: '2026-06-20', status: 'PENDING',  created_at: '2026-06-10T06:00:00Z', additional_notes: '' },
]

export default function ProduceRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [actionNotes, setActionNotes] = useState('')
  const [acting, setActing] = useState(false)

  // Dispatch (creates the traceability Batch — optionally sharing a trip with other batches)
  const [dispatching, setDispatching] = useState(null)   // the request being dispatched
  const [openTrips, setOpenTrips] = useState([])         // this cooperative's PENDING/ACCEPTED leg-1 transport requests
  const [batchCounts, setBatchCounts] = useState({})     // { transportRequestId: numberOfBatchesAlready on it }
  const [dispatchForm, setDispatchForm] = useState({ dispatch_weight_kg: '', quality_grade_at_dispatch: 'A', transport_request_leg1: '' })
  const [savingDispatch, setSavingDispatch] = useState(false)

  // Batch label/QR shown right after a successful dispatch
  const [dispatchedBatch, setDispatchedBatch] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [loadingQr, setLoadingQr] = useState(false)

  useEffect(() => {
    setQrUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    if (!dispatchedBatch) return
    setLoadingQr(true)
    traceabilityApi.getQR(dispatchedBatch.id)
      .then(res => setQrUrl(URL.createObjectURL(res.data)))
      .catch(() => setQrUrl(null))
      .finally(() => setLoadingQr(false))
    return () => setQrUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }, [dispatchedBatch?.id])

  useEffect(() => {
    distributionApi.getMyProduceRequests()
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setRequests(data.length ? data : MOCK_REQUESTS)
      })
      .catch(() => setRequests(MOCK_REQUESTS))
      .finally(() => setLoading(false))
  }, [])

  const openDispatch = async (req) => {
    setDispatching(req)
    setDispatchForm({
      dispatch_weight_kg: req.quantity_kg,
      quality_grade_at_dispatch: req.quality_grade_required || 'A',
      transport_request_leg1: '',
    })
    try {
      const [pendingRes, acceptedRes, batchesRes] = await Promise.all([
        transportApi.getMyRequests({ status: 'PENDING' }, { _silent: true }),
        transportApi.getMyRequests({ status: 'ACCEPTED' }, { _silent: true }),
        traceabilityApi.getBatches({}).catch(() => ({ data: [] })),
      ])
      const trips = [...(pendingRes.data?.results ?? pendingRes.data ?? []), ...(acceptedRes.data?.results ?? acceptedRes.data ?? [])]
        .filter(t => Number(t.leg_number) === 1)
      setOpenTrips(trips)

      const batches = batchesRes.data?.results ?? batchesRes.data ?? []
      const counts = {}
      batches.forEach(b => {
        if (b.transport_request_leg1) counts[b.transport_request_leg1] = (counts[b.transport_request_leg1] || 0) + 1
      })
      setBatchCounts(counts)
    } catch {
      setOpenTrips([])
    }
  }

  const submitDispatch = async (e) => {
    e.preventDefault()
    setSavingDispatch(true)
    try {
      const res = await traceabilityApi.createBatch({
        supply_agreement: dispatching.supply_agreement_id,
        crop: dispatching.crop,
        dispatch_weight_kg: Number(dispatchForm.dispatch_weight_kg),
        quality_grade_at_dispatch: dispatchForm.quality_grade_at_dispatch,
        dispatch_timestamp: new Date().toISOString(),
        transport_request_leg1: dispatchForm.transport_request_leg1 || null,
      })
      toast.success('Batch dispatched — traceability record created.')
      setDispatching(null)
      setDispatchedBatch(res.data)
    } catch (err) {
      const data = err.response?.data
      const msg = data ? Object.values(data).flat().join(' ') : 'Could not dispatch batch'
      toast.error(msg)
    } finally {
      setSavingDispatch(false)
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const handleAction = async (action) => {
    setActing(true)
    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED'
    const applyLocally = () => {
      setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: newStatus } : r))
      toast.success(`Request ${action === 'accept' ? 'accepted' : 'declined'}`)
      setSelected(null)
      setActionNotes('')
    }
    try {
      const res = action === 'accept'
        ? await distributionApi.acceptProduceRequest(selected.id, { notes: actionNotes })
        : await distributionApi.declineProduceRequest(selected.id, { notes: actionNotes })
      setRequests(prev => prev.map(r => r.id === selected.id ? res.data : r))
      toast.success(`Request ${action === 'accept' ? 'accepted' : 'declined'}`)
      setSelected(null)
      setActionNotes('')
    } catch {
      applyLocally()
    } finally {
      setActing(false)
    }
  }

  const columns = [
    { key: 'id', label: 'Request ID', render: v => <span className="font-mono text-sm">#{v}</span> },
    { key: 'distributor_name', label: 'Distributor' },
    { key: 'crop_name', label: 'Crop / Qty', render: (v, row) => (
      <div>
        <p className="font-medium">{v}</p>
        <p className="text-xs text-gray-500">{Number(row.quantity_kg).toLocaleString()} kg · Grade {row.quality_grade_required}</p>
      </div>
    )},
    { key: 'required_delivery_date', label: 'Needed by' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[v] || 'bg-gray-100 text-gray-500'}`}>{statusLabel[v] || v}</span>
    )},
    { key: '_actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelected(row); setActionNotes('') }} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
          <Eye className="w-4 h-4" /> View
        </button>
        {row.status === 'ACCEPTED' && (
          <button onClick={() => openDispatch(row)} className="text-success-600 hover:underline text-sm flex items-center gap-1">
            <Truck className="w-4 h-4" /> Dispatch
          </button>
        )}
      </div>
    )},
  ]

  const pending = requests.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produce Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and respond to purchase requests from distributors.</p>
      </div>

      {!loading && pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning-50 border border-warning-500 rounded-xl text-warning-500">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{pending} pending request{pending > 1 ? 's' : ''} awaiting your response</p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
          {['all', 'PENDING', 'ACCEPTED', 'DECLINED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {f === 'all' ? 'All' : statusLabel[f]}
            </button>
          ))}
        </div>
        {loading
          ? <div className="py-12 text-center text-gray-400 text-sm">Loading requests…</div>
          : <DataTable columns={columns} data={filtered} emptyMessage="No produce requests found." />
        }
      </div>

      {selected && (
        <Modal isOpen={!!selected} onClose={() => { setSelected(null); setActionNotes('') }} title={`Request #${selected.id}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Distributor', selected.distributor_name],
                ['Crop', selected.crop_name],
                ['Quantity', `${Number(selected.quantity_kg).toLocaleString()} kg`],
                ['Grade required', `Grade ${selected.quality_grade_required}`],
                ['Needed by', selected.required_delivery_date],
                ['Submitted', selected.created_at?.split('T')[0]],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>

            {selected.status === 'PENDING' ? (
              <>
                <div>
                  <label className="label">Response notes (optional)</label>
                  <textarea className="input" rows={2} value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="e.g. Will deliver on Tuesday morning…" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleAction('decline')} disabled={acting} className="btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                  <button onClick={() => handleAction('accept')} disabled={acting} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-sm text-gray-500 pt-2 space-y-2">
                <p>This request was <strong>{statusLabel[selected.status]?.toLowerCase()}</strong>.</p>
                {selected.cooperative_response_notes && <p className="text-gray-400">{selected.cooperative_response_notes}</p>}
                {selected.status === 'ACCEPTED' && (
                  <button onClick={() => { openDispatch(selected); setSelected(null) }} className="btn-primary inline-flex items-center gap-2 mt-2">
                    <Truck className="w-4 h-4" /> Dispatch Batch
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Dispatch Batch modal */}
      {dispatching && (
        <Modal isOpen={!!dispatching} onClose={() => setDispatching(null)} title={`Dispatch — ${dispatching.crop_name}`}>
          <form onSubmit={submitDispatch} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-900">{dispatching.distributor_name}</p>
              <p className="text-gray-500">{dispatching.crop_name} · requested {Number(dispatching.quantity_kg).toLocaleString()} kg</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dispatch weight (kg) *</label>
                <input type="number" className="input" required min="1"
                  value={dispatchForm.dispatch_weight_kg}
                  onChange={e => setDispatchForm(f => ({ ...f, dispatch_weight_kg: e.target.value }))} />
              </div>
              <div>
                <label className="label">Quality grade at dispatch</label>
                <select className="input" value={dispatchForm.quality_grade_at_dispatch}
                  onChange={e => setDispatchForm(f => ({ ...f, quality_grade_at_dispatch: e.target.value }))}>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Transport request (optional)</label>
              <select className="input" value={dispatchForm.transport_request_leg1}
                onChange={e => setDispatchForm(f => ({ ...f, transport_request_leg1: e.target.value }))}>
                <option value="">No transport request yet — attach later</option>
                {openTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.id} — {t.pickup_location} → {t.destination} ({t.transporter_name || 'transporter'})
                    {batchCounts[t.id] ? ` · ${batchCounts[t.id]} batch${batchCounts[t.id] > 1 ? 'es' : ''} already on this trip` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDispatching(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={savingDispatch} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {savingDispatch && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {savingDispatch ? 'Dispatching…' : 'Dispatch Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch label / QR code — shown immediately after a successful dispatch */}
      {dispatchedBatch && (
        <Modal isOpen={!!dispatchedBatch} onClose={() => setDispatchedBatch(null)} title="Batch Dispatched">
          <div className="space-y-4">
            <div className="w-40 h-40 mx-auto rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
              {loadingQr ? (
                <span className="text-xs text-gray-400">Loading…</span>
              ) : qrUrl ? (
                <img src={qrUrl} alt={`QR code for batch ${dispatchedBatch.batch_id_short}`} className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-gray-300" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Batch Code', dispatchedBatch.batch_id_short],
                ['Crop Type', dispatchedBatch.crop_name],
                ['Grade', `Grade ${dispatchedBatch.quality_grade_at_dispatch}`],
                ['Origin District', user?.district || dispatchedBatch.cooperative_name || '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5 font-mono">{v || '—'}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center">
              Print and attach this label to the physical batch — scanning it at each handover point records a tamper-evident traceability event.
            </p>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setDispatchedBatch(null)} className="btn-secondary flex-1">Close</button>
              {qrUrl && (
                <a
                  href={qrUrl}
                  download={`batch-${dispatchedBatch.batch_id_short}-qr.png`}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Label
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
