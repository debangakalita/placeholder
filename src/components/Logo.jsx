// The Placeholder wordmark: "placeholder" in Bricolage Grotesque Bold inside a dashed
// placeholder box, with a green dot pinned to its top-right corner.
// Plain text in the app font, so it stays sharp and needs nothing extra to load.
export default function Logo({ className = '' }) {
  return (
    <span className={`logo ${className}`} role="img" aria-label="placeholder">
      <span aria-hidden="true">placeholder</span>
      <span className="logo__dot" aria-hidden="true" />
    </span>
  )
}
