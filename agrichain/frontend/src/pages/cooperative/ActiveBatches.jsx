import { useState } from 'react'
import { QrCode, MapPin, Thermometer, Truck, Clock, CheckCircle } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Modal from '../../components/ui/Modal.jsx'

const MOCK_BATCHES = [
  {
    id: 'BATCH-A4F2', crop: 'Tomatoes', weight_kg: 450, grade: 'A',
    origin: 'Musanze', destination: 'Kigali',
    transporter: 'Jean Mugisha', vehicle: 'RAD 342C',
    cold_chain: true, temp: 11.2, temp_status: 'ok',
    gps: 'Kigali – near Nyabugogo',
    eta: '2h 30m', dispatched: '2026-01-13 08:00', status: 'in_transit',
    events: [
      { time: '08:00', event: 'Batch dispatched from Musanze' },
      { time: '09:30', event: 'Checkpoint: Rulindo — temp 11.4°C ✓' },
      { time: '10:45', event: 'Checkpoint: Kigali outskirts — temp 11.2°C ✓' },
    ],
  },
  {
    id: 'BATCH-B7D1', crop: 'Avocados', weight_kg: 300, grade: 'A',
    origin: 'Huye', destination: 'Kigali',
    transporter: 'Marie Uwase', vehicle: 'RAC 108A',
    cold_chain: false, temp: null, temp_status: null,
    gps: 'Huye – Muhanga road',
    eta: '4h 15m', dispatched: '2026-01-13 07:30', status: 'in_transit',
    events: [
      { time: '07:30', event: 'Batch dispatched from Huye' },
      { time: '09:00', event: 'Checkpoint: Muhanga — on schedule' },
    ],
  },
  {
    id: 'BATCH-C1E3', crop: 'Maize', weight_kg: 800, grade: 'B',
    origin: 'Rwamagana', destination: 'Huye',
    transporter: 'Diane Uwimana', vehicle: 'RAB 556T',
    cold_chain: false, temp: null, temp_status: null,
    gps: 'Huye market',
    eta: null, dispatched: '2026-01-12 09:00', status: 'delivered',
    events: [
      { time: '09:00', event: 'Batch dispatched from Rwamagana' },
      { time: '13:00', event: 'Arrived at Huye market — delivery confirmed' },
    ],
  },
]

export default function ActiveBatches() {
  const [selected, setSelected] = useState(null)

  const active = MOCK_BATCHES.filter(b => b.status === 'in_transit')
  const delivered = MOCK_BATCHES.filter(b => b.status === 'delivered')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Batches</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track batches in transit and recent deliveries.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Truck className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{active.length}</p><p className="text-sm text-gray-500">In transit</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-success-500" />
          <div><p className="text-xl font-bold">{delivered.length}</p><p className="text-sm text-gray-500">Delivered today</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Thermometer className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{active.filter(b => b.cold_chain).length}</p><p className="text-sm text-gray-500">Cold chain active</p></div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-700">In Transit</h2>
        {active.map(batch => (
          <div key={batch.id} onClick={() => setSelected(batch)}
            className="card cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{batch.crop} <span className="text-gray-400 font-normal">· {batch.weight_kg} kg</span></p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                  <MapPin className="w-3 h-3" /> {batch.origin} → {batch.destination}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {batch.cold_chain && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${batch.temp_status === 'ok' ? 'bg-success-50 text-success-500' : 'bg-danger-50 text-danger-500'}`}>
                  <Thermometer className="w-3 h-3" /> {batch.temp}°C
                </span>
              )}
              <div className="text-right">
                <p className="text-gray-900 font-medium">ETA {batch.eta}</p>
                <p className="text-xs text-gray-400">{batch.transporter}</p>
              </div>
              <StatusBadge status={batch.status} />
            </div>
          </div>
        ))}
      </div>

      {delivered.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700">Delivered</h2>
          {delivered.map(batch => (
            <div key={batch.id} onClick={() => setSelected(batch)}
              className="card cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between gap-4 opacity-80">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{batch.crop} <span className="text-gray-400 font-normal">· {batch.weight_kg} kg</span></p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3 h-3" /> {batch.origin} → {batch.destination}
                  </div>
                </div>
              </div>
              <StatusBadge status="delivered" />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Batch ${selected.id}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Crop', selected.crop],
                ['Weight', `${selected.weight_kg.toLocaleString()} kg`],
                ['Grade', `Grade ${selected.grade}`],
                ['Transporter', selected.transporter],
                ['Vehicle', selected.vehicle],
                ['GPS location', selected.gps],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Timeline</p>
              <div className="space-y-2">
                {selected.events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0 pt-0.5">{ev.time}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700">{ev.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
