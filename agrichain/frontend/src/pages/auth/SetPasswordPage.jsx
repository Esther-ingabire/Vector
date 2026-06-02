import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { navigateByRole } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const schema = z.object({
  new_password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

const reqs = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { label: 'One number', test: v => /[0-9]/.test(v) },
]

export default function SetPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })
  const passValue = watch('new_password', '')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.setPassword({ new_password: data.new_password })
      toast.success('Password set successfully. Welcome to AgriChain!')
      if (user) navigateByRole(user.role, navigate)
      else navigate('/login')
    } catch {
      toast.error('Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Set your password</h1>
          <p className="text-primary-200 mt-1 text-sm">Welcome to AgriChain — create a secure password to continue.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create a password</h2>
          <p className="text-sm text-gray-500 mb-6">
            {user?.first_name ? `Hi ${user.first_name}, ` : ''}You must set a new password before continuing.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  {...register('new_password')}
                  type={showNew ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.new_password && <p className="text-danger-500 text-xs mt-1">{errors.new_password.message}</p>}

              {/* Password strength requirements */}
              <div className="mt-3 space-y-1">
                {reqs.map(req => (
                  <div key={req.label} className={`flex items-center gap-2 text-xs ${req.test(passValue) ? 'text-success-500' : 'text-gray-400'}`}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <input
                  {...register('confirm_password')}
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-danger-500 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Setting password…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
