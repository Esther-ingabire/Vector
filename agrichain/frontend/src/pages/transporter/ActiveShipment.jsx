import { useState } from 'react'
import { Thermometer, MapPin, CheckCircle, Plus } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import toast from 'react-hot-toast'

const ACTIVE = {
  batch_id: 'BATCH-A4F2',
  crop: 'Tomatoes',
  weight_kg: 450,
  grade: 'A',
  origin: 'Musanze',
  destination: 'Kigali Central Market',
  cold_chain: true,
  cooperative: 'Musanze Farmers Cooperative',
  dispatcher_phone: '+250 788 000 001',
}

const INITIAL_EVENTS = [
  { time: '08:00', location: 'Musanze', note: 'Batch loaded and dispatched', temp: 12.0 },
  { time: '09:30', location: 'Rulindo', note: 'Checkpoint — on schedule', temp: 11.8 },
  { time: '10:45', location: 'Kigali outskirts', note: 'Checkpoint', temp: 11.2 },
]

export default function ActiveShipment() {
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [showLog, setShowLog] = useState(false)
  const [showDeliver, setShowDeliver] = useState(false)
  const [form, setForm] = useState({ location: '', note: '', temp: '' })
  const [delivered, setDelivered] = useState(false)

  const logCheckpoint = (e) => {
    e.preventDefault()
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setEvents(prev => [...prev, { time, location: form.location, note: form.note, temp: form.temp ? Number(form.temp) : null }])
    toast.success('Checkpoint logged')
    setShowLog(false)
    setForm({ location: '', note: '', temp: '' })
  }

  const confirmDelivery = () => {
    setDelivered(true)
    toast.success('Delivery confirmed! Batch marked as delivered.')
    setShowDeliver(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Shipment</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log checkpoints and confirm delivery.</p>
      </div>

      {delivered ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Delivery confirmed!</h2>
          <p className="text-sm text-gray-500 mt-2">Batch {ACTIVE.batch_id} has been marked as delivered to {ACTIVE.destination}.</p>
        </div>
      ) : (
        <>
          {/* Batch info */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">{ACTIVE.batch_id}</p>
                <h2 className="text-xl font-bold text-gray-900">{ACTIVE.crop} — {ACTIVE.weight_kg} kg (Grade {ACTIVE.grade})</h2>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{ACTIVE.origin} → {ACTIVE.destination}</p>
                <p className="text-sm text-gray-500">{ACTIVE.cooperative}</p>
              </div>
              {ACTIVE.cold_chain && (
                <div className="bg-success-50 rounded-xl p-3 text-center">
                  <Thermometer className="w-5 h-5 text-success-500 mx-auto" />
                  <p className="text-xl font-bold text-success-500 mt-1">{events[events.length - 1]?.temp}°C</p>
                  <p className="text-xs text-success-500">Cold chain OK</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Checkpoints</h2>
              <button onClick={() => setShowLog(true)} className="btn-secondary text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Log checkpoint
              </button>
            </div>
            <div className="space-y-0">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 mt-1 flex-shrink-0" />
                    {i < events.length - 1 && <div className="w-0.5 flex-1 bg-primary-200 my-1" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{ev.time}</span>
                      <span className="text-sm font-medium text-gray-900">{ev.location}</span>
                      {ev.temp && <span className="text-xs text-success-500"><Thermometer className="w-3 h-3 inline" /> {ev.temp}°C</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setShowDeliver(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <CheckCircle className="w-5 h-5" /> Confirm Delivery
          </button>
        </>
      )}

      {/* Log checkpoint modal */}
      <Modal isOpen={showLog} onClose={() => setShowLog(false)} title="Log Checkpoint">
        <form onSubmit={logCheckpoint} className="space-y-4">
          <div>
            <label className="label">Current location</label>
            <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required placeholder="e.g. Muhanga" />
          </div>
          {ACTIVE.cold_chain && (
            <div>
              <label className="label">Temperature (°C)</label>
              <input type="number" step="0.1" className="input" value={form.temp} onChange={e => setForm(f => ({ ...f, temp: e.target.value }))} required />
            </div>
          )}
          <div>
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. On schedule, no issues" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowLog(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Log</button>
          </div>
        </form>
      </Modal>

      {/* Confirm delivery modal */}
      <Modal isOpen={showDeliver} onClose={() => setShowDeliver(false)} title="Confirm Delivery">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to confirm delivery of batch <strong>{ACTIVE.batch_id}</strong> to <strong>{ACTIVE.destination}</strong>?</p>
          <p className="text-sm text-gray-500">This action cannot be undone. A delivery receipt will be generated automatically.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeliver(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={confirmDelivery} className="btn-primary flex-1">Confirm Delivery</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
