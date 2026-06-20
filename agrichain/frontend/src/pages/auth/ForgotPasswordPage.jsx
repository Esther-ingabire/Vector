import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import toast from 'react-hot-toast'

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

export default function ForgotPasswordPage() {
  const [credential, setCredential] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!credential.trim()) { toast.error('Enter your phone number or email'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword({ credential: credential.trim() })
      toast.success('Reset code sent — check your email.')
      navigate('/verify-otp', { state: { credential: credential.trim(), purpose: 'PASSWORD_RESET' } })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 ring-1 ring-white/10">

          <div className="text-center mb-6">
            <ChainSightLogo size={56} className="logo-hover-spin mb-4 drop-shadow-lg block mx-auto" />
            <h1 className="text-2xl font-bold text-white tracking-tight">ChainSight</h1>
          </div>

          <Link to="/login" className="flex items-center gap-1 text-sm text-white/50 hover:text-white/90 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>

          <h2 className="text-lg font-semibold text-white mb-1">Forgot your password?</h2>
          <p className="text-sm text-white/50 mb-6">
            Enter the phone number or email on your account. We'll send a 6-digit reset code.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className={glassLabel}>Phone number or email</label>
              <input
                className={glassInput}
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="+250 7XX XXX XXX or name@example.com"
                autoComplete="username"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !credential.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6 pt-5 border-t border-white/15">
            Remembered it?{' '}
            <Link to="/login" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
