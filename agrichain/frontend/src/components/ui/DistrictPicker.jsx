import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

export const RWANDA_DISTRICTS = [
  'Bugesera','Burera','Gakenke','Gasabo','Gatsibo','Gicumbi','Gisagara',
  'Huye','Kamonyi','Karongi','Kayonza','Kicukiro','Kirehe','Muhanga',
  'Musanze','Ngoma','Ngororero','Nyabihu','Nyagatare','Nyamagabe','Nyamasheke',
  'Nyanza','Nyarugenge','Nyaruguru','Rubavu','Ruhango','Rulindo','Rwamagana',
  'Rusizi','Rutsiro',
]

/**
 * Multi-select dropdown for Rwanda's 30 districts.
 * value: string[] of district names
 * onChange: (string[]) => void
 * If the parent stores districts as a comma-separated string, convert before passing in.
 */
export default function DistrictPicker({ value = [], onChange, placeholder = 'Select districts…' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [])
  const filtered = RWANDA_DISTRICTS.filter(d => d.toLowerCase().includes(search.toLowerCase()))

  const toggle = (d) => {
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d])
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="input flex items-center justify-between text-sm text-left w-full">
        <span className={selected.length ? 'text-gray-900' : 'text-gray-400'}>
          {selected.length ? `${selected.length} district${selected.length !== 1 ? 's' : ''} selected` : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map(d => (
            <span key={d} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full border border-primary-200">
              {d}
              <button type="button" onClick={() => toggle(d)} className="hover:text-danger-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <input className="input text-sm py-1.5" placeholder="Search district…"
              value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="overflow-y-auto">
            {filtered.map(d => (
              <button key={d} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => toggle(d)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
                {d}
                {selected.includes(d) && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No district found</p>}
          </div>
        </div>
      )}
    </div>
  )
}
