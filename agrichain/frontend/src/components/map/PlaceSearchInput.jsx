import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { searchSuggest, searchRetrieve } from '../../lib/mapbox.js'

/**
 * Address-search autocomplete (Mapbox Search Box API). Calls `onSelect({ lat, lng, address })`
 * once the user picks a suggestion. Used for entering brand-new real-world addresses
 * (e.g. a warehouse facility location) — not for searching the app's own records.
 */
export default function PlaceSearchInput({ onSelect, placeholder = 'Search an address…' }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const sessionToken = useRef(crypto.randomUUID())
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchSuggest(query, sessionToken.current)
      setSuggestions(results)
      setLoading(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handlePick = async (s) => {
    setQuery(s.place_formatted ? `${s.name}, ${s.place_formatted}` : s.name)
    setOpen(false)
    setSuggestions([])
    const resolved = await searchRetrieve(s.mapbox_id, sessionToken.current)
    if (resolved) onSelect(resolved)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map(s => (
            <button
              key={s.mapbox_id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handlePick(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-medium text-gray-900">{s.name}</span>
                {s.place_formatted && <span className="text-gray-400"> — {s.place_formatted}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
