import { useState } from 'react'
import { Search, Activity } from 'lucide-react'
import TraceabilityExplorer from '../../components/traceability/TraceabilityExplorer.jsx'
import ActiveBatches from './ActiveBatches.jsx'

const TABS = [
  { id: 'active',       label: 'Active Batches',     icon: Activity, desc: 'In-transit and in-progress batches with live IoT and GPS data' },
  { id: 'traceability', label: 'Traceability & Map',  icon: Search,   desc: 'Search and inspect any batch — route map, IoT readings, and QR scan timeline' },
]

export default function TraceabilityView() {
  const [tab, setTab] = useState('active')

  // The batch that "View route on map" was clicked for — passed to TraceabilityExplorer
  // so it auto-opens immediately without the user having to search again.
  const [viewBatch, setViewBatch] = useState(null)

  const handleViewMap = (batch) => {
    setViewBatch(batch)
    setTab('traceability')
  }

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

      {tab === 'active' && (
        <ActiveBatches onViewMap={handleViewMap} />
      )}

      {tab === 'traceability' && (
        // key={viewBatch?.id} forces a fresh mount when a specific batch is passed in
        // via "View route on map", so initialBatch is always picked up cleanly.
        <TraceabilityExplorer
          key={viewBatch?.id ?? 'default'}
          initialBatch={viewBatch}
          listTitle="Your dispatched batches"
          emptyListMessage="No batches dispatched yet"
          emptyListSubtext="Dispatch a batch to start tracking it here."
        />
      )}
    </div>
  )
}
