import { useRef, useState } from 'react'
import CameraScreen from './screens/CameraScreen.jsx'
import PlacesScreen from './screens/PlacesScreen.jsx'
import { useLocation } from './hooks/useLocation.js'

const OPEN_DISTANCE = 90 // px of drag needed to switch screens
const FLICK_SPEED = 0.5 // px per ms; a quick flick also switches

export default function App() {
  // GPS starts the moment the app opens (rule from CLAUDE.md),
  // so a fix is usually ready by the time a photo is taken.
  const location = useLocation()

  // Places slides up from the bottom over the camera. The camera stays running underneath,
  // so coming back to it is instant.
  const [placesOpen, setPlacesOpen] = useState(false)
  const [drag, setDrag] = useState(null) // px the finger has moved, while dragging
  const touch = useRef(null)

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { y: t.clientY, x: t.clientX, time: e.timeStamp, vertical: null }
  }

  const onTouchMove = (e) => {
    const start = touch.current
    if (!start) return
    const t = e.touches[0]
    const dy = t.clientY - start.y
    const dx = t.clientX - start.x
    if (start.vertical === null && Math.abs(dy) + Math.abs(dx) > 8) {
      start.vertical = Math.abs(dy) > Math.abs(dx)
    }
    if (!start.vertical) return
    // Camera: only an upward drag counts. Places: only a downward drag.
    if (!placesOpen && dy < 0) setDrag(dy)
    else if (placesOpen && dy > 0) setDrag(dy)
  }

  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    if (drag === null || !start) return
    const speed = Math.abs(drag) / Math.max(1, e.timeStamp - start.time)
    if (Math.abs(drag) > OPEN_DISTANCE || speed > FLICK_SPEED) {
      setPlacesOpen(!placesOpen)
      navigator.vibrate?.(10)
    }
    setDrag(null)
  }

  // Where the Places panel sits: fully below the screen when closed, at 0 when open.
  let offset
  if (drag !== null) offset = placesOpen ? `${Math.max(0, drag)}px` : `calc(100% + ${Math.min(0, drag)}px)`
  else offset = placesOpen ? '0px' : '100%'

  return (
    <div
      className="app"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touch.current = null; setDrag(null) }}
    >
      <div aria-hidden={placesOpen} inert={placesOpen ? true : undefined}>
        <CameraScreen location={location} placesCount={0} onOpenPlaces={() => setPlacesOpen(true)} />
      </div>

      <div
        className={`sheet${drag !== null ? ' sheet--dragging' : ''}`}
        style={{ transform: `translateY(${offset})` }}
        aria-hidden={!placesOpen}
        inert={!placesOpen ? true : undefined}
      >
        <PlacesScreen onClose={() => setPlacesOpen(false)} />
      </div>
    </div>
  )
}
