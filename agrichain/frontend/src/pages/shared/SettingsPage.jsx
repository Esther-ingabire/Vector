import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Lock, Eye, EyeOff, CheckCircle, Save, Camera, X, Bell, Check,
  ShieldCheck, Download, Info,
} from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { analyticsApi, triggerDownload } from '../../api/analytics.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const APP_VERSION = '2.0.0'

const ROLE_LABELS = {
  ADMIN: 'System Administrator',
  COOPERATIVE_MANAGER: 'Cooperative Manager',
  TRANSPORTER: 'Transporter',
  TRANSPORT_COMPANY: 'Transport Company',
  DISTRIBUTOR: 'Distributor',
  MARKET_AGENT: 'Market Agent',
  MINAGRI_OFFICER: 'MINAGRI Officer',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
}

const LANGUAGE_OPTIONS = [
  { value: 'EN', label: 'English' },
  { value: 'RW', label: 'Kinyarwanda' },
]

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  language_preference: z.enum(['EN', 'RW']),
})

const passwordSchema = z.object({
  new_password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

const pwdReqs = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { label: 'One number', test: v => /[0-9]/.test(v) },
]

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
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.')
      return
    }
    setPreview({ file, url: URL.createObjectURL(file) })
  }

  const uploadAvatar = async () => {
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
          <p className="text-xs text-gray-400">JPEG, PNG or WebP · max 5 MB</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Avatar display */}
        <div className="relative flex-shrink-0">
          {src ? (
            <img src={src} alt="avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-primary-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
        </div>

        <div className="space-y-3 flex-1">
          {preview ? (
            <div className="flex items-center gap-3">
              <button onClick={uploadAvatar} disabled={uploading}
                className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {uploading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Save photo'}
              </button>
              <button onClick={() => { setPreview(null); fileRef.current.value = '' }}
                className="btn-secondary flex items-center gap-1 text-sm">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="btn-secondary flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" />
              {user?.avatar_url ? 'Change photo' : 'Upload photo'}
            </button>
          )}
          <p className="text-xs text-gray-400">
            Your photo is visible to other users in the system.
          </p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden" onChange={onFileChange} />
    </div>
  )
}

function ProfileSection({ user, onUpdate }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      language_preference: user?.language_preference || 'EN',
    },
  })

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const res = await authApi.updateProfile(data)
      onUpdate(res.data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <User className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Profile Information</h2>
          <p className="text-xs text-gray-400">Your name, contact details, and language</p>
        </div>
      </div>

      {/* Read-only identity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Role</p>
          <p className="font-medium text-gray-700 text-sm">{ROLE_LABELS[user?.role] || user?.role}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">Phone number</p>
          <p className="font-medium text-gray-700 text-sm">{user?.phone_number || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Contact admin to change phone</p>
        </div>
        {user?.organization_name && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Organisation</p>
            <p className="font-medium text-gray-700 text-sm">{user.organization_name}</p>
          </div>
        )}
        {user?.district && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">District</p>
            <p className="font-medium text-gray-700 text-sm">{user.district}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First name</label>
            <input {...register('first_name')} className="input" />
            {errors.first_name && <p className="text-danger-500 text-xs mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="label">Last name</label>
            <input {...register('last_name')} className="input" />
            {errors.last_name && <p className="text-danger-500 text-xs mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">Email address</label>
          <input {...register('email')} type="email" className="input" placeholder="your@email.com" />
          {errors.email && <p className="text-danger-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Language</label>
          <select {...register('language_preference')} className="input">
            {LANGUAGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Kinyarwanda translations are coming soon — the interface stays in English until then.
          </p>
        </div>
        <button type="submit" disabled={saving || !isDirty}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

function PasswordSection() {
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
  })
  const passValue = watch('new_password', '')

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await authApi.setPassword({ new_password: data.new_password, confirm_password: data.confirm_password })
      toast.success('Password changed successfully')
      reset()
    } catch {
      toast.error('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center">
          <Lock className="w-5 h-5 text-warning-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-400">Choose a strong, unique password</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <div className="relative">
            <input {...register('new_password')} type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="New password" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.new_password && <p className="text-danger-500 text-xs mt-1">{errors.new_password.message}</p>}
          <div className="mt-2 space-y-1">
            {pwdReqs.map(r => (
              <div key={r.label} className={`flex items-center gap-2 text-xs ${r.test(passValue) ? 'text-success-500' : 'text-gray-400'}`}>
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {r.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <div className="relative">
            <input {...register('confirm_password')} type={showConfirm ? 'text' : 'password'} className="input pr-10" placeholder="Repeat password" />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-danger-500 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

function TwoFactorSection({ user, onUpdate }) {
  const [step, setStep] = useState('idle') // idle | enabling | disabling
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  const startEnable = async () => {
    setSending(true)
    try {
      await authApi.requestMfaOtp()
      toast.success('Verification code sent to your email.')
      setStep('enabling')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send code.')
    } finally {
      setSending(false)
    }
  }

  const confirmEnable = async () => {
    if (otpCode.length !== 6) { toast.error('Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const res = await authApi.enableMfa({ otp_code: otpCode })
      onUpdate(res.data)
      toast.success('Two-factor authentication enabled.')
      setStep('idle')
      setOtpCode('')
    } catch (err) {
      toast.error(err.response?.data?.otp_code || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const confirmDisable = async () => {
    if (!password) { toast.error('Enter your password.'); return }
    setLoading(true)
    try {
      const res = await authApi.disableMfa({ password })
      onUpdate(res.data)
      toast.success('Two-factor authentication disabled.')
      setStep('idle')
      setPassword('')
    } catch (err) {
      toast.error(err.response?.data?.password || 'Incorrect password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-xs text-gray-400">Require a one-time email code at every sign-in</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${user?.mfa_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {step === 'idle' && (
        user?.mfa_enabled ? (
          <button onClick={() => setStep('disabling')}
            className="btn-secondary text-sm text-danger-600 border-danger-200 hover:bg-danger-50">
            Disable 2FA
          </button>
        ) : (
          <button onClick={startEnable} disabled={sending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {sending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {sending ? 'Sending code…' : 'Enable 2FA'}
          </button>
        )
      )}

      {step === 'enabling' && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Enter the 6-digit code we emailed you to confirm.</p>
          <input
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input tracking-widest text-center text-lg"
            placeholder="000000"
            inputMode="numeric"
          />
          <div className="flex items-center gap-2">
            <button onClick={confirmEnable} disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Confirming…' : 'Confirm'}
            </button>
            <button onClick={() => { setStep('idle'); setOtpCode('') }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {step === 'disabling' && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-600">Enter your password to disable 2FA.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            placeholder="Current password"
          />
          <div className="flex items-center gap-2">
            <button onClick={confirmDisable} disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Disabling…' : 'Confirm disable'}
            </button>
            <button onClick={() => { setStep('idle'); setPassword('') }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DataControlsSection() {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await analyticsApi.exportReport({ report_type: 'complete', file_format: 'csv' })
      triggerDownload(res, `chainsight_my_data_${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Your data export has started downloading.')
    } catch {
      toast.error('Could not generate your data export. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Download className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Data Controls</h2>
          <p className="text-xs text-gray-400">Export the records tied to your account</p>
        </div>
      </div>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl gap-4">
        <div>
          <p className="text-sm font-medium text-gray-800">Download my data</p>
          <p className="text-xs text-gray-500 mt-0.5">A complete CSV export of your role's records (batches, orders, reports, and more)</p>
        </div>
        <button onClick={handleDownload} disabled={downloading}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 shrink-0">
          {downloading ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>
    </div>
  )
}

function AboutSection() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Info className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">About</h2>
          <p className="text-xs text-gray-400">App information</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">ChainSight</span>
        <span className="text-gray-700 font-medium">v{APP_VERSION}</span>
      </div>
      <p className="text-xs text-gray-400">Rwanda Agricultural Supply Chain Analytics Platform</p>
    </div>
  )
}

// Which alert categories each role wants surfaced in the TopBar bell. There's no backend model
// for this yet, so it's local-only — toggling doesn't change what the bell actually shows.
const ROLE_NOTIF_SETTINGS = {
  ADMIN: [
    { label: 'New Registration Requests', desc: 'Notify when a new access request is submitted' },
    { label: 'IoT Device Alerts',         desc: 'Notify when a sensor or vehicle device goes offline' },
    { label: 'Security Alerts',           desc: 'Notify on account lockouts and suspicious activity' },
  ],
  COOPERATIVE_MANAGER: [
    { label: 'New Produce Requests', desc: 'Notify when a distributor requests produce' },
    { label: 'Low Stock Alerts',     desc: 'Notify when crop stock runs low' },
    { label: 'Batch Status Updates', desc: 'Notify on dispatch, pickup, and delivery confirmations' },
  ],
  TRANSPORTER: [
    { label: 'New Job Assignments',    desc: 'Notify when a transport request is assigned to you' },
    { label: 'Delivery Confirmations', desc: 'Notify when a delivery is confirmed by the receiver' },
    { label: 'Incident Reminders',     desc: 'Notify about unresolved incident reports' },
  ],
  DISTRIBUTOR: [
    { label: 'Batch In-Transit Updates',    desc: 'Notify on pickup and en-route status changes' },
    { label: 'Order Confirmations',         desc: 'Notify when a market agent places an order' },
    { label: 'Collection Notice Reminders', desc: 'Notify before a collection deadline passes' },
  ],
  MARKET_AGENT: [
    { label: 'Batch Arrival Alerts',      desc: 'Notify when a batch is approaching your location' },
    { label: 'Quality Check Flags',       desc: 'Notify when a batch is flagged for quality issues' },
    { label: 'Collection Notice Updates', desc: 'Notify when distributors post new notices' },
  ],
  WAREHOUSE_MANAGER: [
    { label: 'Rental Requests',            desc: 'Notify when a cooperative requests to rent your facility' },
    { label: 'Cold Chain Alerts',          desc: 'Notify on temperature/humidity breaches at your facility' },
    { label: 'Facility Capacity Warnings', desc: 'Notify when a facility nears full capacity' },
  ],
  MINAGRI_OFFICER: [
    { label: 'District Threshold Alerts', desc: 'Notify when district loss rate exceeds 12%' },
    { label: 'High-Risk Predictions',     desc: 'Notify on ML predictions with confidence > 80%' },
    { label: 'Cold Chain Violations',     desc: 'Notify on temperature/humidity deviations' },
    { label: 'Monthly Reports',           desc: 'Notify when new reports are available' },
  ],
}
ROLE_NOTIF_SETTINGS.TRANSPORT_COMPANY = ROLE_NOTIF_SETTINGS.TRANSPORTER

function NotificationPreferencesSection({ role }) {
  const items = ROLE_NOTIF_SETTINGS[role] || []
  const [settings, setSettings] = useState(() => items.map(() => true))

  if (items.length === 0) return null

  const toggleSetting = (i) => {
    setSettings(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-xs text-gray-400">Which alerts appear in your notification bell</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={s.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </div>
            <button
              onClick={() => toggleSetting(i)}
              className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                settings[i]
                  ? 'bg-warning-500 border-warning-500'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
              aria-label={settings[i] ? 'Disable' : 'Enable'}
            >
              {settings[i] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, security, and preferences.</p>
      </div>
      <AvatarSection user={user} onUpdate={updateUser} />
      <ProfileSection user={user} onUpdate={updateUser} />
      <PasswordSection />
      <TwoFactorSection user={user} onUpdate={updateUser} />
      <NotificationPreferencesSection role={user?.role} />
      <DataControlsSection />
      <AboutSection />
    </div>
  )
}
