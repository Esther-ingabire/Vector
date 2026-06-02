import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import DataTable from '../../components/ui/DataTable.jsx'
import Modal from '../../components/ui/Modal.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'

const MOCK_STOCK = [
  { id: 1, crop: 'Tomatoes', variety: 'Roma', quantity_kg: 1200, quality_grade: 'A', location: 'Store A', added_date: '2025-01-10', expiry_date: '2025-01-20', status: 'available' },
  { id: 2, crop: 'Avocados', variety: 'Hass', quantity_kg: 850, quality_grade: 'A', location: 'Store B', added_date: '2025-01-09', expiry_date: '2025-01-25', status: 'available' },
  { id: 3, crop: 'Maize', variety: 'Yellow', quantity_kg: 3400, quality_grade: 'B', location: 'Store A', added_date: '2025-01-05', expiry_date: '2025-03-05', status: 'reserved' },
  { id: 4, crop: 'Beans', variety: 'Kidney', quantity_kg: 600, quality_grade: 'A', location: 'Store C', added_date: '2025-01-08', expiry_date: '2025-02-28', status: 'available' },
  { id: 5, crop: 'Potatoes', variety: 'Irish', quantity_kg: 2100, quality_grade: 'B', location: 'Store A', added_date: '2025-01-07', expiry_date: '2025-02-07', status: 'low_stock' },
]

const columns = [
  { key: 'crop', label: 'Crop', render: (v, row) => (
    <div>
      <p className="font-medium text-gray-900">{v}</p>
      <p className="text-xs text-gray-500">{row.variety}</p>
    </div>
  )},
  { key: 'quantity_kg', label: 'Quantity (kg)', render: v => <span className="font-medium">{v.toLocaleString()} kg</span> },
  { key: 'quality_grade', label: 'Grade', render: v => (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${v === 'A' ? 'bg-success-50 text-success-500' : 'bg-warning-50 text-warning-500'}`}>Grade {v}</span>
  )},
  { key: 'location', label: 'Location' },
  { key: 'expiry_date', label: 'Expires' },
  { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
]

export default function StockManagement() {
  const [stock, setStock] = useState(MOCK_STOCK)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ crop: '', variety: '', quantity_kg: '', quality_grade: 'A', location: '', expiry_date: '' })
  const [saving, setSaving] = useState(false)

  const filtered = stock.filter(s =>
    s.crop.toLowerCase().includes(search.toLowerCase()) ||
    s.variety.toLowerCase().includes(search.toLowerCase())
  )

  const totalKg = stock.reduce((acc, s) => acc + s.quantity_kg, 0)
  const available = stock.filter(s => s.status === 'available').length
  const lowStock = stock.filter(s => s.status === 'low_stock').length

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await cooperativesApi.addStock?.(form)
      setStock(prev => [...prev, { ...form, id: Date.now(), quantity_kg: Number(form.quantity_kg), added_date: new Date().toISOString().split('T')[0], status: 'available' }])
      toast.success('Stock record added')
      setShowAdd(false)
      setForm({ crop: '', variety: '', quantity_kg: '', quality_grade: 'A', location: '', expiry_date: '' })
    } catch {
      setStock(prev => [...prev, { ...form, id: Date.now(), quantity_kg: Number(form.quantity_kg), added_date: new Date().toISOString().split('T')[0], status: 'available' }])
      toast.success('Stock record added')
      setShowAdd(false)
      setForm({ crop: '', variety: '', quantity_kg: '', quality_grade: 'A', location: '', expiry_date: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage produce inventory.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <Package className="w-6 h-6 text-primary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{totalKg.toLocaleString()} kg</p>
          <p className="text-sm text-gray-500">Total inventory</p>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-6 h-6 text-success-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{available}</p>
          <p className="text-sm text-gray-500">Available batches</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-6 h-6 text-warning-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{lowStock}</p>
          <p className="text-sm text-gray-500">Low stock alerts</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-1.5 text-sm" placeholder="Search crop…" />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="No stock records found." />
      </div>

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Stock Record">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop name</label>
              <input className="input" value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} required placeholder="e.g. Tomatoes" />
            </div>
            <div>
              <label className="label">Variety</label>
              <input className="input" value={form.variety} onChange={e => setForm(f => ({ ...f, variety: e.target.value }))} required placeholder="e.g. Roma" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity (kg)</label>
              <input type="number" className="input" value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))} required min="1" />
            </div>
            <div>
              <label className="label">Quality grade</label>
              <select className="input" value={form.quality_grade} onChange={e => setForm(f => ({ ...f, quality_grade: e.target.value }))}>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Storage location</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required placeholder="e.g. Store A" />
            </div>
            <div>
              <label className="label">Expiry date</label>
              <input type="date" className="input" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Add Stock'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
