import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import MapScreen from './MapScreen.jsx'
import GridScreen from './GridScreen.jsx'
import { usePhotoUrls } from '../hooks/usePhotoUrls.js'
import { useGallery } from '../hooks/useGallery.js'
import { haptic } from '../lib/haptics.js'
import { areaText, mapsLink, shortDate, titleText } from '../lib/format.js'
import { PinIcon } from '../components/Icons.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import { GOOGLE_CLIENT_ID } from '../config.js'

const STATUS_TEXT = {
  syncing: () => 'Backing up…',
  done: () => 'All places backed up',
  offline: (n) => (n ? `${n} waiting for internet` : 'Offline, backed up earlier'),
  error: (n) => (n ? `${n} not backed up yet, will retry` : 'Backup will retry'),
}

function BackupBar({ account }) {
  const [error, setError] = useState(null)
  if (account.user || !GOOGLE_CLIENT_ID || !account.checked) return null
  return (
    <div className="backup" data-noswipe>
      <div className="backup__text">
        <p className="backup__title">Back up your places</p>
        <p className="backup__sub">{error || 'Safe even if you lose this phone'}</p>
      </div>
      <GoogleButton
        compact
        onToken={async (token, nonce) => {
          setError(null)
          try { await account.signIn(token, nonce) } catch { setError('Sign-in failed. Try again.') }
        }}
      />
    </div>
  )
}

