import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, CheckCircle } from 'lucide-react'
import ChainSightLogo from '../../components/ui/ChainSightLogo.jsx'
import { authApi } from '../../api/auth.js'
import toast from 'react-hot-toast'

// Transporter accounts are created by the Cooperative Manager who contracts them.
// MINAGRI/RAB Officer accounts are created directly by the System Administrator.
const ROLES = [
  { value: 'COOPERATIVE_MANAGER', label: 'Cooperative Manager', docs: ['National ID', 'Cooperative Registration Certificate'] },
  { value: 'DISTRIBUTOR', label: 'Distributor', docs: ['National ID', 'Company Registration'] },
  { value: 'MARKET_AGENT', label: 'Market Agent', docs: ['National ID'] },
]

const DISTRICTS = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi', 'Gisagara',
  'Huye', 'Kamonyi', 'Karongi', 'Kayonza', 'Kicukiro', 'Kirehe', 'Muhanga',
  'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu', 'Nyagatare', 'Nyamagabe',
  'Nyamasheke', 'Nyanza', 'Nyarugenge', 'Nyaruguru', 'Rubavu', 'Ruhango',
  'Rulindo', 'Rusizi', 'Rutsiro', 'Rwamagana',
]

const schema = z.object({
  full_name: z.string().min(3, 'Full name required'),
  role_requested: z.string().min(1, 'Please select a role'),
  organization_name: z.string().min(2, 'Organisation name required'),
  district: z.string().min(1, 'Please select a district'),
  phone_number: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  acknowledgement: z.boolean().refine(v => v, 'You must acknowledge the review process'),
})

export default function RequestAccessPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-50 mb-4">
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request submitted</h2>
          <p className="text-gray-500 mb-6">
            Your access request has been submitted. A System Administrator will review your documents
            and contact you via phone or email. This typically takes 1–2 business days.
          </p>
          <Link to="/login" className="btn-primary inline-block">Return to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <ChainSightLogo size={56} className="logo-hover-spin mb-3 block mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">ChainSight — Request Access</h1>
          <p className="text-gray-500 text-sm mt-1">Complete the form below. An administrator will review your request.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal details */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Full name *</label>
                  <input {...register('full_name')} className="input" placeholder="Jean Pierre Habimana" />
                  {errors.full_name && <p className="text-danger-500 text-xs mt-1">{errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="label">Phone number *</label>
                  <input {...register('phone_number')} className="input" placeholder="+250 7XX XXX XXX" />
                  {errors.phone_number && <p className="text-danger-500 text-xs mt-1">{errors.phone_number.message}</p>}
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input {...register('email')} className="input" placeholder="email@example.com" type="email" />
                  {errors.email && <p className="text-danger-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>
            </div>

            {/* Role and organisation */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">Role & Organisation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Role requested *</label>
                  <select {...register('role_requested')} className="input">
                    <option value="">Select a role…</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {errors.role_requested && <p className="text-danger-500 text-xs mt-1">{errors.role_requested.message}</p>}
                </div>
                <div>
                  <label className="label">Organisation name *</label>
                  <input {...register('organization_name')} className="input" placeholder="Cooperative / Company name" />
                  {errors.organization_name && <p className="text-danger-500 text-xs mt-1">{errors.organization_name.message}</p>}
                </div>
                <div>
                  <label className="label">District of operation *</label>
                  <select {...register('district')} className="input">
                    <option value="">Select district…</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.district && <p className="text-danger-500 text-xs mt-1">{errors.district.message}</p>}
                </div>
              </div>
            </div>

            {/* Document upload */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-2 pb-2 border-b">Supporting Documents</h3>
              {roleInfo && (
                <p className="text-sm text-gray-500 mb-3">
                  Required for {roleInfo.label}: <span className="font-medium text-gray-700">{roleInfo.docs.join(', ')}</span>
                </p>
              )}
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">Click to upload documents</span>
                <span className="text-xs text-gray-400">PDF, JPG, PNG — max 5MB each</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={addFile} />
              </label>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border">
                      <span className="text-sm text-gray-700 truncate max-w-xs">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-danger-500 ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acknowledgement */}
            <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl">
              <input
                {...register('acknowledgement')}
                type="checkbox"
                id="ack"
                className="mt-0.5 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="ack" className="text-sm text-gray-700 cursor-pointer">
                I understand that my request will be reviewed by a System Administrator.
                I confirm that the information provided is accurate and complete.
              </label>
            </div>
            {errors.acknowledgement && <p className="text-danger-500 text-xs">{errors.acknowledgement.message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Submitting request…' : 'Submit access request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
