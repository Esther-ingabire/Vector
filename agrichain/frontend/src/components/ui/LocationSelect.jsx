import { useState, useEffect } from 'react'
import { RWANDA_DISTRICTS } from './DistrictPicker.jsx'

/**
 * Single-select dropdown of Rwanda's 30 districts, with a "type your own" fallback
 * for a more specific base location (e.g. a town or neighbourhood) that isn't one of
 * the 30 district names.
 * value: string
 * onChange: (string) => void
 */
export default function LocationSelect({ value = '', onChange, placeholder = 'Select a district…' }) {
  const isKnownDistrict = RWANDA_DISTRICTS.includes(value)
  const [customMode, setCustomMode] = useState(!!value && !isKnownDistrict)

  useEffect(() => {
    if (!value) setCustomMode(false)
  }, [value])

  if (customMode) {
    return (
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type your location…"
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          onClick={() => { setCustomMode(false); onChange('') }}
          className="btn-secondary px-3 text-sm whitespace-nowrap"
        >
          Choose from list
        </button>
      </div>
    )
  }

  return (
    <select
      className="input"
      value={isKnownDistrict ? value : ''}
      onChange={e => {
        if (e.target.value === '__other__') { setCustomMode(true); onChange('') }
        else onChange(e.target.value)
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {RWANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
      <option value="__other__">Other — type manually…</option>
    </select>
  )
}
