import { useState } from 'react'
import {
  Package, Layers, Truck, TrendingUp, ClipboardList,
  BarChart2, Trash2, CheckCircle, Globe, MapPin, Leaf,
  Activity, Download, Loader, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext.jsx'
import { analyticsApi, triggerDownload } from '../../api/analytics.js'

const CATALOG = {
  COOPERATIVE_MANAGER: [
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
  ],

  MARKET_AGENT: [
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
  ],

  MINAGRI_OFFICER: [
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

CATALOG.ADMIN = CATALOG.MINAGRI_OFFICER

const ROLE_LABELS = {
  COOPERATIVE_MANAGER: 'Cooperative Manager',
  TRANSPORTER: 'Transporter',
  DISTRIBUTOR: 'Distributor',
  MARKET_AGENT: 'Market Agent',
  MINAGRI_OFFICER: 'MINAGRI Officer',
  ADMIN: 'Admin',
}

export default function RoleReportsPage() {
  const { user } = useAuth()
  const [downloading, setDownloading] = useState(new Set())

  const reports = CATALOG[user?.role] ?? []

  const handleDownload = async (report, fileFormat) => {
    const key = `${report.type}:${fileFormat}`
    if (downloading.has(key)) return
    setDownloading(prev => new Set([...prev, key]))
    try {
      const res = await analyticsApi.exportReport({ report_type: report.type, file_format: fileFormat })
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
          Download live CSV reports generated from your data in real time
        </p>
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

      <div className="card bg-blue-50/40 border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">About these reports:</span> Each report is generated live from the current
          database state — no pre-processing required. Choose CSV for further analysis in a spreadsheet, or PDF for
          a printable, presentable document. Data reflects all activity recorded in ChainSight up to the moment you
          click download.
        </p>
      </div>
    </div>
  )
}
