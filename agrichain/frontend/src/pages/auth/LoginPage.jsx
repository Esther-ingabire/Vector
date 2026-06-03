import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Leaf } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const schema = z.object({
  credential: z.string().min(1, 'Phone number or username is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { login } = useAuth()
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
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ChainSight</h1>
            <p className="text-gray-400 mt-1 text-sm">Supply Chain Analytics System</p>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-1">Sign in to your account</h2>
          <p className="text-sm text-gray-500 mb-6">Use your phone number or username and password.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Phone number or username</label>
              <input
                {...register('credential')}
                className="input"
                placeholder="+250 7XX XXX XXX"
                autoComplete="username"
              />
              {errors.credential && <p className="text-danger-500 text-xs mt-1">{errors.credential.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-danger-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/request-access" className="text-primary-600 font-medium hover:underline">
                Request access
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          AUCA Final Year Project · Agricultural Supply Chain Analytics · Rwanda
        </p>
      </div>
    </div>
  )
}
