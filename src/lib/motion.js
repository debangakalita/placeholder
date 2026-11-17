// Shared motion curves.
// A spring (Apple-style feel) written as a CSS linear() curve, so the browser runs it
// on its own animation thread. Older browsers get a strong ease-out instead.

export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)'

function makeSpring(response, damping) {
  const w = (2 * Math.PI) / response
  const z = damping
  const wd = w * Math.sqrt(1 - z * z)
  const x = (t) => 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
  let T = 0.05
  while (T < 3) { // settle time: stays within 0.1% from here on
    let ok = true
    for (let t = T; t < T + 0.3; t += 0.01) if (Math.abs(x(t) - 1) > 0.001) { ok = false; break }
    if (ok) break
    T += 0.01
  }
  const n = 48
  const pts = []
  for (let i = 0; i <= n; i++) pts.push(+x((i / n) * T).toFixed(4))
  pts[n] = 1
  return { easing: `linear(${pts.join(', ')})`, ms: Math.round(T * 1000) }
}

const linearOk = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)')

export function spring({ response = 0.5, damping = 0.8 } = {}) {
  return linearOk ? makeSpring(response, damping) : { easing: EASE_OUT, ms: Math.round(response * 1100) }
}

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
