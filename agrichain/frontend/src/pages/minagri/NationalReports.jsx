import { useState } from 'react'
import { Download, Filter } from 'lucide-react'
import DataTable from '../../components/ui/DataTable.jsx'
import RiskBadge from '../../components/ui/RiskBadge.jsx'

const REPORT_DATA = [
  { region: 'Kigali', crop: 'Tomatoes', produce_tons: 1200, cooperatives: 4, avg_price: 850, trend: +5.2, risk: 'low' },
  { region: 'Northern', crop: 'Avocados', produce_tons: 980, cooperatives: 6, avg_price: 1200, trend: -2.1, risk: 'low' },
  { region: 'Southern', crop: 'Beans', produce_tons: 650, cooperatives: 5, avg_price: 900, trend: +8.3, risk: 'medium' },
  { region: 'Eastern', crop: 'Maize', produce_tons: 2100, cooperatives: 7, avg_price: 400, trend: +1.5, risk: 'low' },
  { region: 'Western', crop: 'Potatoes', produce_tons: 320, cooperatives: 3, avg_price: 350, trend: -12.4, risk: 'high' },
  { region: 'Northern', crop: 'Tomatoes', produce_tons: 1800, cooperatives: 6, avg_price: 840, trend: +4.1, risk: 'low' },
  { region: 'Southern', crop: 'Maize', produce_tons: 1400, cooperatives: 6, avg_price: 410, trend: +2.2, risk: 'low' },
]

const columns = [
  { key: 'region', label: 'Region' },
  { key: 'crop', label: 'Crop' },
  { key: 'produce_tons', label: 'Volume (tons)', render: v => `${v.toLocaleString()} t` },
  { key: 'cooperatives', label: 'Cooperatives' },
  { key: 'avg_price', label: 'Avg price (RWF/kg)', render: v => `RWF ${v.toLocaleString()}` },
  { key: 'trend', label: 'Price trend', render: v => (
    <span className={`text-sm font-medium ${v > 0 ? 'text-success-500' : 'text-danger-500'}`}>
      {v > 0 ? '+' : ''}{v}%
    </span>
  )},
  { key: 'risk', label: 'Risk level', render: v => <RiskBadge risk={v} /> },
]

const PERIODS = ['This month', 'Last month', 'Last quarter', 'Last year']

export default function NationalReports() {
  const [period, setPeriod] = useState('This month')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">National Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Aggregate production, pricing and risk data by region and crop.</p>
        </div>
        <div className="flex gap-3">
          <select className="input text-sm py-1.5 w-40" value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIODS.map(p => <option key={p}>{p}</option>)}
          </select>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total volume tracked', value: `${REPORT_DATA.reduce((a, r) => a + r.produce_tons, 0).toLocaleString()} tons` },
          { label: 'Regions covered', value: [...new Set(REPORT_DATA.map(r => r.region))].length },
          { label: 'Crops monitored', value: [...new Set(REPORT_DATA.map(r => r.crop))].length },
          { label: 'High-risk areas', value: REPORT_DATA.filter(r => r.risk === 'high').length },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Production & pricing by region · {period}</p>
        </div>
        <DataTable columns={columns} data={REPORT_DATA} emptyMessage="No data available." />
      </div>
    </div>
  )
}
