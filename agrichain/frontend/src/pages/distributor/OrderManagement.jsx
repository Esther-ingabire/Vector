import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Star, TrendingUp, RefreshCw, ChevronRight, CheckCircle, X, Bell, MapPin, Package, Truck, Award, ArrowRight, Navigation } from 'lucide-react'
import DataTable from '../../components/ui/DataTable.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { distributionApi } from '../../api/distribution.js'
import { cooperativesApi } from '../../api/cooperatives.js'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

const STATUS_LABEL = {
  PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined',
  IN_TRANSIT: 'In transit', DELIVERED: 'Delivered', CONFIRMED: 'Confirmed',
}

const NOTICE_BLANK = { title: '', crop_name: '', quantity_available_kg: '', price_per_kg: '', available_from: '', available_until: '', pickup_location: '', notes: '' }

const CROP_IMAGES = {
  coffee:          'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=180&fit=crop',
  tea:             'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=180&fit=crop',
  maize:           'https://images.unsplash.com/photo-1500622944204-b135684e99fd?w=400&h=180&fit=crop',
  corn:            'https://images.unsplash.com/photo-1500622944204-b135684e99fd?w=400&h=180&fit=crop',
  potatoes:        'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=180&fit=crop',
  'sweet potatoes':'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400&h=180&fit=crop',
  beans:           'https://images.unsplash.com/photo-1628451657124-26726ca61d75?w=400&h=180&fit=crop',
  avocados:        'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=180&fit=crop',
  tomatoes:        'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=400&h=180&fit=crop',
  bananas:         'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=180&fit=crop',
  sorghum:         'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400&h=180&fit=crop',
  rice:            'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=180&fit=crop',
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=180&fit=crop',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=180&fit=crop',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=180&fit=crop',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=180&fit=crop',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=180&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=180&fit=crop',
]

function getCropImage(crops = [], coopId = 0) {
  const list = typeof crops === 'string'
    ? crops.split(',').map(s => s.trim())
    : crops
  for (const c of list) {
    const img = CROP_IMAGES[(c || '').toLowerCase()]
    if (img) return img
  }
  return FALLBACK_IMAGES[Math.abs(coopId) % FALLBACK_IMAGES.length]
}

// Cooperatives the distributor has worked with before (frequent partners)
const MOCK_FREQUENT = [
  { id: 1, name: 'Musanze Coffee Coop', district: 'Musanze', crops_specialised: ['Coffee', 'Maize'], stock_tons: 24.5, composite_score: 0.88, total_batches_dispatched: 14 },
  { id: 2, name: 'Nyanza Potato Growers', district: 'Nyanza', crops_specialised: ['Potatoes', 'Beans'], stock_tons: 18.0, composite_score: 0.81, total_batches_dispatched: 9 },
]

// IDs used in mock data — API calls for these will always fail
const MOCK_COOP_IDS = new Set([1, 2, 10, 11, 12, 13, 14])

function ScoreBadge({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 75 ? 'text-success-600 bg-success-50' : pct >= 50 ? 'text-warning-500 bg-warning-50' : 'text-gray-500 bg-gray-100'
  return <span className={`badge ${color}`}>{pct}%</span>
}

function CoopCard({ coop, onRequest, isFrequent }) {
  const imgSrc = coop.image_url || getCropImage(coop.crops_specialised, coop.id)
  const wrapperCls = isFrequent
    ? 'rounded-2xl border-2 border-warning-200 bg-warning-50/40 overflow-hidden hover:shadow-md transition-all'
    : 'rounded-2xl border-2 border-gray-200 bg-white overflow-hidden hover:shadow-md hover:border-primary-300 transition-all'
  const stockLabel = typeof coop.stock_tons === 'number' ? coop.stock_tons.toFixed(1) : coop.stock_tons
  return (
    <div className={wrapperCls}>
      <div className="w-full h-32 overflow-hidden bg-gray-100">
        <img
          src={imgSrc}
          alt={coop.crops_specialised?.[0] || 'Produce'}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGES[Math.abs(coop.id || 0) % FALLBACK_IMAGES.length] }}
        />
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{coop.name}</p>
          {isFrequent && <Star className="w-4 h-4 text-warning-400 fill-warning-400 flex-shrink-0" />}
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{coop.district}</p>
          <p>{coop.crops_specialised?.slice(0, 3).join(', ')}</p>
        </div>
        {coop.stock_tons && (
          <p className="text-sm font-medium text-success-600">Stock: {stockLabel} tons</p>
        )}
        <button
          onClick={() => onRequest(coop)}
          className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-primary-500/80 hover:bg-primary-500 border border-primary-400/40 backdrop-blur-sm shadow-md shadow-primary-900/15 transition-colors mt-1">
          {isFrequent ? 'View Profile' : 'Send Request'}
        </button>
      </div>
    </div>
  )
}

