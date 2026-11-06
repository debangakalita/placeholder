// Places viewer. Step 2: only the empty state and a simple look at the latest place.
// The real viewer (big photo, filmstrip, flip card) comes in Step 3.
import { useEffect, useMemo } from 'react'

export default function PlacesScreen({ places = [], onClose }) {
  const latest = places[0]
  const url = useMemo(() => (latest?.photo ? URL.createObjectURL(latest.photo) : null), [latest])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  return (
    <main className="places">
      <header className="places__top">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close, back to camera">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      {latest ? (
        <div className="latest">
          <div className="latest__photo" style={url ? { backgroundImage: `url(${url})` } : undefined}>
            {!url && <span className="latest__pin">Pinned spot</span>}
          </div>
          <p className="latest__title">{latest.title || (latest.kind === 'pin' ? 'Untitled pin' : 'Untitled')}</p>
          <p className="latest__area">{latest.area || (latest.lat != null ? 'Near your location' : 'No location')}</p>
          <p className="latest__count">{places.length} saved. The full viewer comes next.</p>
        </div>
      ) : (
        <div className="empty-card">
          <h1 className="empty-card__title">Your first place goes here</h1>
          <p className="empty-card__body">
            Take a photo of something you like on the way. If a photo is awkward, pin the spot.
          </p>
          <button type="button" className="btn-accent" onClick={onClose}>Open camera</button>
        </div>
      )}

      <div className="strip strip--empty" aria-hidden="true" hidden={!!latest}>
        <span className="strip__slot strip__slot--far" />
        <span className="strip__slot strip__slot--near" />
        <span className="strip__slot strip__slot--current" />
        <span className="strip__slot strip__slot--near" />
        <span className="strip__slot strip__slot--far" />
      </div>
    </main>
  )
}
