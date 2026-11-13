import { useCallback, useEffect, useRef } from 'react'

// Photos-app style paging for the Places viewer.
//
// One number, `pos`, drives everything: it is measured in places (2.5 = halfway between the
// 3rd and 4th place). The big photos and the filmstrip are both drawn from it, so they always
// move together. While a finger is down, pos follows it 1:1 (no easing). When the finger
// lifts, a spring carries pos to a whole place, starting at the speed the finger was moving.
// A spring can be caught mid-flight by touching again. Styles are written straight to the
// elements each frame, so React does not re-render while you drag.

const THUMB_W = 46
const THUMB_H = 62
const GROW_W = 14 // the middle thumbnail is 60 x 80
const GROW_H = 18
const STEP = THUMB_W + 8
const STRIP_H = 96

const PAGE = spring(0.34) // paging the big photo: settles in about a third of a second, no overshoot
const GLIDE = spring(0.5) // after flicking the filmstrip: a longer, softer settle

function spring(response) {
  const k = (2 * Math.PI / response) ** 2
  return { k, c: 2 * Math.sqrt(k) } // critically damped, like iOS paging
}

// iOS-style rubber band: the further past the end, the harder it pulls back.
const rubber = (over, dim) => Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / dim + 1)) * dim
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Finger speed in px per ms, from the last ~100 ms of movement.
function track(samples, x, t) {
  samples.push({ x, t })
  while (samples.length > 2 && t - samples[0].t > 100) samples.shift()
}
function speed(samples) {
  if (samples.length < 2) return 0
  const a = samples[0]
  const b = samples[samples.length - 1]
  return b.t - a.t > 0 ? (b.x - a.x) / (b.t - a.t) : 0
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useGallery({ count, enabled, onIndex, deckRef, stripRef }) {
  const s = useRef({
    pos: 0, vel: 0, target: 0, params: PAGE, raf: 0, last: 0,
    mode: 'deck', // 'deck' = big photos slide; 'strip' = filmstrip leads, big photo just swaps
    tapTarget: null, shown: 0, step: 320, stripW: 390,
    slides: new Map(), thumbs: new Map(),
    deckDrag: null, stripDrag: null, blockUntil: 0, stripMoved: false,
  }).current
  s.count = count
  s.enabled = enabled
  s.onIndex = onIndex

  const paint = useCallback(() => {
    const n = s.count
    if (!n) return
    const p = s.pos

    // Big photos
    for (const [i, el] of s.slides) {
      let x = 0
      let visible
      if (s.mode === 'strip') visible = i === s.shown
      else { x = (i - p) * s.step; visible = Math.abs(i - p) < 0.999 }
      el.style.transform = `translate3d(${x}px,0,0)`
      el.style.visibility = visible ? 'visible' : 'hidden'
    }

    // Filmstrip: the thumbnail(s) nearest pos grow smoothly; pos sits in the middle.
    const grow = (i) => Math.max(0, 1 - Math.abs(i - p))
    const a = Math.floor(p)
    const left = (i) => {
      let x = i * STEP
      for (const j of [a, a + 1]) if (j < i && j >= 0 && j < n) x += GROW_W * grow(j)
      return x
    }
    const center = (i) => left(i) + (THUMB_W + GROW_W * grow(i)) / 2
    let anchor
    if (p <= 0) anchor = center(0) + p * STEP
    else if (p >= n - 1) anchor = center(n - 1) + (p - (n - 1)) * STEP
    else anchor = center(a) + (center(a + 1) - center(a)) * (p - a)
    const shift = s.stripW / 2 - anchor
    const sel = clamp(Math.round(p), 0, n - 1)
    for (const [i, el] of s.thumbs) {
      const g = grow(i)
      const w = THUMB_W + GROW_W * g
      const h = THUMB_H + GROW_H * g
      const d = i - p
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      el.style.opacity = Math.max(0.35, 1 - Math.abs(d) * 0.18)
      el.style.transform =
        `translate3d(${left(i) + shift}px,${(STRIP_H - h) / 2}px,0) rotateY(${clamp(-d * 16, -42, 42)}deg)`
      el.classList.toggle('thumb--sel', i === sel)
    }
  }, [s])

  const sync = useCallback(() => {
    const i = s.mode === 'strip' && s.tapTarget !== null
      ? s.tapTarget
      : clamp(Math.round(s.pos), 0, Math.max(0, s.count - 1))
    if (i !== s.shown) {
      s.shown = i
      s.onIndex(i)
    }
  }, [s])

  const stop = useCallback(() => {
    const moving = !!s.raf
    cancelAnimationFrame(s.raf)
    s.raf = 0
    return moving
  }, [s])

  const frame = useCallback((now) => {
    let dt = Math.min(0.032, (now - s.last) / 1000)
    s.last = now
    const h = 1 / 480
    const { k, c } = s.params
    while (dt > 0) {
      const step = Math.min(h, dt)
      s.vel += (-k * (s.pos - s.target) - c * s.vel) * step
      s.pos += s.vel * step
      dt -= step
    }
    if (Math.abs(s.pos - s.target) < 0.0008 && Math.abs(s.vel) < 0.02) {
      s.pos = s.target
      s.vel = 0
      s.raf = 0
      s.tapTarget = null
    } else {
      s.raf = requestAnimationFrame(frame)
    }
    sync()
    paint()
  }, [s, sync, paint])

  // Let physics carry pos to `target`, starting at `vel` places per second.
  const release = useCallback((target, vel, params) => {
    stop()
    s.target = clamp(target, 0, Math.max(0, s.count - 1))
    if (reducedMotion()) {
      s.pos = s.target
      s.vel = 0
      s.tapTarget = null
      sync()
      paint()
      return
    }
    s.vel = vel
    s.params = params
    s.last = performance.now()
    s.raf = requestAnimationFrame(frame)
  }, [s, stop, sync, paint, frame])

  // Jump straight to a place, no animation (new place saved, delete, map pick).
  const jump = useCallback((i) => {
    stop()
    s.mode = 'deck'
    s.tapTarget = null
    s.pos = clamp(i, 0, Math.max(0, s.count - 1))
    s.vel = 0
    sync()
    paint()
  }, [s, stop, sync, paint])

  // Keep sizes in step with the screen.
  useEffect(() => {
    const deck = deckRef.current
    const strip = stripRef.current
    if (!deck || !strip) return
    const measure = () => {
      s.step = Math.round(deck.clientHeight * 0.75) + 20 // a photo's width plus a small gap
      s.stripW = strip.clientWidth
      paint()
    }
    const ro = new ResizeObserver(measure)
    ro.observe(deck)
    ro.observe(strip)
    measure()
    return () => ro.disconnect()
  }, [count > 0, deckRef, stripRef, paint, s])

  useEffect(() => () => cancelAnimationFrame(s.raf), [s])

  // If places were removed and pos is now past the end, settle on the last one.
  useEffect(() => {
    if (count && s.pos > count - 1) jump(count - 1)
  }, [count, jump, s])

  // --- Big photo gestures
  const deck = {
    onPointerDown: (e) => {
      if (!s.enabled || e.button > 0) return
      const caught = stop()
      if (s.mode === 'strip') { // the filmstrip was leading: continue from the photo on screen
        s.pos = s.shown
        s.tapTarget = null
        s.mode = 'deck'
        paint()
      }
      s.deckDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: s.pos, axis: null, caught, samples: [] }
      track(s.deckDrag.samples, e.clientX, e.timeStamp)
    },
    onPointerMove: (e) => {
      const d = s.deckDrag
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (d.axis === null) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (d.axis === 'x') e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      if (d.axis !== 'x') return
      track(d.samples, e.clientX, e.timeStamp)
      const last = s.count - 1
      let p = d.start - dx / s.step
      if (p < 0) p = rubber(p, 1)
      else if (p > last) p = last + rubber(p - last, 1)
      s.pos = p
      sync()
      paint()
    },
    onPointerUp: (e) => {
      const d = s.deckDrag
      s.deckDrag = null
      if (!d || d.id !== e.pointerId) return
      if (d.axis !== 'x') {
        // A tap that caught a moving photo only stops it; it does not also flip the card.
        if (d.caught) { s.blockUntil = performance.now() + 350; release(Math.round(s.pos), 0, PAGE) }
        return
      }
      s.blockUntil = performance.now() + 350
      track(d.samples, e.clientX, e.timeStamp)
      const v = speed(d.samples) // px per ms; negative = moving left = next place
      const base = Math.round(d.start)
      let target = Math.abs(v) > 0.25 ? base + (v < 0 ? 1 : -1) : Math.round(s.pos)
      target = clamp(target, base - 1, base + 1) // one photo per swipe, like Photos
      if (target !== base && target >= 0 && target < s.count) navigator.vibrate?.(6)
      release(target, (-v * 1000) / s.step, PAGE)
    },
  }
  deck.onPointerCancel = deck.onPointerUp

  // --- Filmstrip gestures
  const strip = {
    onPointerDown: (e) => {
      if (e.button > 0) return
      const caught = stop()
      if (caught && s.mode === 'deck') s.pos = Math.round(s.pos) // swap instead of sliding from here
      s.mode = 'strip'
      s.tapTarget = null
      s.stripDrag = { id: e.pointerId, x: e.clientX, start: s.pos, on: false, caught, samples: [] }
      track(s.stripDrag.samples, e.clientX, e.timeStamp)
      s.stripMoved = false
    },
    onPointerMove: (e) => {
      const d = s.stripDrag
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.x
      if (!d.on) {
        if (Math.abs(dx) < 6) return
        d.on = true
        s.stripMoved = true
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      track(d.samples, e.clientX, e.timeStamp)
      const last = s.count - 1
      let p = d.start - dx / STEP
      if (p < 0) p = rubber(p, 3)
      else if (p > last) p = last + rubber(p - last, 3)
      const before = s.shown
      s.pos = p
      sync()
      if (s.shown !== before) navigator.vibrate?.(3)
      paint()
    },
    onPointerUp: (e) => {
      const d = s.stripDrag
      s.stripDrag = null
      if (!d || d.id !== e.pointerId) return
      if (!d.on) {
        if (d.caught) release(Math.round(s.pos), 0, PAGE) // a tap on a thumbnail retargets this
        return
      }
      track(d.samples, e.clientX, e.timeStamp)
      const v = speed(d.samples)
      // A flick keeps gliding for a few places, then settles on the nearest one.
      const target = Math.round(s.pos - (v * 300) / STEP)
      release(target, (-v * 1000) / STEP, GLIDE)
      setTimeout(() => { s.stripMoved = false }, 60)
    },
  }
  strip.onPointerCancel = strip.onPointerUp

  const tapThumb = (i) => {
    if (s.stripMoved) return
    s.mode = 'strip'
    s.tapTarget = i
    sync()
    release(i, s.raf ? s.vel : 0, PAGE)
  }

  // The click that ends a swipe should not flip the card.
  const takeClickBlock = () => performance.now() < s.blockUntil

  const slideRef = (i) => (el) => { if (el) s.slides.set(i, el); else s.slides.delete(i) }
  const thumbRef = (i) => (el) => { if (el) s.thumbs.set(i, el); else s.thumbs.delete(i) }

  return { deck, strip, tapThumb, jump, paint, slideRef, thumbRef, takeClickBlock }
}
