import mapboxgl from 'mapbox-gl'

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
mapboxgl.accessToken = MAPBOX_TOKEN

// Mapbox's "Standard" style — vibrant colors, 3D buildings, and a much denser default POI
// layer (restaurants, hotels, schools, hospitals) than the older "streets" style, closer to
// the Google/Apple Maps look this app's maps are styled after.
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard'

// Rwanda center, [lng, lat] — Mapbox coordinate order (opposite of the Leaflet [lat, lng] used elsewhere in this codebase)
export const RWANDA_CENTER = [29.8739, -1.9403]

/**
 * Real road-following route via the Mapbox Directions API.
 * Accepts either fetchDrivingRoute(origin, destination) for a single leg, or
 * fetchDrivingRoute(waypoints) with 2+ [lng,lat] points for a multi-stop run —
 * Mapbox visits them in the given order (up to 25 points per request).
 * `profile` is 'driving' (default) or 'driving-traffic' (live-traffic-aware ETA, real
 * Mapbox data — not a heuristic), used for the transporter's traffic-aware Active Trip view.
 * Returns { coordinates: [[lng,lat], ...], distanceKm, durationMin, typicalDurationMin, legs }
 * or null on failure. `typicalDurationMin` (only present for 'driving-traffic') is what the
 * trip would take with no current congestion — compare it to `durationMin` to know if traffic
 * is adding delay right now.
 */
export async function fetchDrivingRoute(origin, destination, profile = 'driving') {
  if (!MAPBOX_TOKEN) return null
  const waypoints = destination ? [origin, destination] : origin
  if (!Array.isArray(waypoints) || waypoints.length < 2) return null
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';')
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
    `?geometries=geojson&overview=full&annotations=duration${profile === 'driving-traffic' ? ',congestion' : ''}` +
    `&access_token=${MAPBOX_TOKEN}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null
    return {
      coordinates: route.geometry.coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      typicalDurationMin: route.duration_typical != null ? route.duration_typical / 60 : null,
      congestion: route.legs?.flatMap(l => l.annotation?.congestion || []) || [],
      legs: route.legs,
    }
  } catch {
    return null
  }
}

/**
 * Address-search autocomplete via the Mapbox Search Box API.
 * `sessionToken` should be a stable uuid for the lifetime of one search session (billing grouping).
 */
export async function searchSuggest(query, sessionToken) {
  if (!MAPBOX_TOKEN || !query?.trim()) return []
  const url = `https://api.mapbox.com/search/searchbox/v1/suggest` +
    `?q=${encodeURIComponent(query)}&session_token=${sessionToken}&access_token=${MAPBOX_TOKEN}` +
    `&country=rw&language=en&limit=6`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return data.suggestions ?? []
  } catch {
    return []
  }
}

/**
 * Reverse geocode a lat/lon into a human-readable place name.
 * Returns the most specific meaningful name available — typically a sector or
 * district level within Rwanda (e.g. "Kinigi, Musanze, Northern Province").
 * Returns null if the token is missing or the call fails.
 */
export async function reverseGeocode(lat, lon) {
  if (!MAPBOX_TOKEN) return null
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json` +
    `?access_token=${MAPBOX_TOKEN}&types=neighborhood,locality,place,district,region&language=en&country=rw&limit=1`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    // Build a concise name: "Neighbourhood, City" or just "City, Province"
    const ctx = feature.context || []
    const parts = [feature.text, ...ctx.slice(0, 2).map(c => c.text)].filter(Boolean)
    return parts.join(', ')
  } catch {
    return null
  }
}

/** Resolve a suggestion's `mapbox_id` (from searchSuggest) into full coordinates. */
export async function searchRetrieve(mapboxId, sessionToken) {
  if (!MAPBOX_TOKEN || !mapboxId) return null
  const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}` +
    `?session_token=${sessionToken}&access_token=${MAPBOX_TOKEN}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    const [lng, lat] = feature.geometry.coordinates
    return { lat, lng, address: feature.properties?.full_address || feature.properties?.name }
  } catch {
    return null
  }
}
