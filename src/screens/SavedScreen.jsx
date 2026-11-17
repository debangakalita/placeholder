import { useEffect, useLayoutEffect, useRef } from 'react'
import { haptic } from '../lib/haptics.js'
import { EASE_IN_OUT, EASE_OUT, reducedMotion, spring } from '../lib/motion.js'

// After Save: the preview photo itself shrinks into a green map pin, lands, shows the
// title, then flies into the "places" pill on the camera, which ticks up by one.
// Only transform, opacity and clip-path move, so it stays smooth on phones.
// Tap anywhere to skip.

const PIN = 140 // photo size inside the pin
const SPRING = spring({ response: 0.5, damping: 0.8 })
const SPRING_SOFT = spring({ response: 0.35, damping: 0.7 })

const a = (el, frames, opts) => el?.animate(frames, { fill: 'both', ...opts })
// Exits only take hold once they start, so they don't override earlier states.
const out = (el, frames, opts) => el?.animate(frames, { fill: 'forwards', ...opts })

export default function SavedScreen({ place, photoUrl, fromRect, onArrive, onDone }) {
  const root = useRef(null)
  const r = useRef({})
  const arrived = useRef(false)
  const done = useRef(false)
  const timers = useRef([])

  const arrive = () => {
    if (arrived.current) return
    arrived.current = true
    onArrive?.()
  }
  const finish = () => {
    if (done.current) return
    done.current = true
    arrive()
    onDone()
  }

  // Geometry is measured before the first paint, so nothing jumps.
  useLayoutEffect(() => {
    const box = root.current.getBoundingClientRect()
    const W = box.width
    const H = box.height
    const pinLeft = Math.round((W - PIN) / 2)
    const pinTop = Math.round(H * 0.24)
    const cx = W / 2
    const cy = pinTop + PIN / 2
    const { photo, ring, tail, shadow, text, title, area, group, backdrop } = r.current

    ring.style.cssText += `left:${pinLeft - 4}px;top:${pinTop - 4}px`
    tail.style.cssText += `left:${cx - 14}px;top:${pinTop + 142}px`
    shadow.style.cssText += `left:${cx - 30}px;top:${pinTop + 169}px`
    text.style.top = `${pinTop + 207}px`
    group.style.transformOrigin = `${cx}px ${cy}px`

    // Where the photo starts: exactly where it sat on the preview.
    const f = fromRect
      ? { left: fromRect.left - box.left, top: fromRect.top - box.top, width: fromRect.width, height: fromRect.height }
      : { left: 24, top: 71, width: W - 48, height: Math.min(456, (W - 48) * 4 / 3) }
    Object.assign(photo.style, {
      left: `${f.left}px`, top: `${f.top}px`, width: `${f.width}px`, height: `${f.height}px`,
    })

    // Where it flies home to: the dot in the camera's "places" pill.
    const dot = document.querySelector('[data-places-pill] .dot')?.getBoundingClientRect()
    const dx = dot ? dot.left + dot.width / 2 - box.left - cx : W / 2 - 60 - cx
    const dy = dot ? dot.top + dot.height / 2 - box.top - cy : 70 - cy

    const later = (ms, fn) => timers.current.push(setTimeout(fn, ms))

    if (reducedMotion()) {
      // No movement: the pin and title simply appear, then fade, and the count ticks.
      Object.assign(photo.style, {
        left: `${pinLeft}px`, top: `${pinTop}px`, width: `${PIN}px`, height: `${PIN}px`, borderRadius: '26px',
      })
      a(group, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
      a(text, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
      out(group, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 1100 })
      out(text, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 1100 })
      out(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 1100 })
      later(1300, arrive)
      later(1500, finish)
      return () => timers.current.forEach(clearTimeout)
    }

    const lift = 90
    const land = lift + Math.round(SPRING.ms * 0.42)
    const home = 1000
    const tick = home + 340

    // 1 · The photo shrinks into the pin with a spring, cropping to a square as it goes.
    const side = Math.min(f.width, f.height)
    const s = PIN / side
    const cropX = (f.width - side) / 2
    const cropY = (f.height - side) / 2
    a(photo, [
      { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 28px)' },
      {
        transform: `translate(${pinLeft - f.left - cropX * s}px, ${pinTop - f.top - cropY * s}px) scale(${s})`,
        clipPath: `inset(${cropY}px ${cropX}px ${cropY}px ${cropX}px round ${26 / s}px)`,
      },
    ], { duration: SPRING.ms, delay: lift, easing: SPRING.easing })

    // 2 · Landing: ring draws in, tail drops, shadow widens, a light tap, text rises.
    a(ring, [{ opacity: 0, transform: 'scale(1.14)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, delay: land - 40, easing: EASE_OUT })
    a(tail, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, delay: land, easing: EASE_OUT })
    a(shadow, [{ opacity: 0, transform: 'scaleX(0.25)' }, { opacity: 1, transform: 'scaleX(1)' }], { duration: SPRING_SOFT.ms, delay: land, easing: SPRING_SOFT.easing })
    a(title, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, delay: land + 60, easing: EASE_OUT })
    a(area, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, delay: land + 110, easing: EASE_OUT })
    later(land, () => haptic('light'))

    // 3 · Fly home: the camera shows through, the pin shrinks into the places pill.
    out(text, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: home, easing: EASE_OUT })
    out(tail, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, delay: home, easing: EASE_OUT })
    out(shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, delay: home, easing: EASE_OUT })
    out(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: home, easing: EASE_OUT })
    out(group, [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 1, offset: 0.9 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.05)`, opacity: 0 },
    ], { duration: 360, delay: home + 20, easing: EASE_IN_OUT })

    // 4 · Arrival: the pill pulses and its count ticks up, with a second light tap.
    later(tick, () => {
      haptic('light')
      arrive()
      later(450, finish)
    })

    return () => timers.current.forEach(clearTimeout)
    // Runs once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl])

  const set = (k) => (el) => { r.current[k] = el }

  return (
    <main className="saved2" ref={root} onClick={finish}>
      <div className="saved2__backdrop" ref={set('backdrop')} />
      <div className="saved2__group" ref={set('group')} aria-hidden="true">
        <span className="saved2__shadow" ref={set('shadow')} />
        <span className="saved2__tail" ref={set('tail')} />
        <div className="saved2__photo" ref={set('photo')}
          style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined} />
        <div className="saved2__ring" ref={set('ring')} />
      </div>
      <div className="saved2__text" ref={set('text')} role="status">
        <p className="saved2__title" ref={set('title')}>{place?.title ? place.title : 'Saved'}</p>
        <p className="saved2__area" ref={set('area')}>
          {place?.area || (place?.lat != null ? 'Near your location' : 'No location')}
        </p>
      </div>
      <button type="button" className="sr-only" onClick={finish}>Back to camera</button>
    </main>
  )
}
