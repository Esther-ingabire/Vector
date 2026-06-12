import { useState, useEffect, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Download, FileText, FileSpreadsheet, TrendingDown, Package, Truck, ShoppingCart, Printer } from 'lucide-react'
import { distributionApi } from '../../api/distribution.js'
import { saveAs } from 'file-saver'
import { format, subMonths } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const MONTHS = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM yyyy'))

const MOCK_MONTHLY = [
  { month: MONTHS[0], orders: 18, spend: 4200000, deliveries: 16, loss_kg: 42 },
  { month: MONTHS[1], orders: 22, spend: 5100000, deliveries: 20, loss_kg: 55 },
  { month: MONTHS[2], orders: 25, spend: 5800000, deliveries: 23, loss_kg: 38 },
  { month: MONTHS[3], orders: 30, spend: 7200000, deliveries: 28, loss_kg: 61 },
  { month: MONTHS[4], orders: 20, spend: 4900000, deliveries: 19, loss_kg: 29 },
  { month: MONTHS[5], orders: 12, spend: 3100000, deliveries: 10, loss_kg: 18 },
]

const MOCK_CROPS = [
  { crop: 'Tomatoes', qty_kg: 4200, spend: 3570000 },
  { crop: 'Avocados', qty_kg: 2100, spend: 2520000 },
  { crop: 'Maize', qty_kg: 6500, spend: 2600000 },
  { crop: 'Beans', qty_kg: 1800, spend: 1620000 },
]

const MOCK_LOSS = [
  { agent: 'Alice Mutoni', self_collection_pct: 4.2, transporter_pct: 0.9, batches: 8 },
  { agent: 'Bernard Hakizimana', self_collection_pct: 3.8, transporter_pct: 0.7, batches: 5 },
  { agent: 'Claire Ingabire', self_collection_pct: 5.1, transporter_pct: 1.1, batches: 6 },
  { agent: 'Daniel Uwimana', self_collection_pct: 2.9, transporter_pct: 0.6, batches: 4 },
]

const MOCK_BATCHES = [
  { batch_id: 'BCH-101', crop: 'Tomatoes', cooperative: 'Musanze Farmers Coop', dispatched_kg: 500, received_kg: 492, loss_kg: 8, loss_pct: 1.6, delivery_method: 'Transporter', date: '2026-06-01' },
  { batch_id: 'BCH-102', crop: 'Avocados', cooperative: 'Huye Highlands Coop', dispatched_kg: 300, received_kg: 285, loss_kg: 15, loss_pct: 5.0, delivery_method: 'Self-collection', date: '2026-06-03' },
  { batch_id: 'BCH-103', crop: 'Beans', cooperative: 'Rwamagana Coop', dispatched_kg: 200, received_kg: 199, loss_kg: 1, loss_pct: 0.5, delivery_method: 'Transporter', date: '2026-06-05' },
  { batch_id: 'BCH-104', crop: 'Maize', cooperative: 'Kigali North Coop', dispatched_kg: 800, received_kg: 762, loss_kg: 38, loss_pct: 4.8, delivery_method: 'Self-collection', date: '2026-06-07' },
]

const C = { primary: '#1a5c34', self: '#f59e0b', transporter: '#1a5c34', light: '#72be97' }

