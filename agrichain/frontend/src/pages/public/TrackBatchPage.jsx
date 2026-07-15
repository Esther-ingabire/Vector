import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Package, MapPin, Truck, AlertTriangle, ArrowLeft, Users } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { traceabilityApi } from '../../api/traceability.js'

const POINT_ICON = {
  DISPATCH: Package,
  PICKUP_CONFIRMATION: Truck,
  DISTRIBUTOR_RECEIPT: CheckCircle,
  AGENT_COLLECTION: CheckCircle,
}

function LossStat({ label, value }) {
  if (value == null) return null
  const pct = Number(value)
  const color = pct > 10 ? 'text-danger-600' : pct > 5 ? 'text-warning-600' : 'text-success-600'
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className={`text-lg font-bold ${color}`}>{pct.toFixed(1)}%</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function TrackBatchPage() {
  const { batchId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    traceabilityApi.getPublicTrack(batchId)
      .then(res => setData(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [batchId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0b2b18] px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <ChainSightLogo size={28} />
          <span className="font-extrabold text-white text-base tracking-tight">ChainSight</span>
          <span className="text-white/40 text-xs ml-auto">Produce Traceability</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-20 text-gray-400">Looking up this batch…</div>
        )}

        {!loading && notFound && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-warning-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">No batch found for this code</p>
            <p className="text-sm text-gray-500 mt-1">
              This QR code may be invalid, or the batch record no longer exists.
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-mono">Batch {data.batch_id_short}</p>
                  <h1 className="text-xl font-bold text-gray-900 mt-0.5">{data.crop_name}</h1>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                  {data.status_display}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-3">
                <MapPin className="w-3.5 h-3.5" />
                Dispatched from {data.origin_cooperative}, {data.origin_district}
              </p>
              {data.mismatch_reported && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  A content mismatch was reported for this batch and is under review.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Chain of custody</p>
              <div className="space-y-4">
                {data.timeline.map((t, i) => {
                  const Icon = POINT_ICON[t.point] || Package
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-success-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.label}</p>
                        <p className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleString('en-RW', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dispatch details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Dispatch weight</p>
                  <p className="font-semibold text-gray-900">{Number(data.dispatch_weight_kg).toLocaleString()} kg</p>
                </div>
                {data.quality_grade_at_dispatch && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Grade at dispatch</p>
                    <p className="font-semibold text-gray-900">Grade {data.quality_grade_at_dispatch}</p>
                  </div>
                )}
                {data.distributor_name && (
                  <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Received by</p>
                    <p className="font-semibold text-gray-900">{data.distributor_name}</p>
                  </div>
                )}
                {data.weight_at_distributor_kg && (
                  <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Weight received</p>
                    <p className="font-semibold text-gray-900">{Number(data.weight_at_distributor_kg).toLocaleString()} kg</p>
                  </div>
                )}
              </div>
            </div>

            {(data.transit_loss_leg1_pct != null || data.self_transport_loss_pct != null
              || data.market_spoilage_loss_pct != null || data.total_loss_pct != null) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Loss recorded along the chain</p>
                <div className="grid grid-cols-2 gap-3">
                  <LossStat label="Transit loss" value={data.transit_loss_leg1_pct} />
                  <LossStat label="Self-transport loss" value={data.self_transport_loss_pct} />
                  <LossStat label="Market spoilage" value={data.market_spoilage_loss_pct} />
                  <LossStat label="Total loss" value={data.total_loss_pct} />
                </div>
              </div>
            )}

            {data.downstream_orders_count > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Where this batch went</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="text-sm text-gray-700">
                    Once received, this batch's stock was sold on to{' '}
                    <strong>{data.downstream_market_agents_count} market agent{data.downstream_market_agents_count !== 1 ? 's' : ''}</strong>
                    {' '}across <strong>{data.downstream_orders_count} order{data.downstream_orders_count !== 1 ? 's' : ''}</strong> so far
                    {data.downstream_allocated_kg != null && (
                      <> — <strong>{Number(data.downstream_allocated_kg).toLocaleString()} kg</strong> of the {Number(data.dispatch_weight_kg).toLocaleString()} kg dispatched has been sold through.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-2">
              This page is generated automatically from ChainSight's traceability records.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> ChainSight home
          </Link>
        </div>
      </div>
    </div>
  )
}
