import { useState } from 'react'
import { Search, QrCode, MapPin, CheckCircle, Truck, Package, ShoppingCart } from 'lucide-react'

const MOCK_BATCHES = {
  'BATCH-A4F2': {
    id: 'BATCH-A4F2',
    crop: 'Tomatoes',
    variety: 'Roma',
    weight_kg: 450,
    grade: 'A',
    cooperative: 'Musanze Farmers Cooperative',
    farmer: 'Alain Nkurunziza',
    harvest_date: '2025-01-10',
    events: [
      { step: 'Harvest', icon: 'farm', date: '2025-01-10', location: 'Musanze Farm — Plot 14B', detail: 'Harvested by Alain Nkurunziza, 450 kg Grade A', status: 'done' },
      { step: 'Storage', icon: 'store', date: '2025-01-10', location: 'Cooperative Cold Store A', detail: 'Stored at 12°C, humidity 68% — quality check passed', status: 'done' },
      { step: 'Dispatch', icon: 'truck', date: '2025-01-13', location: 'Musanze → Kigali', detail: 'Transporter: Jean Mugisha · Vehicle RAD 342C', status: 'done' },
      { step: 'In Transit', icon: 'truck', date: '2025-01-13', location: 'Kigali outskirts', detail: 'Cold chain maintained · Temp 11.2°C', status: 'active' },
      { step: 'Delivery', icon: 'market', date: null, location: 'Kigali Central Market', detail: 'Awaiting delivery confirmation', status: 'pending' },
    ],
  },
  'BATCH-B7D1': {
    id: 'BATCH-B7D1',
    crop: 'Avocados',
    variety: 'Hass',
    weight_kg: 300,
    grade: 'A',
    cooperative: 'Huye Highlands Cooperative',
    farmer: 'Solange Mukamana',
    harvest_date: '2025-01-09',
    events: [
      { step: 'Harvest', icon: 'farm', date: '2025-01-09', location: 'Huye Farm — Block 3', detail: 'Harvested by Solange Mukamana, 300 kg Grade A', status: 'done' },
      { step: 'Storage', icon: 'store', date: '2025-01-09', location: 'Cooperative Dry Store', detail: 'Quality check passed — Grade A confirmed', status: 'done' },
      { step: 'Dispatch', icon: 'truck', date: '2025-01-13', location: 'Huye → Kigali', detail: 'Transporter: Marie Uwase · Vehicle RAC 108A', status: 'active' },
      { step: 'Delivery', icon: 'market', date: null, location: 'Kigali Central Market', detail: 'Awaiting delivery', status: 'pending' },
    ],
  },
}

const iconMap = {
  farm: <Package className="w-4 h-4" />,
  store: <CheckCircle className="w-4 h-4" />,
  truck: <Truck className="w-4 h-4" />,
  market: <ShoppingCart className="w-4 h-4" />,
}

const stepColors = {
  done: { dot: 'bg-success-500 border-success-200', text: 'text-success-500', line: 'bg-success-200' },
  active: { dot: 'bg-primary-500 border-primary-200 animate-pulse', text: 'text-primary-500', line: 'bg-gray-200' },
  pending: { dot: 'bg-gray-200 border-gray-100', text: 'text-gray-400', line: 'bg-gray-100' },
}

export default function TraceabilityView() {
  const [query, setQuery] = useState('')
  const [batch, setBatch] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    const found = MOCK_BATCHES[query.trim().toUpperCase()]
    if (found) { setBatch(found); setNotFound(false) }
    else { setBatch(null); setNotFound(true) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Traceability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track any batch from farm to market using its batch ID or QR code.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter batch ID e.g. BATCH-A4F2"
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2 px-5">
          <QrCode className="w-4 h-4" /> Trace
        </button>
      </form>

      {/* Hint */}
      <div className="flex gap-2 text-sm text-gray-500">
        <span>Try:</span>
        {Object.keys(MOCK_BATCHES).map(k => (
          <button key={k} onClick={() => { setQuery(k); setBatch(MOCK_BATCHES[k]); setNotFound(false) }}
            className="text-primary-600 hover:underline font-mono">{k}</button>
        ))}
      </div>

      {notFound && (
        <div className="card text-center py-10 text-gray-400">
          <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Batch not found</p>
          <p className="text-sm mt-1">Check the batch ID and try again.</p>
        </div>
      )}

      {batch && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">{batch.id}</p>
                <h2 className="text-xl font-bold text-gray-900">{batch.crop} <span className="text-gray-400 font-normal">({batch.variety})</span></h2>
                <p className="text-sm text-gray-500 mt-0.5">{batch.weight_kg} kg · Grade {batch.grade} · Harvested {batch.harvest_date}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{batch.cooperative}</p>
                <p>{batch.farmer}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-5">Supply chain journey</h2>
            <div className="space-y-0">
              {batch.events.map((ev, i) => {
                const c = stepColors[ev.status]
                const isLast = i === batch.events.length - 1
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${c.dot} ${c.text}`}>
                        {iconMap[ev.icon]}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 my-1 ${c.line}`} style={{ minHeight: 24 }} />}
                    </div>
                    <div className={`pb-5 ${isLast ? '' : ''}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${ev.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{ev.step}</p>
                        {ev.date && <span className="text-xs text-gray-400">{ev.date}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </div>
                      <p className="text-xs text-gray-500">{ev.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