function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
    const v = r[h] ?? ''
    return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
  }).join(','))].join('\n')
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export default function DistributorReports() {
  const [section, setSection] = useState('procurement')
  const [monthly, setMonthly] = useState(MOCK_MONTHLY)
  const [crops, setCrops] = useState(MOCK_CROPS)
  const [lossData, setLossData] = useState(MOCK_LOSS)
  const [batches, setBatches] = useState(MOCK_BATCHES)
  const [loading, setLoading] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    setLoading(true)
    distributionApi.getDistributionAnalytics({ })
      .then(res => {
        const d = res.data
        if (d?.monthly?.length) setMonthly(d.monthly)
        if (d?.crops?.length) setCrops(d.crops)
      })
      .catch(() => {})
    distributionApi.getDeliveryMethodComparison({ })
      .then(res => { if (res.data?.length) setLossData(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalOrders = monthly.reduce((a, m) => a + m.orders, 0)
  const totalSpend = monthly.reduce((a, m) => a + m.spend, 0)
  const totalDeliveries = monthly.reduce((a, m) => a + m.deliveries, 0)
  const totalLoss = monthly.reduce((a, m) => a + m.loss_kg, 0)
  const totalCropKg = crops.reduce((a, c) => a + c.qty_kg, 0)
  const avgSelfLoss = lossData.length ? (lossData.reduce((a, x) => a + x.self_collection_pct, 0) / lossData.length).toFixed(1) : 0
  const avgTransLoss = lossData.length ? (lossData.reduce((a, x) => a + x.transporter_pct, 0) / lossData.length).toFixed(1) : 0

  const procurementChart = {
    labels: monthly.map(m => m.month),
    datasets: [
      { label: 'Orders', data: monthly.map(m => m.orders), backgroundColor: C.primary + 'D9', borderRadius: 5, borderSkipped: false },
      { label: 'Deliveries', data: monthly.map(m => m.deliveries), backgroundColor: C.light + 'CC', borderRadius: 5, borderSkipped: false },
    ],
  }

  const lossChart = {
    labels: lossData.map(d => d.agent),
    datasets: [
      { label: 'Self-Collection Loss %', data: lossData.map(d => d.self_collection_pct), backgroundColor: C.self + 'CC', borderRadius: 5, borderSkipped: false },
      { label: 'Transporter Loss %', data: lossData.map(d => d.transporter_pct), backgroundColor: C.primary + 'D9', borderRadius: 5, borderSkipped: false },
    ],
  }

  const chartOptions = (yLabel = '', max = null) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { font: { size: 11 } },
        beginAtZero: true,
        ...(max ? { max } : {}),
        title: yLabel ? { display: true, text: yLabel, font: { size: 11 }, color: '#9ca3af' } : {},
      },
    },
  })

  const handlePrint = () => window.print()

  const downloadProcurementCSV = () => {
    downloadCSV('procurement_report.csv', monthly, ['month', 'orders', 'spend', 'deliveries', 'loss_kg'])
  }

  const downloadLossCSV = () => {
    downloadCSV('delivery_loss_comparison.csv', lossData, ['agent', 'self_collection_pct', 'transporter_pct', 'batches'])
  }

  const downloadBatchesCSV = () => {
    downloadCSV('batch_traceability.csv', batches, ['batch_id', 'crop', 'cooperative', 'dispatched_kg', 'received_kg', 'loss_kg', 'loss_pct', 'delivery_method', 'date'])
  }

  const SECTIONS = [
    { id: 'procurement', label: 'Procurement Summary' },
    { id: 'loss', label: 'Delivery Loss Comparison' },
    { id: 'batches', label: 'Batch Traceability' },
  ]

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analytics, delivery loss comparison, and traceability records.</p>
        </div>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-gray-200 print:hidden">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${section === s.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div ref={printRef}>

        {/* ── Procurement Summary ── */}
        {section === 'procurement' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
              <h2 className="text-base font-semibold text-gray-800">Procurement Summary — Last 6 months</h2>
              <button onClick={downloadProcurementCSV} className="btn-secondary text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total orders', value: totalOrders, icon: ShoppingCart, color: 'text-primary-500' },
                { label: 'Total spend', value: `RWF ${(totalSpend / 1000000).toFixed(1)}M`, icon: FileText, color: 'text-success-500' },
                { label: 'Deliveries completed', value: totalDeliveries, icon: Truck, color: 'text-success-500' },
                { label: 'Transit losses', value: `${totalLoss.toLocaleString()} kg`, icon: TrendingDown, color: 'text-warning-500' },
              ].map(s => (
                <div key={s.label} className="card flex items-center gap-3">
                  <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                  <div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Orders & Deliveries by Month</h3>
                <div className="h-52">
                  <Bar data={procurementChart} options={chartOptions('Count')} />
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Crops by Spend</h3>
                <div className="space-y-3">
                  {crops.map(c => {
                    const pct = Math.round((c.spend / crops.reduce((a, x) => a + x.spend, 0)) * 100)
                    return (
                      <div key={c.crop}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{c.crop}</span>
                          <span className="text-gray-500">RWF {(c.spend / 1000000).toFixed(1)}M · {pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: C.primary }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {['Month', 'Orders', 'Deliveries', 'Total Spend (RWF)', 'Avg/Order (RWF)', 'Transit Loss (kg)'].map(h => (
                      <th key={h} className="pb-2 text-gray-500 font-medium text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(m => (
                    <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-900">{m.month}</td>
                      <td className="py-2.5 text-right text-gray-700">{m.orders}</td>
                      <td className="py-2.5 text-right text-gray-700">{m.deliveries}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{m.spend.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-gray-500">{Math.round(m.spend / m.orders).toLocaleString()}</td>
                      <td className="py-2.5 text-right">
                        <span className={m.loss_kg > 50 ? 'text-warning-600 font-medium' : 'text-gray-500'}>{m.loss_kg} kg</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Delivery Loss Comparison ── */}
        {section === 'loss' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Delivery Method Loss Comparison</h2>
                <p className="text-sm text-gray-500 mt-0.5">Compare transit losses between self-collection and transporter delivery per market agent.</p>
              </div>
              <button onClick={downloadLossCSV} className="btn-secondary text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card border-2 border-warning-400">
                <p className="text-xs text-gray-500 mb-1">Avg Self-Collection Loss</p>
                <p className="text-3xl font-bold text-warning-500">{avgSelfLoss}%</p>
                <p className="text-xs text-gray-400 mt-1">Across all market agents</p>
              </div>
              <div className="card border-2 border-primary-600">
                <p className="text-xs text-gray-500 mb-1">Avg Transporter Loss</p>
                <p className="text-3xl font-bold text-primary-700">{avgTransLoss}%</p>
                <p className="text-xs text-gray-400 mt-1">Across all market agents</p>
              </div>
            </div>

            <div className="card bg-primary-50 border-primary-100">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-primary-600" />
                <div>
                  <p className="font-semibold text-primary-800">Insight: Transporter delivery reduces loss by {(avgSelfLoss - avgTransLoss).toFixed(1)} percentage points on average.</p>
                  <p className="text-sm text-primary-600 mt-0.5">Consider recommending transporter delivery for high-volume or cold-chain batches.</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Loss % by Market Agent & Delivery Method</h3>
              <div className="h-64">
                <Bar data={lossChart} options={chartOptions('Transit Loss (%)', 8)} />
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Per-Agent Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {['Market Agent', 'Batches', 'Self-Collection Loss', 'Transporter Loss', 'Savings (ppt)'].map(h => (
                      <th key={h} className="pb-2 text-gray-500 font-medium text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lossData.map(row => (
                    <tr key={row.agent} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-900">{row.agent}</td>
                      <td className="py-2.5 text-right text-gray-600">{row.batches}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-warning-600 font-medium">{row.self_collection_pct}%</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-primary-700 font-medium">{row.transporter_pct}%</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-success-600 font-medium">+{(row.self_collection_pct - row.transporter_pct).toFixed(1)} ppt</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Batch Traceability ── */}
        {section === 'batches' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Batch Traceability</h2>
                <p className="text-sm text-gray-500 mt-0.5">Per-batch journey records including confirmed receipt and transit losses.</p>
              </div>
              <button onClick={downloadBatchesCSV} className="btn-secondary text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    {['Batch ID', 'Crop', 'Cooperative', 'Method', 'Dispatched', 'Received', 'Loss', 'Loss %', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batches.map(b => (
                    <tr key={b.batch_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.batch_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 text-right">{b.crop}</td>
                      <td className="px-4 py-3 text-gray-600 text-right">{b.cooperative}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.delivery_method === 'Transporter' ? 'bg-primary-50 text-primary-700' : 'bg-warning-50 text-warning-700'}`}>
                          {b.delivery_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.dispatched_kg.toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-right text-gray-700">{b.received_kg.toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-right">
                        <span className={b.loss_kg > 20 ? 'text-warning-600 font-medium' : 'text-gray-600'}>{b.loss_kg} kg</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={b.loss_pct > 3 ? 'text-danger-600 font-medium' : b.loss_pct > 1.5 ? 'text-warning-600' : 'text-success-600'}>
                          {b.loss_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{b.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
