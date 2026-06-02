import { useState, useEffect } from 'react'
import { Search, Download, Filter } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ACTION_COLORS = { LOGIN: 'bg-success-50 text-success-500', LOGOUT: 'bg-gray-100 text-gray-500', FAILED_LOGIN: 'bg-danger-50 text-danger-500', ACCOUNT_CREATED: 'bg-primary-50 text-primary-600', ACCOUNT_SUSPENDED: 'bg-warning-50 text-warning-500', ACCOUNT_ACTIVATED: 'bg-success-50 text-success-500', PASSWORD_CHANGED: 'bg-primary-50 text-primary-600', OTP_SENT: 'bg-gray-100 text-gray-500', OTP_VERIFIED: 'bg-success-50 text-success-500', DATA_CREATED: 'bg-primary-50 text-primary-600', DATA_UPDATED: 'bg-warning-50 text-warning-500', DATA_DELETED: 'bg-danger-50 text-danger-500', PERMISSION_DENIED: 'bg-danger-50 text-danger-500', REPORT_DOWNLOADED: 'bg-gray-100 text-gray-600' }

const ACTIONS = ['ALL', 'LOGIN', 'FAILED_LOGIN', 'LOGOUT', 'ACCOUNT_CREATED', 'PASSWORD_CHANGED', 'DATA_CREATED', 'DATA_UPDATED', 'PERMISSION_DENIED', 'REPORT_DOWNLOADED']

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ action: 'ALL', search: '', date_from: '', date_to: '' })
  const PAGE_SIZE = 50

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, page_size: PAGE_SIZE }
      if (filters.action !== 'ALL') params.action = filters.action
      if (filters.search) params.search = filters.search
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const res = await authApi.getAuditLogs(params)
      setLogs(res.data.results || res.data || [])
      setTotal(res.data.count || 0)
      setPage(p)
    } catch { toast.error('Failed to load audit log') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [filters.action])

  const handleSearch = (e) => { e.preventDefault(); load(1) }

  const exportCsv = () => {
    const rows = [['Timestamp', 'Action', 'User', 'Description', 'IP Address']]
    logs.forEach(l => rows.push([l.timestamp, l.action, l.user?.phone_number || 'System', l.description, l.ip_address || '']))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Immutable record of all system activity. {total.toLocaleString()} total events.</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={filters.search} onChange={e => setFilters(p => ({...p, search: e.target.value}))} placeholder="Search user, description…" className="input pl-9" />
            </div>
          </div>
          <div>
            <label className="label">Action</label>
            <select value={filters.action} onChange={e => setFilters(p => ({...p, action: e.target.value}))} className="input">
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(p => ({...p, date_from: e.target.value}))} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(p => ({...p, date_to: e.target.value}))} className="input" />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2"><Filter className="w-4 h-4" />Apply</button>
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-7 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit events found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 font-mono text-xs">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{log.timestamp ? format(new Date(log.timestamp), 'dd MMM yyyy HH:mm:ss') : '—'}</td>
                  <td className="px-4 py-2.5"><span className={`font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action}</span></td>
                  <td className="px-4 py-2.5 text-gray-600 font-sans">{log.user?.phone_number || <span className="text-gray-400 italic">System</span>}</td>
                  <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate font-sans">{log.description}</td>
                  <td className="px-4 py-2.5 text-gray-400">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of {total.toLocaleString()}</p>
            <div className="flex gap-1">
              <button onClick={() => load(page-1)} disabled={page<=1} className="px-3 py-1 rounded text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-100">Previous</button>
              <button onClick={() => load(page+1)} disabled={page>=pages} className="px-3 py-1 rounded text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-100">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
