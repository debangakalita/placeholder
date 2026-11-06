import { useCallback, useEffect, useRef, useState } from 'react'
import { countWaiting, syncOnce } from '../lib/sync.js'

// Keeps the cloud backup up to date while signed in.
// status: 'off' (signed out) | 'syncing' | 'done' | 'offline' | 'error'
export function useSync({ user, edits, reload }) {
  const [status, setStatus] = useState('off')
  const [waiting, setWaiting] = useState(0)
  const running = useRef(false)
  const again = useRef(false)

  const run = useCallback(async () => {
    if (!user) return
    if (running.current) { again.current = true; return }
    if (!navigator.onLine) {
      setStatus('offline')
      setWaiting(await countWaiting())
      return
    }
    running.current = true
    setStatus('syncing')
    try {
      const { waiting: left, changed } = await syncOnce(user.id)
      if (changed) await reload()
      setWaiting(left)
      setStatus(left ? 'error' : 'done')
    } catch {
      setStatus('error')
      setWaiting(await countWaiting())
    } finally {
      running.current = false
      if (again.current) { again.current = false; run() }
    }
  }, [user, reload])

  // Run on sign-in, when the internet comes back, and when the app is opened again.
  useEffect(() => {
    if (!user) { setStatus('off'); return }
    run()
    const onVisible = () => !document.hidden && run()
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(run, 60000)
    return () => {
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [user, run])

  // Run shortly after every local change.
  useEffect(() => {
    if (!user || edits === 0) return
    const t = setTimeout(run, 1500)
    return () => clearTimeout(t)
  }, [edits, user, run])

  return { status, waiting, syncNow: run }
}
