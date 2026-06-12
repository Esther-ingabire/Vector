import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import { navigateByRole } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

export default function OTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [credential, setCredential] = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const phone = location.state?.phone || ''
    if (phone) setCredential(phone)
    inputs.current[0]?.focus()
  }, [location.state])

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
      const res = await authApi.verifyOtp({ credential: credential.trim(), otp_code: code })
      const { access, refresh, user, must_change_password } = res.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      toast.success('Account activated!')
      if (must_change_password) {
        navigate('/set-password', { state: { user } })
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
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <ChainSightLogo size={56} className="logo-hover-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">ChainSight</h1>
          </div>
          <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </button>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Activate your account</h2>
          <p className="text-sm text-gray-500 mb-6">
            Check the email your administrator used for your account. Enter your phone or email and the 6-digit code below.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label">Your phone number or email</label>
              <input
                className="input"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder="+250 7XX XXX XXX or name@example.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">6-digit activation code</label>
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
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Verifying…' : 'Activate account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Didn't receive the code?{' '}
            <span className="text-primary-600 font-medium">
              Contact your administrator to resend it.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
