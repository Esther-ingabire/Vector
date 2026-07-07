import { useState } from 'react'
import { X } from 'lucide-react'

export default function DeclineReasonPicker({
  quickReasons = [],
  onConfirm,
  onCancel,
  busy = false,
  label = 'Confirm Decline',
}) {
  const [reason, setReason] = useState('')
  const [picked, setPicked] = useState('')

  const pickQuick = (r) => {
    setPicked(r)
    setReason(r)
  }

  return (
    <div className="border border-rose-200 rounded-xl p-3.5 space-y-3 bg-rose-50/50">
      {/* Quick-pick chips */}
      {quickReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickReasons.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => pickQuick(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                picked === r
                  ? 'bg-rose-700 text-white border-rose-700'
                  : 'bg-white text-rose-700 border-rose-200 hover:border-rose-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Free-text reason */}
      <textarea
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all placeholder-gray-400 bg-white"
        rows={2}
        placeholder="Add a reason (optional but helpful)…"
        value={reason}
        onChange={e => { setReason(e.target.value); setPicked('') }}
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(reason.trim())}
          disabled={busy}
          className="flex-1 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {busy && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {busy ? 'Declining…' : label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
