import { useEffect, useState } from 'react'

// Tells us when the phone keyboard is open, and how tall the visible area is.
export function useKeyboard() {
  const [state, setState] = useState({ open: false, height: null })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const open = window.innerHeight - vv.height > 120
      setState({ open, height: Math.round(vv.height) })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
