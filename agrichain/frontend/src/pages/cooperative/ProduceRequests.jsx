import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import toast from 'react-hot-toast'

const MOCK_REQUESTS = [
  { id: 'REQ-001', distributor: 'IADL Kigali', crop: 'Tomatoes', quantity_kg: 500, grade: 'A', requested_date: '2025-01-12', delivery_date: '2025-01-15', status: 'pending', price_offer: 850 },
  { id: 'REQ-002', distributor: 'Agri-Hub Huye', crop: 'Avocados', quantity_kg: 300, grade: 'A', requested_date: '2025-01-11', delivery_date: '2025-01-14', status: 'approved', price_offer: 1200 },
  { id: 'REQ-003', distributor: 'FreshMart Musanze', crop: 'Beans', quantity_kg: 200, grade: 'B', requested_date: '2025-01-10', delivery_date: '2025-01-13', status: 'rejected', price_offer: 600 },
  { id: 'REQ-004', distributor: 'IADL Kigali', crop: 'Maize', quantity_kg: 1000, grade: 'B', requested_date: '2025-01-09', delivery_date: '2025-01-16', status: 'pending', price_offer: 400 },
]

const statusStyles = {
  pending: 'bg-warning-50 text-warning-500',
  approved: 'bg-success-50 text-success-500',
  rejected: 'bg-danger-50 text-danger-500',
}

export default function ProduceRequests() {
  const [requests, setRequests] = useState(MOCK_REQUESTS)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const handleAction = (id, action) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r))
    toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}`)
    setSelected(null)
  }

  const columns = [
    { key: 'id', label: 'Request ID', render: v => <span className="font-mono text-sm">{v}</span> },
    { key: 'distributor', label: 'Distributor' },
    { key: 'crop', label: 'Crop / Qty', render: (v, row) => (
      <div>
        <p className="font-medium">{v}</p>
        <p className="text-xs text-gray-500">{row.quantity_kg.toLocaleString()} kg · Grade {row.grade}</p>
      </div>
    )},
    { key: 'price_offer', label: 'Price/kg (RWF)', render: v => `RWF ${v.toLocaleString()}` },
    { key: 'delivery_date', label: 'Needed by' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[v]}`}>{v}</span>
    )},
    { key: '_actions', label: '', render: (_, row) => (
      <button onClick={() => setSelected(row)} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
        <Eye className="w-4 h-4" /> View
      </button>
    )},
  ]

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produce Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and respond to purchase requests from distributors.</p>
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning-50 border border-warning-500 rounded-xl text-warning-500">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{pending} pending request{pending > 1 ? 's' : ''} awaiting your response</p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {f}
            </button>
          ))}
        </div>
        <DataTable columns={columns} data={filtered} emptyMessage="No requests found." />
      </div>

      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Request ${selected.id}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Distributor', selected.distributor],
                ['Crop', selected.crop],
                ['Quantity', `${selected.quantity_kg.toLocaleString()} kg`],
                ['Grade', `Grade ${selected.grade}`],
                ['Price offer', `RWF ${selected.price_offer.toLocaleString()}/kg`],
                ['Needed by', selected.delivery_date],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {selected.status === 'pending' ? (
              <div className="flex gap-3 pt-2">
                <button onClick={() => handleAction(selected.id, 'reject')} className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleAction(selected.id, 'approve')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 pt-2">This request has been <strong>{selected.status}</strong>.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
