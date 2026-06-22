import { useRef, useEffect, useState } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
import { Map as MapIcon, Satellite, Mountain, Navigation2 } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_TOKEN, MAPBOX_STYLE, RWANDA_CENTER } from '../../lib/mapbox.js'
import PlaceSearchInput from './PlaceSearchInput.jsx'

const MAP_STYLES = {
  streets:    { label: 'Default',    icon: MapIcon,     url: MAPBOX_STYLE },
  navigation: { label: 'Navigation', icon: Navigation2, url: 'mapbox://styles/mapbox/navigation-day-v1' },
  satellite:  { label: 'Satellite',  icon: Satellite,   url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  terrain:    { label: 'Terrain',    icon: Mountain,     url: 'mapbox://styles/mapbox/outdoors-v12' },
}

/**
 * Shared Mapbox map used across roles.
 * `markers`: [{ id, lat, lng, color, element, draggable, onDragEnd({lat,lng}), popup: <node>, onClick }]
 *   `element` (optional JSX) fully replaces the default pin — used for custom dot/label markers.
 * `routes`: [{ id, coordinates: [[lng,lat],...], color, width, opacity, dashArray }]
 *   Coordinates are GeoJSON order — e.g. from fetchDrivingRoute(). Mapbox's own coordinate order
 *   is the opposite of the [lat,lng] convention used by the Leaflet maps elsewhere in this
 *   codebase, so this stays isolated to this component and `lib/mapbox.js`.
 */
export default function MapboxMap({
  markers = [],
  routes = [],
  center = null,
  zoom = 12,
  height = 360,
  fitToMarkers = false,
  onMarkerClick = null,
  showSearch = false,
  onSearchSelect = null,
  showStyleSwitcher = true,
}) {
  const mapRef = useRef(null)
  const [popupMarker, setPopupMarker] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [styleKey, setStyleKey] = useState('streets')
  const [viewState, setViewState] = useState({
    longitude: center ? center[1] : RWANDA_CENTER[0],
    latitude: center ? center[0] : RWANDA_CENTER[1],
    zoom,
  })

  const handleSearchSelect = (result) => {
    const map = mapRef.current?.getMap?.()
    if (map) map.flyTo({ center: [result.lng, result.lat], zoom: 14, duration: 800 })
    else setViewState(v => ({ ...v, longitude: result.lng, latitude: result.lat, zoom: 14 }))
    onSearchSelect?.(result)
  }

  const validMarkers = markers.filter(m => m.lat != null && m.lng != null)

  const routeKey = JSON.stringify(routes.map(r => r.coordinates))

  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!fitToMarkers || !map) return
    const coords = validMarkers.map(m => [m.lng, m.lat])
    routes.forEach(r => { if (r.coordinates?.length) coords.push(...r.coordinates) })
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.flyTo({ center: coords[0], zoom, duration: 0 })
      return
    }
    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    )
    map.fitBounds(bounds, { padding: 60, duration: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToMarkers, JSON.stringify(validMarkers.map(m => [m.lat, m.lng])), routeKey])

  if (!MAPBOX_TOKEN || loadError) {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded-xl text-sm text-gray-400 text-center p-4" style={{ height }}>
        {loadError
          ? "Map couldn't load in this browser — the rest of the page still works."
          : 'Map unavailable — set VITE_MAPBOX_TOKEN in frontend/.env to enable the live map.'}
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-100" style={{ height }}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 text-sm text-gray-400">
          Loading map…
        </div>
      )}

      {showSearch && (
        <div className="absolute top-3 left-3 z-20 w-64 max-w-[calc(100%-5.5rem)]">
          <PlaceSearchInput onSelect={handleSearchSelect} placeholder="Search a place…" />
        </div>
      )}

      {showStyleSwitcher && (
        <div className="absolute bottom-3 left-3 z-20 flex bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {Object.entries(MAP_STYLES).map(([key, s]) => (
            <button
              key={key}
              type="button"
              title={s.label}
              onClick={() => setStyleKey(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${styleKey === key ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          ))}
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onError={() => setLoadError(true)}
        onLoad={() => setLoaded(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[styleKey].url}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={true} />

        {routes.filter(r => r.coordinates?.length > 1).map(r => (
          <Source key={r.id} type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coordinates } }}>
            {/* White halo underneath — makes the route pop against any map style/terrain,
                the same trick Google/Apple Maps use instead of a flat single-color line. */}
            {!r.dashArray && (
              <Layer
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': '#ffffff',
                  'line-width': (r.width ?? 4) + 3,
                  'line-opacity': 0.9,
                }}
              />
            )}
            <Layer
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': r.color || '#228b52',
                'line-width': r.width ?? 4,
                'line-opacity': r.opacity ?? 0.85,
                ...(r.dashArray ? { 'line-dasharray': r.dashArray } : {}),
              }}
            />
          </Source>
        ))}

        {validMarkers.map(m => (
          <Marker
            key={m.id}
            longitude={m.lng}
            latitude={m.lat}
            anchor={m.element ? 'center' : 'bottom'}
            {...(!m.element ? { color: m.color || '#228b52' } : {})}
            draggable={!!m.draggable}
            onDragEnd={evt => m.onDragEnd?.({ lat: evt.lngLat.lat, lng: evt.lngLat.lng })}
            onClick={e => {
              e.originalEvent?.stopPropagation()
              m.onClick?.(m)
              onMarkerClick?.(m)
              if (m.popup) setPopupMarker(m)
            }}
          >
            {m.element}
          </Marker>
        ))}

        {popupMarker && (
          <Popup
            longitude={popupMarker.lng}
            latitude={popupMarker.lat}
            onClose={() => setPopupMarker(null)}
            closeOnClick={false}
            offset={16}
          >
            {popupMarker.popup}
          </Popup>
        )}
      </Map>
    </div>
  )
}
