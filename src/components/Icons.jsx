export function PinIcon({ size = 22, color = 'currentColor', withDot = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      {withDot && <circle cx="12" cy="9.5" r="2.5" />}
    </svg>
  )
}
