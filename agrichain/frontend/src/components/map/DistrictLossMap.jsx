import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { DivIcon } from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'

function FitRwanda() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([[-2.84, 28.86], [-1.05, 30.90]], { padding: [16, 16], animate: false })
  }, [map])
  return null
}

// Coordinates for all 30 Rwanda districts
const DISTRICT_COORDS = {
  'Kigali City':   [-1.9441, 30.0619],
  'Gasabo':        [-1.8800, 30.1200],
  'Kicukiro':      [-1.9800, 30.0700],
  'Nyarugenge':    [-1.9500, 30.0500],
  'Musanze':       [-1.4996, 29.6340],
  'Gicumbi':       [-1.5799, 30.0628],
  'Burera':        [-1.4575, 29.8568],
  'Gakenke':       [-1.7003, 29.7897],
  'Rulindo':       [-1.7252, 30.0512],
  'Huye':          [-2.5967, 29.7375],
  'Muhanga':       [-2.0769, 29.7571],
  'Nyanza':        [-2.3514, 29.7393],
  'Gisagara':      [-2.6163, 29.8305],
  'Kamonyi':       [-2.1197, 29.8826],
  'Nyaruguru':     [-2.7565, 29.5287],
  'Nyamagabe':     [-2.4798, 29.4825],
  'Ruhango':       [-2.2273, 29.7813],
  'Rwamagana':     [-1.9480, 30.4346],
  'Nyagatare':     [-1.2952, 30.3260],
  'Bugesera':      [-2.1724, 30.2480],
  'Ngoma':         [-2.1645, 30.5024],
  'Gatsibo':       [-1.5933, 30.4728],
  'Kirehe':        [-2.2897, 30.6814],
  'Kayonza':       [-1.8806, 30.6453],
  'Rubavu':        [-1.6817, 29.3547],
  'Rusizi':        [-2.4718, 28.9070],
  'Karongi':       [-2.0717, 29.3676],
  'Rutsiro':       [-1.9452, 29.4289],
  'Ngororero':     [-1.8538, 29.5697],
  'Nyabihu':       [-1.6667, 29.5000],
  'Nyamasheke':    [-2.3167, 29.1333],
}

function lossColor(pct) {
  if (pct >= 15) return '#C00000'
  if (pct >= 12) return '#e03030'
  if (pct >= 10) return '#e67e22'
  if (pct >= 7)  return '#f39c12'
  return '#228b52'
}

function riskLabel(pct) {
  if (pct >= 12) return 'HIGH RISK'
  if (pct >= 7)  return 'MEDIUM'
  return 'LOW'
}

// Find district coords — try exact match, then partial match
function findCoords(districtName) {
  if (!districtName) return null
  const exact = DISTRICT_COORDS[districtName]
  if (exact) return exact
  const key = Object.keys(DISTRICT_COORDS).find(k =>
    k.toLowerCase().includes(districtName.toLowerCase()) ||
    districtName.toLowerCase().includes(k.toLowerCase())
  )
  return key ? DISTRICT_COORDS[key] : null
}

export default function DistrictLossMap({ districts = [] }) {
  const maxVol = Math.max(...districts.map(d => d.volume_tons ?? 1), 1)

  return (
    <MapContainer
      center={[-1.94, 29.87]}
      zoom={8}
      minZoom={7}
      maxZoom={13}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={false}
      zoomControl={true}
      dragging={true}
      doubleClickZoom={false}
      attributionControl={false}
      maxBounds={[[-3.2, 28.1], [-0.7, 31.4]]}
      maxBoundsViscosity={0.9}
    >
      <FitRwanda />

      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO &copy; OpenStreetMap contributors'
      />

      {districts.length === 0 ? null : districts.map(d => {
        const coords = findCoords(d.district)
        if (!coords) return null
        const color  = lossColor(d.loss_pct)
        // Circle radius scales with volume (min 10, max 28)
        const radius = 10 + Math.round((d.volume_tons / maxVol) * 18)
        return (
          <CircleMarker
            key={d.district}
            center={coords}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.75,
              weight: 1.5,
              opacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} className="cs-tooltip" sticky={false}>
              <p className="text-xs font-bold text-gray-900">{d.district}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold" style={{ color }}>{d.loss_pct}% loss</span>
                <span className="text-xs text-gray-400">· {d.volume_tons} tons</span>
              </div>
              <span className={`text-[10px] font-bold mt-0.5 block`} style={{ color }}>
                {riskLabel(d.loss_pct)}
              </span>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
