import { useEffect, useMemo } from 'react'

// Photo shrinks into a pin, then we go back to the camera.
export default function SavedScreen({ place, onDone }) {
  const url = useMemo(() => (place?.photo ? URL.createObjectURL(place.photo) : null), [place])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <main className="saved">
      <div className="saved__stack">
        <div className="saved__photo" style={url ? { backgroundImage: `url(${url})` } : undefined} />
        <span className="saved__tail" aria-hidden="true" />
        <span className="saved__shadow" aria-hidden="true" />
        <div className="saved__text" role="status">
          <p className="saved__title">{place?.title ? place.title : 'Saved'}</p>
          <p className="saved__area">{place?.area || (place?.lat != null ? 'Near your location' : 'No location')}</p>
        </div>
      </div>
      <button type="button" className="saved__skip" onClick={onDone}>Back to camera</button>
    </main>
  )
}
