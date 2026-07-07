import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
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
  { label: '8+ characters', test: v => v.length >= 8 },
  { label: 'Uppercase',     test: v => /[A-Z]/.test(v) },
  { label: 'Number',        test: v => /[0-9]/.test(v) },
]

const authBg = {
  backgroundImage: "url('/images/auth-bg.jpg')",
  backgroundColor: '#0b2b18',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}

export default function SetPasswordPage() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isReset = location.state?.isReset
  const user = authUser || location.state?.user
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })
  const passValue = watch('new_password', '')
  const allMet = reqs.every(r => r.test(passValue))

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authApi.setPassword({ new_password: data.new_password, confirm_password: data.confirm_password })
      toast.success(isReset ? 'Password reset! Please log in.' : 'Password set! Welcome to ChainSight.')
      navigate('/login')
    } catch {
      toast.error('Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
      {/* layered overlay: deep dark base + subtle green tint at bottom */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.62) 0%, rgba(11,43,24,0.70) 100%)' }} />

      <div className="relative z-10 w-full max-w-[420px]">

        {/* ── Brand identity above the card ── */}
        <div className="flex flex-col items-center gap-2 mb-7">
          <ChainSightLogo size={48} />
          <span className="text-white font-bold text-lg tracking-tight">ChainSight</span>
        </div>

        {/* ── Glass card ── */}
        <div className="rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(34,139,82,0.65)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(34,139,82,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>

          <div className="p-8">

            {/* context pill */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#86efac' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isReset ? 'Password Reset' : 'Account Activation'}
              </span>
            </div>

            {/* heading */}
            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isReset ? 'Create a new password' : 'Set your password'}
              </h1>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                {user?.first_name
                  ? <>Hi <span className="text-white/75 font-medium">{user.first_name}</span> — create a secure password to activate your account.</>
                  : 'Create a secure password to activate your account.'}
              </p>
            </div>

            {/* thin separator */}
            <div className="h-px mb-7" style={{ background: 'rgba(255,255,255,0.08)' }} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* new password */}
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  New password
                </label>
                <div className="relative">
                  <input
                    {...register('new_password')}
                    type={showNew ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                    {errors.new_password.message}
                  </p>
                )}

                {/* requirement pills — turn green as each rule is met */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {reqs.map(req => {
                    const met = req.test(passValue)
                    return (
                      <span key={req.label}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300"
                        style={met
                          ? { background: 'rgba(74,222,128,0.18)', border: '1px solid rgba(74,222,128,0.4)', color: '#86efac' }
                          : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }
                        }>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                          style={met ? { background: '#22c55e' } : { background: 'rgba(255,255,255,0.1)' }}>
                          {met && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        {req.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* confirm password */}
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    {...register('confirm_password')}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>

              {/* submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: allMet && !loading
                      ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                      : 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: allMet ? '0 4px 20px rgba(22,163,74,0.35)' : 'none',
                  }}
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting password…</>
                    : <>{isReset ? 'Reset password' : 'Set password & continue'} <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* below-card footnote */}
        <p className="text-center text-primary-300 text-xs mt-6 font-medium tracking-wide">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
