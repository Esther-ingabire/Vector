import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, Building2, CheckCircle, Clock, Plus, RefreshCw, Navigation, Package, X, List, Map as MapIcon } from 'lucide-react'
import { marketAgentApi } from '../../api/marketAgent.js'
import MapboxMap from '../../components/map/MapboxMap.jsx'
import toast from 'react-hot-toast'

const MOCK_DISTRIBUTORS = [
  { id: 1, name: 'Kigali Fresh Distributors',    company_name: 'Kigali Fresh Ltd',         district: 'Gasabo',     warehouse_location: 'Kacyiru, Kigali' },
  { id: 2, name: 'Musanze Agro Wholesale',       company_name: 'Musanze Agro Wholesale',   district: 'Musanze',    warehouse_location: 'Musanze Town' },
  { id: 3, name: 'Huye Market Supplies',         company_name: 'Huye Supplies Ltd',        district: 'Huye',       warehouse_location: 'Huye Market Area' },
  { id: 4, name: 'Rubavu Lakeside Distributors', company_name: 'Rubavu Distributors Ltd',  district: 'Rubavu',     warehouse_location: 'Gisenyi, Rubavu' },
  { id: 5, name: 'Rwamagana Agri Hub',           company_name: 'Rwamagana Agri Hub',       district: 'Rwamagana',  warehouse_location: 'Rwamagana Town' },
]

// linkStatus: null = not connected, 'PENDING' = request sent, 'LINKED' = active link
function LinkBadge({ status }) {
  if (status === 'LINKED')
    return <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />Linked</span>
  if (status === 'PENDING')
    return <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" />Request sent</span>
  return null
}

