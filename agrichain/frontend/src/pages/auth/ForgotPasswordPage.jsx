import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import toast from 'react-hot-toast'

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
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <ChainSightLogo size={56} className="logo-hover-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">ChainSight</h1>
          </div>

          <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot your password?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the phone number or email on your account. We'll send a 6-digit reset code.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label">Phone number or email</label>
              <input
                className="input"
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
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Remembered it?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
