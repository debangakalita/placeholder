// Turns coordinates into a short area name like "12th Main, Indiranagar".
// Needs the internet, so it can fail; callers keep the exact coordinates either way.
export async function areaName(lat, lng) {
  if (lat == null || lng == null || !navigator.onLine) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } }
    )
    clearTimeout(timer)
    if (!res.ok) return null
    const { address = {} } = await res.json()
    const road = address.road || address.pedestrian || address.footway || address.path
    const part = address.neighbourhood || address.suburb || address.city_district || address.village || address.town || address.city
    return [road, part].filter(Boolean).join(', ') || null
  } catch {
    return null
  }
}
