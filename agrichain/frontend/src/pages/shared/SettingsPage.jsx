import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Eye, EyeOff, CheckCircle, Save } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  ADMIN: 'System Administrator',
  COOPERATIVE_MANAGER: 'Cooperative Manager',
  TRANSPORTER: 'Transporter',
  DISTRIBUTOR: 'Distributor',
  MARKET_AGENT: 'Market Agent',
  MINAGRI_OFFICER: 'MINAGRI Officer',
}

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').or(z.literal('')),
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

function ProfileSection({ user, onUpdate }) {
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' },
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
          <p className="text-xs text-gray-400">Your name and contact details</p>
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

export default function SettingsPage() {
  const { user, updateUser } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and security preferences.</p>
      </div>
      <ProfileSection user={user} onUpdate={updateUser} />
      <PasswordSection />
    </div>
  )
}
