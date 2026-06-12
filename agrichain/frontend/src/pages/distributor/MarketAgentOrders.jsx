import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle, X, MapPin, ShoppingBag } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const NOTICE_BLANK = {
  title: '', crop_name: '', quantity_available_kg: '', price_per_kg: '',
  available_from: '', available_until: '', pickup_location: '', notes: '',
}

const MOCK_ORDERS = [
  {
    id: 1, agent_name: 'Jean de Dieu', stall: 'Kimironko Stall 12', market: 'Kimironko Market',
    crop_name: 'Coffee', quantity_kg: 10000, required_by: '2026-05-08',
    delivery_method: 'SELF_COLLECT', status: 'PENDING', note: '',
  },
  {
    id: 2, agent_name: 'Marie Uwimana', stall: 'Nyabugogo Stall 5', market: 'Kimironko Market',
    crop_name: 'Maize', quantity_kg: 15000, required_by: '2026-05-08',
    delivery_method: 'TRANSPORTER', status: 'PENDING', note: '',
  },
  {
    id: 3, agent_name: 'Alice Mutoni', stall: 'Kigali Central Stall 3', market: 'Kigali Central Market',
    crop_name: 'Tomatoes', quantity_kg: 5000, required_by: '2026-06-20',
    delivery_method: 'SELF_COLLECT', status: 'ACCEPTED', note: 'Grade A only.',
  },
]

export default function MarketAgentOrders() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [actionId, setActionId] = useState(null)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [noticeForm, setNoticeForm] = useState(NOTICE_BLANK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await distributionApi.getMyOrders({})
      const list = res.data?.results ?? res.data ?? []
      if (list.length) setOrders(list)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAccept = async (order) => {
    setActionId(order.id)
    try { await distributionApi.confirmOrder(order.id) } catch {}
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'ACCEPTED' } : o))
    toast.success(`Order from ${order.agent_name} accepted`)
    setActionId(null)
  }

  const handleDecline = async (order) => {
    setActionId(order.id)
    try { await distributionApi.declineOrder(order.id) } catch {}
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'DECLINED' } : o))
    toast.success('Order declined')
    setActionId(null)
  }

  const submitNotice = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await distributionApi.createNotice({
        ...noticeForm,
        quantity_available_kg: Number(noticeForm.quantity_available_kg),
        price_per_kg: Number(noticeForm.price_per_kg),
        is_active: true,
      })
    } catch {}
    toast.success('Notice published')
    setSaving(false)
    setShowNoticeForm(false)
    setNoticeForm(NOTICE_BLANK)
  }

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)
  const pending = orders.filter(o => o.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Agent Collection Notices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and respond to orders from your linked market agents.</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'ALL', label: 'All Orders' },
          { id: 'PENDING', label: `Pending${pending ? ` (${pending})` : ''}` },
          { id: 'ACCEPTED', label: 'Accepted' },
          { id: 'DECLINED', label: 'Declined' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${filter === f.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No orders here.</p>
          <p className="text-sm mt-1">Linked agents can place orders against your published notices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const agentLabel = order.stall ? `${order.agent_name} - ${order.stall}` : order.agent_name
            const qtyTons = (Number(order.quantity_kg) / 1000).toFixed(0)
            const deadline = order.required_by
              ? new Date(order.required_by).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'
            const isPending = order.status === 'PENDING'
            const busy = actionId === order.id

            return (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{agentLabel}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      Crop: <span className="font-medium text-gray-700">{order.crop_name}</span>
                      {' • '}Quantity: <span className="font-medium text-gray-700">{qtyTons} tons</span>
                      {' • '}Deadline: <span className="font-medium text-gray-700">{deadline}</span>
                    </p>
                    {order.market && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location: {order.market}
                      </p>
                    )}
                    {order.note && (
                      <p className="text-xs text-gray-500 italic">"{order.note}"</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleAccept(order)}
                              disabled={busy}
                              className="px-5 py-1.5 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-60 flex items-center gap-1.5">
                              {busy ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(order)}
                              disabled={busy}
                              className="px-5 py-1.5 rounded-lg text-sm font-semibold text-danger-600 border border-danger-300 hover:bg-danger-50 transition-colors disabled:opacity-60 flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${order.status === 'ACCEPTED' ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                            {order.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowNoticeForm(true)}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Create Notice
                      </button>
                    </div>
                  </div>

                  {/* Active badge */}
                  <div className="flex-shrink-0">
                    {isPending && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-200">
                        Active
                      </span>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-50 text-success-700 border border-success-200">
                        Accepted
                      </span>
                    )}
                    {order.status === 'DECLINED' && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                        Declined
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Notice modal */}
      <Modal isOpen={showNoticeForm} onClose={() => { setShowNoticeForm(false); setNoticeForm(NOTICE_BLANK) }} title="Create Collection Notice">
        <form onSubmit={submitNotice} className="space-y-4">
          <p className="text-sm text-gray-500">Publish a notice so your linked market agents can place orders.</p>
          <div>
            <label className="label">Notice title *</label>
            <input className="input" value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Tomatoes Available – June 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop *</label>
              <input className="input" value={noticeForm.crop_name} onChange={e => setNoticeForm(f => ({ ...f, crop_name: e.target.value }))} required placeholder="e.g. Coffee" />
            </div>
            <div>
              <label className="label">Qty available (kg) *</label>
              <input type="number" className="input" value={noticeForm.quantity_available_kg} onChange={e => setNoticeForm(f => ({ ...f, quantity_available_kg: e.target.value }))} required min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price/kg (RWF)</label>
              <input type="number" className="input" value={noticeForm.price_per_kg} onChange={e => setNoticeForm(f => ({ ...f, price_per_kg: e.target.value }))} min="0" />
            </div>
            <div>
              <label className="label">Pickup location</label>
              <input className="input" value={noticeForm.pickup_location} onChange={e => setNoticeForm(f => ({ ...f, pickup_location: e.target.value }))} placeholder="e.g. Kigali Warehouse A" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Available from *</label>
              <input type="date" className="input" value={noticeForm.available_from} onChange={e => setNoticeForm(f => ({ ...f, available_from: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Available until *</label>
              <input type="date" className="input" value={noticeForm.available_until} onChange={e => setNoticeForm(f => ({ ...f, available_until: e.target.value }))} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowNoticeForm(false); setNoticeForm(NOTICE_BLANK) }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Publishing...' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
