import { useState } from 'react'
import { MapPin, Package } from 'lucide-react'
import TraceabilityExplorer from '../../components/traceability/TraceabilityExplorer.jsx'
import IncomingDeliveries from './IncomingDeliveries.jsx'

const TABS = [
  { id: 'track',    label: 'Traceability & Map',  icon: MapPin,   desc: 'Search any batch in transit — see the live route map, GPS position, cold-chain temperature, and supply chain timeline' },
  { id: 'incoming', label: 'Incoming Deliveries',  icon: Package, desc: 'Batches that have arrived or are on their way — confirm receipt and record weights and quality here' },
]

export default function DistributorTraceability() {
  const [tab, setTab] = useState('track')

  return (
    <div className="space-y-6">
      {/* Tab strip */}
      <div>
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-1">
          {TABS.find(t => t.id === tab)?.desc}
        </p>
      </div>

      {tab === 'track' && (
        <TraceabilityExplorer
          listTitle="Your batches"
          emptyListMessage="No batches yet"
          emptyListSubtext="Batches dispatched to you will appear here once they are in transit."
        />
      )}

      {tab === 'incoming' && <IncomingDeliveries />}
    </div>
  )
}
