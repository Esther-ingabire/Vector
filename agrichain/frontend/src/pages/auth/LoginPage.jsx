import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AtSign, Lock } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const schema = z.object({
  credential: z.string().min(1, 'Phone number or email is required'),
  password:   z.string().min(1, 'Password is required'),
})

const authBg = {
  backgroundImage: "url('/images/auth-bg.jpg')",
  backgroundColor: '#1b4332',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const result = await login(data.credential, data.password)
      if (result?.mfaRequired) {
        navigate('/verify-otp', { state: { credential: result.credential, purpose: 'MFA_LOGIN' } })
        toast('Enter the verification code sent to your email.', { icon: '🔐' })
      }
    } catch (err) {
      const errData = err.response?.data
      const msg = errData?.error
        || errData?.detail
        || errData?.credential?.[0] || errData?.credential
        || errData?.password?.[0]  || errData?.password
        || errData?.non_field_errors?.[0]
        || 'Login failed. Please check your credentials.'

      if (typeof msg === 'string' && (msg.includes('not activated') || msg.includes('OTP'))) {
        navigate('/verify-otp', { state: { credential: data.credential } })
        toast('Check your email for the activation code.', { icon: '📧' })
        return
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">

        {/* Glass card — logo lives inside so it matches every other auth page */}
        <div className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.09)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(34,139,82,0.55)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,139,82,0.1)',
          }}>

          {/* Logo block */}
          <div className="text-center mb-8">
            <ChainSightLogo size={56} className="logo-hover-spin drop-shadow-lg block mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white tracking-tight">ChainSight</h1>
            <p className="text-white/45 mt-1 text-xs tracking-wide">Supply Chain Analytics System</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Credential field ── */}
            <div>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  {...register('credential')}
                  placeholder="Phone or email"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/35 bg-white/8 transition-all focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onFocus={e  => { e.target.style.borderColor = 'rgba(52,211,153,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.12)' }}
                  onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              {errors.credential && (
                <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.credential.message}</p>
              )}
            </div>

            {/* ── Password field ── */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder-white/35 transition-all focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  onFocus={e  => { e.target.style.borderColor = 'rgba(52,211,153,0.7)'; e.target.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.12)' }}
                  onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* ── Forgot password inline ── */}
            <div className="flex justify-end">
              <Link to="/forgot-password"
                className="text-xs text-emerald-300/80 hover:text-emerald-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                boxShadow: '0 4px 20px rgba(22,163,74,0.30)',
              }}
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
                : 'Sign in'
              }
            </button>
          </form>

          {/* ── Bottom links ── */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-center text-xs text-white/40">
            <p>
              First time?{' '}
              <Link to="/verify-otp" className="text-emerald-300/80 hover:text-emerald-300 transition-colors">
                Enter activation code
              </Link>
            </p>
            <p>
              No account?{' '}
              <Link to="/request-access" className="text-emerald-300/80 hover:text-emerald-300 transition-colors">
                Request access
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-5 font-medium tracking-wide">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
