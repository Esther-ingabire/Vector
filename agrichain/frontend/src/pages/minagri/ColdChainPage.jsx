import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, ScatterController, Tooltip, Legend,
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import { Thermometer, AlertTriangle, TrendingDown } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ScatterController, Tooltip, Legend)

const DEVIATION_HISTORY = [
  { date: 'Apr 28', count: 2, level: 'LOW'    },
  { date: 'Apr 29', count: 5, level: 'MEDIUM' },
  { date: 'Apr 30', count: 1, level: 'LOW'    },
  { date: 'May 1',  count: 8, level: 'HIGH'   },
  { date: 'May 2',  count: 3, level: 'MEDIUM' },
  { date: 'May 3',  count: 1, level: 'LOW'    },
]

const FACILITIES = [
  { name: 'Kigali Cold Storage',  location: 'Kigali',  score: 94, violations: 3, status: 'Good'              },
  { name: 'Musanze Storage Hub',  location: 'Musanze', score: 98, violations: 1, status: 'Excellent'         },
  { name: 'Nyanza Distribution',  location: 'Nyanza',  score: 87, violations: 6, status: 'Needs Improvement' },
  { name: 'Rubavu Warehouse',     location: 'Rubavu',  score: 92, violations: 4, status: 'Good'              },
]

const DEV_STYLE = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
}

const FACILITY_STATUS_STYLE = {
  Excellent:          'bg-green-100 text-green-700',
  Good:               'bg-yellow-100 text-yellow-700',
  'Needs Improvement':'bg-red-100 text-red-700',
}

function complianceBarColor(score) {
  if (score >= 95) return 'bg-success-500'
  if (score >= 88) return 'bg-warning-400'
  return 'bg-danger-500'
}

const tempHumidityData = {
  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  datasets: [
    {
      label: 'Temperature °C',
      data: [21, 21, 22, 24, 24, 22],
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220,38,38,0.05)',
      pointBackgroundColor: '#dc2626',
      pointRadius: 4,
      tension: 0.3,
      yAxisID: 'yTemp',
    },
    {
      label: 'Humidity %',
      data: [63, 62, 62, 61, 61, 62],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.05)',
      pointBackgroundColor: '#2563eb',
      pointStyle: 'circle',
      pointRadius: 4,
      tension: 0.3,
      yAxisID: 'yHumid',
    },
  ],
}

const tempHumidityOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 12 }, padding: 20 } },
    tooltip: {
      callbacks: {
        label: ctx => ctx.dataset.yAxisID === 'yTemp'
          ? ` Temperature °C: ${ctx.raw}`
          : ` Humidity %: ${ctx.raw}`,
      },
    },
  },
  scales: {
    yTemp: {
      type: 'linear', position: 'left',
      min: 0, max: 28,
      grid: { color: '#f1f5f9' },
      ticks: { font: { size: 11 } },
      title: { display: true, text: 'Temperature (°C)', font: { size: 11 }, color: '#6b7280' },
    },
    yHumid: {
      type: 'linear', position: 'right',
      min: 0, max: 80,
      grid: { drawOnChartArea: false },
      ticks: { font: { size: 11 } },
      title: { display: true, text: 'Humidity (%)', font: { size: 11 }, color: '#6b7280' },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
}

const scatterData = {
  datasets: [{
    label: 'Temperature vs Loss Rate',
    data: [
      { x: 18, y: 2.1 }, { x: 20, y: 1.8 }, { x: 22, y: 1.6 },
      { x: 24, y: 2.2 }, { x: 26, y: 3.9 }, { x: 28, y: 5.2 }, { x: 30, y: 7.3 },
    ],
    backgroundColor: '#dc2626',
    pointRadius: 6,
  }],
}

const scatterOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}°C → ${ctx.parsed.y}% loss` } } },
  scales: {
    x: {
      min: 16, max: 32,
      grid: { color: '#f1f5f9' },
      ticks: { callback: v => `${v}°C`, font: { size: 11 } },
      title: { display: false },
    },
    y: {
      min: 0, max: 9,
      grid: { color: '#f1f5f9' },
      ticks: { callback: v => `${v}%`, font: { size: 11 } },
      title: { display: true, text: 'Loss Rate (%)', font: { size: 11 }, color: '#6b7280' },
    },
  },
}

export default function ColdChainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cold Chain Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Temperature compliance, deviations and facility performance</p>
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card border-2 border-success-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Thermometer className="w-3.5 h-3.5 text-success-600" /> Overall Compliance
          </div>
          <p className="text-3xl font-bold text-success-600">92.8%</p>
          <p className="text-xs text-gray-400 mt-1">Across all facilities</p>
        </div>
        <div className="card border-2 border-warning-400">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-500" /> Active Deviations
          </div>
          <p className="text-3xl font-bold text-warning-500">4</p>
          <p className="text-xs text-gray-400 mt-1">Requires attention</p>
        </div>
        <div className="card border-2 border-primary-500">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-primary-600" /> Avg Loss (Cold Chain)
          </div>
          <p className="text-3xl font-bold text-primary-700">2.3%</p>
          <p className="text-xs text-success-600 mt-1">↓ 0.4% vs last month</p>
        </div>
      </div>

      {/* Temp & Humidity chart */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-1">Real-Time Temperature & Humidity</h2>
        <p className="text-xs text-gray-400 mb-4">Kigali Cold Storage — Today</p>
        <div className="h-60">
          <Line data={tempHumidityData} options={tempHumidityOptions} />
        </div>
      </div>

      {/* Deviation History + Facility Compliance */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Temperature Deviation History (Last 7 Days)</h2>
          <div className="space-y-2">
            {DEVIATION_HISTORY.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700 font-medium">{d.date}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{d.count} deviation{d.count !== 1 ? 's' : ''}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${DEV_STYLE[d.level]}`}>
                    {d.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Facility Compliance Scores</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Facility', 'Location', 'Score', 'Violations', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FACILITIES.map((f, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 pr-3 text-sm font-medium text-gray-800 whitespace-nowrap">{f.name}</td>
                    <td className="py-3 pr-3 text-sm text-gray-500">{f.location}</td>
                    <td className="py-3 pr-3 w-28">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${complianceBarColor(f.score)}`} style={{ width: `${f.score}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{f.score}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-sm text-gray-600">{f.violations}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FACILITY_STATUS_STYLE[f.status]}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Scatter: Temp vs Loss Rate */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-1">Temperature vs Loss Rate Correlation</h2>
        <div className="h-52">
          <Scatter data={scatterData} options={scatterOptions} />
        </div>
        <p className="text-xs text-center text-gray-400 mt-3">
          Correlation coefficient: r = 0.89 (strong positive correlation)
        </p>
      </div>
    </div>
  )
}
