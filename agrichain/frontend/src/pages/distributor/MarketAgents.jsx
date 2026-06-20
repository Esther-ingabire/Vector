import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, Phone, MapPin, Trash2, Star, TrendingDown, RefreshCw, CheckCircle, X, Clock } from 'lucide-react'
import Modal from '../../components/ui/Modal.jsx'
import { distributionApi } from '../../api/distribution.js'
import toast from 'react-hot-toast'

const MOCK_AGENTS = [
  { id: 1, agent_name: 'Alice Mutoni', phone: '+250 788 001 001', market: 'Kigali Central Market', district: 'Nyarugenge', total_orders: 12, avg_loss_pct: 3.8, linked_at: '2026-01-15' },
  { id: 2, agent_name: 'Bernard Hakizimana', phone: '+250 788 002 002', market: 'Kimironko Market', district: 'Gasabo', total_orders: 8, avg_loss_pct: 4.2, linked_at: '2026-02-20' },
  { id: 3, agent_name: 'Claire Ingabire', phone: '+250 788 003 003', market: 'Nyabugogo Market', district: 'Nyarugenge', total_orders: 15, avg_loss_pct: 2.9, linked_at: '2026-01-10' },
  { id: 4, agent_name: 'Daniel Uwimana', phone: '+250 788 004 004', market: 'Remera Market', district: 'Gasabo', total_orders: 5, avg_loss_pct: 5.1, linked_at: '2026-03-05' },
]

const LINK_BLANK = { phone_number: '', name: '' }

export default function MarketAgents() {
  const [agents, setAgents] = useState(MOCK_AGENTS)
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showLink, setShowLink] = useState(false)
  const [linkForm, setLinkForm] = useState(LINK_BLANK)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [approvingId, setApprovingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await distributionApi.getPendingAgentRequests()
      const all = res.data?.results ?? res.data ?? []
      setAgents(all.filter(l => l.is_active))
      setPendingRequests(all.filter(l => !l.is_active))
    } catch {
      // fallback: load active only
      try {
        const res = await distributionApi.getMyMarketAgents({})
        const list = res.data?.results ?? res.data ?? []
        if (list.length) setAgents(list)
      } catch {}
    }
    finally { setLoading(false) }
  }, [])

  const handleApprove = async (req) => {
    setApprovingId(req.id)
    try {
      await distributionApi.approveLinkRequest(req.id)
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      setAgents(prev => [...prev, { ...req, is_active: true }])
      toast.success(`${req.name} approved and linked`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not approve')
    } finally { setApprovingId(null) }
  }

  const handleReject = async (req) => {
    setApprovingId(req.id)
    try {
      await distributionApi.rejectLinkRequest(req.id)
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      toast.success('Request rejected')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not reject')
    } finally { setApprovingId(null) }
  }

  useEffect(() => { load() }, [load])

  const filtered = agents.filter(a =>
    !search || a.agent_name?.toLowerCase().includes(search.toLowerCase()) || a.market?.toLowerCase().includes(search.toLowerCase()) || a.district?.toLowerCase().includes(search.toLowerCase())
  )

  const handleLink = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await distributionApi.addMarketAgentLink({ phone_number: linkForm.phone_number })
      const newAgent = res.data
      setAgents(prev => [newAgent, ...prev])
      toast.success('Market agent linked successfully')
      setShowLink(false)
      setLinkForm(LINK_BLANK)
    } catch (err) {
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Agent not found — check phone number'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleRemove = async (agent) => {
    if (!window.confirm(`Unlink ${agent.agent_name}? They will no longer see your collection notices.`)) return
    setRemovingId(agent.id)
    try {
      await distributionApi.removeMarketAgentLink(agent.id)
    } catch {}
    setAgents(prev => prev.filter(a => a.id !== agent.id))
    toast.success('Agent unlinked')
    setRemovingId(null)
  }

  const totalOrders = agents.reduce((a, ag) => a + (ag.total_orders || 0), 0)
  const avgLoss = agents.length ? (agents.reduce((a, ag) => a + (ag.avg_loss_pct || 0), 0) / agents.length).toFixed(1) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your linked market agents. Linked agents can view your collection notices and place orders.</p>
        </div>
        <button onClick={() => setShowLink(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Link Agent
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <Users className="w-6 h-6 text-primary-500" />
          <div><p className="text-xl font-bold">{agents.length}</p><p className="text-sm text-gray-500">Linked agents</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <Star className="w-6 h-6 text-warning-500" />
          <div><p className="text-xl font-bold">{totalOrders}</p><p className="text-sm text-gray-500">Total orders placed</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <TrendingDown className="w-6 h-6 text-warning-500" />
          <div><p className="text-xl font-bold">{avgLoss}%</p><p className="text-sm text-gray-500">Avg transit loss rate</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search by name, market, or district…" />
        </div>
        <button onClick={load} className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Pending connection requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Connection Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map(req => (
            <div key={req.id} className="card py-3 flex items-center gap-4 border-amber-200 bg-amber-50/40">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700 font-bold">
                {(req.name || 'A')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{req.name}</p>
                <p className="text-xs text-gray-500">
                  {req.market_name && <>{req.market_name}</>}
                  {req.district && <> · {req.district}</>}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={approvingId === req.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={approvingId === req.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent cards */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-50" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No linked market agents yet.</p>
          <p className="text-sm mt-1">Link an agent so they can place orders against your collection notices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(agent => (
            <div key={agent.id} className="card flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 text-primary-700 font-bold text-base">
                {(agent.agent_name || 'A')[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{agent.agent_name}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  {agent.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone}</span>
                  )}
                  {agent.market && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{agent.market}</span>
                  )}
                  {agent.district && <span className="text-gray-400">{agent.district}</span>}
                </div>
              </div>

              <div className="flex items-center gap-6 text-right flex-shrink-0">
                <div>
                  <p className="text-lg font-bold text-gray-900">{agent.total_orders || 0}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${(agent.avg_loss_pct || 0) > 4 ? 'text-warning-600' : 'text-success-600'}`}>
                    {agent.avg_loss_pct?.toFixed(1) || '—'}%
                  </p>
                  <p className="text-xs text-gray-500">Avg loss</p>
                </div>
                <div className="text-xs text-gray-400">
                  <p>Linked</p>
                  <p>{agent.linked_at || '—'}</p>
                </div>
                <button
                  onClick={() => handleRemove(agent)}
                  disabled={removingId === agent.id}
                  className="p-2 text-gray-300 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-40"
                  title="Unlink agent">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link agent modal */}
      <Modal isOpen={showLink} onClose={() => { setShowLink(false); setLinkForm(LINK_BLANK) }} title="Link Market Agent">
        <form onSubmit={handleLink} className="space-y-4">
          <p className="text-sm text-gray-500">Enter the phone number of the market agent registered in ChainSight. They will receive a notification when linked.</p>
          <div>
            <label className="label">Agent phone number *</label>
            <input className="input" value={linkForm.phone_number}
              onChange={e => setLinkForm(f => ({ ...f, phone_number: e.target.value }))}
              required placeholder="+250 7XX XXX XXX" type="tel" />
            <p className="text-xs text-gray-400 mt-1">Must match the number they registered with on ChainSight.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowLink(false); setLinkForm(LINK_BLANK) }} className="btn-secondary flex-1">Cancel</button>
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
