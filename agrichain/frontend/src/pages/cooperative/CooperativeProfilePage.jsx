import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2, MapPin, Phone, Mail, Leaf, Star,
  Save, Loader, BadgeCheck, TrendingUp, Camera, X,
} from 'lucide-react'
import { cooperativesApi } from '../../api/cooperatives.js'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const schema = z.object({
  name:          z.string().min(2, 'Name is required'),
  description:   z.string().optional(),
  district:      z.string().min(1, 'District is required'),
  sector:        z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email').or(z.literal('')).optional(),
})

// ── Avatar / profile photo ───────────────────────────────────────────────────
function AvatarSection({ user, onUpdate }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?'

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG or WebP images are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setPreview({ file, url: URL.createObjectURL(file) })
  }

  const upload = async () => {
    if (!preview) return
    setUploading(true)
    try {
      const res = await authApi.uploadAvatar(preview.file)
      onUpdate({ ...user, avatar_url: res.data.avatar })
      toast.success('Profile photo updated.')
      setPreview(null)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const src = preview?.url || user?.avatar_url || null

  return (
    <div className="card">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Profile Photo</h2>
          <p className="text-xs text-gray-400">Your photo is visible to other users in the system.</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          {src
            ? <img src={src} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary-200" />
            : <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
          }
        </div>
        <div className="space-y-3 flex-1">
          {preview ? (
            <div className="flex items-center gap-3">
              <button onClick={upload} disabled={uploading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {uploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Save photo'}
              </button>
              <button onClick={() => { setPreview(null); fileRef.current.value = '' }} className="btn-secondary flex items-center gap-1 text-sm">
                <X className="w-4 h-4" /> Cancel
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

// ── Reusable section card with icon header ──────────────────────────────────
function Section({ icon: Icon, title, subtitle, color = 'primary', children }) {
  const colours = {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-50 text-warning-500',
    info:    'bg-info-50 text-info-500',
  }
  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colours[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Read-only info tile ─────────────────────────────────────────────────────
function InfoTile({ label, value, span = false }) {
  return (
    <div className={`bg-gray-50 rounded-xl p-3 ${span ? 'col-span-2' : ''}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="font-medium text-gray-700 text-sm">{value || '—'}</p>
    </div>
  )
}

// ── Reliability star display ────────────────────────────────────────────────
function Stars({ score }) {
  const full = Math.round(score || 0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n}
          className={`w-4 h-4 ${n <= full ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1.5 text-sm font-bold text-gray-800">{Number(score || 0).toFixed(1)}</span>
    </div>
  )
}

export default function CooperativeProfilePage() {
  const { user, updateUser } = useAuth()
  const [coop, setCoop]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
  })

  const load = useCallback(() => {
    cooperativesApi.getMyCooperative()
      .then(res => {
        const data = res.data
        setCoop(data)
        reset({
          name:          data.name          || '',
          description:   data.description   || '',
          district:      data.district      || '',
          sector:        data.sector        || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
        })
      })
      .catch(() => toast.error('Could not load cooperative profile.'))
      .finally(() => setLoading(false))
  }, [reset])

  useEffect(() => { load() }, [load])

  const onSubmit = async (data) => {
    if (!coop?.id) return
    setSaving(true)
    try {
      const res = await cooperativesApi.updateCooperative(coop.id, data)
      setCoop(prev => ({ ...prev, ...res.data }))
      toast.success('Profile updated successfully')
      reset(data)
    } catch {
      toast.error('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-5 h-5 animate-spin mr-2" /> Loading profile…
      </div>
    )
  }

  const crops = coop?.crops_specialised || []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisation Profile</h1>

        <p className="text-sm text-gray-500 mt-0.5">
          This information is visible to distributors when they browse your cooperative.
          Keep it accurate so buyers know exactly what you offer and where you are.
        </p>
      </div>

      {/* Profile photo — same as Settings page, placed here so users find it alongside their org info */}
      <AvatarSection user={user} onUpdate={updateUser} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <Section icon={Building2} title="Organisation Identity"
          subtitle="Name and description visible to distributors">

          <div className="grid grid-cols-2 gap-4">
            <InfoTile label="Registration number" value={coop?.registration_number} />
            <InfoTile label="Cooperative ID" value={coop?.id} />
          </div>

          <div>
            <label className="label">Cooperative name *</label>
            <input {...register('name')} className="input" placeholder="e.g. Musanze Farmers Cooperative" />
            {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input" rows={3}
              placeholder="Briefly describe what your cooperative does, what produce you focus on, and what makes you a reliable partner for distributors." />
            <p className="text-xs text-gray-400 mt-1">
              Shown on your cooperative's public profile — a good description helps distributors choose you.
            </p>
          </div>
        </Section>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <Section icon={MapPin} title="Location &amp; Coverage"
          subtitle="Where you are and where you operate" color="info">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">District *</label>
              <input {...register('district')} className="input" placeholder="e.g. Musanze" />
              {errors.district && <p className="text-danger-500 text-xs mt-1">{errors.district.message}</p>}
            </div>
            <div>
              <label className="label">Sector</label>
              <input {...register('sector')} className="input" placeholder="e.g. Kinigi" />
            </div>
          </div>

          {(coop?.gps_latitude || coop?.gps_longitude) && (
            <div className="grid grid-cols-2 gap-4">
              <InfoTile label="GPS latitude" value={coop.gps_latitude} />
              <InfoTile label="GPS longitude" value={coop.gps_longitude} />
            </div>
          )}

          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
            GPS coordinates are fixed at registration. Contact the system administrator to update them.
          </p>
        </Section>

        {/* ── Crops & Produce ───────────────────────────────────────────── */}
        <Section icon={Leaf} title="Crops &amp; Produce"
          subtitle="The produce your cooperative handles" color="success">

          {crops.length > 0 ? (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Your specialised crops — visible to all distributors browsing cooperatives.
              </p>
              <div className="flex flex-wrap gap-2">
                {crops.map((crop, i) => (
                  <span key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-success-50 text-success-700 border border-success-200">
                    <Leaf className="w-3.5 h-3.5" />
                    {crop.name || crop}
                    {(crop.requires_cold_chain || crop.category === 'PERISHABLE') && (
                      <span className="text-xs text-blue-500 font-normal">· cold chain</span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                To add or remove crops from your profile, contact the system administrator — crops are linked to your registration.
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Leaf className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No specialised crops linked yet.</p>
              <p className="text-xs mt-1">Contact the administrator to assign your crop categories.</p>
            </div>
          )}
        </Section>

        {/* ── Contact ───────────────────────────────────────────────────── */}
        <Section icon={Phone} title="Contact Information"
          subtitle="How distributors and the system can reach you">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Contact phone
              </label>
              <input {...register('contact_phone')} className="input" placeholder="+250 7XX XXX XXX" />
            </div>
            <div>
              <label className="label">
                <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />Contact email
              </label>
              <input {...register('contact_email')} type="email" className="input" placeholder="coop@example.rw" />
              {errors.contact_email && <p className="text-danger-500 text-xs mt-1">{errors.contact_email.message}</p>}
            </div>
          </div>
        </Section>

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || !isDirty}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {!isDirty && !saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-success-500" /> All changes saved
            </span>
          )}
        </div>
      </form>

      {/* ── Performance summary (read-only, below the form) ───────────── */}
      {(coop?.reliability_score != null) && (
        <Section icon={TrendingUp} title="Reliability &amp; Performance"
          subtitle="Computed automatically from your dispatch history — not editable" color="warning">

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Reliability score</p>
              <Stars score={coop.reliability_score} />
              <p className="text-xs text-gray-400 mt-1">Updated weekly from dispatch history</p>
            </div>
            <InfoTile label="Total batches dispatched"
              value={coop.total_batches_dispatched ? `${coop.total_batches_dispatched} batches` : null} />
            <InfoTile label="On-time dispatch rate"
              value={coop.on_time_dispatch_rate != null ? `${coop.on_time_dispatch_rate}%` : null} />
            <InfoTile label="Quality consistency"
              value={coop.quality_consistency_rate != null ? `${coop.quality_consistency_rate}%` : null} />
          </div>

          <p className="text-xs text-gray-400">
            These scores are visible to distributors on your public profile and influence how often they choose to work with you.
          </p>
        </Section>
      )}
    </div>
  )
}
