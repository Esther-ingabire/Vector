const CONFIGS = {
  GREEN: { dot: 'bg-success-500', bg: 'bg-success-50',  text: 'text-success-700', ring: 'ring-success-100', label: 'LOW'    },
  AMBER: { dot: 'bg-warning-400', bg: 'bg-warning-50',  text: 'text-warning-700', ring: 'ring-warning-100', label: 'MEDIUM' },
  RED:   { dot: 'bg-danger-500',  bg: 'bg-danger-50',   text: 'text-danger-600',  ring: 'ring-danger-100',  label: 'HIGH'   },
}

export default function RiskBadge({ label, risk, score, size = 'md' }) {
  const key = label || (risk === 'high' ? 'RED' : risk === 'medium' ? 'AMBER' : 'GREEN')
  const c = CONFIGS[key] || CONFIGS.GREEN
  const displayLabel = c.label
  const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${c.bg} ${c.text} ${c.ring} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {displayLabel}{score !== undefined && ` (${score})`}
    </span>
  )
}
