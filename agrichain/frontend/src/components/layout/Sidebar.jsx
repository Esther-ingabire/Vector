import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { LogOut, MessageSquare, HelpCircle } from 'lucide-react'
import ChainSightLogo from '../ui/ChainSightLogo.jsx'
import FeedbackModal from '../ui/FeedbackModal.jsx'

export default function Sidebar({ navItems, title }) {
  const { user, logout } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <>
      <aside className="w-60 min-h-screen bg-primary-900 text-white flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-primary-700/60">
          <ChainSightLogo size={32} className="flex-shrink-0 opacity-90" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">ChainSight</p>
            <p className="text-[11px] text-primary-300 mt-0.5 truncate">{title}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={!!item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-primary-200 hover:bg-primary-700/60 hover:text-white'
                }`
              }>
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-3 border-t border-primary-700/60 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[11px] text-primary-300 truncate">{user?.phone_number}</p>
            </div>
          </div>

          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-primary-300 hover:bg-primary-700/60 hover:text-white transition-colors"
          >
            {isAdmin
              ? <><MessageSquare className="w-4 h-4 flex-shrink-0" />Send Feedback</>
              : <><HelpCircle className="w-4 h-4 flex-shrink-0" />Help &amp; Support</>
            }
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-primary-300 hover:bg-primary-700/60 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {feedbackOpen && (
        <FeedbackModal
          mode={isAdmin ? 'feedback' : 'help'}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </>
  )
}
