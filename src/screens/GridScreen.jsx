import { useEffect, useRef } from 'react'
import { PinIcon } from '../components/Icons.jsx'
import { titleText } from '../lib/format.js'

// All places at once, newest first, three per row. Tap one to open it.
export default function GridScreen({ places, urls, current, onBack, onPick }) {
  const currentRef = useRef(null)

  // Open with the place you were looking at in view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="gridscreen">
      <header className="mapscreen__top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to places">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 className="mapscreen__title">{places.length} {places.length === 1 ? 'place' : 'places'}</h1>
        <span className="icon-btn" aria-hidden="true" />
      </header>

      <div className="grid" data-noswipe>
        {places.map((p, i) => {
          const url = urls[p.id]
          const isPin = p.kind === 'pin' || !url
          return (
            <button
              key={p.id}
              ref={i === current ? currentRef : undefined}
              type="button"
              className={`grid__tile${isPin ? ' grid__tile--pin' : ''}${i === current ? ' grid__tile--current' : ''}`}
              style={isPin ? undefined : { backgroundImage: `url(${url})` }}
              aria-label={titleText(p)}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => onPick(i)}
            >
              {isPin && <PinIcon size={20} color="#A3A3A3" withDot />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
