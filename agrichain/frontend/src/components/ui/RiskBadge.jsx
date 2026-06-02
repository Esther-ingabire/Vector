export default function RiskBadge({ label, risk, score, size='md' }) {
  // Support both label (GREEN/AMBER/RED) and risk (low/medium/high)
  const normalized = label || (risk === 'high' ? 'RED' : risk === 'medium' ? 'AMBER' : 'GREEN')
  const configs = {
    GREEN: { bg:'bg-green-100', text:'text-green-800', border:'border-green-400', dot:'bg-green-500' },
    AMBER: { bg:'bg-yellow-100', text:'text-yellow-800', border:'border-yellow-400', dot:'bg-yellow-500' },
    RED:   { bg:'bg-red-100',   text:'text-red-800',   border:'border-red-400',   dot:'bg-red-500'   },
  }
  const c = configs[normalized] || configs.GREEN
  const displayLabel = label || (risk === 'high' ? 'HIGH' : risk === 'medium' ? 'MEDIUM' : 'LOW')
  const sizeClass = size === 'lg' ? 'px-4 py-2 text-base' : 'px-2 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${c.bg} ${c.text} ${c.border} ${sizeClass}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {displayLabel} {score !== undefined && `(${score})`}
    </span>
  )
}
