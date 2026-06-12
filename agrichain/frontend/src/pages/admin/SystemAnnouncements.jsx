import { useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: 'Scheduled Maintenance', body: 'The system will be offline for maintenance on Sunday 8 June from 02:00–04:00 CAT. Please plan accordingly.', created_at: new Date(Date.now() - 2 * 86400000), active: true },
  { id: 2, title: 'New Crop Thresholds', body: 'Loss prediction thresholds for Irish Potatoes have been updated. Cooperative managers and distributors should review their active batches.', created_at: new Date(Date.now() - 7 * 86400000), active: false },
]

export default function SystemAnnouncements() {
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', body: '' })

  const openNew = () => { setForm({ title: '', body: '' }); setEditing(null); setShowForm(true) }
  const openEdit = (a) => { setForm({ title: a.title, body: a.body }); setEditing(a.id); setShowForm(true) }

  const save = () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body required'); return }
    if (editing) {
      setAnnouncements(prev => prev.map(a => a.id === editing ? { ...a, ...form } : a))
      toast.success('Announcement updated')
    } else {
      setAnnouncements(prev => [{ id: Date.now(), ...form, created_at: new Date(), active: true }, ...prev])
      toast.success('Announcement posted')
    }
    setShowForm(false)
  }

  const del = (id) => { setAnnouncements(prev => prev.filter(a => a.id !== id)); toast.success('Deleted') }
  const toggle = (id) => setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Active announcements are shown to all users at login.</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New Announcement</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="space-y-4">
            <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Announcement title" /></div>
            <div><label className="label">Message *</label><textarea className="input resize-none" rows={4} value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} placeholder="Write the announcement here…" /></div>
            <div className="flex gap-3">
              <button onClick={save} className="btn-primary flex items-center gap-2"><Check className="w-4 h-4" />{editing ? 'Save changes' : 'Post announcement'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {announcements.length === 0 && <div className="card text-center py-12 text-gray-400"><Megaphone className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No announcements yet</p></div>}
        {announcements.map(a => (
          <div key={a.id} className={`card border-2 ${a.active ? 'border-primary-500' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{a.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.active ? 'bg-success-50 text-success-500' : 'bg-gray-100 text-gray-400'}`}>{a.active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-sm text-gray-600">{a.body}</p>
                <p className="text-xs text-gray-400 mt-2">{format(a.created_at, 'dd MMM yyyy')}</p>
              </div>
              <div className="flex gap-1 ml-4">
                <button onClick={() => toggle(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600" title={a.active ? 'Deactivate' : 'Activate'}>
                  {a.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(a.id)} className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
