import { useState, useEffect } from 'react'
import { User, MapPin, Building2, Phone, Mail, TrendingUp } from 'lucide-react'
import { transportApi } from '../../api/transport.js'
import { useAuth } from '../../context/AuthContext.jsx'

// Profile page for individual driver accounts.
// Drivers don't register vehicles — that's the company's job via Vehicle Profile.
// This page shows what a cooperative or distributor would see when they look at this driver:
// their company, coverage area, and performance track record.
export default function DriverProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      transportApi.getMyProfile({ _silent: true }),
      transportApi.getMyTripHistory({ _silent: true }),
    ]).then(([profileRes, histRes]) => {
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
      if (histRes.status === 'fulfilled') {
        const data = histRes.value.data?.results ?? histRes.value.data ?? []
        setHistory(data)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>

  const districts = Array.isArray(profile?.operating_districts)
    ? profile.operating_districts
    : (profile?.operating_districts || '').split(',').map(s => s.trim()).filter(Boolean)

  const completedTrips = history.filter(t => t.delivery_confirmed_at).length

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Driver Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          This is the information cooperatives and distributors see when they work with you.
        </p>
      </div>

      {/* Identity card */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Personal Details</h2>
            <p className="text-xs text-gray-400">Update your name and contact in Settings</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Full name"    value={user?.first_name ? `${user.first_name} ${user.last_name}` : '—'} />
          <Tile label="Role"         value="Driver" />
          {user?.phone_number && (
            <Tile label="Phone" value={user.phone_number} icon={Phone} />
          )}
          {user?.email && (
            <Tile label="Email" value={user.email} icon={Mail} />
          )}
        </div>
      </div>

      {/* Company */}
      {profile?.parent_company_name && (
        <div className="card space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-info-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-info-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Employer</h2>
              <p className="text-xs text-gray-400">The transport company you work under</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-medium text-gray-900">{profile.parent_company_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Vehicles are registered and managed by this company</p>
          </div>
        </div>
      )}

      {/* Coverage */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Coverage Area</h2>
            <p className="text-xs text-gray-400">Districts you operate in</p>
          </div>
        </div>
        {districts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {districts.map(d => (
              <span key={d} className="px-2.5 py-1 bg-success-50 text-success-700 text-xs font-medium rounded-full border border-success-200">
                {d}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No districts specified. Contact your company to update.</p>
        )}
      </div>

      {/* Performance */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-warning-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Performance</h2>
            <p className="text-xs text-gray-400">Computed from your completed trip history</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{history.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total trips</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-success-600">{completedTrips}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>
        </div>
        {history.length === 0 && (
          <p className="text-sm text-gray-400 text-center">
            No trips completed yet — performance stats will appear here once you start.
          </p>
        )}
      </div>

    </div>
  )
}

function Tile({ label, value, icon: Icon }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </p>
      <p className="font-medium text-gray-700 text-sm">{value || '—'}</p>
    </div>
  )
}
