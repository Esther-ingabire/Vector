import { BarChart2, Download, TrendingUp, Package, Truck, DollarSign } from 'lucide-react'

const MONTHLY = [
  { month: 'Sep', orders: 18, spend: 4200000 },
  { month: 'Oct', orders: 22, spend: 5100000 },
  { month: 'Nov', orders: 25, spend: 5800000 },
  { month: 'Dec', orders: 30, spend: 7200000 },
  { month: 'Jan', orders: 12, spend: 3100000 },
]

const TOP_CROPS = [
  { crop: 'Tomatoes', qty_kg: 4200, spend: 3570000 },
  { crop: 'Avocados', qty_kg: 2100, spend: 2520000 },
  { crop: 'Maize', qty_kg: 6500, spend: 2600000 },
  { crop: 'Beans', qty_kg: 1800, spend: 1620000 },
]

const maxOrders = Math.max(...MONTHLY.map(m => m.orders))

export default function DistributorReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Procurement summary and analytics.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total orders (Jan)', value: '12', icon: <Package className="w-5 h-5 text-primary-500" /> },
          { label: 'Total spend (Jan)', value: 'RWF 3.1M', icon: <DollarSign className="w-5 h-5 text-success-500" /> },
          { label: 'Deliveries completed', value: '8', icon: <Truck className="w-5 h-5 text-success-500" /> },
          { label: 'Avg delivery time', value: '1.8 days', icon: <TrendingUp className="w-5 h-5 text-warning-500" /> },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Orders by month chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Orders per month</h2>
          <div className="flex items-end gap-3 h-40">
            {MONTHLY.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{m.orders}</span>
                <div className="w-full rounded-t-md bg-primary-400"
                  style={{ height: `${Math.max(8, (m.orders / maxOrders) * 100)}%` }} />
                <span className="text-xs text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top crops */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Top crops by spend</h2>
          <div className="space-y-3">
            {TOP_CROPS.map((c, i) => {
              const pct = Math.round((c.spend / TOP_CROPS.reduce((a, x) => a + x.spend, 0)) * 100)
              return (
                <div key={c.crop}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{c.crop}</span>
                    <span className="text-gray-500">RWF {(c.spend / 1000000).toFixed(1)}M · {pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Monthly summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-gray-500 font-medium">Month</th>
              <th className="pb-2 text-gray-500 font-medium text-right">Orders</th>
              <th className="pb-2 text-gray-500 font-medium text-right">Total spend</th>
              <th className="pb-2 text-gray-500 font-medium text-right">Avg per order</th>
            </tr>
          </thead>
          <tbody>
            {MONTHLY.map(m => (
              <tr key={m.month} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-gray-900">{m.month} 2025</td>
                <td className="py-2.5 text-right text-gray-600">{m.orders}</td>
                <td className="py-2.5 text-right font-medium text-gray-900">RWF {m.spend.toLocaleString()}</td>
                <td className="py-2.5 text-right text-gray-500">RWF {Math.round(m.spend / m.orders).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
