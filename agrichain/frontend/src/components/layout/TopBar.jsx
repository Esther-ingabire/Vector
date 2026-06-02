import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useState, useEffect } from 'react'
import { analyticsApi } from '../../api/analytics.js'

export default function TopBar({ pageTitle }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    analyticsApi.getNotifications({ is_read: false }).then(res => {
      setUnread(res.data?.count || 0)
    }).catch(() => {})
  }, [])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-lg font-semibold text-gray-800">{pageTitle}</h2>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-400">{user?.role?.replace(/_/g,' ')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
