import { useEffect, useRef, useState } from 'react'
import MapScreen from './MapScreen.jsx'
import { usePhotoUrls } from '../hooks/usePhotoUrls.js'
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

// Swiping the big photo: how far (share of the screen) or how fast (px per ms) counts as "next".
const SWIPE_SHARE = 0.18
const FLICK = 0.35
// Filmstrip geometry: small thumbs are 46 px wide, 8 px apart; the selected one is 60 px.
const STEP = 54
const SEL_W = 60

export default function PlacesScreen({ places, active, coords, account, onClose, onUpdate, onRemove }) {
  const urls = usePhotoUrls(places)
  const [sel, setSel] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [menu, setMenu] = useState(null) // null | 'menu' | 'confirm'
  const [mapOpen, setMapOpen] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [draft, setDraft] = useState('')
  const [stripW, setStripW] = useState(390)
  const stripRef = useRef(null)
  // Big photo deck: x follows the finger; anim = slide with easing.
  const [deck, setDeck] = useState({ x: 0, anim: false })
  const [deckW, setDeckW] = useState(390)
  const deckRef = useRef(null)
  const drag = useRef(null)
  const swiped = useRef(false)
  const settle = useRef(null)
  const sliding = useRef(null)
  // Filmstrip drag: dx while the finger is down, null otherwise.
  const [stripDx, setStripDx] = useState(null)
  const stripDrag = useRef(null)
  const stripMoved = useRef(false)

  const index = Math.min(sel, Math.max(0, places.length - 1))
  const place = places[index]

  // A newly saved place shows first.
  const newestId = places[0]?.id
  useEffect(() => { setSel(0); setFlipped(false) }, [newestId])

  // Closing the panel puts everything back to the front of the card.
  useEffect(() => {
    if (!active) { setFlipped(false); setMenu(null); setMapOpen(false); setAddingTag(false) }
  }, [active])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStripW(el.clientWidth))
    ro.observe(el)
    setStripW(el.clientWidth)
    return () => ro.disconnect()
  }, [places.length > 0])

  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    // One "step" = a photo's width plus a small gap, so photos travel side by side.
    const measure = () => setDeckW(Math.round(el.clientHeight * 0.75) + 20)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [places.length > 0])

  const go = (i) => {
    setSel(Math.max(0, Math.min(places.length - 1, i)))
    setFlipped(false)
    setMenu(null)
    setAddingTag(false)
  }

  // --- Big photo: drag sideways, the photo follows the finger and the next one slides in.
  const onDeckDown = (e) => {
    if (flipped || deck.anim || e.button > 0) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, v: 0, axis: null }
    swiped.current = false
  }
  const onDeckMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (d.axis === null) {
      if (Math.abs(dx) + Math.abs(dy) < 8) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'x') e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (d.axis !== 'x') return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    const blocked = (dx > 0 && index === 0) || (dx < 0 && index === places.length - 1)
    setDeck({ x: blocked ? dx / 3 : dx, anim: false }) // a soft pull at the first and last place
  }
  const onDeckUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    swiped.current = true
    setTimeout(() => { swiped.current = false }, 350) // ignore only the click that ends the swipe
    const dx = e.clientX - d.x
    const dir = dx < 0 ? 1 : -1
    const far = Math.abs(dx) > deckW * SWIPE_SHARE || (Math.abs(d.v) > FLICK && Math.sign(d.v) === Math.sign(dx))
    const exists = index + dir >= 0 && index + dir < places.length
    const next = far && exists ? { x: -dir * deckW, anim: true, dir } : { x: 0, anim: true }
    if (next.dir) navigator.vibrate?.(6)
    sliding.current = next
    setDeck(next)
    // Backup in case the slide's "finished" event never fires (e.g. it ended where it started).
    clearTimeout(settle.current)
    settle.current = setTimeout(() => finishSlide(next), 360)
  }
  const finishSlide = (d) => {
    clearTimeout(settle.current)
    if (sliding.current !== d) return // already finished
    sliding.current = null
    if (d.dir) go(index + d.dir)
    setDeck({ x: 0, anim: false })
  }
  const onDeckEnd = (e) => {
    if (e.target !== e.currentTarget || !deck.anim) return
    finishSlide(deck)
  }

  // --- Filmstrip: drag to scroll; the photo under the middle becomes the big one.
  const onStripDown = (e) => {
    if (e.button > 0) return
    stripDrag.current = { id: e.pointerId, x: e.clientX, start: index, lastX: e.clientX, lastT: e.timeStamp, v: 0, on: false }
    stripMoved.current = false
  }
  const onStripMove = (e) => {
    const s = stripDrag.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    if (!s.on) {
      if (Math.abs(dx) < 6) return
      s.on = true
      stripMoved.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    const dt = e.timeStamp - s.lastT
    if (dt > 0) s.v = (e.clientX - s.lastX) / dt
    s.lastX = e.clientX
    s.lastT = e.timeStamp
    const target = Math.max(0, Math.min(places.length - 1, s.start + Math.round(-dx / STEP)))
    if (target !== index) { go(target); navigator.vibrate?.(4) }
    setStripDx(dx)
  }
  const onStripUp = () => {
    const s = stripDrag.current
    stripDrag.current = null
    if (!s?.on) return
    // A quick flick keeps going for a few places, then settles.
    const glide = (stripDx ?? 0) + s.v * 220
    go(s.start + Math.round(-glide / STEP))
    setStripDx(null)
    setTimeout(() => { stripMoved.current = false }, 50)
  }
  const onCardClick = () => {
    if (swiped.current) { swiped.current = false; return }
    setFlipped(true)
    setMenu(null)
  }

  const addTag = () => {
    const tag = draft.trim().toLowerCase()
    setDraft('')
    setAddingTag(false)
    if (tag && !place.tags.includes(tag)) onUpdate(place.id, { tags: [...place.tags, tag] })
  }

  // The filmstrip: the selected thumbnail is bigger and sits in the middle.
  let x = 0
  let center = 0
  const thumbs = places.map((p, i) => {
    const d = i - index
    const isSel = d === 0
    const w = isSel ? 60 : 46
    const h = isSel ? 80 : 62
    if (isSel) center = x + w / 2
    x += w + 8
    return { p, i, d, isSel, w, h }
  })
  const offset = stripDx !== null && stripDrag.current
    ? Math.round(stripW / 2 - (stripDrag.current.start * STEP + SEL_W / 2) + stripDx)
    : Math.round(stripW / 2 - center)

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
                  setSel(Math.max(0, next))
                }}>Delete</button>
                <button type="button" className="menu__item" onClick={() => setMenu(null)}>Cancel</button>
              </>
            )}
          </div>
        </>
      )}

      <div
        className={`deck${flipped ? '' : ' deck--swipe'}${deck.x !== 0 || deck.anim ? ' deck--moving' : ''}`}
        ref={deckRef}
        data-noswipe
        onPointerDown={onDeckDown}
        onPointerMove={onDeckMove}
        onPointerUp={onDeckUp}
        onPointerCancel={onDeckUp}
      >
        <div
          className={`deck__track${deck.anim ? ' deck__track--anim' : ''}`}
          style={{ transform: `translateX(${deck.x}px)` }}
          onTransitionEnd={onDeckEnd}
        >
          {[-1, 1].map((k) => {
            const p = places[index + k]
            if (!p) return null
            return (
              <div key={p.id} className="deck__slide deck__slide--side" style={{ transform: `translateX(${k * deckW}px)` }} aria-hidden="true">
                {urls[p.id] && p.kind !== 'pin'
                  ? <div className="card-photo" style={{ backgroundImage: `url(${urls[p.id]})` }} />
                  : <div className="card-pin"><PinIcon size={30} color="#FFFFFF" withDot />Pinned spot, tap to add details</div>}
              </div>
            )
          })}
          <div key={place.id} className="deck__slide">
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
        onPointerDown={onStripDown}
        onPointerMove={onStripMove}
        onPointerUp={onStripUp}
        onPointerCancel={onStripUp}
      >
        <div className={`filmstrip__row${stripDx !== null ? ' filmstrip__row--drag' : ''}`} style={{ transform: `translateX(${offset}px)` }}>
          {thumbs.map(({ p, i, d, isSel, w, h }) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={isSel}
              aria-label={titleText(p)}
              className={`thumb${isSel ? ' thumb--sel' : ''}${urls[p.id] ? '' : ' thumb--pin'}`}
              style={{
                width: w, height: h,
                opacity: Math.max(0.35, 1 - Math.abs(d) * 0.18),
                transform: `rotateY(${Math.max(-42, Math.min(42, -d * 16))}deg)`,
                backgroundImage: urls[p.id] ? `url(${urls[p.id]})` : undefined,
              }}
              onClick={() => { if (!stripMoved.current) go(i) }}
            >
              {!urls[p.id] && <PinIcon size={16} color="#A3A3A3" />}
            </button>
          ))}
        </div>
      </div>

      {mapOpen && (
        <div className="viewer__map">
          <MapScreen
            places={places}
            urls={urls}
            coords={coords}
            onBack={() => setMapOpen(false)}
            onPick={(i) => { go(i); setMapOpen(false) }}
          />
        </div>
      )}
    </main>
  )
}
