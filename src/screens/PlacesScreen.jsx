// Places viewer. For now only the "nothing saved yet" state (D · Places, nothing saved yet).
// The big photo, filmstrip and flip card come in Step 3.
export default function PlacesScreen({ onClose }) {
  return (
    <main className="places">
      <header className="places__top">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close, back to camera">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div className="empty-card">
        <h1 className="empty-card__title">Your first place goes here</h1>
        <p className="empty-card__body">
          Take a photo of something you like on the way. If a photo is awkward, pin the spot.
        </p>
        <button type="button" className="btn-accent" onClick={onClose}>Open camera</button>
      </div>

      <div className="strip strip--empty" aria-hidden="true">
        <span className="strip__slot strip__slot--far" />
        <span className="strip__slot strip__slot--near" />
        <span className="strip__slot strip__slot--current" />
        <span className="strip__slot strip__slot--near" />
        <span className="strip__slot strip__slot--far" />
      </div>
    </main>
  )
}
