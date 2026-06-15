import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
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
  { label: 'One uppercase letter',  test: v => /[A-Z]/.test(v) },
  { label: 'One number',            test: v => /[0-9]/.test(v) },
]

const authBg = {
  backgroundImage: "url('/images/auth-bg.jpg')",
  backgroundColor: '#1b4332',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}

const glassInput = [
  'w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/40',
  'bg-white/10 border border-white/20',
  'focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20',
  'transition-all backdrop-blur-sm',
].join(' ')

const glassLabel = 'block text-sm font-medium text-white/80 mb-1.5'

export default function SetPasswordPage() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isReset = location.state?.isReset
  // After OTP verification, authUser may not be set yet — use the state passed from OTPPage
  const user = authUser || location.state?.user
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
      await authApi.setPassword({ new_password: data.new_password, confirm_password: data.confirm_password })
      if (isReset) {
        toast.success('Password reset! Please log in with your new password.')
        navigate('/login')
      } else {
        toast.success('Password set! Please log in to continue.')
        navigate('/login')
      }
    } catch {
      toast.error('Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 ring-1 ring-white/10">

          {/* Icon + heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Set your password</h1>
            <p className="text-white/50 mt-1 text-sm">Welcome to ChainSight — create a secure password to continue.</p>
          </div>

          <p className="text-sm text-white/60 mb-6">
            {user?.first_name ? `Hi ${user.first_name} — ` : ''}Create a password to finish setting up your account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={glassLabel}>New password</label>
              <div className="relative">
                <input
                  {...register('new_password')}
                  type={showNew ? 'text' : 'password'}
                  className={`${glassInput} pr-10`}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.new_password && <p className="text-red-300 text-xs mt-1">{errors.new_password.message}</p>}

              {/* Strength indicators */}
              <div className="mt-3 space-y-1.5">
                {reqs.map(req => (
                  <div key={req.label} className={`flex items-center gap-2 text-xs transition-colors ${req.test(passValue) ? 'text-emerald-300' : 'text-white/35'}`}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={glassLabel}>Confirm password</label>
              <div className="relative">
                <input
                  {...register('confirm_password')}
                  type={showConfirm ? 'text' : 'password'}
                  className={`${glassInput} pr-10`}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-red-300 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Setting password…' : 'Set password & continue'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
