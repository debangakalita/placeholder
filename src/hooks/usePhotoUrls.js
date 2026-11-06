import { useEffect, useRef } from 'react'

// Gives each saved photo a link the page can show. Links are reused, so photos don't flicker.
export function usePhotoUrls(places) {
  const cache = useRef(new Map())
  const urls = {}
  const live = new Set()

  for (const p of places) {
    live.add(p.id)
    if (!p.photo) continue
    if (!cache.current.has(p.id)) cache.current.set(p.id, URL.createObjectURL(p.photo))
    urls[p.id] = cache.current.get(p.id)
  }
  for (const [id, url] of cache.current) {
    if (!live.has(id)) {
      URL.revokeObjectURL(url)
      cache.current.delete(id)
    }
  }

  useEffect(() => {
    const map = cache.current
    return () => { map.forEach((u) => URL.revokeObjectURL(u)); map.clear() }
  }, [])

  return urls
}
