import { useCallback, useRef, useState } from 'react'
import CameraScreen from './screens/CameraScreen.jsx'
import PlacesScreen from './screens/PlacesScreen.jsx'
import PreviewScreen from './screens/PreviewScreen.jsx'
import SavedScreen from './screens/SavedScreen.jsx'
import { useLocation } from './hooks/useLocation.js'
import { usePlaces } from './hooks/usePlaces.js'
import { useAuth } from './hooks/useAuth.js'
import { useSync } from './hooks/useSync.js'
import { haptic } from './lib/haptics.js'

const OPEN_DISTANCE = 90 // px of drag needed to switch screens
const FLICK_SPEED = 0.5 // px per ms; a quick flick also switches

export default function App() {
  // GPS starts the moment the app opens (rule from CLAUDE.md),
  // so a fix is usually ready by the time a photo is taken.
  const location = useLocation()
  const { places, edits, add, update, remove, reload, forgetAll } = usePlaces()
  const auth = useAuth()
  const sync = useSync({ user: auth.user, edits, reload })

  const account = {
    user: auth.user,
    checked: auth.checked,
    status: sync.status,
    waiting: sync.waiting,
    signIn: auth.signInWithGoogleToken,
    signOut: async () => { await auth.signOut(); await forgetAll() },
  }

  // After a shutter press: 'preview' (edit details), then 'saved' (the pin animation).
  const [step, setStep] = useState(null)
  const [shot, setShot] = useState(null) // { photo, coords } while previewing
  const [savedPlace, setSavedPlace] = useState(null)

  // Places slides up from the bottom over the camera. The camera stays running underneath,
  // so coming back to it is instant.
  const [placesOpen, setPlacesOpen] = useState(false)
  const [drag, setDrag] = useState(null) // px the finger has moved, while dragging
  const touch = useRef(null)

  const swipeOn = step === null

  const onPhoto = (photo) => {
    setShot({ photo, coords: location.coords }) // lock the location at the moment of the shot
    setStep('preview')
  }

  const onPin = async () => {
    const c = location.coords
    await add({ kind: 'pin', lat: c.lat, lng: c.lng, accuracy: c.accuracy })
  }

  const onSave = async ({ title, note, tags, area }) => {
    const c = shot.coords
    const place = await add({
      kind: 'photo', photo: shot.photo, title, note, tags, area,
      lat: c?.lat ?? null, lng: c?.lng ?? null, accuracy: c?.accuracy ?? null,
    })
    setSavedPlace(place)
    setStep('saved')
  }

  const backToCamera = useCallback(() => {
    setStep(null)
    setShot(null)
    setSavedPlace(null)
  }, [])

  const onTouchStart = (e) => {
    if (!swipeOn || e.target.closest?.('[data-noswipe]')) return
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
      haptic('medium')
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
      <div aria-hidden={placesOpen} inert={placesOpen || step !== null ? true : undefined}>
        <CameraScreen
          location={location}
          placesCount={places.length}
          onOpenPlaces={() => setPlacesOpen(true)}
          onPhoto={onPhoto}
          onPin={onPin}
        />
      </div>

      <div
        className={`sheet${drag !== null ? ' sheet--dragging' : ''}`}
        style={{ transform: `translateY(${offset})` }}
        aria-hidden={!placesOpen}
        inert={!placesOpen ? true : undefined}
      >
        <PlacesScreen
          places={places}
          active={placesOpen}
          coords={location.coords}
          account={account}
          onClose={() => setPlacesOpen(false)}
          onUpdate={update}
          onRemove={remove}
        />
      </div>

      {step === 'preview' && shot && (
        <div className="overlay">
          <PreviewScreen photo={shot.photo} coords={shot.coords} onRetake={backToCamera} onSave={onSave} />
        </div>
      )}
      {step === 'saved' && (
        <div className="overlay">
          <SavedScreen place={savedPlace} onDone={backToCamera} />
        </div>
      )}
    </div>
  )
}
