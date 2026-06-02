import { useState, useEffect } from 'react'
import { ShoppingCart, Truck, TrendingUp, Package, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import KPICard from '../../components/ui/KPICard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Link } from 'react-router-dom'

const MOCK_PENDING_ORDERS = [
  { id: 'ORD-201', cooperative: 'Musanze Farmers Coop', crop: 'Tomatoes', qty: 500, status: 'approved', delivery_date: '2025-01-15' },
  { id: 'ORD-202', cooperative: 'Huye Highlands Coop', crop: 'Avocados', qty: 300, status: 'pending', delivery_date: '2025-01-14' },
  { id: 'ORD-203', cooperative: 'Rwamagana Coop', crop: 'Beans', qty: 200, status: 'in_transit', delivery_date: '2025-01-13' },
]

const MOCK_PRICES = [
  { crop: 'Tomatoes', price: 850, change: +5.2 },
  { crop: 'Avocados', price: 1200, change: -2.1 },
  { crop: 'Maize', price: 400, change: +1.5 },
  { crop: 'Beans', price: 900, change: +8.3 },
]

const ORDER_STATUS_STYLES = {
  pending: 'bg-warning-50 text-warning-500',
  approved: 'bg-primary-50 text-primary-500',
  in_transit: 'bg-success-50 text-success-500',
  delivered: 'bg-gray-100 text-gray-500',
}

export default function DistributorDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.first_name || 'Distributor'} {user?.last_name || ''}</h1>
            <p className="text-primary-200 text-sm mt-1">Distributor · AgriChain Rwanda</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-primary-200">Today</p>
            <p className="font-semibold">{new Date().toLocaleDateString('en-RW', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Active orders" value="12" icon={ShoppingCart} color="primary" />
        <KPICard title="In transit" value="3" icon={Truck} color="warning" />
        <KPICard title="Delivered this week" value="8" icon={CheckCircle} color="success" />
        <KPICard title="Pending approval" value="2" icon={Clock} color="danger" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Recent Orders</h2>
            <Link to="/distributor/orders" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {MOCK_PENDING_ORDERS.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.crop} · {order.qty} kg</p>
                  <p className="text-xs text-gray-500">{order.cooperative}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ORDER_STATUS_STYLES[order.status]}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{order.delivery_date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market prices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Market Prices (RWF/kg)</h2>
            <Link to="/distributor/prices" className="text-sm text-primary-600 hover:underline">All prices</Link>
          </div>
          <div className="space-y-3">
            {MOCK_PRICES.map(p => (
              <div key={p.crop} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{p.crop}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">RWF {p.price.toLocaleString()}</span>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${p.change > 0 ? 'text-success-500' : 'text-danger-500'}`}>
                    <TrendingUp className="w-3 h-3" /> {p.change > 0 ? '+' : ''}{p.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
