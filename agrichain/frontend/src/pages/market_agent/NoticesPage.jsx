import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, AlertCircle, CheckCircle, MapPin, Calendar } from 'lucide-react'
import { marketAgentApi } from '../../api/marketAgent.js'
import toast from 'react-hot-toast'

const RISK_CONFIG = {
  LOW:   { color: 'bg-success-50 border-success-300 text-success-700', icon: CheckCircle, label: 'Low Risk — Safe to self-collect' },
  AMBER: { color: 'bg-warning-50 border-warning-300 text-warning-700', icon: AlertTriangle, label: 'Amber Risk — Consider using a transporter' },
  HIGH:  { color: 'bg-danger-50 border-danger-300 text-danger-700', icon: AlertCircle, label: 'High Risk — Use a transporter' },
}

function RiskBanner({ risk, label }) {
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.LOW
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium mb-3 ${cfg.color}`}>
      <cfg.icon className="w-4 h-4 flex-shrink-0" />
      {label || cfg.label}
    </div>
  )
}

export default function NoticesPage() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    marketAgentApi.getNotices()
      .then(res => setNotices(res.data ?? []))
      .catch(() => toast.error('Could not load notices.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="card animate-pulse h-32 bg-gray-100" />)}
    </div>
  )

  // Group by risk level
  const grouped = { HIGH: [], AMBER: [], LOW: [] }
  notices.forEach(n => (grouped[n.risk_level] ??= []).push(n))
  const ordered = [...grouped.HIGH, ...grouped.AMBER, ...grouped.LOW]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Collection notices from distributors. Higher risk means produce spoils faster — act sooner or use a transporter.</p>
      </div>

      {ordered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active collection notices right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordered.map(notice => {
            const deadline = new Date(notice.collection_deadline)
            const deadlineStr = deadline.toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div key={notice.id} className="card">
                <RiskBanner risk={notice.risk_level} label={notice.risk_label} />

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                        Ready for Collection
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base">
                      {notice.distributor_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {notice.crop_name} • {(notice.available_quantity_kg / 1000).toFixed(1)} tons
                    </p>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {notice.pickup_location}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400 flex items-center gap-1 whitespace-nowrap ml-4">
                    <Calendar className="w-3.5 h-3.5" /> Deadline: {deadlineStr}
                  </p>
                </div>

                <button
                  onClick={() => toast('Go to Claims to record your collection after pickup.', { icon: '📋' })}
                  className="btn-primary w-full mt-4 py-2.5 text-sm"
                >
                  Request Collection
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
