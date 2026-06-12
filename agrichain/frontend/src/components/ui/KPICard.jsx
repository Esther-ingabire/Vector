import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ACCENT = {
  primary: { border: 'border-primary-200', bg: 'bg-primary-50',  icon: 'bg-primary-100 text-primary-600' },
  success: { border: 'border-success-400', bg: 'bg-success-50',  icon: 'bg-success-100 text-success-600' },
  warning: { border: 'border-warning-400', bg: 'bg-warning-50',  icon: 'bg-warning-100 text-warning-600' },
  danger:  { border: 'border-danger-400',  bg: 'bg-danger-50',   icon: 'bg-danger-100  text-danger-600'  },
  info:    { border: 'border-info-100',    bg: 'bg-info-50',     icon: 'bg-info-100    text-info-600'    },
}

export default function KPICard({ title, value, unit = '', change, changeLabel, icon: Icon, color = 'primary' }) {
  const c = ACCENT[color] || ACCENT.primary
  const positive = change > 0
  const neutral  = change === 0 || change === undefined

  return (
    <div className={`rounded-2xl shadow-sm border p-5 ${c.border} ${c.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 leading-none">
            {value}
            {unit && <span className="text-base font-normal text-gray-400 ml-1">{unit}</span>}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${positive ? 'text-danger-500' : change < 0 ? 'text-success-600' : 'text-gray-400'}`}>
              {neutral ? <Minus className="w-3 h-3" /> : positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {!neutral && `${Math.abs(change)}%`} {changeLabel || 'vs last period'}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}
