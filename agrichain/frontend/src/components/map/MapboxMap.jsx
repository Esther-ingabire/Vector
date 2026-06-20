import { useRef, useEffect, useState } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_TOKEN, MAPBOX_STYLE, RWANDA_CENTER } from '../../lib/mapbox.js'

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
}) {
  const mapRef = useRef(null)
  const [popupMarker, setPopupMarker] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [viewState, setViewState] = useState({
    longitude: center ? center[1] : RWANDA_CENTER[0],
    latitude: center ? center[0] : RWANDA_CENTER[1],
    zoom,
  })

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
    <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onError={() => setLoadError(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {routes.filter(r => r.coordinates?.length > 1).map(r => (
          <Source key={r.id} type="geojson" data={{ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coordinates } }}>
            <Layer
              type="line"
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
