const CONFIGS = {
  PENDING:         { dot: 'bg-warning-400',  bg: 'bg-warning-50',  text: 'text-warning-700',  ring: 'ring-warning-100'  },
  ACCEPTED:        { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  ring: 'ring-success-100'  },
  CONFIRMED:       { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  ring: 'ring-success-100'  },
  APPROVED:        { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  ring: 'ring-success-100'  },
  DECLINED:        { dot: 'bg-danger-500',   bg: 'bg-danger-50',   text: 'text-danger-600',   ring: 'ring-danger-100'   },
  REJECTED:        { dot: 'bg-danger-500',   bg: 'bg-danger-50',   text: 'text-danger-600',   ring: 'ring-danger-100'   },
  CANCELLED:       { dot: 'bg-gray-400',     bg: 'bg-gray-100',    text: 'text-gray-600',     ring: 'ring-gray-200'     },
  IN_PROGRESS:     { dot: 'bg-info-500',     bg: 'bg-info-50',     text: 'text-info-600',     ring: 'ring-info-100'     },
  IN_TRANSIT:      { dot: 'bg-info-500',     bg: 'bg-info-50',     text: 'text-info-600',     ring: 'ring-info-100'     },
  IN_TRANSIT_LEG1: { dot: 'bg-info-500',     bg: 'bg-info-50',     text: 'text-info-600',     ring: 'ring-info-100'     },
  COMPLETED:       { dot: 'bg-gray-400',     bg: 'bg-gray-100',    text: 'text-gray-600',     ring: 'ring-gray-200'     },
  DELIVERED:       { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  ring: 'ring-success-100'  },
  NEGOTIATING:     { dot: 'bg-warning-500',  bg: 'bg-warning-50',  text: 'text-warning-700',  ring: 'ring-warning-100'  },
  AT_COOPERATIVE:  { dot: 'bg-primary-400',  bg: 'bg-primary-50',  text: 'text-primary-700',  ring: 'ring-primary-100'  },
  AT_DISTRIBUTOR:  { dot: 'bg-info-500',     bg: 'bg-info-50',     text: 'text-info-600',     ring: 'ring-info-100'     },
  AT_MARKET:       { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  ring: 'ring-success-100'  },
}

export default function StatusBadge({ status, label }) {
  const c = CONFIGS[status] || { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', ring: 'ring-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {label || status?.replace(/_/g, ' ')}
    </span>
  )
}
