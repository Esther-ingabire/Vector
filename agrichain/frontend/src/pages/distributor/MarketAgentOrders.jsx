import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle, X, MapPin, ShoppingBag, Bell, FileText, Clock, Truck, Package } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import PlaceSearchInput from '../../components/map/PlaceSearchInput.jsx'
import DeclineReasonPicker from '../../components/ui/DeclineReasonPicker.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const ORDER_DECLINE_REASONS = ['Out of stock', 'Quantity unavailable', 'Cannot meet delivery date', 'Order already fulfilled']

const NOTICE_BLANK = {
  title: '', crop_name: '', quantity_available_kg: '', price_per_kg: '',
  available_from: '', available_until: '', pickup_location: '', notes: '',
}

const MOCK_NOTICES = [
  { id: 1, title: 'Tomatoes Available – June 2026',  crop_name: 'Tomatoes', quantity_available_kg: 800,  price_per_kg: 850,  available_from: '2026-06-18', available_until: '2026-06-28', pickup_location: 'Kigali Warehouse A',     orders_count: 2, is_active: true },
  { id: 2, title: 'Grade A Avocados Ready',           crop_name: 'Avocados', quantity_available_kg: 400,  price_per_kg: 1200, available_from: '2026-06-20', available_until: '2026-06-30', pickup_location: 'Musanze Collection Point', orders_count: 1, is_active: true },
  { id: 3, title: 'Maize Batch – Bulk Orders',        crop_name: 'Maize',    quantity_available_kg: 2000, price_per_kg: 400,  available_from: '2026-06-10', available_until: '2026-06-25', pickup_location: 'Kigali Warehouse B',     orders_count: 0, is_active: false },
]

const MOCK_ORDERS = [
  { id: 1,  market_agent_name: 'Jean de Dieu — Kimironko Market',        crop_name: 'Tomatoes',     quantity_requested_kg: 200, preferred_collection_date: '2026-06-20', status: 'PENDING_CONFIRMATION', notes: '' },
  { id: 2,  market_agent_name: 'Marie Uwimana — Nyabugogo Market',       crop_name: 'Avocados',     quantity_requested_kg: 150, preferred_collection_date: '2026-06-21', status: 'PENDING_CONFIRMATION', notes: 'Grade A only.' },
  { id: 3,  market_agent_name: 'Claudine Ishimwe — Kacyiru Market',      crop_name: 'Beans',        quantity_requested_kg: 250, preferred_collection_date: '2026-06-22', status: 'PENDING_CONFIRMATION', notes: '' },
  { id: 4,  market_agent_name: 'Patrick Nzeyimana — Kimisagara Market',  crop_name: 'Sweet Potatoes', quantity_requested_kg: 120, preferred_collection_date: '2026-06-19', status: 'PENDING_CONFIRMATION', notes: 'Early morning delivery preferred.' },
  { id: 5,  market_agent_name: 'Alice Mutoni — Kigali Central Market',   crop_name: 'Maize',        quantity_requested_kg: 400, preferred_collection_date: '2026-06-23', status: 'CONFIRMED', delivery_method: 'TRANSPORTER_DELIVERY', notes: '' },
  { id: 6,  market_agent_name: 'Samuel Hakizimana — Remera Market',      crop_name: 'Tomatoes',     quantity_requested_kg: 180, preferred_collection_date: '2026-06-18', status: 'CONFIRMED', delivery_method: 'SELF_COLLECTION', notes: '' },
  { id: 7,  market_agent_name: 'Diane Mukankusi — Gisozi Market',        crop_name: 'Avocados',     quantity_requested_kg: 90,  preferred_collection_date: '2026-06-17', status: 'DECLINED', notes: 'Stock no longer available.' },
  { id: 8,  market_agent_name: 'Emmanuel Nshimiyimana — Nyabugogo',      crop_name: 'Bananas',      quantity_requested_kg: 350, preferred_collection_date: '2026-06-15', status: 'COMPLETED', delivery_method: 'SELF_COLLECTION', notes: '' },
  { id: 9,  market_agent_name: 'Grace Uwera — Kimironko Market',         crop_name: 'Potatoes',     quantity_requested_kg: 500, preferred_collection_date: '2026-06-14', status: 'COMPLETED', delivery_method: 'TRANSPORTER_DELIVERY', notes: '' },
  { id: 10, market_agent_name: 'Vestine Mukamusoni — Nyamirambo Market', crop_name: 'Tomatoes',     quantity_requested_kg: 220, preferred_collection_date: '2026-06-24', status: 'PENDING_CONFIRMATION', notes: 'Prefers Roma variety.' },
]

