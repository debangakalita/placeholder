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
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
}
