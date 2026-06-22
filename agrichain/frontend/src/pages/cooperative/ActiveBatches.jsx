import { useState, useEffect } from 'react'
import { MapPin, Thermometer, Truck, CheckCircle, Package, AlertTriangle, Navigation } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { traceabilityApi } from '../../api/traceability.js'

const TRANSIT_STATUSES = ['IN_TRANSIT_LEG1', 'IN_TRANSIT_LEG2']

const MOCK_BATCHES = [
  {
    id: 1, batch_id_short: 'A4F2C1D0', crop_name: 'Tomatoes',
    dispatch_weight_kg: 450, current_status: 'IN_TRANSIT_LEG1',
    dispatch_timestamp: '2026-06-09T08:00:00Z',
    transporter_name: 'Claude Mugisha', requires_refrigeration: true, total_loss_pct: 0,
  },
  {
    id: 2, batch_id_short: 'B3C1D2E0', crop_name: 'Avocados',
    dispatch_weight_kg: 300, current_status: 'IN_TRANSIT_LEG1',
    dispatch_timestamp: '2026-06-09T09:00:00Z',
    transporter_name: 'Marie Uwase', requires_refrigeration: false, total_loss_pct: 0,
  },
  {
    id: 3, batch_id_short: 'C7D4E5F0', crop_name: 'Maize',
    dispatch_weight_kg: 800, current_status: 'AT_DISTRIBUTOR',
    dispatch_timestamp: '2026-06-06T07:00:00Z',
    transporter_name: 'Jean Habimana', requires_refrigeration: false,
    weight_at_distributor_kg: 783, quality_at_distributor: 'B',
    distributor_receipt_timestamp: '2026-06-07T14:30:00Z',
    transit_loss_leg1_pct: 2.1, total_loss_pct: 2.1,
  },
]


