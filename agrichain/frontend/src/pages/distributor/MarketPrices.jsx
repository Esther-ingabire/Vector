import { useState } from 'react'
import { TrendingUp, TrendingDown, Search, RefreshCw } from 'lucide-react'

const MOCK_PRICES = [
  { crop: 'Tomatoes', variety: 'Roma', market: 'Kigali Central', price: 850, prev: 808, unit: 'kg', updated: '30 min ago' },
  { crop: 'Avocados', variety: 'Hass', market: 'Kigali Central', price: 1200, prev: 1225, unit: 'kg', updated: '45 min ago' },
  { crop: 'Maize', variety: 'Yellow', market: 'Huye Market', price: 400, prev: 394, unit: 'kg', updated: '1 hr ago' },
  { crop: 'Beans', variety: 'Kidney', market: 'Kigali Central', price: 900, prev: 831, unit: 'kg', updated: '2 hr ago' },
  { crop: 'Potatoes', variety: 'Irish', market: 'Musanze Market', price: 350, prev: 350, unit: 'kg', updated: '1 hr ago' },
  { crop: 'Onions', variety: 'Red', market: 'Kigali Central', price: 500, prev: 520, unit: 'kg', updated: '3 hr ago' },
  { crop: 'Carrots', variety: 'Nantes', market: 'Kigali Central', price: 450, prev: 430, unit: 'kg', updated: '2 hr ago' },
  { crop: 'Cabbage', variety: 'Green', market: 'Huye Market', price: 280, prev: 295, unit: 'kg', updated: '4 hr ago' },
]

export default function MarketPrices() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_PRICES.filter(p =>
    p.crop.toLowerCase().includes(search.toLowerCase()) ||
    p.market.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Prices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live market prices from agents across Rwanda.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" placeholder="Search crop or market…" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(p => {
          const change = ((p.price - p.prev) / p.prev * 100)
          const isUp = change > 0
          const isFlat = change === 0
          return (
            <div key={`${p.crop}-${p.market}`} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{p.crop}</p>
                <p className="text-xs text-gray-500">{p.variety} · {p.market}</p>
                <p className="text-xs text-gray-400 mt-1">Updated {p.updated}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">RWF {p.price.toLocaleString()}</p>
                <p className="text-xs text-gray-400">per {p.unit}</p>
                {!isFlat && (
                  <div className={`flex items-center justify-end gap-0.5 text-xs font-medium mt-1 ${isUp ? 'text-success-500' : 'text-danger-500'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-10 text-gray-400">
          <p>No prices found for "{search}"</p>
        </div>
      )}
    </div>
  )
}
