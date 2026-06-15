import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const schema = z.object({
  credential: z.string().min(1, 'Phone number or username is required'),
  password: z.string().min(1, 'Password is required'),
})

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
      await login(data.credential, data.password)
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        {/* Glass card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 ring-1 ring-white/10">

          {/* Logo */}
          <div className="text-center mb-8">
            <ChainSightLogo size={60} className="logo-hover-spin mb-4 drop-shadow-lg block mx-auto" />
            <h1 className="text-2xl font-bold text-white tracking-tight">ChainSight</h1>
            <p className="text-white/50 mt-1 text-sm">Supply Chain Analytics System</p>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">Sign in to your account</h2>
          <p className="text-sm text-white/50 mb-6">Use your phone number or username and password.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={glassLabel}>Phone number or username</label>
              <input
                {...register('credential')}
                className={glassInput}
                placeholder="+250 7XX XXX XXX"
                autoComplete="username"
              />
              {errors.credential && <p className="text-red-300 text-xs mt-1">{errors.credential.message}</p>}
            </div>

            <div>
              <label className={glassLabel}>Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`${glassInput} pr-10`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Primary CTA — solid green so it reads as the main action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-white/15 space-y-2.5 text-center">
            <p className="text-sm text-white/50">
              <Link to="/forgot-password" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                Forgot your password?
              </Link>
            </p>
            <p className="text-sm text-white/50">
              First time logging in?{' '}
              <Link to="/verify-otp" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                Enter your activation code
              </Link>
            </p>
            <p className="text-sm text-white/50">
              Don't have an account?{' '}
              <Link to="/request-access" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
                Request access
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
