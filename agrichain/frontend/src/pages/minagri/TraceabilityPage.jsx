import { useState, useRef, useEffect } from 'react'
import { Search, Users, Truck, Building2, MapPin, AlertTriangle, CheckCircle, Clock, Loader, Thermometer } from 'lucide-react'
import { traceabilityApi } from '../../api/traceability.js'
import TripTrackingMap from '../../components/map/TripTrackingMap.jsx'

const STATUS_BADGE = {
  AT_COOPERATIVE:   'bg-yellow-100 text-yellow-700',
  IN_TRANSIT_LEG1:  'bg-blue-100 text-blue-700',
  AT_DISTRIBUTOR:   'bg-orange-100 text-orange-700',
  IN_TRANSIT_LEG2:  'bg-blue-100 text-blue-700',
  AT_MARKET:        'bg-purple-100 text-purple-700',
  COMPLETED:        'bg-green-100 text-green-700',
}

const STATUS_LABEL = {
  AT_COOPERATIVE:  'At Cooperative',
  IN_TRANSIT_LEG1: 'In Transit',
  AT_DISTRIBUTOR:  'At Distribution',
  IN_TRANSIT_LEG2: 'In Transit (Leg 2)',
  AT_MARKET:       'At Market',
  COMPLETED:       'Completed',
}

const TIMELINE_STATUS = {
  done:       { dot: 'bg-success-500', icon: 'text-success-600', label: 'text-success-600', text: 'Completed' },
  active:     { dot: 'bg-blue-500',    icon: 'text-blue-600',    label: 'text-blue-600',    text: 'In Progress' },
  pending:    { dot: 'bg-gray-300',    icon: 'text-gray-400',    label: 'text-gray-400',    text: 'Pending' },
}

function buildTimeline(batch) {
  if (!batch) return []
  const steps = []
  const STATUS_ORDER = ['AT_COOPERATIVE', 'IN_TRANSIT_LEG1', 'AT_DISTRIBUTOR', 'IN_TRANSIT_LEG2', 'AT_MARKET', 'COMPLETED']
  const currentIdx = STATUS_ORDER.indexOf(batch.current_status)

  function stepState(stepIdx) {
    if (stepIdx < currentIdx) return 'done'
    if (stepIdx === currentIdx) return 'active'
    return 'pending'
  }

  // Step 0 — Cooperative
  steps.push({
    stage: 'Cooperative Harvest',
    actor: batch.cooperative?.name || 'Cooperative',
    time:  batch.dispatch_timestamp
           ? new Date(batch.dispatch_timestamp).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })
           : '—',
    detail: `${batch.dispatch_weight_kg} kg dispatched · Grade ${batch.quality_grade_at_dispatch || '—'}`,
    icon:  Users,
    state: stepState(0),
  })

  // Step 1 — Transit Leg 1
  const leg1 = batch.transport_request_leg1
  if (leg1 || currentIdx >= 1) {
    steps.push({
      stage: 'Transport — Leg 1',
      actor: leg1?.transporter?.company_name || 'Transporter',
      time:  leg1?.required_pickup_datetime
             ? new Date(leg1.required_pickup_datetime).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })
             : '—',
      detail: leg1 ? `Route: ${leg1.pickup_location} → ${leg1.destination}` : 'Transit details pending',
      icon:  Truck,
      state: stepState(1),
    })
  }

  // Step 2 — Distributor Receipt
  if (batch.received_by_distributor || currentIdx >= 2) {
    steps.push({
      stage: 'Distributor Receipt',
      actor: batch.received_by_distributor?.company_name || 'Distributor',
      time:  batch.distributor_receipt_timestamp
             ? new Date(batch.distributor_receipt_timestamp).toLocaleString('en-RW', { dateStyle: 'medium', timeStyle: 'short' })
             : '—',
      detail: batch.weight_at_distributor_kg
              ? `${batch.weight_at_distributor_kg} kg received · Transit loss: ${batch.transit_loss_leg1_pct ?? '—'}%`
              : 'Awaiting receipt confirmation',
      icon:  Building2,
      state: stepState(2),
    })
  }

  // Step 3 — Market Agent Collection (via order)
  if (batch.order || currentIdx >= 4) {
    const agent = batch.order?.market_agent
    steps.push({
      stage: 'Market Agent Collection',
      actor: agent ? `${agent.market_name} — Stall ${agent.stall_number}` : 'Market Agent',
      time:  '—',
      detail: 'Final delivery to market stall',
      icon:  MapPin,
      state: stepState(4),
    })
  }

  // Step 4 — Waste / Completion
  if (currentIdx >= 5 || batch.total_loss_pct != null) {
    steps.push({
      stage: 'Waste Recorded',
      actor: 'Loss logged',
      time:  '—',
      detail: batch.total_loss_pct != null
              ? `${batch.total_loss_kg} kg (${batch.total_loss_pct}%) total loss`
              : 'Waste report submitted',
      icon:  AlertTriangle,
      state: 'done',
    })
  }

  return steps
}

