import mark from '../assets/logo-wordmark.json'

// The Placeholder wordmark: lowercase "placeholder" in Fredoka SemiBold with the green
// spot as the "o". Drawn as vector shapes, so no extra font has to load.
export default function Logo({ height = 21, className }) {
  return (
    <svg
      className={className}
      viewBox={mark.viewBox}
      height={height}
      width={Math.round(height * mark.ratio)}
      role="img"
      aria-label="placeholder"
    >
      <path fill="currentColor" d={mark.letters} />
      <circle cx={mark.spot.cx} cy={mark.spot.cy} r={mark.spot.r} fill="var(--accent)" />
      <circle cx={mark.dot.cx} cy={mark.dot.cy} r={mark.dot.r} fill="#000000" />
    </svg>
  )
}
