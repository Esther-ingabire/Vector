import { useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Eye, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const STAGES   = ['All', 'Harvest', 'Storage', 'Transport', 'Distribution', 'Market']
const CROPS    = ['All', 'Coffee', 'Maize', 'Beans', 'Rice']
const DISTRICTS= ['All', 'Musanze', 'Kigali', 'Nyanza', 'Rubavu', 'Huye']
const METRICS  = ['Loss Rate %', 'Total Volume', 'Bottlenecks', 'Cold Chain Compliance', 'Transit Delays', 'Waste Cost']

const SAVED_REPORTS = [
  { name: 'Monthly Loss Summary - April 2026',   type: 'PDF',   date: 'May 1, 2026'   },
  { name: 'Coffee Supply Chain Analysis Q1',      type: 'Excel', date: 'Apr 15, 2026'  },
  { name: 'District Comparison Report',           type: 'PDF',   date: 'Apr 8, 2026'   },
]

const SUMMARY = [
  { crop: 'Coffee', volume: 245, loss: 8.2,  transit: 12.5 },
  { crop: 'Maize',  volume: 189, loss: 10.5, transit: 8.3  },
  { crop: 'Beans',  volume: 156, loss: 9.1,  transit: 10.2 },
  { crop: 'Rice',   volume: 98,  loss: 11.8, transit: 14.1 },
]

const barData = {
  labels: ['Coffee', 'Maize', 'Beans', 'Rice'],
  datasets: [{
    label: 'Volume (tons)',
    data: [245, 189, 156, 98],
    backgroundColor: '#2d6a4f',
    borderRadius: 4,
  }],
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} tons` } } },
  scales: {
    y: {
      min: 0, max: 280,
      grid: { color: '#f1f5f9' },
      ticks: { font: { size: 11 } },
      title: { display: true, text: 'Volume (tons)', font: { size: 11 }, color: '#6b7280' },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
}

const TYPE_STYLE = {
  PDF:   'bg-red-100 text-red-700',
  Excel: 'bg-green-100 text-green-700',
}

function PillGroup({ options, value, onChange, multi = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt
        return (
          <button
            key={opt}
            onClick={() => {
              if (multi) {
                onChange(prev =>
                  prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
                )
              } else {
                onChange(opt)
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              active
                ? 'bg-primary-800 text-white border-primary-800'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-700'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function CustomReportsPage() {
  const [stage,    setStage]    = useState('All')
  const [crop,     setCrop]     = useState('All')
  const [district, setDistrict] = useState('All')
  const [startDate,setStart]    = useState('04/01/2026')
  const [endDate,  setEnd]      = useState('05/03/2026')
  const [metrics,  setMetrics]  = useState(['Loss Rate %'])
  const [preview,  setPreview]  = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Build and export tailored supply chain reports</p>
      </div>

      {/* Report Builder */}
      <div className="card space-y-6">
        <h2 className="font-semibold text-gray-900">Custom Report Builder</h2>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Step 1: Select Supply Chain Stage</p>
          <PillGroup options={STAGES} value={stage} onChange={setStage} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Select Crop Type</p>
          <PillGroup options={CROPS} value={crop} onChange={setCrop} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Step 3: Select District</p>
          <PillGroup options={DISTRICTS} value={district} onChange={setDistrict} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Step 4: Select Time Period</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="label">Start Date</label>
              <input value={startDate} onChange={e => setStart(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input value={endDate} onChange={e => setEnd(e.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Step 5: Select Metrics (Multiple)</p>
          <PillGroup options={METRICS} value={metrics} onChange={setMetrics} multi />
        </div>

        <button
          onClick={() => setPreview(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Eye className="w-4 h-4" /> Preview Report
        </button>
      </div>

      {/* Report Preview */}
      {preview && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Report Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => toast.success('Exporting PDF…')}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={() => toast.success('Exporting Excel…')}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 font-medium">
            Loss Rate by Crop ({startDate} - {endDate})
          </p>
          <div className="h-52">
            <Bar data={barData} options={barOptions} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Summary Statistics</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Crop', 'Total Volume (tons)', 'Loss Rate %', 'Avg Transit Time (hrs)'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {SUMMARY.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 text-sm font-medium text-primary-700">{r.crop}</td>
                    <td className="py-3 pr-4 text-sm text-gray-700">{r.volume}</td>
                    <td className="py-3 pr-4 text-sm text-gray-700">{r.loss}%</td>
                    <td className="py-3 text-sm text-primary-700">{r.transit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Saved Reports</h2>
        <div className="space-y-3">
          {SAVED_REPORTS.map((r, i) => (
            <div key={i} className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Created: {r.date}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${TYPE_STYLE[r.type]}`}>{r.type}</span>
              <button
                onClick={() => toast.success(`Downloading "${r.name}"…`)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:border-primary-400 hover:text-primary-700 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
