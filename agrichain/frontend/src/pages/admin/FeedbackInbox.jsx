import { useState, useEffect } from 'react'
import { MessageSquare, HelpCircle, Star, CheckCircle, Clock, Filter, X, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { feedbackApi } from '../../api/feedback.js'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const MODE_BADGE   = { feedback: 'badge-primary', help: 'badge-green' }
const STATUS_BADGE = { new: 'badge-amber', read: 'badge-gray', resolved: 'badge-green' }

function StarDisplay({ rating }) {
  if (!rating) return <span className="text-xs text-gray-300">—</span>
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

function FeedbackCard({ item, onResolved }) {
  const [expanded, setExpanded] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [resolving, setResolving] = useState(false)

  const handleResolve = async () => {
    setResolving(true)
    try {
      await feedbackApi.resolve(item.id, noteInput)
      toast.success('Marked as resolved')
      onResolved(item.id, noteInput)
    } catch {
      // interceptor shows toast
    } finally {
      setResolving(false)
    }
  }

  const ModeIcon = item.mode === 'feedback' ? MessageSquare : HelpCircle

  return (
    <div className={`card p-0 overflow-hidden border-2 ${item.status === 'resolved' ? 'border-success-400' : item.status === 'new' ? 'border-warning-400' : 'border-gray-200'}`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.mode === 'feedback' ? 'bg-primary-50' : 'bg-success-50'}`}>
          <ModeIcon className={`w-4 h-4 ${item.mode === 'feedback' ? 'text-primary-600' : 'text-success-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-800">{item.user_name}</span>
            <span className="text-xs text-gray-400">{item.user_phone}</span>
            <span className={MODE_BADGE[item.mode] || 'badge-gray'}>
              {item.mode === 'feedback' ? 'Feedback' : 'Help & Support'}
            </span>
            <span className={STATUS_BADGE[item.status] || 'badge-gray'}>
              {item.status}
            </span>
            {item.rating && <StarDisplay rating={item.rating} />}
          </div>
          <p className="text-sm text-gray-500 truncate pr-4">{item.message}</p>
          <p className="text-xs text-gray-300 mt-1">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })} · {item.role?.replace(/_/g, ' ')}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.message}</p>

          {item.admin_note && (
            <div className="bg-success-50 rounded-xl p-3 text-sm text-success-700">
              <p className="font-medium mb-1">Your note</p>
              <p className="leading-snug">{item.admin_note}</p>
            </div>
          )}

          {item.status !== 'resolved' && (
            <div className="space-y-2">
              <label className="label">Add a note &amp; resolve</label>
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={2}
                placeholder="Optional internal note…"
                className="input resize-none text-sm"
              />
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {resolving ? 'Resolving…' : <><CheckCircle className="w-4 h-4" /> Mark as Resolved</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedbackInbox() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (modeFilter !== 'all') params.mode = modeFilter
      const res = await feedbackApi.list(params)
      setItems(res.data?.results || res.data || [])
    } catch {
      // interceptor shows toast
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, modeFilter])

  const handleResolved = (id, note) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved', admin_note: note } : i))
  }

  const newCount  = items.filter(i => i.status === 'new').length
  const helpCount = items.filter(i => i.mode === 'help').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Support Inbox</h1>
        <p className="text-sm text-gray-500 mt-0.5">Feedback and help requests submitted by users.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total submissions', value: items.length,    color: 'text-gray-800',   bg: 'bg-gray-50 border border-gray-200' },
          { label: 'Awaiting response', value: newCount,        color: 'text-warning-700', bg: 'bg-warning-50 border border-warning-200' },
          { label: 'Help requests',     value: helpCount,       color: 'text-success-700', bg: 'bg-success-50 border border-success-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input">
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="input">
              <option value="all">All Types</option>
              <option value="feedback">Feedback</option>
              <option value="help">Help &amp; Support</option>
            </select>
          </div>
          {(statusFilter !== 'all' || modeFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilter('all'); setModeFilter('all') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-danger-600 border border-gray-200 hover:border-danger-300 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-14">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No submissions yet</p>
          <p className="text-xs text-gray-300 mt-1">Feedback and help requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <FeedbackCard key={item.id} item={item} onResolved={handleResolved} />
          ))}
        </div>
      )}
    </div>
  )
}
