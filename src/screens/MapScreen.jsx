import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { titleText } from '../lib/format.js'

const DEFAULT_CENTER = [12.9716, 77.5946]

function pinEl(place, url) {
  const wrap = document.createElement('div')
  wrap.className = 'mpin'
  const thumb = document.createElement('span')
  thumb.className = place.kind === 'pin' ? 'mpin__thumb mpin__thumb--pin' : 'mpin__thumb'
  if (url) thumb.style.backgroundImage = `url(${url})`
  const label = document.createElement('span')
  label.className = place.title ? 'mpin__label' : 'mpin__label mpin__label--dim'
  label.textContent = titleText(place)
  wrap.append(thumb, label)
  return wrap
}

export default function MapScreen({ places, urls, coords, onBack, onPick }) {
  const box = useRef(null)
  const mapRef = useRef(null)
  const meRef = useRef(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick

  // Build the map once, with one marker per saved place that has a location.
  useEffect(() => {
    const map = L.map(box.current, { zoomControl: false, zoomSnap: 0.5, attributionControl: true })
    map.attributionControl.setPrefix(false)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)
    mapRef.current = map

    const points = []
    places.forEach((place, index) => {
      if (place.lat == null) return
      const latlng = [place.lat, place.lng]
      points.push(latlng)
      const icon = L.divIcon({ html: pinEl(place, urls[place.id]), className: 'mpin-icon', iconSize: [0, 0] })
      L.marker(latlng, { icon, keyboard: true, title: titleText(place) })
        .on('click', () => pickRef.current(index))
        .addTo(map)
    })

    const here = coords ? [coords.lat, coords.lng] : null
    if (here) points.push(here)
    if (points.length > 1) map.fitBounds(points, { padding: [60, 60], maxZoom: 16 })
    else map.setView(points[0] || DEFAULT_CENTER, points[0] ? 16 : 12)

    // The panel slides in, so measure again once it has settled.
    const t = setTimeout(() => map.invalidateSize(), 350)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; meRef.current = null }
    // Rebuilt only when the set of places changes, not on every GPS update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.map((p) => p.id + (p.title || '')).join('|')])

  // The green "you are here" dot follows the GPS.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !coords) return
    const latlng = [coords.lat, coords.lng]
    if (meRef.current) meRef.current.setLatLng(latlng)
    else {
      meRef.current = L.circleMarker(latlng, {
        radius: 8, color: '#000000', weight: 3, fillColor: '#00AA13', fillOpacity: 1, interactive: false,
      }).addTo(map)
    }
  }, [coords?.lat, coords?.lng])

  return (
    <div className="mapscreen">
      <header className="mapscreen__top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to places">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 className="mapscreen__title">{places.length} {places.length === 1 ? 'place' : 'places'}</h1>
        <span className="icon-btn" aria-hidden="true" />
      </header>
      <div ref={box} className="mapscreen__map" data-noswipe role="application" aria-label="Map of your places" />
    </div>
  )
}
