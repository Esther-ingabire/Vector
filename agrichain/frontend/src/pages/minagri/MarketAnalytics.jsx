import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

const CROPS = ['All crops', 'Tomatoes', 'Avocados', 'Maize', 'Beans', 'Potatoes']

const PRICE_HISTORY = {
  Tomatoes: [780, 800, 810, 808, 820, 840, 830, 850],
  Avocados: [1250, 1230, 1220, 1225, 1215, 1200, 1210, 1200],
  Maize: [380, 385, 390, 394, 398, 400, 402, 400],
  Beans: [820, 835, 840, 831, 850, 870, 885, 900],
  Potatoes: [340, 342, 345, 350, 355, 350, 348, 350],
}

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

const MARKET_SUMMARY = [
  { crop: 'Tomatoes', price: 850, vol_tons: 4200, change: +5.2 },
  { crop: 'Avocados', price: 1200, vol_tons: 2100, change: -2.1 },
  { crop: 'Maize', price: 400, vol_tons: 8600, change: +1.5 },
  { crop: 'Beans', price: 900, vol_tons: 3200, change: +8.3 },
  { crop: 'Potatoes', price: 350, vol_tons: 5400, change: 0 },
]

export default function MarketAnalytics() {
  const [selectedCrop, setSelectedCrop] = useState('Tomatoes')

  const history = PRICE_HISTORY[selectedCrop] || []
  const maxPrice = Math.max(...history)
  const minPrice = Math.min(...history)
  const chartH = 120

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Market Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">National price trends and market volumes across Rwanda.</p>
      </div>

      {/* Price trend chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">Price trend (RWF/kg) — last 8 months</h2>
          <select className="input text-sm py-1 w-36" value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}>
            {Object.keys(PRICE_HISTORY).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="relative" style={{ height: chartH + 40 }}>
          <svg width="100%" height={chartH + 32} viewBox={`0 0 600 ${chartH + 32}`} preserveAspectRatio="none">
            {history.map((v, i) => {
              const x = (i / (history.length - 1)) * 580 + 10
              const y = chartH - ((v - minPrice) / (maxPrice - minPrice || 1)) * (chartH - 10) + 5
              return (
                <g key={i}>
                  {i > 0 && (
                    <line
                      x1={(((i - 1) / (history.length - 1)) * 580 + 10)}
                      y1={chartH - ((history[i - 1] - minPrice) / (maxPrice - minPrice || 1)) * (chartH - 10) + 5}
                      x2={x} y2={y}
                      stroke="#3B82F6" strokeWidth="2"
                    />
                  )}
                  <circle cx={x} cy={y} r="4" fill="#3B82F6" />
                  <text x={x} y={chartH + 22} textAnchor="middle" fontSize="11" fill="#9CA3AF">{MONTHS[i]}</text>
                </g>
              )
            })}
          </svg>
          <div className="absolute top-0 left-0 flex flex-col justify-between h-full text-xs text-gray-400 py-1 pr-2" style={{ height: chartH + 5 }}>
            <span>RWF {maxPrice}</span>
            <span>RWF {Math.round((maxPrice + minPrice) / 2)}</span>
            <span>RWF {minPrice}</span>
          </div>
        </div>
      </div>

      {/* Market summary table */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Current market prices</h2>
        <div className="space-y-0">
          {MARKET_SUMMARY.map(m => (
            <div key={m.crop} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="w-32">
                <p className="font-medium text-gray-900">{m.crop}</p>
                <p className="text-xs text-gray-400">{m.vol_tons.toLocaleString()} tons traded</p>
              </div>
              <div className="flex-1 mx-6">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${(m.vol_tons / 10000) * 100}%` }} />
                </div>
              </div>
              <div className="text-right w-40">
                <p className="font-bold text-gray-900">RWF {m.price.toLocaleString()}/kg</p>
                <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${m.change > 0 ? 'text-success-500' : m.change < 0 ? 'text-danger-500' : 'text-gray-400'}`}>
                  {m.change > 0 ? <TrendingUp className="w-3 h-3" /> : m.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {m.change !== 0 ? `${m.change > 0 ? '+' : ''}${m.change}%` : 'No change'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
