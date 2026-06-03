import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { LogOut } from 'lucide-react'

export default function Sidebar({ navItems, title }) {
  const { user, logout } = useAuth()
  return (
    <aside className="w-64 min-h-screen bg-primary-700 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-primary-600">
        <h1 className="text-lg font-bold">ChainSight</h1>
        <p className="text-xs text-primary-200 mt-0.5">{title}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white text-primary-700' : 'text-primary-100 hover:bg-primary-600'}`
            }>
            {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-primary-600">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
          <p className="text-xs text-primary-200 truncate">{user?.phone_number}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-primary-100 hover:bg-primary-600 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}