// Normalize real API statuses → display buckets
function normStatus(s) {
  if (!s) return 'PENDING'
  if (s === 'PENDING_CONFIRMATION') return 'PENDING'
  if (['CONFIRMED', 'ADJUSTED'].includes(s)) return 'ACCEPTED'
  if (s === 'DECLINED') return 'DECLINED'
  // COLLECTED, WASTE_REPORTED, COMPLETED
  return 'COMPLETED'
}

const STATUS_BADGE = {
  PENDING:   'bg-amber-50   text-amber-700   border border-amber-200',
  ACCEPTED:  'bg-emerald-50 text-emerald-700  border border-emerald-200',
  DECLINED:  'bg-red-50     text-red-600     border border-red-200',
  COMPLETED: 'bg-gray-100   text-gray-500    border border-gray-200',
}
const STATUS_LABEL = { PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined', COMPLETED: 'Completed' }

const PILL_ACTIVE = {
  ALL:       'bg-gray-800 text-white',
  PENDING:   'bg-amber-500 text-white',
  ACCEPTED:  'bg-emerald-600 text-white',
  DECLINED:  'bg-red-500 text-white',
  COMPLETED: 'bg-gray-500 text-white',
}
const PILL_INACTIVE = 'bg-gray-100 text-gray-600 hover:bg-gray-200'

export default function MarketAgentOrders() {
  const [tab, setTab] = useState('orders')
  const [notices, setNotices] = useState(MOCK_NOTICES)
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [loadingNotices, setLoadingNotices] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)

  // Accept modal state
  const [acceptTarget, setAcceptTarget] = useState(null)
  const [deliveryMethod, setDeliveryMethod] = useState('SELF_COLLECTION')
  const [accepting, setAccepting] = useState(false)

  // Decline — just direct action
  const [decliningId, setDecliningId] = useState(null)

  // Notice form
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [noticeForm, setNoticeForm] = useState(NOTICE_BLANK)

  const openAccept = (order) => {
    setAcceptTarget(order)
    setDeliveryMethod('SELF_COLLECTION')
  }

  const openNoticeForOrder = (order) => {
    setNoticeForm({
      ...NOTICE_BLANK,
      crop_name: order.crop_name || '',
      quantity_available_kg: order.quantity_requested_kg || '',
      title: order.crop_name
        ? `${order.crop_name} Available – ${new Date().toLocaleDateString('en-RW', { month: 'long', year: 'numeric' })}`
        : '',
    })
    setShowNoticeForm(true)
  }

  const loadNotices = useCallback(async () => {
    setLoadingNotices(true)
    try {
      const res = await distributionApi.getMyNotices({})
      const list = res.data?.results ?? res.data ?? []
      if (list.length) setNotices(list)
    } catch {}
    finally { setLoadingNotices(false) }
  }, [])

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await distributionApi.getMyOrders({})
      const list = res.data?.results ?? res.data ?? []
      // Only replace mock if real data has actionable orders (not all completed)
      const hasActionable = list.some(o => !['COMPLETED', 'COLLECTED', 'WASTE_REPORTED'].includes(o.status))
      if (list.length && hasActionable) setOrders(list)
    } catch {}
    finally { setLoadingOrders(false) }
  }, [])

  useEffect(() => { loadNotices(); loadOrders() }, [loadNotices, loadOrders])

  const confirmAccept = async () => {
    if (!acceptTarget) return
    setAccepting(true)
    // Honour the delivery method the agent already chose
    const method = acceptTarget.delivery_method || 'SELF_COLLECTION'
    try {
      await distributionApi.confirmOrder(acceptTarget.id, { delivery_method: method })
    } catch (err) {
      if (err?.response?.status !== 404) {
        toast.error(err?.response?.data?.detail || 'Could not accept order')
        setAccepting(false)
        return
      }
    }
    setOrders(prev => prev.map(o =>
      o.id === acceptTarget.id ? { ...o, status: 'CONFIRMED', delivery_method: method } : o
    ))
    toast.success(`Order accepted · ${method === 'SELF_COLLECTION' ? 'Agent will self-collect' : 'You arrange transport'}`)
    setAcceptTarget(null)
    setAccepting(false)
  }

  const [showDeclineId, setShowDeclineId] = useState(null)

  const handleDecline = async (order, reason) => {
    setDecliningId(order.id)
    setShowDeclineId(null)
    try {
      await distributionApi.declineOrder(order.id, { reason: reason || 'Declined' })
    } catch (err) {
      if (err?.response?.status !== 404) {
        toast.error(err?.response?.data?.detail || 'Could not decline order')
        setDecliningId(null)
        return
      }
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'DECLINED' } : o))
    toast.success('Order declined')
    setDecliningId(null)
  }

  const submitNotice = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await distributionApi.createNotice({
        ...noticeForm,
        quantity_available_kg: Number(noticeForm.quantity_available_kg),
        price_per_kg: Number(noticeForm.price_per_kg) || 0,
        is_active: true,
      })
      setNotices(prev => [{ ...res.data, orders_count: 0 }, ...prev])
      toast.success('Stock listing published — linked agents can now order from it')
      setShowNoticeForm(false)
      setNoticeForm(NOTICE_BLANK)
      setTab('notices')
    } catch (err) {
      const data = err?.response?.data
      toast.error(data ? Object.values(data).flat().join(' ') : 'Failed to publish listing')
    } finally { setSaving(false) }
  }

  const pendingCount  = orders.filter(o => normStatus(o.status) === 'PENDING').length
  const activeNotices = notices.filter(n => n.is_active).length
  const filtered = filter === 'ALL' ? orders : orders.filter(o => normStatus(o.status) === filter)

  const FILTERS = [
    { id: 'ALL',       label: `All (${orders.length})` },
    { id: 'PENDING',   label: `Pending (${orders.filter(o => normStatus(o.status) === 'PENDING').length})` },
    { id: 'ACCEPTED',  label: `Accepted (${orders.filter(o => normStatus(o.status) === 'ACCEPTED').length})` },
    { id: 'DECLINED',  label: `Declined (${orders.filter(o => normStatus(o.status) === 'DECLINED').length})` },
    { id: 'COMPLETED', label: `Completed (${orders.filter(o => normStatus(o.status) === 'COMPLETED').length})` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Agent Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Post stock listings — agents order from them, you accept and choose delivery method.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadNotices(); loadOrders() }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNoticeForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Post Listing
          </button>
        </div>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {pendingCount} order{pendingCount > 1 ? 's' : ''} waiting for your response
          </p>
          <button onClick={() => { setTab('orders'); setFilter('PENDING') }}
            className="ml-auto text-xs font-semibold text-amber-700 underline underline-offset-2">
            Review
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'orders',  label: `Agent Orders${pendingCount ? ` · ${pendingCount} pending` : ''}`, icon: ShoppingBag },
          { id: 'notices', label: `Stock Listings${activeNotices ? ` · ${activeNotices} active` : ''}`, icon: FileText },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Agent Orders tab ── */}
      {tab === 'orders' && (
        <>
          {/* Colored filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filter === f.id ? PILL_ACTIVE[f.id] : PILL_INACTIVE}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loadingOrders ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="card py-14 text-center text-gray-400">
              <ShoppingBag className="w-9 h-9 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No {filter !== 'ALL' ? STATUS_LABEL[filter].toLowerCase() : ''} orders</p>
              {filter === 'ALL' && (
                <button onClick={() => setShowNoticeForm(true)} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Post Listing
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(order => {
                const norm = normStatus(order.status)
                const isPending = norm === 'PENDING'
                const busyDecline = decliningId === order.id
                const qty = Number(order.quantity_requested_kg)
                const qtyLabel = qty >= 1000 ? `${(qty / 1000).toFixed(1)} tons` : `${qty} kg`
                const deadlineRaw = order.preferred_collection_date
                const deadline = deadlineRaw
                  ? new Date(deadlineRaw).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })
                  : null

                return (
                  <div key={order.id} className="card py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{order.market_agent_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium text-gray-700">{order.crop_name}</span>
                          {' · '}{qtyLabel}
                          {deadline && <>{' · '}collect by {deadline}</>}
                        </p>
                        {order.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{order.notes}"</p>}
                        {order.delivery_method && norm !== 'PENDING' && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            {order.delivery_method === 'SELF_COLLECTION'
                              ? <><Package className="w-3 h-3" />Agent self-collects</>
                              : <><Truck className="w-3 h-3" />Distributor arranges transport</>}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[norm]}`}>
                        {STATUS_LABEL[norm]}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openAccept(order)}
                        disabled={!isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                          ${isPending ? 'bg-primary-500 hover:bg-primary-600 text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      {isPending && (
                        <button
                          onClick={() => setShowDeclineId(order.id)}
                          disabled={busyDecline}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60">
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      )}
                      <button
                        onClick={() => openNoticeForOrder(order)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors ml-auto">
                        <Plus className="w-3.5 h-3.5" /> Create Notice
                      </button>
                    </div>
                    {showDeclineId === order.id && (
                      <div className="mt-2">
                        <DeclineReasonPicker
                          quickReasons={ORDER_DECLINE_REASONS}
                          busy={busyDecline}
                          onConfirm={reason => handleDecline(order, reason)}
                          onCancel={() => setShowDeclineId(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Stock Listings tab ── */}
      {tab === 'notices' && (
        <>
          <p className="text-sm text-gray-500 -mt-2">
            Your linked agents browse these listings and place orders against them.
            Orders then appear in{' '}
            <button onClick={() => setTab('orders')} className="text-primary-600 underline underline-offset-2">Agent Orders</button>.
          </p>

          {loadingNotices ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
          ) : notices.length === 0 ? (
            <div className="card py-14 text-center text-gray-400">
              <FileText className="w-9 h-9 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No listings yet</p>
              <p className="text-xs mt-1">Post your first listing so agents know what you have available.</p>
              <button onClick={() => setShowNoticeForm(true)} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Post Listing
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notices.map(n => (
                <div key={n.id} className="card py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{n.title}</p>
                        <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full
                          ${n.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {n.is_active ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{n.crop_name}</span>
                        {' · '}
                        {Number(n.quantity_available_kg) >= 1000
                          ? `${(Number(n.quantity_available_kg) / 1000).toFixed(1)} tons`
                          : `${Number(n.quantity_available_kg)} kg`} available
                        {n.price_per_kg ? ` · RWF ${Number(n.price_per_kg).toLocaleString()}/kg` : ''}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {n.pickup_location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{n.pickup_location}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{n.available_from} → {n.available_until}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center min-w-[44px]">
                      <p className={`text-xl font-bold ${n.orders_count > 0 ? 'text-primary-600' : 'text-gray-300'}`}>
                        {n.orders_count ?? 0}
                      </p>
                      <p className="text-[10px] text-gray-400">order{n.orders_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Accept Order modal — captures delivery method ── */}
      <Modal isOpen={!!acceptTarget} onClose={() => setAcceptTarget(null)} title="Accept Order">
        {acceptTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold text-gray-900">{acceptTarget.market_agent_name}</p>
              <p className="text-gray-500">
                {acceptTarget.crop_name}{' · '}
                {Number(acceptTarget.quantity_requested_kg) >= 1000
                  ? `${(Number(acceptTarget.quantity_requested_kg) / 1000).toFixed(1)} tons`
                  : `${Number(acceptTarget.quantity_requested_kg)} kg`}
              </p>
            </div>

            {/* Show what the agent requested — read only */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
              ${acceptTarget.delivery_method === 'TRANSPORTER_DELIVERY'
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              {acceptTarget.delivery_method === 'TRANSPORTER_DELIVERY'
                ? <><Truck className="w-4 h-4 flex-shrink-0" /> Agent requested delivery — you will arrange transport</>
                : <><Package className="w-4 h-4 flex-shrink-0" /> Agent will self-collect from your warehouse</>}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAcceptTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={confirmAccept}
                disabled={accepting}
                className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {accepting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {accepting ? 'Accepting...' : 'Confirm Accept'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Post Stock Listing modal */}
      <Modal isOpen={showNoticeForm} onClose={() => { setShowNoticeForm(false); setNoticeForm(NOTICE_BLANK) }} title="Post Stock Listing">
        <form onSubmit={submitNotice} className="space-y-4">
          <p className="text-sm text-gray-500">Linked agents will see this and can place orders against it.</p>
          <div>
            <label className="label">Listing title *</label>
            <input className="input" value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Tomatoes Available – June 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop *</label>
              <input className="input" value={noticeForm.crop_name} onChange={e => setNoticeForm(f => ({ ...f, crop_name: e.target.value }))} required placeholder="e.g. Tomatoes" />
            </div>
            <div>
              <label className="label">Qty available (kg) *</label>
              <input type="number" className="input" value={noticeForm.quantity_available_kg} onChange={e => setNoticeForm(f => ({ ...f, quantity_available_kg: e.target.value }))} required min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price/kg (RWF)</label>
              <input type="number" className="input" value={noticeForm.price_per_kg} onChange={e => setNoticeForm(f => ({ ...f, price_per_kg: e.target.value }))} min="0" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Pickup location</label>
              <PlaceSearchInput
                placeholder="Search pickup location…"
                onSelect={({ address }) => setNoticeForm(f => ({ ...f, pickup_location: address }))}
              />
              {noticeForm.pickup_location && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {noticeForm.pickup_location}
                </p>
              )}
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
              {saving ? 'Publishing...' : 'Post Listing'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
