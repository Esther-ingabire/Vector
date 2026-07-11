import { useState } from 'react'
import {
  Package, Layers, Truck, TrendingUp, TrendingDown, ClipboardList,
  BarChart2, Trash2, CheckCircle, Globe, MapPin, Leaf,
  Activity, Download, Loader, FileText, Users, Warehouse, Inbox,
  Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext.jsx'
import { analyticsApi, triggerDownload } from '../../api/analytics.js'

const PERIODS = [
  { id: 'today',   label: 'Today' },
  { id: 'week',    label: 'This week' },
  { id: 'month',   label: 'This month' },
  { id: 'last30',  label: 'Last 30 days' },
  { id: 'all',     label: 'All time' },
  { id: 'custom',  label: 'Custom range' },
]

function getPeriodDates(periodId, customFrom, customTo) {
  const today = new Date()
  const fmt = d => d.toISOString().slice(0, 10)
  if (periodId === 'today') {
    const t = fmt(today)
    return { date_from: t, date_to: t }
  }
  if (periodId === 'week') {
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    return { date_from: fmt(start), date_to: fmt(today) }
  }
  if (periodId === 'month') {
    return { date_from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: fmt(today) }
  }
  if (periodId === 'last30') {
    const start = new Date(today)
    start.setDate(today.getDate() - 30)
    return { date_from: fmt(start), date_to: fmt(today) }
  }
  if (periodId === 'custom') return { date_from: customFrom, date_to: customTo }
  return {}
}

const CATALOG = {
  COOPERATIVE_MANAGER: [
    {
      type: 'complete',
      name: 'Complete Activity Report',
      desc: 'Every batch from dispatch through transport, distributor receipt, and market handover — the full traceability picture in one report.',
      filename: 'cooperative_complete_report.csv',
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      type: 'batches',
      name: 'Batch Dispatch Report',
      desc: 'All batches dispatched from your cooperative — weights, quality grades, transit and total losses.',
      filename: 'cooperative_batch_report.csv',
      icon: Package,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      type: 'stock',
      name: 'Stock Inventory Report',
      desc: 'Current stock levels per crop, quality grade, and harvest date.',
      filename: 'cooperative_stock_report.csv',
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      type: 'transport',
      name: 'Transport Requests History',
      desc: 'All transport jobs requested by your cooperative — routes, transporters, and statuses.',
      filename: 'cooperative_transport_report.csv',
      icon: Truck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ],

  TRANSPORTER: [
    {
      type: 'complete',
      name: 'Complete Activity Report',
      desc: 'Every job — requester, vehicle, actual pickup/delivery times, transit hours, and incidents — plus a per-route performance summary, all in one report.',
      filename: 'transporter_complete_report.csv',
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      type: 'jobs',
      name: 'Transport Jobs Report',
      desc: 'All transport jobs — routes, cargo, scheduled vs actual pickup and delivery times.',
      filename: 'transporter_jobs_report.csv',
      icon: Truck,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      type: 'performance',
      name: 'Delivery Performance Report',
      desc: 'On-time delivery rate and average transit hours broken down by route.',
      filename: 'transporter_performance_report.csv',
      icon: TrendingUp,
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
  ],

  DISTRIBUTOR: [
    {
      type: 'complete',
      name: 'Complete Activity Report',
      desc: 'Every order — crop origin cooperative, market agent, delivery method, collection results, and status — in one report.',
      filename: 'distributor_complete_report.csv',
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      type: 'orders',
      name: 'Orders Report',
      desc: 'All market agent orders — crop, quantities requested and confirmed, delivery method, and status.',
      filename: 'distributor_orders_report.csv',
      icon: ClipboardList,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      type: 'delivery-comparison',
      name: 'Delivery Method Comparison',
      desc: 'Self-collection vs transporter delivery — order counts, volumes, and completion rates.',
      filename: 'distributor_delivery_comparison_report.csv',
      icon: BarChart2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      type: 'waste',
      name: 'Warehouse Waste Report',
      desc: 'Produce that spoiled or was discarded in your warehouse — quantities moved on, discarded, and loss percentage.',
      filename: 'distributor_waste_report.csv',
      icon: Trash2,
      color: 'text-danger-600',
      bg: 'bg-danger-50',
    },
  ],

  MARKET_AGENT: [
    {
      type: 'complete',
      name: 'Complete Activity Report',
      desc: 'Every collection — crop, distributor, price, collected/arrived quantities, loss, and order status — in one report.',
      filename: 'market_agent_complete_report.csv',
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      type: 'collections',
      name: 'Collection Confirmations Report',
      desc: 'All collections — crop, collected and arrived quantities, and self-transport loss.',
      filename: 'market_agent_collections_report.csv',
      icon: CheckCircle,
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
    {
      type: 'waste',
      name: 'Waste Report Summary',
      desc: 'Waste reports submitted — quantities sold and discarded, spoilage reasons, and loss percentage.',
      filename: 'market_agent_waste_report.csv',
      icon: Trash2,
      color: 'text-danger-600',
      bg: 'bg-danger-50',
    },
    {
      type: 'loss-summary',
      name: 'Loss Summary Report',
      desc: 'High-risk collections where self-transport loss exceeded 5%, ranked by loss rate — plus your overall collection and waste averages.',
      filename: 'market_agent_loss_summary_report.csv',
      icon: TrendingDown,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
    },
  ],

  MINAGRI_OFFICER: [
    {
      type: 'complete',
      name: 'Complete Activity Report',
      desc: 'Every batch nationwide — cooperative, district, transport, distributor, and market agent in a single end-to-end report.',
      filename: 'national_complete_report.csv',
      icon: FileText,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      type: 'national',
      name: 'National Supply Chain Report',
      desc: 'District-by-district, crop-by-crop loss aggregation across the entire national supply chain.',
      filename: 'national_supply_chain_report.csv',
      icon: Globe,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      type: 'districts',
      name: 'District Performance Report',
      desc: 'Per-district ranking by average loss rate, total volume, and risk classification.',
      filename: 'national_districts_report.csv',
      icon: MapPin,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      type: 'crops',
      name: 'Crop Loss Analysis Report',
      desc: 'National average loss per crop type with volume and batch count statistics.',
      filename: 'national_crops_report.csv',
      icon: Leaf,
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
    {
      type: 'transport',
      name: 'National Transport Performance',
      desc: 'Summary of all transport jobs across Rwanda — routes, volumes, transit times, and delay rates.',
      filename: 'national_transport_report.csv',
      icon: Activity,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ],
}

CATALOG.TRANSPORT_COMPANY = CATALOG.TRANSPORTER

CATALOG.ADMIN = [
  ...CATALOG.MINAGRI_OFFICER,
  {
    type: 'users',
    name: 'System Users Report',
    desc: 'Every account in ChainSight — role, contact info, verification, and active status.',
    filename: 'system_users_report.csv',
    icon: Users,
    color: 'text-gray-700',
    bg: 'bg-gray-100',
  },
]

CATALOG.WAREHOUSE_MANAGER = [
  {
    type: 'complete',
    name: 'Complete Activity Report',
    desc: 'Every rental request with full facility specs — capacity, IoT sensor, cold-chain thresholds — in one report.',
    filename: 'warehouse_complete_report.csv',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    type: 'facilities',
    name: 'Warehouse Facilities Report',
    desc: 'Every facility you manage — capacity, rental availability, and cold-chain thresholds.',
    filename: 'warehouse_facilities_report.csv',
    icon: Warehouse,
    color: 'text-primary-600',
    bg: 'bg-primary-50',
  },
  {
    type: 'rentals',
    name: 'Rental Requests Report',
    desc: 'All rental requests from cooperatives — facility, requested capacity, and status.',
    filename: 'warehouse_rentals_report.csv',
    icon: Inbox,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
]

const ROLE_LABELS = {
  COOPERATIVE_MANAGER: 'Cooperative Manager',
  TRANSPORTER: 'Transporter',
  TRANSPORT_COMPANY: 'Transport Company',
  DISTRIBUTOR: 'Distributor',
  MARKET_AGENT: 'Market Agent',
  MINAGRI_OFFICER: 'MINAGRI Officer',
  ADMIN: 'Admin',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
}

export default function RoleReportsPage() {
  const { user } = useAuth()
  const [downloading, setDownloading] = useState(new Set())
  const [period, setPeriod] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const reports = CATALOG[user?.role] ?? []

  const handleDownload = async (report, fileFormat) => {
    const key = `${report.type}:${fileFormat}`
    if (downloading.has(key)) return
    if (period === 'custom' && (!customFrom || !customTo)) {
      toast.error('Please select both a start and end date for custom range.')
      return
    }
    setDownloading(prev => new Set([...prev, key]))
    try {
      const dateParams = getPeriodDates(period, customFrom, customTo)
      const res = await analyticsApi.exportReport({ report_type: report.type, file_format: fileFormat, ...dateParams })
      const filename = fileFormat === 'pdf'
        ? report.filename.replace(/\.csv$/, '.pdf')
        : report.filename
      triggerDownload(res, filename)
      toast.success(`"${report.name}" downloaded`)
    } catch {
      toast.error('Could not generate report. Try again.')
    } finally {
      setDownloading(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generated live from your current data — download as CSV for analysis, or PDF for a printable document.
        </p>
      </div>

      {/* ── Date range filter ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Report period</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                period === p.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input text-sm py-1.5" />
            </div>
            <span className="text-gray-400 mt-5">→</span>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input text-sm py-1.5" />
            </div>
          </div>
        )}
        {period !== 'all' && period !== 'custom' && (
          <p className="text-xs text-gray-400 mt-2">
            {period === 'today'
              ? "Reports will only include records from today."
              : `Reports will only include records from ${PERIODS.find(p2 => p2.id === period)?.label.toLowerCase()}.`}
          </p>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports available for your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {reports.map(report => {
            const Icon = report.icon
            const busyCsv = downloading.has(`${report.type}:csv`)
            const busyPdf = downloading.has(`${report.type}:pdf`)
            return (
              <div
                key={report.type}
                className="card flex flex-col gap-4 hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${report.bg}`}>
                    <Icon className={`w-5 h-5 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{report.name}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{report.desc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Live Data</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(report, 'csv')}
                      disabled={busyCsv}
                      className="btn-secondary flex items-center gap-2 text-sm py-2 px-3 disabled:opacity-60"
                    >
                      {busyCsv ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      CSV
                    </button>
                    <button
                      onClick={() => handleDownload(report, 'pdf')}
                      disabled={busyPdf}
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-60"
                    >
                      {busyPdf ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {busyPdf ? 'Generating…' : 'PDF'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
