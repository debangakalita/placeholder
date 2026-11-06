import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera.js'
import { PinIcon } from '../components/Icons.jsx'

const CAMERA_MESSAGES = {
  denied: {
    title: 'Camera is off',
    body: 'Allow camera access for this site in your phone settings, then try again.',
  },
  unavailable: {
    title: 'No camera found',
    body: 'This device has no camera we can use. Try on your phone.',
  },
  error: {
    title: 'Camera did not start',
    body: 'Another app may be using it. Close it and try again.',
  },
}

function locationLine(location) {
  if (location.status === 'ready') return `Location found, accurate to ${location.coords.accuracy} m`
  if (location.status === 'denied') return 'Location is off. Allow it in settings'
  if (location.status === 'unavailable') return 'This device cannot share location'
  return 'Still finding your location'
}

export default function CameraScreen({ location, onOpenPlaces, placesCount = 0 }) {
  const { videoRef, status, retry, capture } = useCamera()
  const [toast, setToast] = useState(null)
  const [flash, setFlash] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = (next) => {
    setToast(next)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  const onPin = () => {
    navigator.vibrate?.(15)
    showToast({ kind: 'pin', title: 'Pinned', body: locationLine(location) })
  }

  const onShutter = async () => {
    if (status !== 'live') return
    navigator.vibrate?.(15)
    setFlash(true)
    setTimeout(() => setFlash(false), 180)
    // Step 1 only checks the camera works. Saving and the preview screen come in Step 2.
    const photo = await capture()
    if (photo) showToast({ kind: 'photo', title: 'Photo taken', body: locationLine(location) })
  }

  const message = CAMERA_MESSAGES[status]

  return (
    <main className="cam">
      <header className="cam__top">
        <span className="wordmark">placeholder</span>
        <button type="button" className="pill" onClick={onOpenPlaces}
          aria-label={`Open places, ${placesCount} saved`}>
          <span className="dot" aria-hidden="true" />{placesCount} {placesCount === 1 ? 'place' : 'places'}
        </button>
      </header>

      <div className={`viewfinder${message ? ' viewfinder--empty' : ''}`}>
        <video
          ref={videoRef}
          className="viewfinder__video"
          playsInline
          muted
          autoPlay
          aria-label="Live camera"
          hidden={status !== 'live'}
        />

        {message && (
          <div className="viewfinder__msg">
            <p className="viewfinder__title">{message.title}</p>
            <p className="viewfinder__body">{message.body}</p>
            <button type="button" className="btn-quiet" onClick={retry}>Try again</button>
          </div>
        )}

        {flash && <span className="viewfinder__flash" aria-hidden="true" />}

        {toast && (
          <div className="toast" role="status">
            <span className="toast__icon" aria-hidden="true"><PinIcon size={15} color="#1A1A17" /></span>
            <div>
              <p className="toast__title">{toast.title}</p>
              <p className="toast__body">{toast.body}</p>
            </div>
          </div>
        )}
      </div>

      <div className="cam__controls">
        <button type="button" className="pin-btn" onClick={onPin}>
          <span className="pin-btn__circle"><PinIcon size={22} color="#FFFFFF" withDot /></span>
          Pin only
        </button>

        <button
          type="button"
          className="shutter"
          aria-label="Take photo"
          onClick={onShutter}
          disabled={status !== 'live'}
        >
          <span className="shutter__inner" />
        </button>
      </div>

      <button type="button" className="swipe-hint" onClick={onOpenPlaces} aria-label="Open places">
        <span className="swipe-hint__label">Swipe up for places</span>
        <span className="swipe-hint__bar" aria-hidden="true" />
      </button>
    </main>
  )
}
