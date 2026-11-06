import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../config.js'

let scriptPromise
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = resolve
      s.onerror = () => { scriptPromise = null; reject(new Error('Google did not load')) }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

// Google's own "Continue with Google" button. It opens a small Google window
// and hands back a signed token, so the app never leaves the page.
export default function GoogleButton({ onToken, width = 260, compact = false }) {
  const box = useRef(null)
  const tokenRef = useRef(onToken)
  tokenRef.current = onToken
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await loadGoogle()
        const nonce = await makeNonce()
        if (!alive || !box.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          itp_support: true,
          use_fedcm_for_button: true,
          callback: (res) => tokenRef.current(res.credential, nonce.raw),
        })
        box.current.innerHTML = ''
        window.google.accounts.id.renderButton(box.current, {
          theme: 'filled_black', shape: 'pill',
          ...(compact ? { size: 'medium', text: 'signin' } : { size: 'large', text: 'continue_with', width }),
        })
      } catch {
        if (alive) setError('Could not reach Google. Check your internet and try again.')
      }
    })()
    return () => { alive = false }
  }, [width, compact])

  return (
    <div className="gbtn">
      <div ref={box} className="gbtn__slot" />
      {error && <p className="gbtn__error" role="alert">{error}</p>}
    </div>
  )
}