export default function PlacesScreen({ places, active, coords, account, onClose, onUpdate, onRemove }) {
  const urls = usePhotoUrls(places)
  const [sel, setSel] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [menu, setMenu] = useState(null) // null | 'menu' | 'confirm'
  const [mapOpen, setMapOpen] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [draft, setDraft] = useState('')
  const deckRef = useRef(null)
  const stripRef = useRef(null)

  const index = Math.min(sel, Math.max(0, places.length - 1))
  const place = places[index]

  // Swiping, the filmstrip and their physics live in useGallery; it tells us which place is showing.
  const gallery = useGallery({
    count: places.length,
    enabled: !flipped,
    deckRef,
    stripRef,
    onIndex: (i) => {
      setSel(i)
      setFlipped(false)
      setMenu(null)
      setAddingTag(false)
    },
  })
  // After each render, place any photos or thumbnails that just appeared.
  useLayoutEffect(() => gallery.paint())

  // A newly saved place shows first.
  const newestId = places[0]?.id
  useEffect(() => { gallery.jump(0); setSel(0); setFlipped(false) }, [newestId])

  // Closing the panel puts everything back to the front of the card.
  useEffect(() => {
    if (!active) { setFlipped(false); setMenu(null); setMapOpen(false); setGridOpen(false); setAddingTag(false) }
  }, [active])

  const onCardClick = () => {
    if (gallery.takeClickBlock()) return
    setFlipped(true)
    setMenu(null)
  }

  const addTag = () => {
    const tag = draft.trim().toLowerCase()
    setDraft('')
    setAddingTag(false)
    if (tag && !place.tags.includes(tag)) onUpdate(place.id, { tags: [...place.tags, tag] })
  }

  if (!place) {
    return (
      <main className="places">
        <header className="places__top">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close, back to camera">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <BackupBar account={account} />
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

  const url = urls[place.id]
  const isPin = place.kind === 'pin' || !url
  const link = mapsLink(place)

  return (
    <main className="places viewer">
      <header className="viewer__top">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close, back to camera">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="viewer__date">{shortDate(place.createdAt)}</span>
        <div className="viewer__actions">
          <button type="button" className="icon-btn icon-btn--slim" onClick={() => setMapOpen(true)} aria-label="Map view">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" />
            </svg>
          </button>
          <button type="button" className="icon-btn" onClick={() => setMenu(menu ? null : 'menu')}
            aria-label="More options" aria-expanded={!!menu}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        </div>
      </header>

      <BackupBar account={account} />

      {menu && (
        <>
          <button type="button" className="menu-scrim" aria-label="Close menu" onClick={() => setMenu(null)} />
          <div className="menu" role="menu">
            {menu === 'menu' && (
              <>
                {account.user && (
                  <p className="menu__status">
                    <span className={`menu__dot menu__dot--${account.status}`} aria-hidden="true" />
                    {(STATUS_TEXT[account.status] || (() => 'Backup on'))(account.waiting)}
                  </p>
                )}
                <button type="button" role="menuitem" className="menu__item menu__item--icon"
                  onClick={() => { setMenu(null); setGridOpen(true) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
                    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
                  </svg>
                  Grid view
                </button>
                {link ? (
                  <a role="menuitem" className="menu__item" href={link} target="_blank" rel="noopener noreferrer"
                    onClick={() => setMenu(null)}>Open in Maps</a>
                ) : (
                  <span role="menuitem" aria-disabled="true" className="menu__item menu__item--off">Open in Maps</span>
                )}
                <button type="button" role="menuitem" className="menu__item menu__item--danger" onClick={() => setMenu('confirm')}>
                  Delete place
                </button>
                {account.user && (
                  <button type="button" role="menuitem" className="menu__item" onClick={() => setMenu('signout')}>
                    Sign out
                  </button>
                )}
              </>
            )}
            {menu === 'signout' && (
              <>
                <p className="menu__ask">
                  {account.waiting
                    ? `${account.waiting} ${account.waiting === 1 ? 'place is' : 'places are'} not backed up yet. Signing out now removes ${account.waiting === 1 ? 'it' : 'them'} from this phone for good.`
                    : 'Signing out removes your places from this phone. They stay safe in your backup.'}
                </p>
                <button type="button" className="menu__item menu__item--danger" onClick={() => { setMenu(null); account.signOut() }}>
                  Sign out
                </button>
                <button type="button" className="menu__item" onClick={() => setMenu(null)}>Cancel</button>
              </>
            )}
            {menu === 'confirm' && (
              <>
                <p className="menu__ask">Delete this place? This cannot be undone.</p>
                <button type="button" className="menu__item menu__item--danger" onClick={() => {
                  const next = Math.min(index, places.length - 2)
                  setMenu(null); setFlipped(false)
                  onRemove(place.id)
                  gallery.jump(Math.max(0, next))
                }}>Delete</button>
                <button type="button" className="menu__item" onClick={() => setMenu(null)}>Cancel</button>
              </>
            )}
          </div>
        </>
      )}

      <div className={`deck${flipped ? '' : ' deck--swipe'}`} ref={deckRef} data-noswipe {...gallery.deck}>
        <div className="deck__track">
          {[-1, 1].map((k) => {
            const p = places[index + k]
            if (!p) return null
            return (
              <div key={p.id} ref={gallery.slideRef(index + k)} className="deck__slide" aria-hidden="true">
                {urls[p.id] && p.kind !== 'pin'
                  ? <div className="card-photo" style={{ backgroundImage: `url(${urls[p.id]})` }} />
                  : <div className="card-pin"><PinIcon size={30} color="#FFFFFF" withDot />Pinned spot, tap to add details</div>}
              </div>
            )
          })}
          <div key={place.id} ref={gallery.slideRef(index)} className="deck__slide">
            <div className="card3d">
              <div className={`card3d__inner${flipped ? ' is-flipped' : ''}`}>
                <div className="card3d__face" inert={flipped ? true : undefined}>
                  {isPin ? (
                    <button type="button" className="card-pin" onClick={onCardClick}>
                      <PinIcon size={30} color="#FFFFFF" withDot />
                      Pinned spot, tap to add details
                    </button>
                  ) : (
                    <button
                      key={place.id}
                      type="button"
                      className="card-photo"
                      style={{ backgroundImage: `url(${url})` }}
                      onClick={onCardClick}
                      aria-label={`Show details for ${titleText(place)}`}
                    />
                  )}
                </div>

                <div className="card3d__face card3d__back" inert={!flipped ? true : undefined}>
                  <label className="sr-only" htmlFor="v-title">Title</label>
                  <input
                    id="v-title"
                    className="back__title"
                    type="text"
                    placeholder="Add a title"
                    value={place.title}
                    maxLength={80}
                    onChange={(e) => onUpdate(place.id, { title: e.target.value })}
                  />
                  <p className="back__where">{areaText(place)}, {shortDate(place.createdAt)}</p>

                  <label className="sr-only" htmlFor="v-note">Note</label>
                  <textarea
                    id="v-note"
                    className="back__note"
                    rows={5}
                    placeholder="Add a note"
                    value={place.note}
                    onChange={(e) => onUpdate(place.id, { note: e.target.value })}
                  />

                  <div className="back__tags" role="group" aria-label="Tags">
                    {place.tags.map((tag) => (
                      <button key={tag} type="button" className="chip" aria-label={`Remove tag ${tag}`}
                        onClick={() => onUpdate(place.id, { tags: place.tags.filter((t) => t !== tag) })}>
                        {tag}<span aria-hidden="true"> ×</span>
                      </button>
                    ))}
                    {addingTag ? (
                      <input
                        className="chip chip--input"
                        autoFocus
                        value={draft}
                        maxLength={24}
                        placeholder="new tag"
                        aria-label="New tag"
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={addTag}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                    ) : (
                      <button type="button" className="chip chip--add" onClick={() => setAddingTag(true)}>+ tag</button>
                    )}
                  </div>

                  <div className="back__bar">
                    <button type="button" className="back__flip" onClick={() => { setFlipped(false); setAddingTag(false) }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v5h5" />
                      </svg>
                      {isPin ? 'Back' : 'Show photo'}
                    </button>
                    {link ? (
                      <a className="back__maps" href={link} target="_blank" rel="noopener noreferrer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l14-7-7 14-2-5z" /></svg>
                        Open in Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="viewer__caption">
        <p className={`viewer__title${place.title ? '' : ' viewer__title--dim'}`}>{titleText(place)}</p>
        <p className="viewer__area">{areaText(place)}</p>
      </div>

      <div
        className="filmstrip"
        ref={stripRef}
        role="listbox"
        aria-label="Your places"
        data-noswipe
        {...gallery.strip}
      >
        <div className="filmstrip__row">
          {places.slice(Math.max(0, index - 14), index + 15).map((p, k) => {
            const i = Math.max(0, index - 14) + k
            return (
              <button
                key={p.id}
                ref={gallery.thumbRef(i)}
                type="button"
                role="option"
                aria-selected={i === index}
                aria-label={titleText(p)}
                className={`thumb${urls[p.id] ? '' : ' thumb--pin'}`}
                style={{ backgroundImage: urls[p.id] ? `url(${urls[p.id]})` : undefined }}
                onClick={() => gallery.tapThumb(i)}
              >
                {!urls[p.id] && <PinIcon size={16} color="#A3A3A3" />}
              </button>
            )
          })}
        </div>
      </div>

      {gridOpen && (
        <div className="viewer__map">
          <GridScreen
            places={places}
            urls={urls}
            current={index}
            onBack={() => setGridOpen(false)}
            onPick={(i) => { haptic('light'); gallery.jump(i); setGridOpen(false) }}
          />
        </div>
      )}

      {mapOpen && (
        <div className="viewer__map">
          <MapScreen
            places={places}
            urls={urls}
            coords={coords}
            onBack={() => setMapOpen(false)}
            onPick={(i) => { gallery.jump(i); setMapOpen(false) }}
          />
        </div>
      )}
    </main>
  )
}
