import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllPlaces, keepStorage, newId, putPlace } from '../lib/db.js'
import { areaName } from '../lib/geo.js'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [ready, setReady] = useState(false)
  const filling = useRef(false)

  const reload = useCallback(
    () => getAllPlaces().then((list) => { setPlaces(list); return list }).catch(() => []),
    []
  )

  // Places saved offline have no area name yet; fill them in one by one when online.
  const fillAreas = useCallback(async () => {
    if (filling.current) return
    filling.current = true
    try {
      const list = await getAllPlaces()
      let changed = false
      for (const p of list) {
        if (p.area || p.lat == null) continue
        const name = await areaName(p.lat, p.lng)
        if (!name) continue
        await putPlace({ ...p, area: name })
        changed = true
        await new Promise((r) => setTimeout(r, 1100)) // be polite to the free map service
      }
      if (changed) await reload()
    } finally {
      filling.current = false
    }
  }, [reload])

  useEffect(() => {
    keepStorage()
    reload().then(() => { setReady(true); fillAreas() })
    window.addEventListener('online', fillAreas)
    return () => window.removeEventListener('online', fillAreas)
  }, [reload, fillAreas])

  const add = useCallback(
    async (data) => {
      const place = {
        id: newId(),
        createdAt: Date.now(),
        kind: 'photo',
        photo: null,
        title: '',
        note: '',
        tags: [],
        lat: null,
        lng: null,
        accuracy: null,
        area: null,
        synced: false,
        ...data,
      }
      await putPlace(place)
      await reload()
      return place
    },
    [reload]
  )

  return { places, ready, add }
}
