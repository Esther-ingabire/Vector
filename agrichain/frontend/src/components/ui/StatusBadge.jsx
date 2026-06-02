const STATUS_CONFIGS = {
  PENDING: { bg:'bg-yellow-100', text:'text-yellow-800' },
  ACCEPTED: { bg:'bg-green-100', text:'text-green-800' },
  CONFIRMED: { bg:'bg-green-100', text:'text-green-800' },
  DECLINED: { bg:'bg-red-100', text:'text-red-800' },
  REJECTED: { bg:'bg-red-100', text:'text-red-800' },
  IN_PROGRESS: { bg:'bg-blue-100', text:'text-blue-800' },
  COMPLETED: { bg:'bg-gray-100', text:'text-gray-700' },
  APPROVED: { bg:'bg-green-100', text:'text-green-800' },
  NEGOTIATING: { bg:'bg-orange-100', text:'text-orange-800' },
  AT_COOPERATIVE: { bg:'bg-gray-100', text:'text-gray-700' },
  IN_TRANSIT_LEG1: { bg:'bg-blue-100', text:'text-blue-800' },
  AT_DISTRIBUTOR: { bg:'bg-purple-100', text:'text-purple-800' },
  AT_MARKET: { bg:'bg-green-100', text:'text-green-800' },
}

export default function StatusBadge({ status, label }) {
  const cfg = STATUS_CONFIGS[status] || { bg:'bg-gray-100', text:'text-gray-700' }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {label || status?.replace(/_/g,' ')}
    </span>
  )
}
