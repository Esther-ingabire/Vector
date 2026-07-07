import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, MapPin, Phone, Mail, Users, Star, Save, Camera, X, Loader } from 'lucide-react'
import DistrictPicker from '../../components/ui/DistrictPicker.jsx'
import { distributionApi } from '../../api/distribution.js'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

// ── Avatar upload ─────────────────────────────────────────────────────────
function AvatarSection({ user, onUpdate }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?'

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('JPEG, PNG or WebP only.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setPreview({ file, url: URL.createObjectURL(file) })
  }

  const upload = async () => {
    setUploading(true)
    try {
      const res = await authApi.uploadAvatar(preview.file)
      onUpdate({ ...user, avatar_url: res.data.avatar })
      toast.success('Profile photo updated.')
      setPreview(null)
    } catch { toast.error('Upload failed.') }
    finally { setUploading(false) }
  }

  const src = preview?.url || user?.avatar_url
  return (
    <div className="card">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Profile Photo</h2>
          <p className="text-xs text-gray-400">Visible to market agents viewing your profile</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          {src ? <img src={src} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary-200" />
               : <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>}
        </div>
        <div className="space-y-2">
          {preview ? (
            <div className="flex items-center gap-2">
              <button onClick={upload} disabled={uploading} className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-60">
                {uploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Save photo'}
              </button>
              <button onClick={() => { setPreview(null); fileRef.current.value = '' }} className="btn-secondary text-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="btn-secondary flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" /> {user?.avatar_url ? 'Change photo' : 'Upload photo'}
            </button>
          )}
          <p className="text-xs text-gray-400">JPEG, PNG or WebP · max 5 MB</p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
    </div>
  )
}

// ── Info tile ─────────────────────────────────────────────────────────────
function Tile({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="font-medium text-gray-700 text-sm">{value || '—'}</p>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, color = 'primary', children }) {
  const cols = { primary: 'bg-primary-100 text-primary-600', success: 'bg-success-100 text-success-600',
                 info: 'bg-info-50 text-info-500', warning: 'bg-warning-50 text-warning-500' }
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cols[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div><h2 className="font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}</div>
      </div>
      {children}
    </div>
  )
}

export default function DistributorProfilePage() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    company_name: '', warehouse_location: '', district: '', contact_phone: '',
  })

  const load = useCallback(() => {
    distributionApi.getMyProfile({ _silent: true })
      .then(res => {
        const d = res.data
        setProfile(d)
        setForm({
          company_name:      d.company_name || '',
          warehouse_location:d.warehouse_location || '',
          district:          d.district || '',
          contact_phone:     d.contact_phone || '',
        })
      })
      .catch(() => toast.error('Could not load profile.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // PATCH via the user update endpoint (fields that live on the user model)
      await authApi.updateProfile({ first_name: user.first_name, last_name: user.last_name })
      toast.success('Profile updated')
      load()
    } catch { toast.error('Could not save changes.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader className="w-5 h-5 animate-spin mr-2" /> Loading…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisation Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          This is what market agents see when they browse your profile before requesting a connection.
          Keep it complete so they can make an informed decision.
        </p>
      </div>

      <AvatarSection user={user} onUpdate={updateUser} />

      {/* ── Company Identity ─────────────────────────────── */}
      <Section icon={Building2} title="Company Identity" subtitle="Name and contact details market agents see">
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Company / Business name" value={profile?.company_name} />
          <Tile label="Member since"            value={profile?.member_since ? new Date(profile.member_since).toLocaleDateString('en-RW', { year: 'numeric', month: 'long' }) : null} />
          <Tile label="Contact person"          value={profile?.contact_person} />
          <Tile label="Linked market agents"    value={profile?.linked_agents_count != null ? `${profile.linked_agents_count} agents` : null} />
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label"><Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Contact phone</label>
              <input className="input" placeholder="+250 7XX XXX XXX" value={form.contact_phone}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div>
              <label className="label"><Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Email</label>
              <input className="input bg-gray-50 cursor-not-allowed" value={user?.email || ''} readOnly />
              <p className="text-xs text-gray-400 mt-1">Update email in Settings</p>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Section>

      {/* ── Warehouse & Location ──────────────────────────── */}
      <Section icon={MapPin} title="Warehouse &amp; Coverage" subtitle="Where market agents can collect from" color="info">
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Warehouse location"  value={profile?.warehouse_location} />
          <Tile label="District"            value={profile?.district} />
          {profile?.warehouse_gps_lat && <Tile label="GPS latitude"  value={profile.warehouse_gps_lat} />}
          {profile?.warehouse_gps_lng && <Tile label="GPS longitude" value={profile.warehouse_gps_lng} />}
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
          Warehouse location and GPS coordinates are set during registration. Contact the system administrator to update them.
        </p>
      </Section>

      {/* ── Active Stock Listings ─────────────────────────── */}
      <Section icon={Users} title="Active Stock Listings" subtitle="How many collection notices you currently have open for market agents" color="success">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{profile?.active_notices ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Active collection notices</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{profile?.linked_agents_count ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Linked market agents</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Market agents browsing the distributor directory can see your active notices count and linked agents — a signal of how active and reliable your supply is.
        </p>
      </Section>
    </div>
  )
}
