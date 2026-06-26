import { useState, useEffect, useCallback } from 'react'
import { Building2, Save, Truck, Snowflake, MapPin, Users, Phone, Mail, Star } from 'lucide-react'
import { transportApi } from '../../api/transport.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const VEHICLE_TYPE_LABELS = {
  REFRIGERATED:   'Refrigerated Truck',
  STANDARD_TRUCK: 'Standard Truck',
  PICKUP:         'Pickup Truck',
  MOTORCYCLE:     'Motorcycle',
  MINIBUS:        'Minibus',
}

export default function CompanyProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [ratings, setRatings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ company_name: '', description: '', base_location: '', operating_districts: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      transportApi.getMyProfile({ _silent: true }),
      transportApi.getMyDrivers({ _silent: true }),
      transportApi.getMyRatings({ _silent: true }),
    ]).then(([profileRes, driversRes, ratingsRes]) => {
      setProfile(profileRes.data)
      setDrivers(driversRes.data?.results ?? driversRes.data ?? [])
      setRatings(ratingsRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (user?.role !== 'TRANSPORT_COMPANY') {
    return (
      <div className="card py-16 text-center text-gray-400">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">This page is only for transport company accounts.</p>
        <p className="text-sm mt-1">Individual drivers don't manage a company profile.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Loading company profile…</div>
  }

  const startEdit = () => {
    setForm({
      company_name: profile.company_name || '',
      description: profile.description || '',
      base_location: profile.base_location || '',
      operating_districts: (profile.operating_districts || []).join(', '),
    })
    setEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await transportApi.updateMyProfile({
        company_name: form.company_name,
        description: form.description,
        base_location: form.base_location,
        operating_districts: form.operating_districts.split(',').map(s => s.trim()).filter(Boolean),
      })
      setProfile(res.data)
      toast.success('Company profile updated')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  // Fleet capability — computed live from registered vehicles, never manually maintained.
  const allVehicles = [...(profile.vehicles || []), ...drivers.flatMap(d => d.vehicles || [])]
  const typeCounts = {}
  allVehicles.forEach(v => { typeCounts[v.vehicle_type] = (typeCounts[v.vehicle_type] || 0) + 1 })
  const totalCapacity = allVehicles.reduce((sum, v) => sum + Number(v.capacity_kg || 0), 0)
  const hasRefrigerated = allVehicles.some(v => v.vehicle_type === 'REFRIGERATED' || v.has_iot_temperature)
  const districts = [...new Set([
    ...(profile.operating_districts || []),
    ...drivers.flatMap(d => d.operating_districts || []),
  ])]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Who you are and what your fleet can offer — visible context for cooperatives and distributors you work with.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
        {!editing ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Company Name</label>
                <p className="text-base font-semibold text-gray-900">{profile.company_name || profile.name || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Description</label>
                <p className="text-sm text-gray-700 whitespace-pre-line">{profile.description || 'No description yet — add one so partners know what you offer.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Base Location</label>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{profile.base_location || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Operating Districts</label>
                  <p className="text-sm text-gray-700">{(profile.operating_districts || []).join(', ') || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Phone</label>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{profile.phone_number || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
                  <p className="text-sm text-gray-700 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" />{profile.email || '—'}</p>
                </div>
              </div>
            </div>
            <button onClick={startEdit} className="btn-primary flex items-center gap-2 mt-5">
              <Save className="w-4 h-4" /> Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={4} value={form.description}
                placeholder="e.g. Kalinda Transport Co. — refrigerated and standard trucks serving Northern Province, specializing in cold-chain produce delivery."
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Base Location</label>
              <input className="input" placeholder="e.g. Kacyiru, Kigali" value={form.base_location}
                onChange={e => setForm(f => ({ ...f, base_location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Operating Districts</label>
              <input className="input" placeholder="e.g. Musanze, Kigali, Rubavu" value={form.operating_districts}
                onChange={e => setForm(f => ({ ...f, operating_districts: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
            </div>
            <p className="text-xs text-gray-400">Phone and email come from your account — update those in Settings.</p>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fleet Capability — auto-computed from your registered fleet</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card flex items-center gap-3">
            <Users className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div><p className="text-lg font-bold">{drivers.length}</p><p className="text-xs text-gray-500">Drivers</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <Truck className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div><p className="text-lg font-bold">{allVehicles.length}</p><p className="text-xs text-gray-500">Vehicles</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <Snowflake className={`w-5 h-5 flex-shrink-0 ${hasRefrigerated ? 'text-blue-500' : 'text-gray-300'}`} />
            <div><p className="text-lg font-bold">{hasRefrigerated ? 'Yes' : 'No'}</p><p className="text-xs text-gray-500">Cold Chain</p></div>
          </div>
          <div className="card flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <div><p className="text-lg font-bold">{districts.length}</p><p className="text-xs text-gray-500">Districts Covered</p></div>
          </div>
        </div>

        {allVehicles.length > 0 && (
          <div className="card mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Fleet by vehicle type · {totalCapacity.toLocaleString()} kg total capacity</p>
            <div className="space-y-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{VEHICLE_TYPE_LABELS[type] || type}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ratings & Feedback from Cooperatives and Distributors</p>
        <div className="card flex items-center gap-5">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={`w-6 h-6 ${ratings?.average_rating && n <= Math.round(ratings.average_rating) ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
            ))}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{ratings?.average_rating ?? '—'}<span className="text-sm font-normal text-gray-400"> / 5</span></p>
            <p className="text-xs text-gray-500">{ratings?.rating_count ?? 0} rating{ratings?.rating_count === 1 ? '' : 's'}</p>
          </div>
        </div>

        {ratings?.recent?.length > 0 && (
          <div className="space-y-2 mt-3">
            {ratings.recent.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-warning-400 text-warning-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1.5">{r.comment || <span className="text-gray-400 italic">No comment left.</span>}</p>
                <p className="text-xs text-gray-400 mt-1">{r.rated_by} — {r.driver_name} · {r.route}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
