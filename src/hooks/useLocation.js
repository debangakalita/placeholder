import { useEffect, useState } from 'react'

// Keeps watching the phone's GPS while the app is open.
// status: 'finding' | 'ready' | 'denied' | 'unavailable'
export function useLocation() {
  const [state, setState] = useState({ status: 'finding', coords: null })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', coords: null })
      return
    }

    let watchId = null

    const start = () => {
      if (watchId !== null) return
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setState({
            status: 'ready',
            coords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              at: pos.timestamp,
            },
          })
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setState({ status: 'denied', coords: null })
          } else {
            // Timeouts or weak signal: keep the last good fix and keep trying.
            setState((s) => (s.coords ? s : { status: 'finding', coords: null }))
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      )
    }

    const stop = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      watchId = null
    }

    // Save battery: stop GPS when the app is in the background.
    const onVisibility = () => (document.hidden ? stop() : start())

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [])

  return state
}
