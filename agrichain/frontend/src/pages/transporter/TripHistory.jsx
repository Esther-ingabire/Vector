import { CheckCircle, Truck, Thermometer } from 'lucide-react'
import DataTable from '../../components/ui/DataTable.jsx'

const TRIPS = [
  { id: 'TRIP-801', batch_id: 'BATCH-Z9A1', crop: 'Beans', weight_kg: 300, origin: 'Huye', destination: 'Kigali', date: '2026-01-10', cold_chain: false, status: 'delivered', breach: false },
  { id: 'TRIP-802', batch_id: 'BATCH-Y3B2', crop: 'Tomatoes', weight_kg: 500, origin: 'Musanze', destination: 'Kigali', date: '2026-01-08', cold_chain: true, status: 'delivered', breach: false },
  { id: 'TRIP-803', batch_id: 'BATCH-X5C3', crop: 'Avocados', weight_kg: 250, origin: 'Huye', destination: 'Huye Market', date: '2026-01-06', cold_chain: false, status: 'delivered', breach: false },
  { id: 'TRIP-804', batch_id: 'BATCH-W1D4', crop: 'Maize', weight_kg: 800, origin: 'Rwamagana', destination: 'Kigali', date: '2026-01-04', cold_chain: false, status: 'delivered', breach: false },
  { id: 'TRIP-805', batch_id: 'BATCH-V7E5', crop: 'Tomatoes', weight_kg: 420, origin: 'Musanze', destination: 'Kigali', date: '2026-01-02', cold_chain: true, status: 'delivered', breach: true },
]

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'batch_id', label: 'Batch ID', render: v => <span className="font-mono text-sm">{v}</span> },
  { key: 'crop', label: 'Crop / Weight', render: (v, row) => (
    <div><p className="font-medium">{v}</p><p className="text-xs text-gray-400">{row.weight_kg.toLocaleString()} kg</p></div>
  )},
  { key: 'origin', label: 'Route', render: (v, row) => `${v} → ${row.destination}` },
  { key: 'cold_chain', label: 'Cold chain', render: (v, row) => v ? (
    <span className={`flex items-center gap-1 text-xs font-medium ${row.breach ? 'text-danger-500' : 'text-success-500'}`}>
      <Thermometer className="w-3 h-3" />{row.breach ? 'Breach recorded' : 'OK'}
    </span>
  ) : <span className="text-xs text-gray-400">N/A</span>},
  { key: 'status', label: 'Status', render: v => (
    <span className="flex items-center gap-1 text-xs font-medium text-success-500">
      <CheckCircle className="w-3 h-3" /> Delivered
    </span>
  )},
]

export default function TripHistory() {
  const totalKg = TRIPS.reduce((a, t) => a + t.weight_kg, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trip History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All completed deliveries.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <Truck className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{TRIPS.length}</p><p className="text-sm text-gray-500">Total trips</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{totalKg.toLocaleString()} kg</p><p className="text-sm text-gray-500">Total delivered</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <Thermometer className="w-6 h-6 text-warning-500" />
          <div><p className="text-xl font-bold">{TRIPS.filter(t => t.breach).length}</p><p className="text-sm text-gray-500">Cold chain breaches</p></div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={TRIPS} emptyMessage="No trips yet." />
      </div>
    </div>
  )
}