export default function OrderManagement() {
  const location = useLocation()
  const initialTab = location.search.includes('coop=') ? 'cooperatives' : 'requests'
  const [tab, setTab] = useState(initialTab)
  const [orders, setOrders] = useState([])
  const [notices, setNotices] = useState([])
  const [frequentCoops] = useState(MOCK_FREQUENT)
  const [allCoops, setAllCoops] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingNotices, setLoadingNotices] = useState(true)
  const [loadingCoops, setLoadingCoops] = useState(false)
  const [search, setSearch] = useState('')
  const [coopSearch, setCoopSearch] = useState('')
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [coopStep, setCoopStep] = useState('profile') // 'profile' | 'order'
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [selectedCoop, setSelectedCoop] = useState(null)
  const [noticeForm, setNoticeForm] = useState(NOTICE_BLANK)
  const [form, setForm] = useState({ cooperative: '', crop_name: '', quantity_kg: '', quality_grade_required: 'A', required_delivery_date: '', additional_notes: '' })
  const [saving, setSaving] = useState(false)
  const [partnerIds, setPartnerIds] = useState(new Set([1, 2]))
  const [selectedOrder, setSelectedOrder] = useState(null)

  const MOCK_ORDERS = [
    { id: 101, cooperative_name: 'Musanze Coffee Coop', crop_name: 'Coffee', quantity_kg: 5000, quality_grade_required: 'A', required_delivery_date: '2026-06-25', status: 'PENDING', additional_notes: '' },
    { id: 102, cooperative_name: 'Nyanza Potato Growers', crop_name: 'Potatoes', quantity_kg: 3000, quality_grade_required: 'B', required_delivery_date: '2026-06-20', status: 'ACCEPTED', additional_notes: '' },
    { id: 103, cooperative_name: 'Kigali Tea Collective', crop_name: 'Tea', quantity_kg: 1500, quality_grade_required: 'A', required_delivery_date: '2026-07-01', status: 'IN_TRANSIT', additional_notes: '' },
  ]

  const MOCK_NOTICES = [
    { id: 1, title: 'Tomatoes Available – Batch 2026-06', crop_name: 'Tomatoes', quantity_available_kg: 800, price_per_kg: 850, available_from: '2026-06-12', available_until: '2026-06-20', pickup_location: 'Kigali Warehouse A', orders_count: 3, is_active: true },
    { id: 2, title: 'Grade A Avocados Ready', crop_name: 'Avocados', quantity_available_kg: 400, price_per_kg: 1200, available_from: '2026-06-10', available_until: '2026-06-18', pickup_location: 'Musanze Collection Point', orders_count: 1, is_active: true },
    { id: 3, title: 'Maize Batch – May Harvest', crop_name: 'Maize', quantity_available_kg: 2000, price_per_kg: 400, available_from: '2026-05-20', available_until: '2026-06-05', pickup_location: 'Kigali Warehouse B', orders_count: 5, is_active: false },
  ]

  const MOCK_ALL_COOPS = [
    { id: 10, name: 'Musanze Coffee Coop', district: 'Musanze', crops_specialised: ['Coffee', 'Maize'], stock_tons: 24.5, composite_score: 0.88, total_batches_dispatched: 14 },
    { id: 11, name: 'Nyanza Potato Growers', district: 'Nyanza', crops_specialised: ['Potatoes', 'Beans'], stock_tons: 18.0, composite_score: 0.81, total_batches_dispatched: 9 },
    { id: 12, name: 'Kigali Tea Collective', district: 'Kigali', crops_specialised: ['Tea', 'Maize'], stock_tons: 30.0, composite_score: 0.75, total_batches_dispatched: 6 },
    { id: 13, name: 'Huye Highlands Coop', district: 'Huye', crops_specialised: ['Avocados', 'Beans'], stock_tons: 12.0, composite_score: 0.70, total_batches_dispatched: 4 },
    { id: 14, name: 'Rwamagana Grain Coop', district: 'Rwamagana', crops_specialised: ['Maize', 'Rice'], stock_tons: 40.0, composite_score: 0.65, total_batches_dispatched: 3 },
  ]

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await distributionApi.getMyProduceRequests({})
      const list = res.data?.results ?? res.data ?? []
      const final = list.length ? list : MOCK_ORDERS
      setOrders(final)
      setPartnerIds(new Set([...final.map(o => o.cooperative), 10, 11]))
    } catch {
      setOrders(MOCK_ORDERS)
      setPartnerIds(new Set([10, 11]))
    }
    finally { setLoadingOrders(false) }
  }, [])

  const loadNotices = useCallback(async () => {
    setLoadingNotices(true)
    try {
      const res = await distributionApi.getMyNotices({})
      const list = res.data?.results ?? res.data ?? []
      setNotices(list.length ? list : MOCK_NOTICES)
    } catch { setNotices(MOCK_NOTICES) }
    finally { setLoadingNotices(false) }
  }, [])

  const loadCoops = useCallback(async (q = '', nearby = false) => {
    setLoadingCoops(true)
    try {
      const params = {}
      if (q) params.search = q
      if (nearby) params.nearby = 'true'
      const res = await cooperativesApi.searchDirectory(params)
      const list = res.data?.results ?? res.data ?? []
      setAllCoops(list.length ? list : MOCK_ALL_COOPS.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.district.toLowerCase().includes(q.toLowerCase())))
    } catch { setAllCoops(MOCK_ALL_COOPS) }
    finally { setLoadingCoops(false) }
  }, [])

  useEffect(() => { loadOrders(); loadNotices() }, [loadOrders, loadNotices])
  useEffect(() => { if (tab === 'cooperatives') loadCoops(coopSearch, nearbyOnly) }, [tab, nearbyOnly])

  const openRequest = (coop) => {
    setSelectedCoop(coop)
    setForm(f => ({ ...f, cooperative: coop.id }))
    setCoopStep('profile')
    setShowNew(true)
    // Fetch the full profile (stock records, storage facilities) in the background
    // so the modal upgrades from the lightweight directory row to real data.
    if (!MOCK_COOP_IDS.has(coop.id)) {
      cooperativesApi.getCooperativeDetail(coop.id).then(res => {
        const full = res.data
        const stockTons = (full.stock_records || []).reduce((sum, s) => sum + Number(s.quantity_kg || 0), 0) / 1000
        setSelectedCoop(prev => (prev && prev.id === coop.id ? { ...prev, ...full, stock_tons: stockTons } : prev))
      }).catch(() => {})
    }
  }

  const closeCoopModal = () => {
    setShowNew(false)
    setSelectedCoop(null)
    setCoopStep('profile')
  }

  const submitOrder = async (e) => {
    e.preventDefault()
    setSaving(true)

    const coopId = Number(form.cooperative)
    const isMockCoop = MOCK_COOP_IDS.has(coopId)

    if (isMockCoop) {
      // Skip the API — mock cooperative IDs don't exist in the DB
      setOrders(prev => [{
        id: Date.now(),
        cooperative_name: selectedCoop?.name || 'Cooperative',
        crop_name: form.crop_name,
        quantity_kg: Number(form.quantity_kg),
        quality_grade_required: form.quality_grade_required,
        required_delivery_date: form.required_delivery_date,
        additional_notes: form.additional_notes,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      }, ...prev])
      toast.success('Request sent to cooperative')
    } else {
      try {
        const payload = {
          cooperative: coopId,
          quantity_kg: Number(form.quantity_kg),
          quality_grade_required: form.quality_grade_required,
          required_delivery_date: form.required_delivery_date,
          additional_notes: form.crop_name ? `Crop: ${form.crop_name}. ${form.additional_notes}` : form.additional_notes,
        }
        const res = await distributionApi.createProduceRequest(payload)
        setOrders(prev => [res.data, ...prev])
        toast.success('Request sent to cooperative')
      } catch (err) {
        const raw = err.response?.data
        const msg = raw ? Object.values(raw).flat().join(' ') : 'Failed to place order'
        toast.error(msg)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setShowNew(false)
    setSelectedCoop(null)
  }

  const submitNotice = async (e) => {
    e.preventDefault()
    setSaving(true)
    const newNotice = {
      id: Date.now(),
      ...noticeForm,
      quantity_available_kg: Number(noticeForm.quantity_available_kg),
      price_per_kg: Number(noticeForm.price_per_kg),
      orders_count: 0,
      is_active: true,
    }
    try {
      const res = await distributionApi.createNotice(newNotice)
      setNotices(prev => [res.data, ...prev])
    } catch {
      setNotices(prev => [newNotice, ...prev])
    }
    toast.success('Collection notice published')
    setSaving(false)
    setShowNoticeForm(false)
    setNoticeForm(NOTICE_BLANK)
  }

  const deactivateNotice = async (id) => {
    try { await distributionApi.deactivateNotice(id) } catch {}
    setNotices(prev => prev.map(n => n.id === id ? { ...n, is_active: false } : n))
    toast.success('Notice deactivated')
  }

  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => {
      const q = search.toLowerCase()
      return !q || (o.cooperative_name || '').toLowerCase().includes(q) || (o.crop_name || '').toLowerCase().includes(q)
    })

  const orderColumns = [
    { key: 'id', label: 'Request ID', render: v => <span className="font-mono text-sm text-gray-700">DIST-REQ-{String(v).padStart(3, '0')}</span> },
    { key: 'cooperative_name', label: 'Cooperative', render: (v, row) => (
      <div>
        <p className="font-medium text-sm text-gray-900">{v || '—'}</p>
        <p className="text-xs text-gray-400">Grade {row.quality_grade_required}</p>
      </div>
    )},
    { key: 'crop_name', label: 'Crop', render: v => <span className="text-sm text-gray-700">{v || '—'}</span> },
    { key: 'quantity_kg', label: 'Quantity', render: v => v ? <span className="font-medium">{(Number(v)/1000).toFixed(1)} tons</span> : '—' },
    { key: 'required_delivery_date', label: 'Delivery Date', render: v => v ? new Date(v).toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: '_actions', label: 'Actions', render: (_, row) => (
      <button
        onClick={() => setSelectedOrder(row)}
        className="text-xs font-medium text-primary-700 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
        View Agreement
      </button>
    )},
  ]

  // Recommended = not yet partners, sorted by score
  const recommended = allCoops
    .filter(c => !partnerIds.has(c.id))
    .sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0))
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders & Cooperatives</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your produce requests, find cooperatives, and publish collection notices.</p>
        </div>
        <div className="flex gap-2">
          {tab === 'requests' && (
            <button onClick={() => { setSelectedCoop(null); setShowNew(true) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}
          {tab === 'notices' && (
            <button onClick={() => setShowNoticeForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Notice
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'requests', label: 'My Produce Requests' },
          { id: 'cooperatives', label: 'Find Cooperatives' },
          { id: 'notices', label: 'Collection Notices' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── My Produce Requests ── */}
      {tab === 'requests' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 py-1.5 text-sm" placeholder="Search cooperative or crop…" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['all', 'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'DECLINED'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === f ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {f === 'all' ? 'All' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
            <button onClick={loadOrders} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {loadingOrders
            ? <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
            : <DataTable columns={orderColumns} data={filtered} emptyMessage="No produce requests yet. Go to 'Find Cooperatives' to place one." />
          }
        </div>
      )}

      {/* ── Find Cooperatives ── */}
      {tab === 'cooperatives' && (
        <div className="space-y-8">
          {/* Frequent Cooperatives (starred, card design) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-warning-400 fill-warning-400" />
              <h2 className="text-base font-semibold text-gray-900">Frequent Cooperatives</h2>
              <span className="text-xs text-gray-400">Partners you've worked with before</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {frequentCoops.map(coop => (
                <CoopCard key={coop.id} coop={coop} onRequest={openRequest} isFrequent />
              ))}
            </div>
          </section>

          {/* Recommended / Highly Rated */}
          {recommended.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h2 className="text-base font-semibold text-gray-900">Highly Rated Cooperatives</h2>
                <span className="text-xs text-gray-400">Recommended based on performance scores</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommended.map(coop => (
                  <CoopCard key={coop.id} coop={coop} onRequest={openRequest} isFrequent={false} />
                ))}
              </div>
            </section>
          )}

          {/* Browse All */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Browse All Cooperatives</h2>
            <form onSubmit={e => { e.preventDefault(); loadCoops(coopSearch, nearbyOnly) }} className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={coopSearch} onChange={e => setCoopSearch(e.target.value)} className="input pl-9" placeholder="Search by name, district, or crop…" />
              </div>
              <button type="submit" className="btn-primary px-5">Search</button>
              <button
                type="button"
                onClick={() => setNearbyOnly(v => !v)}
                className={`px-4 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-colors ${nearbyOnly ? 'bg-primary-500 text-white border-primary-500' : 'btn-secondary'}`}>
                <Navigation className="w-3.5 h-3.5" /> Near Me
              </button>
              <button type="button" onClick={() => { setCoopSearch(''); loadCoops('', nearbyOnly) }} className="btn-secondary px-4">
                <RefreshCw className="w-4 h-4" />
              </button>
            </form>

            {loadingCoops ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
            ) : allCoops.length === 0 ? (
              <div className="card py-12 text-center text-gray-400">No cooperatives found. Try a different search term.</div>
            ) : (
              <div className="space-y-3">
                {allCoops.map((coop, idx) => (
                  <div key={coop.id}
                    className={`card flex items-center gap-5 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all ${partnerIds.has(coop.id) ? 'border-success-200' : ''}`}
                    onClick={() => openRequest(coop)}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-primary-50 text-primary-700">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{coop.name}</p>
                        {partnerIds.has(coop.id) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-50 text-success-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Previous partner
                          </span>
                        )}
                        {idx === 0 && !partnerIds.has(coop.id) && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-50 text-warning-600 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-warning-400 text-warning-400" /> Top rated
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        {coop.district}{coop.sector ? ` · ${coop.sector}` : ''}
                        {coop.distance_km != null && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {coop.distance_km} km away
                          </span>
                        )}
                      </p>
                      {coop.crops_specialised?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {coop.crops_specialised.slice(0, 4).map(c => (
                            <span key={c} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      {coop.composite_score != null && <ScoreBadge score={coop.composite_score} />}
                      <p className="text-xs text-gray-400">{coop.total_batches_dispatched || 0} batches</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Collection Notices ── */}
      {tab === 'notices' && (
        <div className="space-y-4">
          {loadingNotices ? (
            <div className="card py-10 text-center text-gray-400">Loading…</div>
          ) : notices.length === 0 ? (
            <div className="card py-16 text-center text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No notices yet.</p>
              <p className="text-sm mt-1">Create one so market agents can see and order your available produce.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map(notice => (
                <div key={notice.id} className={`card ${!notice.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{notice.title}</h3>
                        {notice.is_active
                          ? <span className="badge badge-green">Active</span>
                          : <span className="badge badge-gray">Closed</span>}
                        {(notice.orders_count || 0) > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 border border-warning-200">
                            {notice.orders_count} order{notice.orders_count > 1 ? 's' : ''} received
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Crop</p>
                          <p className="font-semibold text-gray-900">{notice.crop_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Qty Available</p>
                          <p className="font-semibold text-gray-900">{Number(notice.quantity_available_kg).toLocaleString()} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Price / kg</p>
                          <p className="font-semibold text-success-700">RWF {Number(notice.price_per_kg || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Pickup Location</p>
                          <p className="font-medium text-gray-700">{notice.pickup_location || '—'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Available: {notice.available_from} &rarr; {notice.available_until}
                      </p>
                    </div>
                    {notice.is_active && (
                      <button onClick={() => deactivateNotice(notice.id)} className="btn-secondary text-xs flex items-center gap-1 flex-shrink-0">
                        <X className="w-3 h-3" /> Close Notice
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cooperative profile → order modal */}
      <Modal isOpen={showNew} onClose={closeCoopModal}
        title={coopStep === 'profile' ? 'Cooperative Profile' : `Order from ${selectedCoop?.name}`}>

        {coopStep === 'profile' && selectedCoop && (() => {
          const imgSrc = selectedCoop.image_url || getCropImage(selectedCoop.crops_specialised, selectedCoop.id)
          const score = Math.round((selectedCoop.composite_score || 0) * 100)
          const scoreColor = score >= 75 ? 'text-success-600' : score >= 50 ? 'text-warning-500' : 'text-gray-500'
          const crops = typeof selectedCoop.crops_specialised === 'string'
            ? selectedCoop.crops_specialised.split(',').map(s => s.trim())
            : (selectedCoop.crops_specialised || [])
          return (
            <div className="space-y-4">
              {/* Hero image */}
              <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100 -mt-1">
                <img src={imgSrc} alt={crops[0]} className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGES[Math.abs(selectedCoop.id || 0) % FALLBACK_IMAGES.length] }} />
              </div>

              {/* Name & location */}
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedCoop.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{selectedCoop.district}</p>
              </div>

              {/* Crops */}
              <div className="flex flex-wrap gap-2">
                {crops.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                    <Package className="w-3 h-3" />{c}
                  </span>
                ))}
              </div>

              {/* Performance stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${scoreColor}`}>{score}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Performance</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{selectedCoop.total_batches_dispatched ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Batches sent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-success-600">
                    {typeof selectedCoop.stock_tons === 'number' ? `${selectedCoop.stock_tons.toFixed(1)}t` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Stock available</p>
                </div>
              </div>

              {/* Score breakdown */}
              {selectedCoop.reliability_score != null && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score breakdown</p>
                  {[
                    { label: 'Reliability', value: selectedCoop.reliability_score },
                    { label: 'Quality consistency', value: selectedCoop.quality_consistency_rate },
                    { label: 'Response rate', value: selectedCoop.response_rate },
                    { label: 'On-time dispatch', value: selectedCoop.on_time_dispatch_rate },
                  ].map(({ label, value }) => value != null && (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-400 rounded-full" style={{ width: `${Math.round(value * 100)}%` }} />
                      </div>
                      <p className="text-xs font-medium text-gray-700 w-8 text-right">{Math.round(value * 100)}%</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={closeCoopModal} className="btn-secondary flex-1">Close</button>
                <button onClick={() => setCoopStep('order')} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Place Order <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })()}

        {coopStep === 'order' && (
          <form onSubmit={submitOrder} className="space-y-4">
            {selectedCoop ? (
              <div className="bg-primary-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary-800 text-sm">{selectedCoop.name}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{selectedCoop.district}</p>
                </div>
                <button type="button" onClick={() => setCoopStep('profile')} className="text-xs text-primary-600 hover:underline">View profile</button>
              </div>
            ) : (
              <div>
                <label className="label">Cooperative *</label>
                <select className="input" value={form.cooperative} onChange={e => setForm(f => ({ ...f, cooperative: e.target.value }))} required>
                  <option value="">Select cooperative…</option>
                  {allCoops.map(c => <option key={c.id} value={c.id}>{c.name} — {c.district}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Crop</label>
                <input className="input" value={form.crop_name} onChange={e => setForm(f => ({ ...f, crop_name: e.target.value }))} placeholder="e.g. Coffee" />
              </div>
              <div>
                <label className="label">Grade required</label>
                <select className="input" value={form.quality_grade_required} onChange={e => setForm(f => ({ ...f, quality_grade_required: e.target.value }))}>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity (kg) *</label>
                <input type="number" className="input" value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))} required min="1" />
              </div>
              <div>
                <label className="label">Required by *</label>
                <input type="date" className="input" value={form.required_delivery_date} onChange={e => setForm(f => ({ ...f, required_delivery_date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="label">Additional notes</label>
              <textarea className="input" rows={2} value={form.additional_notes} onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))} placeholder="Any special requirements…" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeCoopModal} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create notice modal */}
      <Modal isOpen={showNoticeForm} onClose={() => { setShowNoticeForm(false); setNoticeForm(NOTICE_BLANK) }} title="Create Collection Notice">
        <form onSubmit={submitNotice} className="space-y-4">
          <div>
            <label className="label">Notice title *</label>
            <input className="input" value={noticeForm.title} onChange={e => setNoticeForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Coffee Available – Batch June 2026" />
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
              {saving ? 'Publishing…' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Agreement modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Produce Request Agreement">
        {selectedOrder && (() => {
          const o = selectedOrder
          const statusColors = {
            PENDING: 'bg-warning-50 text-warning-700 border-warning-200',
            ACCEPTED: 'bg-success-50 text-success-700 border-success-200',
            DECLINED: 'bg-danger-50 text-danger-700 border-danger-200',
            IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
            DELIVERED: 'bg-primary-50 text-primary-700 border-primary-200',
            CONFIRMED: 'bg-success-50 text-success-700 border-success-200',
          }
          const statusCls = statusColors[o.status] || 'bg-gray-100 text-gray-600 border-gray-200'
          return (
            <div className="space-y-5">
              {/* Status banner */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${statusCls}`}>
                <span className="text-sm font-semibold">Request Status</span>
                <span className="text-sm font-bold uppercase tracking-wide">{o.status?.replace(/_/g, ' ')}</span>
              </div>

              {/* Reference */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Reference No.</span>
                <span className="font-mono font-semibold text-gray-900">DIST-REQ-{String(o.id).padStart(3, '0')}</span>
              </div>

              <hr className="border-gray-100" />

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Cooperative</p>
                  <p className="font-semibold text-gray-900">{o.cooperative_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Crop Requested</p>
                  <p className="font-semibold text-gray-900">{o.crop_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                  <p className="font-semibold text-gray-900">
                    {o.quantity_kg ? `${Number(o.quantity_kg).toLocaleString()} kg (${(Number(o.quantity_kg)/1000).toFixed(1)} tons)` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Quality Grade</p>
                  <p className="font-semibold text-gray-900">Grade {o.quality_grade_required || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Required by</p>
                  <p className="font-semibold text-gray-900">
                    {o.required_delivery_date ? new Date(o.required_delivery_date).toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date Placed</p>
                  <p className="font-semibold text-gray-900">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' }) : 'June 12, 2026'}
                  </p>
                </div>
              </div>

              {o.additional_notes && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{o.additional_notes}</p>
                  </div>
                </>
              )}

              <hr className="border-gray-100" />
              <p className="text-xs text-gray-400 text-center">
                This is an internal produce request record. It becomes a binding agreement once the cooperative accepts it.
              </p>

              <button onClick={() => setSelectedOrder(null)} className="btn-secondary w-full">Close</button>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