export default function ActiveBatches() {
  const [batches, setBatches] = useState(MOCK_BATCHES)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [iotData, setIotData] = useState(null)

  useEffect(() => {
    traceabilityApi.getBatches()
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        if (data.length) setBatches(data)
      })
      .catch(() => {})
  }, [])

  const openDetail = async (batch) => {
    setSelected(batch)
    setDetail(null)
    setIotData(null)
    setLoadingDetail(true)
    try {
      const res = await traceabilityApi.getBatch(batch.id, { _silent: true })
      setDetail(res.data)
    } catch {
      // silently keep basic data from list
    } finally {
      setLoadingDetail(false)
    }
    if (TRANSIT_STATUSES.includes(batch.current_status)) {
      traceabilityApi.getBatchIoT(batch.id).then(res => setIotData(res.data)).catch(() => {})
    }
  }

  const inTransit     = batches.filter(b => ['IN_TRANSIT_LEG1', 'IN_TRANSIT_LEG2'].includes(b.current_status))
  const atDistributor = batches.filter(b => b.current_status === 'AT_DISTRIBUTOR')
  const atMarket      = batches.filter(b => ['AT_MARKET', 'COMPLETED'].includes(b.current_status))
  const coldChainActive = inTransit.filter(b => b.requires_refrigeration || b.cold_chain).length

  // Batches sharing the same transport request travel on one vehicle — group them
  // so each batch's own audit trail stays visible while showing they're on the same trip.
  const tripMateCount = (batch) => {
    const tripId = batch.transport_request_leg1 || batch.transport_request_leg2
    if (!tripId) return 0
    return batches.filter(b => (b.transport_request_leg1 || b.transport_request_leg2) === tripId).length - 1
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Batches</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track batches in transit and confirmed deliveries.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : inTransit.length}</p><p className="text-sm text-gray-500">In transit</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : atDistributor.length}</p><p className="text-sm text-gray-500">Delivery confirmed</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Thermometer className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{loading ? '…' : coldChainActive}</p><p className="text-sm text-gray-500">Cold chain active</p></div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading batches…</div>
      ) : (
        <>
          {/* In transit */}
          {inTransit.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-700">In Transit</h2>
              {inTransit.map(batch => {
                const mates = tripMateCount(batch)
                return (
                <div key={batch.id} onClick={() => openDetail(batch)}
                  className="card cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {batch.crop_name} <span className="text-gray-400 font-normal">· {Number(batch.dispatch_weight_kg).toLocaleString()} kg</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{batch.batch_id_short}</p>
                      {batch.destination && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" /> To {batch.destination}
                        </p>
                      )}
                      {mates > 0 && (
                        <p className="text-xs text-blue-600 mt-0.5">Sharing this trip with {mates} other batch{mates > 1 ? 'es' : ''}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">
                        {batch.current_status === 'IN_TRANSIT_LEG1' ? 'Leg 1 — to distributor' : 'Leg 2 — to market'}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{batch.dispatch_timestamp?.split('T')[0]}</p>
                    </div>
                    {batch.requires_refrigeration && (
                      <span className="text-xs text-info-600 bg-info-50 px-2 py-0.5 rounded-full">Cold chain</span>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}

          {/* Delivery confirmations — received by distributor */}
          {atDistributor.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-500" /> Delivery Confirmations
              </h2>
              {atDistributor.map(batch => {
                const lossKg = batch.dispatch_weight_kg && batch.weight_at_distributor_kg
                  ? Number(batch.dispatch_weight_kg) - Number(batch.weight_at_distributor_kg)
                  : null
                return (
                  <div key={batch.id} onClick={() => openDetail(batch)}
                    className="card cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-success-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {batch.crop_name} <span className="text-gray-400 font-normal">· dispatched {Number(batch.dispatch_weight_kg).toLocaleString()} kg</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{batch.batch_id_short}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600 flex-shrink-0">
                        Received by distributor
                      </span>
                    </div>

                    {/* Receipt details */}
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Received weight</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {batch.weight_at_distributor_kg ? `${Number(batch.weight_at_distributor_kg).toLocaleString()} kg` : '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Quality at receipt</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          {batch.quality_at_distributor ? `Grade ${batch.quality_at_distributor}` : '—'}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 ${batch.transit_loss_leg1_pct > 0 ? 'bg-warning-50' : 'bg-success-50'}`}>
                        <p className="text-xs text-gray-500">Transit loss</p>
                        <p className={`text-sm font-semibold mt-0.5 ${batch.transit_loss_leg1_pct > 0 ? 'text-warning-600' : 'text-success-600'}`}>
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

          {/* At market / completed */}
          {atMarket.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-700">At Market</h2>
              {atMarket.map(batch => (
                <div key={batch.id} onClick={() => openDetail(batch)}
                  className="card cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between gap-4 opacity-80">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {batch.crop_name} <span className="text-gray-400 font-normal">· {Number(batch.dispatch_weight_kg).toLocaleString()} kg</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{batch.batch_id_short}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {batch.total_loss_pct > 0 && (
                      <span className="text-xs text-warning-500">{batch.total_loss_pct}% total loss</span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600">
                      {batch.current_status === 'COMPLETED' ? 'Completed' : 'At market'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {batches.length === 0 && (
            <div className="card py-12 text-center text-gray-400 text-sm">
              No batches dispatched yet.
            </div>
          )}
        </>
      )}

      {/* Batch detail modal */}
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
                  ['Destination', (detail || selected).destination],
                  ['Dispatched weight', `${Number((detail || selected).dispatch_weight_kg).toLocaleString()} kg`],
                  ['Grade at dispatch', `Grade ${(detail || selected).quality_grade_at_dispatch || '—'}`],
                  ['Status', (detail || selected).current_status?.replace(/_/g, ' ')],
                  ['Dispatch date', (detail || selected).dispatch_timestamp?.split('T')[0]],
                  ['Transit loss', `${(detail || selected).transit_loss_leg1_pct ?? 0}%`],
                  ...(((detail || selected).weight_at_distributor_kg) ? [
                    ['Received weight', `${Number((detail || selected).weight_at_distributor_kg).toLocaleString()} kg`],
                    ['Quality at receipt', `Grade ${(detail || selected).quality_at_distributor || '—'}`],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="font-medium text-gray-900 mt-0.5">{v || '—'}</p>
                  </div>
                ))}
              </div>

              {iotData && (iotData.temperature_readings?.length > 0 || iotData.gps_tracks?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {iotData.temperature_readings?.length > 0 && (
                    <div className={`rounded-lg p-3 ${iotData.temperature_readings[0].is_breach ? 'bg-danger-50' : 'bg-gray-50'}`}>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Latest temp</p>
                      <p className={`font-medium mt-0.5 ${iotData.temperature_readings[0].is_breach ? 'text-danger-600' : 'text-gray-900'}`}>
                        {iotData.temperature_readings[0].temperature_celsius}°C
                      </p>
                    </div>
                  )}
                  {iotData.gps_tracks?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Navigation className="w-3 h-3" /> Last known location</p>
                      <p className="font-medium text-gray-900 mt-0.5 text-xs">
                        {iotData.gps_tracks[0].latitude}, {iotData.gps_tracks[0].longitude}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {detail?.qr_scans?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Scan timeline</p>
                  <div className="space-y-2">
                    {detail.qr_scans.map((scan, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{new Date(scan.scanned_at).toLocaleString()}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                        <span className="text-gray-700">{scan.scan_point?.replace(/_/g, ' ')} — {scan.scanned_by_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
