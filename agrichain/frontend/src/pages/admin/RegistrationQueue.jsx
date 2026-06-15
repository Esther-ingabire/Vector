import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, FileText, Phone, MapPin, Building, ChevronLeft, Eye, Download, X, Clock } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const API_ORIGIN = (() => {
  const base = import.meta.env.VITE_API_URL || ''
  if (base.startsWith('http')) return new URL(base).origin
  return window.location.origin
})()

function mediaUrl(url) {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

const DOC_LABELS = {
  NATIONAL_ID: 'National ID',
  COOPERATIVE_REG: 'Cooperative Registration',
  DRIVERS_LICENSE: "Driver's Licence",
  VEHICLE_LOGBOOK: 'Vehicle Logbook',
  COMPANY_REGISTRATION: 'Company Registration',
  OTHER: 'Other Document',
}

function DocViewerModal({ doc, onClose }) {
  const url = mediaUrl(doc.url)
  const isPdf = url?.toLowerCase().includes('.pdf')
  const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url || '')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-primary-500" />
            <span className="font-semibold text-gray-900">{DOC_LABELS[doc.type] || doc.type || 'Document'}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} download target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <a href={url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors">
              <Eye className="w-3.5 h-3.5" /> Open in tab
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {isImage ? (
            <img src={url} alt={doc.type} className="max-w-full mx-auto rounded-lg shadow-sm" />
          ) : isPdf ? (
            <iframe src={url} title={doc.type} className="w-full h-[60vh] rounded-lg border border-gray-200" />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Preview not available</p>
              <p className="text-xs mt-1">Use the buttons above to open or download this file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ROLE_LABELS = { COOPERATIVE_MANAGER: 'Cooperative Manager', TRANSPORTER: 'Transporter', DISTRIBUTOR: 'Distributor', MARKET_AGENT: 'Market Agent', MINAGRI_OFFICER: 'MINAGRI Officer' }

function RequestCard({ req, onSelect }) {
  return (
    <div onClick={() => onSelect(req)} className="card cursor-pointer hover:border-primary-300 hover:shadow-md transition-all border border-transparent">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{req.full_name}</p>
          <p className="text-sm text-gray-500">{ROLE_LABELS[req.role_requested] || req.role_requested}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Building className="w-3 h-3" />{req.organization_name}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.district}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone_number}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
          <span className="text-xs text-warning-500 bg-warning-50 px-2 py-0.5 rounded-full font-medium">Pending Review</span>
        </div>
      </div>
      <p className="text-xs mt-2 flex items-center gap-1">
        {req.documents?.length > 0
          ? <><FileText className="w-3 h-3 text-primary-500" /><span className="text-primary-600 font-medium">{req.documents.length} document{req.documents.length !== 1 ? 's' : ''} submitted</span></>
          : <><FileText className="w-3 h-3 text-gray-300" /><span className="text-gray-400">No documents uploaded</span></>
        }
      </p>
    </div>
  )
}

function RequestDetail({ req, onBack, onAction }) {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [viewDoc, setViewDoc] = useState(null)
  const [newUserData, setNewUserData] = useState({ first_name: req.full_name.split(' ')[0] || '', last_name: req.full_name.split(' ').slice(1).join(' ') || '', username: '', role: req.role_requested, phone_number: req.phone_number, email: req.email || '', organization_name: req.organization_name, district: req.district })

  const approve = async () => {
    if (!newUserData.username) { toast.error('Please set a username for the new account'); return }
    setApproving(true)
    try {
      await authApi.approveRequest(req.id, newUserData)
      toast.success('Account created and OTP sent')
      onAction()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Approval failed')
    } finally { setApproving(false) }
  }

  const reject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason for rejection'); return }
    setRejecting(true)
    try {
      await authApi.rejectRequest(req.id, { reason: rejectReason })
      toast.success('Request rejected')
      onAction()
    } catch { toast.error('Rejection failed') }
    finally { setRejecting(false) }
  }

  return (
    <div className="space-y-6">
      {viewDoc && <DocViewerModal doc={viewDoc} onClose={() => setViewDoc(null)} />}

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> Back to queue
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applicant info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Applicant Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[['Full Name', req.full_name], ['Role Requested', ROLE_LABELS[req.role_requested] || req.role_requested], ['Organisation', req.organization_name], ['District', req.district], ['Phone', req.phone_number], ['Email', req.email || '—'], ['Submitted', format(new Date(req.created_at), 'dd MMM yyyy HH:mm')]].map(([label, val]) => (
              <div key={label}><p className="text-xs text-gray-400">{label}</p><p className="font-medium text-gray-800">{val}</p></div>
            ))}
          </div>

          {/* Documents */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Submitted Documents</p>
            {req.documents?.length > 0 ? (
              <div className="space-y-2">
                {req.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {DOC_LABELS[doc.type] || doc.type || `Document ${i + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <a href={mediaUrl(doc.url)} download target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No documents uploaded with this request.</p>
            )}
          </div>
        </div>

        {/* Account creation */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Create Account</h2>
          <p className="text-xs text-gray-500">Fill in account details before approving. An OTP will be sent to the user.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First name</label><input className="input" value={newUserData.first_name} onChange={e => setNewUserData(p => ({...p, first_name: e.target.value}))} /></div>
              <div><label className="label">Last name</label><input className="input" value={newUserData.last_name} onChange={e => setNewUserData(p => ({...p, last_name: e.target.value}))} /></div>
            </div>
            <div><label className="label">Username *</label><input className="input" placeholder="e.g. jhabimana" value={newUserData.username} onChange={e => setNewUserData(p => ({...p, username: e.target.value}))} /></div>
            <div><label className="label">Phone number</label><input className="input" value={newUserData.phone_number} onChange={e => setNewUserData(p => ({...p, phone_number: e.target.value}))} /></div>
            <div><label className="label">Email</label><input className="input" value={newUserData.email} onChange={e => setNewUserData(p => ({...p, email: e.target.value}))} /></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={approve} disabled={approving} className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
              {approving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {approving ? 'Creating…' : 'Approve & Create Account'}
            </button>
            <button onClick={() => setShowRejectForm(v => !v)} className="flex-1 btn-danger flex items-center justify-center gap-2 py-2.5">
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>

          {showRejectForm && (
            <div className="space-y-3 pt-2 border-t">
              <label className="label">Reason for rejection *</label>
              <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why the request is being rejected…" />
              <button onClick={reject} disabled={rejecting} className="btn-danger w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {rejecting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RegistrationQueue() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const { id } = useParams()

  const load = async () => {
    setLoading(true)
    try {
      const res = await authApi.getAccessRequests({ status: 'PENDING' })
      const list = res.data.results || res.data || []
      setRequests(list)
      if (id) setSelected(list.find(r => String(r.id) === id) || null)
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAction = () => { setSelected(null); load() }

  if (selected) return <RequestDetail req={selected} onBack={() => setSelected(null)} onAction={handleAction} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registration Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and approve access requests from applicants.</p>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success-500" />
          <p className="font-semibold text-gray-700">All requests reviewed</p>
          <p className="text-sm text-gray-400 mt-1">No pending access requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => <RequestCard key={r.id} req={r} onSelect={setSelected} />)}
        </div>
      )}
    </div>
  )
}