export default function TraceabilityPage() {
  const [batchInput, setBatchInput] = useState('')
  const [cropFilter,  setCropFilter]  = useState('All')
  const [coopFilter,  setCoopFilter]  = useState('All')
  const [results,     setResults]     = useState([])
  const [searching,   setSearching]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [detail,      setDetail]      = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searched,    setSearched]    = useState(false)
  const [iotData,     setIotData]     = useState(null)
  const timelineRef = useRef(null)

  useEffect(() => {
    setIotData(null)
    if (!detail) return
    traceabilityApi.getBatchIoT(detail.id).then(res => setIotData(res.data)).catch(() => {})
  }, [detail?.id])

  const handleSearch = async () => {
    setSearching(true)
    setSearched(true)
    try {
      const params = {}
      if (batchInput) params.search = batchInput
      const res = await traceabilityApi.getBatches(params)
      setResults(Array.isArray(res.data) ? res.data : (res.data?.results || []))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleViewTimeline = async (batch) => {
    setSelected(batch.id)
    setDetail(null)
    setLoadingDetail(true)
    setTimeout(() => timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    try {
      const res = await traceabilityApi.getBatch(batch.id)
      setDetail(res.data)
    } catch {
      setDetail(batch)
    } finally {
      setLoadingDetail(false)
    }
  }

  const timeline = buildTimeline(detail)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Traceability Explorer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track any batch from cooperative harvest to market delivery</p>
      </div>

      {/* Search form */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Search Batch</h2>
        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="relative">
            <label className="label">Batch ID / Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={batchInput}
                onChange={e => setBatchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by ID or crop…"
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label">Crop Type</label>
            <select value={cropFilter} onChange={e => setCropFilter(e.target.value)} className="input">
              {['All', 'Coffee', 'Maize', 'Beans', 'Rice'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cooperative</label>
            <select value={coopFilter} onChange={e => setCoopFilter(e.target.value)} className="input">
              {['All', 'Musanze', 'Nyanza', 'Rubavu', 'Kigali'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary flex items-center gap-2"
          >
            {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Batch Timeline — appears above results once a batch is selected */}
      {selected && (
        <div ref={timelineRef} className="card border-primary-200 border-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">
              Batch Timeline
              {detail && (
                <span className="ml-2 font-mono text-sm font-normal text-gray-500">
                  #{String(detail.batch_id || detail.id).replace(/-/g, '').slice(0, 8).toUpperCase()}
                </span>
              )}
            </h2>
            <button onClick={() => { setSelected(null); setDetail(null) }} className="text-xs text-gray-400 hover:text-gray-600">
              ✕ Close
            </button>
          </div>

          {loadingDetail ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader className="w-4 h-4 animate-spin" /> Loading batch details…
            </div>
          ) : (
            <>
            {detail && iotData?.temperature_readings?.length > 0 && (() => {
              const latest = iotData.temperature_readings[0]
              const breachCount = iotData.temperature_readings.filter(r => r.is_breach).length
              return (
                <div className={`flex items-center gap-4 mb-4 p-3.5 rounded-xl ${latest.is_breach ? 'bg-danger-50 border border-danger-200' : 'bg-gray-50 border border-gray-100'}`}>
                  <Thermometer className={`w-5 h-5 flex-shrink-0 ${latest.is_breach ? 'text-danger-600' : 'text-primary-600'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Cold-Chain Status</p>
                    <p className="text-xs text-gray-500">
                      As of {new Date(latest.timestamp).toLocaleString()}
                      {breachCount > 0 && <span className="text-danger-600 ml-1">· {breachCount} breach{breachCount > 1 ? 'es' : ''}</span>}
                    </p>
                  </div>
                  <p className={`text-xl font-bold flex-shrink-0 ${latest.is_breach ? 'text-danger-600' : 'text-success-600'}`}>{latest.temperature_celsius}°C</p>
                </div>
              )
            })()}

            {detail && iotData?.route && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {iotData.is_live ? 'Live Location' : 'Delivery Route'}
                </p>
                <TripTrackingMap route={iotData.route} gpsTracks={iotData.is_live ? iotData.gps_tracks : []} height={420} />
              </div>
            )}
            <div className="relative pl-10">
              <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {timeline.map((step, i) => {
                  const Icon = step.icon
                  const s = TIMELINE_STATUS[step.state]
                  return (
                    <div key={i} className="relative flex gap-4">
                      <div className={`absolute -left-6 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${s.dot} shadow-sm`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className={`flex-1 border rounded-xl p-4 ${step.state === 'pending' ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{step.stage}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{step.actor}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3.5 h-3.5" /> {step.time}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{step.detail}</p>
                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${s.label}`}>
                          <CheckCircle className="w-3.5 h-3.5" /> {s.text}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* Results table */}
      {searched && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">
            Search Results
            {results.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({results.length} found)</span>}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              No batches found. Try a different search term or check the batch ID.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Batch ID', 'Crop', 'Cooperative', 'Status', 'Dispatched', 'Action'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map(b => (
                    <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${selected === b.id ? 'bg-primary-50/50' : ''}`}>
                      <td className="py-3.5 pr-4 font-mono text-sm font-semibold text-gray-800">
                        {String(b.batch_id || b.id).replace(/-/g, '').slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-700">{b.crop?.name || b.crop}</td>
                      <td className="py-3.5 pr-4 text-sm text-gray-700">{b.cooperative?.name || b.cooperative}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[b.current_status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[b.current_status] || b.current_status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-500">
                        {b.dispatch_timestamp
                          ? new Date(b.dispatch_timestamp).toLocaleDateString('en-RW')
                          : '—'}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() => handleViewTimeline(b)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                            selected === b.id
                              ? 'bg-primary-700 text-white border-primary-700'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-700'
                          }`}
                        >
                          View Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="card text-center py-12 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Enter a batch ID or search term above to explore the supply chain journey</p>
        </div>
      )}
    </div>
  )
}
