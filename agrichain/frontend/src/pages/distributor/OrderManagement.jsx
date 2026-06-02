import { useState } from 'react'
import { Plus, Search, Eye } from 'lucide-react'
import DataTable from '../../components/ui/DataTable.jsx'
import Modal from '../../components/ui/Modal.jsx'
import toast from 'react-hot-toast'

const MOCK_ORDERS = [
  { id: 'ORD-201', cooperative: 'Musanze Farmers Coop', crop: 'Tomatoes', quantity_kg: 500, grade: 'A', price_per_kg: 850, total: 425000, order_date: '2025-01-12', delivery_date: '2025-01-15', status: 'approved' },
  { id: 'ORD-202', cooperative: 'Huye Highlands Coop', crop: 'Avocados', quantity_kg: 300, grade: 'A', price_per_kg: 1200, total: 360000, order_date: '2025-01-11', delivery_date: '2025-01-14', status: 'pending' },
  { id: 'ORD-203', cooperative: 'Rwamagana Coop', crop: 'Beans', quantity_kg: 200, grade: 'B', price_per_kg: 600, total: 120000, order_date: '2025-01-10', delivery_date: '2025-01-13', status: 'in_transit' },
  { id: 'ORD-204', cooperative: 'Musanze Farmers Coop', crop: 'Maize', quantity_kg: 1000, grade: 'B', price_per_kg: 400, total: 400000, order_date: '2025-01-09', delivery_date: '2025-01-16', status: 'delivered' },
]

const STATUS_STYLES = {
  pending: 'bg-warning-50 text-warning-500',
  approved: 'bg-primary-50 text-primary-500',
  in_transit: 'bg-success-50 text-success-500',
  delivered: 'bg-gray-100 text-gray-600',
  rejected: 'bg-danger-50 text-danger-500',
}

const COOPERATIVES = ['Musanze Farmers Coop', 'Huye Highlands Coop', 'Rwamagana Coop', 'Nyagatare Coop']
const CROPS = ['Tomatoes', 'Avocados', 'Beans', 'Maize', 'Potatoes', 'Onions']

export default function OrderManagement() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ cooperative: '', crop: '', quantity_kg: '', grade: 'A', price_per_kg: '', delivery_date: '' })
  const [saving, setSaving] = useState(false)

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => o.crop.toLowerCase().includes(search.toLowerCase()) || o.cooperative.toLowerCase().includes(search.toLowerCase()))

  const handleNew = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      const qty = Number(form.quantity_kg)
      const price = Number(form.price_per_kg)
      setOrders(prev => [...prev, {
        ...form, id: `ORD-${200 + prev.length + 5}`,
        quantity_kg: qty, price_per_kg: price, total: qty * price,
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending',
      }])
      toast.success('Order placed successfully')
      setShowNew(false)
      setForm({ cooperative: '', crop: '', quantity_kg: '', grade: 'A', price_per_kg: '', delivery_date: '' })
      setSaving(false)
    }, 600)
  }

  const columns = [
    { key: 'id', label: 'Order ID', render: v => <span className="font-mono text-sm">{v}</span> },
    { key: 'cooperative', label: 'Cooperative', render: (v, row) => (
      <div><p className="font-medium text-sm">{v}</p><p className="text-xs text-gray-400">{row.crop} · Grade {row.grade}</p></div>
    )},
    { key: 'quantity_kg', label: 'Qty', render: v => `${v.toLocaleString()} kg` },
    { key: 'total', label: 'Total (RWF)', render: v => `RWF ${v.toLocaleString()}` },
    { key: 'delivery_date', label: 'Delivery date' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[v]}`}>{v.replace('_', ' ')}</span>
    )},
    { key: '_view', label: '', render: (_, row) => (
      <button onClick={() => setSelected(row)} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
        <Eye className="w-4 h-4" /> View
      </button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage produce purchase orders from cooperatives.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Place Order
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-1.5 text-sm w-52" placeholder="Search…" />
          </div>
          <div className="flex gap-1">
            {['all', 'pending', 'approved', 'in_transit', 'delivered'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="No orders found." />
      </div>

      {/* New order modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Place New Order">
        <form onSubmit={handleNew} className="space-y-4">
          <div>
            <label className="label">Cooperative</label>
            <select className="input" value={form.cooperative} onChange={e => setForm(f => ({ ...f, cooperative: e.target.value }))} required>
              <option value="">Select cooperative…</option>
              {COOPERATIVES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop</label>
              <select className="input" value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} required>
                <option value="">Select crop…</option>
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grade</label>
              <select className="input" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity (kg)</label>
              <input type="number" className="input" value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))} required min="1" />
            </div>
            <div>
              <label className="label">Price offer (RWF/kg)</label>
              <input type="number" className="input" value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} required min="1" />
            </div>
          </div>
          <div>
            <label className="label">Required delivery date</label>
            <input type="date" className="input" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} required />
          </div>
          {form.quantity_kg && form.price_per_kg && (
            <div className="bg-primary-50 rounded-lg p-3 text-sm">
              <span className="text-primary-600">Estimated total: </span>
              <span className="font-bold text-primary-700">RWF {(Number(form.quantity_kg) * Number(form.price_per_kg)).toLocaleString()}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Placing order…' : 'Place Order'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Order ${selected.id}`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Cooperative', selected.cooperative],
              ['Crop', `${selected.crop} (Grade ${selected.grade})`],
              ['Quantity', `${selected.quantity_kg.toLocaleString()} kg`],
              ['Price/kg', `RWF ${selected.price_per_kg.toLocaleString()}`],
              ['Total', `RWF ${selected.total.toLocaleString()}`],
              ['Order date', selected.order_date],
              ['Delivery date', selected.delivery_date],
              ['Status', selected.status.replace('_', ' ')],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{k}</p>
                <p className="font-medium text-gray-900 mt-0.5 capitalize">{v}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
