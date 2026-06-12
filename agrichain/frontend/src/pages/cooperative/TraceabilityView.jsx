import { useState, useEffect } from 'react'
import { Search, QrCode, MapPin, CheckCircle, Truck, Package, ShoppingCart, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { traceabilityApi } from '../../api/traceability.js'
import toast from 'react-hot-toast'

const MOCK_BATCHES = [
  { id: 1, batch_id: 'a4f2c1d0-0000-0000-0000-000000000001', batch_id_short: 'A4F2C1D0', crop_name: 'Tomatoes', dispatch_weight_kg: 450, current_status: 'IN_TRANSIT_LEG1', dispatch_timestamp: '2026-06-09T08:00:00Z', cooperative_name: 'My Cooperative', total_loss_pct: null },
  { id: 2, batch_id: 'b3c1d2e0-0000-0000-0000-000000000002', batch_id_short: 'B3C1D2E0', crop_name: 'Avocados', dispatch_weight_kg: 300, current_status: 'AT_DISTRIBUTOR',  dispatch_timestamp: '2026-06-08T09:00:00Z', cooperative_name: 'My Cooperative', total_loss_pct: 0.8, weight_at_distributor_kg: 297.6, distributor_receipt_timestamp: '2026-06-09T11:00:00Z' },
  { id: 3, batch_id: 'c7d4e5f0-0000-0000-0000-000000000003', batch_id_short: 'C7D4E5F0', crop_name: 'Maize',    dispatch_weight_kg: 800, current_status: 'COMPLETED',       dispatch_timestamp: '2026-06-05T07:00:00Z', cooperative_name: 'My Cooperative', total_loss_pct: 4.2  },
]

// Build supply chain timeline from full batch data
function buildTimeline(batch) {
  const status = batch.current_status
  const steps = [
    {
      step: 'Dispatched from Cooperative',
      date: batch.dispatch_timestamp?.split('T')[0],
      location: batch.cooperative_name || 'Cooperative',
      detail: `${Number(batch.dispatch_weight_kg).toLocaleString()} kg · Grade ${batch.quality_grade_at_dispatch || '—'}`,
      status: 'done',
      icon: 'dispatch',
    },
    {
      step: 'In Transit — Leg 1',
      date: null,
      location: 'En route to distributor',
      detail: batch.transport_request_leg1
        ? `Transport request #${batch.transport_request_leg1}`
        : 'No transport assigned',
      status: status === 'AT_COOPERATIVE' ? 'pending' : status === 'IN_TRANSIT_LEG1' ? 'active' : 'done',
      icon: 'transit',
    },
    {
      step: 'Received by Distributor',
      date: batch.distributor_receipt_timestamp?.split('T')[0],
      location: 'Distributor warehouse',
      detail: batch.weight_at_distributor_kg
        ? `Received: ${Number(batch.weight_at_distributor_kg).toLocaleString()} kg · Grade ${batch.quality_at_distributor || '—'}`
        : 'Awaiting receipt confirmation',
      status: ['AT_DISTRIBUTOR', 'IN_TRANSIT_LEG2', 'AT_MARKET', 'COMPLETED'].includes(status) ? 'done' : 'pending',
      icon: 'delivered',
    },
    {
      step: 'At Market',
      date: null,
      location: 'Market stall',
      detail: ['AT_MARKET', 'COMPLETED'].includes(status)
        ? `At market — ${batch.total_loss_pct ?? 0}% total loss recorded`
        : 'Awaiting delivery to market',
      status: ['AT_MARKET', 'COMPLETED'].includes(status) ? 'done' : 'pending',
      icon: 'market',
    },
  ]

  return { steps, scans: batch.qr_scans ?? [] }
}

const iconByType = {
  dispatch: <Package className="w-4 h-4" />,
  transit: <Truck className="w-4 h-4" />,
  delivered: <CheckCircle className="w-4 h-4" />,
  market: <ShoppingCart className="w-4 h-4" />,
}

const stepColors = {
  done: { dot: 'bg-success-500 border-success-200 text-white', line: 'bg-success-200' },
  active: { dot: 'bg-primary-500 border-primary-200 text-white animate-pulse', line: 'bg-gray-200' },
  pending: { dot: 'bg-gray-200 border-gray-100 text-gray-400', line: 'bg-gray-100' },
}

const STATUS_LABEL = {
  AT_COOPERATIVE:   'At Cooperative',
  IN_TRANSIT_LEG1:  'In Transit (Leg 1)',
  AT_DISTRIBUTOR:   'At Distributor',
  IN_TRANSIT_LEG2:  'In Transit (Leg 2)',
  AT_MARKET:        'At Market',
  COMPLETED:        'Completed',
}

export default function TraceabilityView() {
  const [batches, setBatches] = useState(MOCK_BATCHES)
  const [loadingBatches, setLoadingBatches] = useState(true)

  const [query, setQuery] = useState('')
  const [batch, setBatch] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    traceabilityApi.getBatches()
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        if (data.length) setBatches(data)
      })
      .catch(() => {})
      .finally(() => setLoadingBatches(false))
  }, [])

  const openBatch = async (item) => {
    setBatch(null)
    setNotFound(false)
    setQuery('')
    try {
      const res = await traceabilityApi.getBatch(item.id, { _silent: true })
      setBatch(res.data)
    } catch {
      // silently fall back to list-level data so the timeline still renders
      setBatch(item)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setBatch(null)
    setNotFound(false)
    try {
      const res = await traceabilityApi.lookupByQR(q)
      setBatch(res.data)
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true)
      else toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const timeline = batch ? buildTimeline(batch) : null

  const statusColor = (status) => {
    if (['AT_MARKET', 'COMPLETED'].includes(status)) return 'bg-success-50 text-success-600'
    if (['IN_TRANSIT_LEG1', 'IN_TRANSIT_LEG2'].includes(status)) return 'bg-primary-50 text-primary-600'
    if (status === 'AT_DISTRIBUTOR') return 'bg-success-50 text-success-500'
    return 'bg-warning-50 text-warning-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Traceability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track any batch through the supply chain from dispatch to market.</p>
      </div>

      {/* Search by batch ID */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by batch ID or UUID…"
          />
        </div>
        <button type="submit" disabled={searching} className="btn-primary flex items-center gap-2 px-5 disabled:opacity-60">
          <QrCode className="w-4 h-4" /> {searching ? 'Searching…' : 'Trace'}
        </button>
      </form>

      {notFound && (
        <div className="card text-center py-10 text-gray-400">
          <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Batch not found</p>
          <p className="text-sm mt-1">Check the batch ID and try again.</p>
        </div>
      )}

      {/* Timeline for selected/searched batch */}
      {batch && timeline && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">{batch.batch_id || batch.batch_id_short}</p>
                <h2 className="text-xl font-bold text-gray-900">{batch.crop_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {Number(batch.dispatch_weight_kg).toLocaleString()} kg · Grade {batch.quality_grade_at_dispatch || '—'} · Dispatched {batch.dispatch_timestamp?.split('T')[0]}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{batch.cooperative_name}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusColor(batch.current_status)}`}>
                  {STATUS_LABEL[batch.current_status] ?? batch.current_status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {(batch.transit_loss_leg1_pct > 0 || batch.total_loss_pct > 0) && (
              <div className="mt-3 p-3 bg-warning-50 rounded-lg flex items-start gap-2 text-sm text-warning-500">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Loss recorded: Leg 1 — {batch.transit_loss_leg1_pct ?? 0}%, Total — {batch.total_loss_pct ?? 0}%
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-5">Supply chain journey</h2>
            <div className="space-y-0">
              {timeline.steps.map((ev, i) => {
                const c = stepColors[ev.status]
                const isLast = i === timeline.steps.length - 1
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${c.dot}`}>
                        {iconByType[ev.icon]}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 my-1 ${c.line}`} style={{ minHeight: 24 }} />}
                    </div>
                    <div className="pb-5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${ev.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{ev.step}</p>
                        {ev.date && <span className="text-xs text-gray-400">{ev.date}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </div>
                      <p className="text-xs text-gray-500">{ev.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {timeline.scans.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-700 mb-3">QR scan events</h2>
              <div className="space-y-2">
                {timeline.scans.map((scan, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{scan.scan_point?.replace(/_/g, ' ')}</span>
                      <span className="text-gray-400 text-xs ml-2">{scan.scanned_by_name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(scan.scanned_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setBatch(null); setQuery('') }} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
            ← Back to all batches
          </button>
        </div>
      )}

      {/* Cooperative's own batch list */}
      {!batch && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700">Your dispatched batches</h2>
          {loadingBatches ? (
            <div className="card py-8 text-center text-gray-400 text-sm">Loading batches…</div>
          ) : batches.length === 0 ? (
            <div className="card py-12 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No batches dispatched yet</p>
              <p className="text-sm mt-1">Dispatch a batch to start tracking it here.</p>
            </div>
          ) : (
            batches.map(b => (
              <button
                key={b.id}
                onClick={() => openBatch(b)}
                className="card w-full text-left hover:shadow-md transition-shadow flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {b.crop_name} <span className="text-gray-400 font-normal text-sm">· {Number(b.dispatch_weight_kg).toLocaleString()} kg</span>
                    </p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{b.batch_id_short}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${statusColor(b.current_status)}`}>
                      {STATUS_LABEL[b.current_status] ?? b.current_status?.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{b.dispatch_timestamp?.split('T')[0]}</p>
                  </div>
                  {b.total_loss_pct > 0 && (
                    <span className="text-xs text-warning-500 bg-warning-50 px-2 py-0.5 rounded-full">
                      {b.total_loss_pct}% loss
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
