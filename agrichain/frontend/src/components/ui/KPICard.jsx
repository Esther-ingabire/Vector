export default function KPICard({ title, value, unit='', change, changeLabel, icon: Icon, color='primary' }) {
  const colors = { primary:'border-primary-500 bg-primary-50', success:'border-success-500 bg-success-50', warning:'border-warning-500 bg-warning-50', danger:'border-danger-500 bg-danger-50' }
  const changeColor = change > 0 ? 'text-danger-500' : change < 0 ? 'text-success-500' : 'text-gray-500'
  return (
    <div className={`card border-l-4 ${colors[color] || colors.primary}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}<span className="text-lg font-normal text-gray-500 ml-1">{unit}</span></p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${changeColor}`}>
              {change > 0 ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change)}% {changeLabel || 'vs last period'}
            </p>
          )}
        </div>
        {Icon && <div className="p-2 bg-white rounded-lg shadow-sm"><Icon className="w-6 h-6 text-primary-500" /></div>}
      </div>
    </div>
  )
}
