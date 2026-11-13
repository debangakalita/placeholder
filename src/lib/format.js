export function shortDate(ms) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function areaText(place) {
  if (place.area) return place.area
  return place.lat != null ? 'Near your location' : 'No location'
}

export function titleText(place) {
  return place.title || (place.kind === 'pin' ? 'Untitled pin' : 'Untitled')
}

// A link that opens the place in the phone's maps app (or the browser).
export function mapsLink(place) {
  if (place.lat == null) return null
  // Opens directions from where you are to the place (Google Maps app if installed).
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
}
