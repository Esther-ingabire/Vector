import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, CheckCircle } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import toast from 'react-hot-toast'

// Individual transporters contracted directly by a cooperative are still added by that
// cooperative's manager. This form is for independent transport companies who want their
// own account, and for the other roles that have always self-registered.
// MINAGRI/RAB Officer accounts are created directly by the System Administrator.
const ROLES = [
  { value: 'COOPERATIVE_MANAGER', label: 'Cooperative Manager', docs: ['National ID', 'Cooperative Registration Certificate'] },
  { value: 'DISTRIBUTOR',         label: 'Distributor',         docs: ['National ID', 'Company Registration'] },
  { value: 'MARKET_AGENT',        label: 'Market Agent',        docs: ['National ID'] },
  { value: 'TRANSPORT_COMPANY',   label: 'Transport Company',   docs: ['National ID', 'Vehicle Registration / Driving Licence'] },
  { value: 'WAREHOUSE_MANAGER',   label: 'Warehouse Manager',   docs: ['National ID', 'Business Registration'] },
]

const DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi', 'Gisagara',
  'Huye', 'Kamonyi', 'Karongi', 'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga',
  'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
  'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu', 'Ruhango',
  'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana',
]

const schema = z.object({
  full_name:         z.string().min(3, 'Full name required'),
  role_requested:    z.string().min(1, 'Please select a role'),
  organization_name: z.string().min(2, 'Organisation name required'),
  district:          z.string().min(1, 'Please select a district'),
  phone_number:      z.string().min(10, 'Valid phone number required'),
  email:             z.string().email('Invalid email').optional().or(z.literal('')),
  acknowledgement:   z.boolean().refine(v => v, 'You must acknowledge the review process'),
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
  'focus:outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/25',
  'transition-all backdrop-blur-sm',
].join(' ')

const glassSelect = [
  'w-full px-4 py-2.5 rounded-xl text-sm text-white',
  'bg-white/10 border border-white/20',
  'focus:outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/25',
  'transition-all backdrop-blur-sm appearance-none',
  '[&>option]:bg-slate-800 [&>option]:text-white',
].join(' ')

const glassLabel = 'block text-sm font-medium text-white/80 mb-1.5'

export default function RequestAccessPage() {
  const navigate = useNavigate()
  const [files, setFiles]       = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { acknowledgement: false },
  })

  const selectedRole = watch('role_requested')
  const roleInfo = ROLES.find(r => r.value === selectedRole)

  const addFile = (e) => {
    const newFiles = Array.from(e.target.files || []).filter(f =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type) && f.size <= 5 * 1024 * 1024
    )
    setFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') formData.append(k, v) })
      files.forEach(f => formData.append('documents', f))
      await authApi.requestAccess(formData)
      setSubmitted(true)
    } catch {
      toast.error('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Success state ─────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={authBg}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-10 max-w-md w-full text-center ring-1 ring-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-300" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Request submitted</h2>
          <p className="text-white/60 mb-8">
            Your access request has been submitted. A System Administrator will review your documents
            and contact you via phone or email. This typically takes 1–2 business days.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 border border-emerald-500/40 backdrop-blur-sm shadow-md shadow-emerald-900/20 border border-emerald-500/50 shadow-lg transition-all"
          >
            Return to login
          </Link>
        </div>
      </div>
    )
  }

  /* ── Form ──────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen py-10 px-4 relative" style={authBg}>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Header branding */}
        <div className="text-center mb-8">
          <ChainSightLogo size={56} className="logo-hover-spin mb-3 drop-shadow-lg block mx-auto" />
          <h1 className="text-2xl font-bold text-white tracking-tight">ChainSight — Request Access</h1>
          <p className="text-white/50 text-sm mt-1">Complete the form below. An administrator will review your request.</p>
        </div>

        {/* Glass card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 ring-1 ring-white/10">

          {/* Back button */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to login
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

            {/* ── Personal Information ──────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-4 pb-2 border-b border-white/15">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={glassLabel}>Full name *</label>
                  <input {...register('full_name')} className={glassInput} placeholder="Jean Pierre Habimana" />
                  {errors.full_name && <p className="text-red-300 text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className={glassLabel}>Phone number *</label>
                  <input {...register('phone_number')} className={glassInput} placeholder="+250 7XX XXX XXX" />
                  {errors.phone_number && <p className="text-red-300 text-xs mt-1">{errors.phone_number.message}</p>}
                </div>
                <div>
                  <label className={glassLabel}>Email (optional)</label>
                  <input {...register('email')} className={glassInput} placeholder="email@example.com" type="email" />
                  {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>
            </div>

            {/* ── Role & Organisation ───────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-4 pb-2 border-b border-white/15">
                Role & Organisation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={glassLabel}>Role requested *</label>
                  <select {...register('role_requested')} className={glassSelect}>
                    <option value="">Select a role…</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {errors.role_requested && <p className="text-red-300 text-xs mt-1">{errors.role_requested.message}</p>}
                </div>
                <div>
                  <label className={glassLabel}>Organisation name *</label>
                  <input {...register('organization_name')} className={glassInput} placeholder="Cooperative / Company name" />
                  {errors.organization_name && <p className="text-red-300 text-xs mt-1">{errors.organization_name.message}</p>}
                </div>
                <div>
                  <label className={glassLabel}>District of operation *</label>
                  <select {...register('district')} className={glassSelect}>
                    <option value="">Select district…</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.district && <p className="text-red-300 text-xs mt-1">{errors.district.message}</p>}
                </div>
              </div>
            </div>

            {/* ── Documents ────────────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-3 pb-2 border-b border-white/15">
                Supporting Documents
              </h3>
              {roleInfo && (
                <p className="text-sm text-white/50 mb-3">
                  Required for {roleInfo.label}:{' '}
                  <span className="font-medium text-white/80">{roleInfo.docs.join(', ')}</span>
                </p>
              )}
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/25 rounded-xl cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all">
                <Upload className="w-6 h-6 text-white/40 mb-1" />
                <span className="text-sm text-white/50">Click to upload documents</span>
                <span className="text-xs text-white/30">PDF, JPG, PNG — max 5MB each</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={addFile} />
              </label>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg border border-white/15">
                      <span className="text-sm text-white/80 truncate max-w-xs">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-white/40 hover:text-red-300 ml-2 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Acknowledgement ───────────────────────────────────────── */}
            <div className="flex items-start gap-3 p-4 bg-white/8 rounded-xl border border-white/15">
              <input
                {...register('acknowledgement')}
                type="checkbox"
                id="ack"
                className="mt-0.5 w-4 h-4 rounded border-white/30 accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="ack" className="text-sm text-white/70 cursor-pointer leading-relaxed">
                I understand that my request will be reviewed by a System Administrator.
                I confirm that the information provided is accurate and complete.
              </label>
            </div>
            {errors.acknowledgement && <p className="text-red-300 text-xs -mt-4">{errors.acknowledgement.message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600/85 hover:bg-emerald-600 active:bg-emerald-700 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Submitting request…' : 'Submit access request'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-300 text-xs mt-5 pb-4 font-medium tracking-wide">
          Rwanda Agricultural Supply Chain Traceability System
        </p>
      </div>
    </div>
  )
}
