import { useState, useEffect } from 'react'
import { Warehouse, Inbox, CheckCircle, Thermometer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { warehouseApi } from '../../api/warehouse.js'

export default function WarehouseDashboard() {
  const [facilities, setFacilities] = useState([])
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([warehouseApi.getMyFacilities(), warehouseApi.getRentalRequests()])
      .then(([fRes, rRes]) => {
        if (fRes.status === 'fulfilled') setFacilities(fRes.value.data?.results ?? fRes.value.data ?? [])
        if (rRes.status === 'fulfilled') setRentals(rRes.value.data?.results ?? rRes.value.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const rented = facilities.filter(f => f.cooperative_name).length
  const pendingRentals = rentals.filter(r => r.status === 'PENDING').length
  const withIot = facilities.filter(f => f.has_iot_sensor).length

  const stats = [
    { label: 'Facilities', value: facilities.length, icon: Warehouse, color: 'text-primary-500' },
    { label: 'Currently rented', value: rented, icon: CheckCircle, color: 'text-success-500' },
    { label: 'Pending requests', value: pendingRentals, icon: Inbox, color: 'text-warning-500' },
    { label: 'With IoT sensors', value: withIot, icon: Thermometer, color: 'text-blue-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Warehouse Manager Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your facilities and rental requests from cooperatives.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <s.icon className={`w-6 h-6 ${s.color}`} />
            <div><p className="text-xl font-bold">{loading ? '…' : s.value}</p><p className="text-sm text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {!loading && pendingRentals > 0 && (
        <div className="card bg-warning-50/40 border border-warning-200 flex items-center justify-between">
          <p className="text-sm font-medium text-warning-700">
            {pendingRentals} cooperative{pendingRentals > 1 ? 's' : ''} waiting on your response.
          </p>
          <Link to="/warehouse/rentals" className="btn-primary text-sm py-2 px-4">Review Requests</Link>
        </div>
      )}

      {!loading && facilities.length === 0 && (
        <div className="card py-16 text-center text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No facilities added yet.</p>
          <Link to="/warehouse/facilities" className="btn-primary mt-4 inline-flex items-center gap-2">Add Your First Facility</Link>
        </div>
      )}
    </div>
  )
}
