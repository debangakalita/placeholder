import { useCallback, useEffect, useRef, useState } from 'react'

// Opens the back camera into a <video> element.
// status: 'starting' | 'live' | 'denied' | 'unavailable' | 'error'
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('starting')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    if (streamRef.current) return
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
      })
      // The app may have gone to the background while we waited.
      if (document.hidden) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => {})
      }
      setStatus('live')
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') setStatus('denied')
      else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') setStatus('unavailable')
      else setStatus('error')
    }
  }, [])

  useEffect(() => {
    start()
    // Phones kill the camera in the background; restart it when the app comes back.
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [start, stop])

  // Grabs the current frame as a tall 3:4 JPEG (matches the 3:4 view),
  // shrunk to at most 1200 px tall so it stays light on the phone.
  const capture = useCallback(async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const vw = video.videoWidth
    const vh = video.videoHeight
    const w = Math.min(vw, vh * 0.75)
    const h = w / 0.75
    const sx = (vw - w) / 2
    const sy = (vh - h) / 2
    const outH = Math.round(Math.min(h, 1200))
    const outW = Math.round(outH * 0.75)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    canvas.getContext('2d').drawImage(video, sx, sy, w, h, 0, 0, outW, outH)
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  }, [])

  return { videoRef, status, retry: start, capture }
}
