import { useState, useEffect } from 'react'
import { Search, UserPlus, ChevronDown, MoreHorizontal, Shield, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const ROLES = ['ALL', 'ADMIN', 'COOPERATIVE_MANAGER', 'TRANSPORTER', 'DISTRIBUTOR', 'MARKET_AGENT', 'MINAGRI_OFFICER']
const ROLE_LABELS = { ADMIN: 'Admin', COOPERATIVE_MANAGER: 'Coop Manager', TRANSPORTER: 'Transporter', DISTRIBUTOR: 'Distributor', MARKET_AGENT: 'Market Agent', MINAGRI_OFFICER: 'MINAGRI Officer' }
const ROLE_COLORS = { ADMIN: 'bg-danger-50 text-danger-500', COOPERATIVE_MANAGER: 'bg-success-50 text-success-500', TRANSPORTER: 'bg-warning-50 text-warning-500', DISTRIBUTOR: 'bg-primary-50 text-primary-600', MARKET_AGENT: 'bg-purple-50 text-purple-600', MINAGRI_OFFICER: 'bg-blue-50 text-blue-600' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [total, setTotal] = useState(0)
  const [actionUser, setActionUser] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (roleFilter !== 'ALL') params.role = roleFilter
      if (search) params.search = search
      const res = await authApi.getUsers(params)
      setUsers(res.data.results || res.data || [])
      setTotal(res.data.count || (res.data?.length) || 0)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [roleFilter])

  const handleSearch = (e) => { e.preventDefault(); load() }

  const toggleActive = async (user) => {
    try {
      await authApi.updateUser(user.id, { is_active: !user.is_active })
      toast.success(`User ${user.is_active ? 'suspended' : 'activated'}`)
      load()
    } catch { toast.error('Action failed') }
    setActionUser(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…" className="input pl-9" />
            </div>
            <button type="submit" className="btn-primary px-4">Search</button>
          </form>
          <div className="flex gap-1 flex-wrap">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r === 'ALL' ? 'All Roles' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400">{u.phone_number}</p>
                      {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.organization_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.district || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-success-50 text-success-500' : 'bg-gray-100 text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-success-500' : 'bg-gray-400'}`} />
                      {u.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button onClick={() => setActionUser(actionUser?.id === u.id ? null : u)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionUser?.id === u.id && (
                        <div className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-40">
                          <button onClick={() => toggleActive(u)}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${u.is_active ? 'text-warning-500' : 'text-success-500'}`}>
                            {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {u.is_active ? 'Suspend account' : 'Activate account'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