export default function FindDistributorsPage() {
  const [distributors, setDistributors] = useState([])
  const [links, setLinks] = useState({})   // { distributorId: 'LINKED' | 'PENDING' }
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(null)
  const [search, setSearch] = useState('')
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [profileDist, setProfileDist] = useState(null)
  const [view, setView] = useState('list')

  const load = useCallback(async (nearby = false) => {
    setLoading(true)
    try {
      const [distRes, linkRes] = await Promise.allSettled([
        nearby ? marketAgentApi.getNearbyDistributors() : marketAgentApi.getAllDistributors(),
        marketAgentApi.getMyLinks(),
      ])
      if (distRes.status === 'fulfilled') {
        const list = distRes.value.data?.results ?? distRes.value.data ?? []
        setDistributors(list.length ? list : MOCK_DISTRIBUTORS)
      } else {
        setDistributors(MOCK_DISTRIBUTORS)
      }
      if (linkRes.status === 'fulfilled') {
        const myLinks = linkRes.value.data ?? []
        const map = {}
        myLinks.forEach(l => {
          map[l.distributor_id] = l.is_active ? 'LINKED' : 'PENDING'
        })
        setLinks(map)
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(nearbyOnly) }, [load, nearbyOnly])

  const handleRequest = async (dist) => {
    setRequesting(dist.id)
    try {
      await marketAgentApi.requestLink(dist.id)
      setLinks(prev => ({ ...prev, [dist.id]: 'PENDING' }))
      toast.success(`Connection request sent to ${dist.name || dist.company_name}`)
    } catch (err) {
      const msg = err?.response?.data?.detail
      if (msg === 'Already linked.') {
        setLinks(prev => ({ ...prev, [dist.id]: 'LINKED' }))
        toast('Already linked to this distributor.', { icon: 'ℹ️' })
      } else {
        toast.error(msg || 'Could not send request')
      }
    } finally { setRequesting(null) }
  }

  const filtered = distributors.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (d.name || d.company_name || '').toLowerCase().includes(q)
      || (d.district || '').toLowerCase().includes(q)
      || (d.warehouse_location || '').toLowerCase().includes(q)
  })

  const linked = filtered.filter(d => links[d.id] === 'LINKED')
  const pending = filtered.filter(d => links[d.id] === 'PENDING')
  const unlinked = filtered.filter(d => !links[d.id])

  const sections = [
    { label: 'Your Distributors', items: linked,   empty: 'No linked distributors yet.' },
    { label: 'Pending Requests',  items: pending,  empty: null },
    { label: nearbyOnly ? 'Nearest Distributors' : 'Available to Connect', items: unlinked, empty: 'No other distributors found.' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Distributors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect with distributors to access their stock listings and place orders.</p>
        </div>
        <button onClick={() => load(nearbyOnly)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search + Near Me + List/Map toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, district, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setNearbyOnly(v => !v)}
          className={`px-4 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-colors ${nearbyOnly ? 'bg-primary-500 text-white border-primary-500' : 'btn-secondary'}`}>
          <Navigation className="w-3.5 h-3.5" /> Near Me
        </button>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('list')}
            className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setView('map')}
            className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${view === 'map' ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <MapIcon className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </div>

      {view === 'map' ? (
        <MapboxMap
          height={480}
          fitToMarkers
          showSearch
          markers={filtered
            .filter(d => d.warehouse_gps_lat != null && d.warehouse_gps_lng != null)
            .map(d => ({
              id: d.id,
              lat: parseFloat(d.warehouse_gps_lat),
              lng: parseFloat(d.warehouse_gps_lng),
              color: links[d.id] === 'LINKED' ? '#15803d' : links[d.id] === 'PENDING' ? '#C55A11' : '#228b52',
              onClick: () => setProfileDist(d),
            }))}
        />
      ) : loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-50" />)}</div>
      ) : (
        sections.map(({ label, items, empty }) => {
          if (!items.length && !empty) return null
          return (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">{empty}</p>
              ) : items.map(dist => {
                const linkStatus = links[dist.id] ?? null
                const isRequesting = requesting === dist.id
                const displayName = dist.name || dist.company_name || `Distributor #${dist.id}`
                return (
                  <div key={dist.id} className="card py-3.5 flex items-center gap-3 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all" onClick={() => setProfileDist(dist)}>
                    <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {dist.warehouse_location || dist.district || '—'}
                        {dist.district && dist.warehouse_location ? ` · ${dist.district}` : ''}
                        {dist.distance_km != null && (
                          <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {dist.distance_km} km away
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {linkStatus ? (
                        <LinkBadge status={linkStatus} />
                      ) : (
                        <button
                          onClick={() => handleRequest(dist)}
                          disabled={isRequesting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-60">
                          {isRequesting
                            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Plus className="w-3.5 h-3.5" />}
                          {isRequesting ? 'Sending...' : 'Request to Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {/* Full profile modal */}
      {profileDist && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setProfileDist(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{profileDist.name || profileDist.company_name}</h3>
                  <p className="text-xs text-gray-400">{profileDist.district}</p>
                </div>
              </div>
              <button onClick={() => setProfileDist(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              {profileDist.contact_person && (
                <div className="flex justify-between"><span className="text-gray-500">Contact person</span><span className="font-medium text-gray-900">{profileDist.contact_person}</span></div>
              )}
              {profileDist.contact_phone && (
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium text-gray-900">{profileDist.contact_phone}</span></div>
              )}
              {profileDist.email && (
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900">{profileDist.email}</span></div>
              )}
              {profileDist.warehouse_location && (
                <div className="flex justify-between"><span className="text-gray-500">Warehouse</span><span className="font-medium text-gray-900">{profileDist.warehouse_location}</span></div>
              )}
              {profileDist.member_since && (
                <div className="flex justify-between"><span className="text-gray-500">Partner since</span><span className="font-medium text-gray-900">{new Date(profileDist.member_since).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })}</span></div>
              )}
              {profileDist.distance_km != null && (
                <div className="flex justify-between"><span className="text-gray-500">Distance</span><span className="font-medium text-gray-900">{profileDist.distance_km} km from your stall</span></div>
              )}
            </div>

            {profileDist.linked_agents_count != null && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-success-500" />
                Already supplying {profileDist.linked_agents_count} market agent{profileDist.linked_agents_count === 1 ? '' : 's'}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Currently Available
              </p>
              {(profileDist.active_notices || []).length === 0 ? (
                <p className="text-sm text-gray-400">No active collection notices right now.</p>
              ) : (
                <div className="space-y-1.5">
                  {profileDist.active_notices.map(n => (
                    <div key={n.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-gray-800">{n.crop_name}</span>
                      <div className="text-right">
                        <span className="text-gray-500">{Number(n.available_quantity_kg).toLocaleString()} kg</span>
                        {n.price_per_kg != null && (
                          <span className="text-success-600 font-medium ml-2">RWF {Number(n.price_per_kg).toLocaleString()}/kg</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setProfileDist(null)} className="btn-secondary flex-1">Close</button>
              {!links[profileDist.id] && (
                <button
                  onClick={() => { handleRequest(profileDist); setProfileDist(null) }}
                  className="btn-primary flex-1">
                  Request to Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
