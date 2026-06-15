import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import { useAuth, navigateByRole } from '../../context/AuthContext.jsx'
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

export default function OTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [credential, setCredential] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const inputs = useRef([])
  const navigate = useNavigate()
  const location = useLocation()
  const { updateUser } = useAuth()
  const purpose = location.state?.purpose || 'ACCOUNT_ACTIVATION'
  const isReset = purpose === 'PASSWORD_RESET'

  useEffect(() => {
    const pre = location.state?.phone || location.state?.credential || ''
    if (pre) setCredential(pre)
    inputs.current[0]?.focus()
  }, [location.state])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleResend = async () => {
    if (!credential.trim()) { toast.error('Enter your phone number or email first'); return }
    setResending(true)
    try {
      await authApi.resendOtp({ credential: credential.trim(), purpose })
      toast.success('A new code has been sent to your email.')
      setResendCooldown(60)
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (!credential.trim()) { toast.error('Enter your phone number or email first'); return }
    if (code.length < 6) { toast.error('Please enter all 6 digits'); return }
    setLoading(true)
    try {
      const res = await authApi.verifyOtp({ credential: credential.trim(), otp_code: code, purpose })
      const { access, refresh, user, must_change_password } = res.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      updateUser(user)
      toast.success(isReset ? 'Code verified — set your new password.' : 'Account activated!')
      if (must_change_password) {
        navigate('/set-password', { state: { user, isReset } })
      } else {
        navigateByRole(user.role, navigate)
      }
    } catch (err) {
      const errData = err.response?.data
      const msg = errData?.otp_code?.[0] || errData?.credential?.[0] || errData?.detail || 'Invalid or expired code.'
      toast.error(msg)
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 ring-1 ring-white/10">

          {/* Logo */}
          <div className="text-center mb-6">
            <ChainSightLogo size={56} className="logo-hover-spin mb-4 drop-shadow-lg block mx-auto" />
            <h1 className="text-2xl font-bold text-white tracking-tight">ChainSight</h1>
          </div>

          {/* Back button — glass nav */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to login
          </button>

          <h2 className="text-xl font-semibold text-white mb-1">
            {isReset ? 'Reset your password' : 'Activate your account'}
          </h2>
          <p className="text-sm text-white/50 mb-6">
            {isReset
              ? 'Enter your phone or email and the 6-digit reset code we sent you.'
              : 'Check the email your administrator used for your account. Enter your phone or email and the 6-digit code below.'}
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className={glassLabel}>Your phone number or email</label>
              <input
                className={glassInput}
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="+250 7XX XXX XXX or name@example.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className={glassLabel}>6-digit activation code</label>
              <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-white/70 focus:ring-2 focus:ring-white/20 backdrop-blur-sm transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Verifying…' : isReset ? 'Verify & reset password' : 'Activate account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="text-white/30 font-medium">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
