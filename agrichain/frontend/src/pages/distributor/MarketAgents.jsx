import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, Phone, MapPin, Trash2, TrendingDown, RefreshCw,
         CheckCircle, X, Clock, ShoppingBag, Star, AlertTriangle } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import DeclineReasonPicker from '../../components/ui/DeclineReasonPicker.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const AGENT_REJECT_REASONS = ['Already at capacity', 'Service area mismatch', 'No available stock for this area', 'Duplicate application']

export default function MarketAgents() {
  const [agents, setAgents]               = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [showLink, setShowLink]           = useState(false)
  const [linkPhone, setLinkPhone]         = useState('')
  const [saving, setSaving]               = useState(false)
  const [removingId, setRemovingId]       = useState(null)
  const [approvingId, setApprovingId]     = useState(null)
  const [rejectingId, setRejectingId]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await distributionApi.getPendingAgentRequests()
      const all = res.data?.results ?? res.data ?? []
      setAgents(all.filter(l => l.is_active))
      setPendingRequests(all.filter(l => !l.is_active))
    } catch {
      try {
        const res = await distributionApi.getMyMarketAgents({})
        setAgents(res.data?.results ?? res.data ?? [])
      } catch {}
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (req) => {
    setApprovingId(req.id)
    try {
      await distributionApi.approveLinkRequest(req.id)
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      setAgents(prev => [...prev, { ...req, is_active: true }])
      toast.success(`${req.name || req.agent_name} approved and linked`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not approve')
    } finally { setApprovingId(null) }
  }

  const handleReject = async (req, reason) => {
    setApprovingId(req.id)
    setRejectingId(null)
    try {
      await distributionApi.rejectLinkRequest(req.id, { reason: reason || 'Declined' })
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      toast.success('Request rejected')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not reject')
    } finally { setApprovingId(null) }
  }

  const handleLink = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await distributionApi.addMarketAgentLink({ phone_number: linkPhone })
      setAgents(prev => [res.data, ...prev])
      toast.success('Market agent linked successfully')
      setShowLink(false)
      setLinkPhone('')
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Agent not found — check phone number'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleRemove = async (agent) => {
    const name = agent.agent_name || agent.name || 'this agent'
    if (!window.confirm(`Unlink ${name}? They will no longer see your collection notices.`)) return
    setRemovingId(agent.id)
    try { await distributionApi.removeMarketAgentLink(agent.id) } catch {}
    setAgents(prev => prev.filter(a => a.id !== agent.id))
    toast.success('Agent unlinked')
    setRemovingId(null)
  }

  const filtered = agents.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.agent_name || a.name || '').toLowerCase().includes(q)
      || (a.market_name || a.market || '').toLowerCase().includes(q)
      || (a.district || '').toLowerCase().includes(q)
  })

  const totalOrders = agents.reduce((s, a) => s + (a.total_orders || 0), 0)
  const avgLoss = agents.length
    ? (agents.reduce((s, a) => s + (a.avg_self_transport_loss_pct || 0), 0) / agents.length).toFixed(1)
    : '—'
  const highRisk = agents.filter(a => (a.avg_self_transport_loss_pct || 0) > 5).length

  const lossColor = (pct) => {
    if (pct > 5) return 'text-danger-600'
    if (pct > 3) return 'text-warning-600'
    return 'text-success-600'
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Linked agents can view your collection notices and place orders.
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-50 text-warning-700 border border-warning-200">
                <Clock className="w-3 h-3" /> {pendingRequests.length} pending
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowLink(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Link Agent
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div><p className="text-xl font-bold text-gray-900">{agents.length}</p><p className="text-xs text-gray-500">Linked agents</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-success-600" />
          </div>
          <div><p className="text-xl font-bold text-gray-900">{totalOrders}</p><p className="text-xs text-gray-500">Total orders placed</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5 text-warning-500" />
          </div>
          <div><p className="text-xl font-bold text-gray-900">{avgLoss}%</p><p className="text-xs text-gray-500">Avg self-transport loss</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highRisk > 0 ? 'bg-danger-50' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${highRisk > 0 ? 'text-danger-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-xl font-bold ${highRisk > 0 ? 'text-danger-600' : 'text-gray-900'}`}>{highRisk}</p>
            <p className="text-xs text-gray-500">High-loss agents (&gt;5%)</p>
          </div>
        </div>
      </div>

      {/* Pending connection requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-warning-500" /> Pending Connection Requests — {pendingRequests.length}
          </p>
          {pendingRequests.map(req => (
            <div key={req.id}>
              <div className="card py-4 flex items-center gap-4 border-warning-200 bg-warning-50/40">
                <div className="w-11 h-11 rounded-xl bg-warning-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-warning-700 font-bold text-base">{(req.agent_name || req.name || 'A')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{req.agent_name || req.name || '—'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    {(req.market_name || req.market) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {req.market_name || req.market}
                      </span>
                    )}
                    {req.district && <span>{req.district}</span>}
                    {req.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(req)} disabled={approvingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setRejectingId(req.id)} disabled={approvingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-60">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
              {rejectingId === req.id && (
                <div className="mt-1">
                  <DeclineReasonPicker quickReasons={AGENT_REJECT_REASONS} busy={approvingId === req.id}
                    label="Confirm Rejection" onConfirm={reason => handleReject(req, reason)} onCancel={() => setRejectingId(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" placeholder="Search by name, market, or district…" />
        </div>
        <button onClick={load} className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Linked agent list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-50" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No linked market agents yet</p>
          <p className="text-sm mt-1">Link an agent so they can see your collection notices and place orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(agent => {
            const name     = agent.agent_name || agent.name || '—'
            const market   = agent.market_name || agent.market || '—'
            const district = agent.district || '—'
            const phone    = agent.phone || agent.contact_phone || ''
            const orders   = agent.total_orders || 0
            const loss     = agent.avg_self_transport_loss_pct
            const initials = name[0]?.toUpperCase() || 'A'
            const isHighRisk = loss > 5
            return (
              <div key={agent.id} className={`card flex items-center gap-5 ${isHighRisk ? 'border-l-4 border-l-danger-400' : ''}`}>
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base ${isHighRisk ? 'bg-danger-50 text-danger-700' : 'bg-primary-50 text-primary-700'}`}>
                  {initials}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{name}</p>
                    {isHighRisk && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-danger-50 text-danger-600 border border-danger-200">
                        <AlertTriangle className="w-3 h-3" /> High loss
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" /> {market}
                    </span>
                    <span className="text-gray-400">{district}</span>
                    {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{phone}</span>}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-right flex-shrink-0">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{orders}</p>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${loss != null ? lossColor(loss) : 'text-gray-400'}`}>
                      {loss != null ? `${Number(loss).toFixed(1)}%` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">Self-transport loss</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{agent.stall_number ? `Stall ${agent.stall_number}` : '—'}</p>
                    <p className="text-xs text-gray-400">Stall no.</p>
                  </div>
                  <button onClick={() => handleRemove(agent)} disabled={removingId === agent.id}
                    className="p-2 text-gray-300 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-40"
                    title="Unlink agent">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Link agent modal */}
      <Modal isOpen={showLink} onClose={() => { setShowLink(false); setLinkPhone('') }} title="Link Market Agent">
        <form onSubmit={handleLink} className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter the phone number of the market agent registered in ChainSight.
            They will be notified when linked and can immediately start viewing your collection notices.
          </p>
          <div>
            <label className="label">Agent phone number *</label>
            <input className="input" value={linkPhone} onChange={e => setLinkPhone(e.target.value)}
              required placeholder="+250 7XX XXX XXX" type="tel" />
            <p className="text-xs text-gray-400 mt-1">Must match exactly the number they registered with on ChainSight.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowLink(false); setLinkPhone('') }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Linking…' : 'Link Agent'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
