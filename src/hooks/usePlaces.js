import { useCallback, useEffect, useRef, useState } from 'react'
import { deletePlace, getAllPlaces, keepStorage, newId, putPlace } from '../lib/db.js'
import { areaName } from '../lib/geo.js'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [ready, setReady] = useState(false)
  const placesRef = useRef([])
  const filling = useRef(false)

  const commit = useCallback((list) => {
    placesRef.current = list
    setPlaces(list)
  }, [])

  const reload = useCallback(
    () => getAllPlaces().then((list) => { commit(list); return list }).catch(() => []),
    [commit]
  )

  // Change some fields of a place. The screen updates at once; the phone's storage follows.
  const update = useCallback(
    async (id, patch) => {
      const cur = placesRef.current.find((p) => p.id === id)
      if (!cur) return
      const next = { ...cur, ...patch, synced: false }
      commit(placesRef.current.map((p) => (p.id === id ? next : p)))
      await putPlace(next)
    },
    [commit]
  )

  const remove = useCallback(
    async (id) => {
      commit(placesRef.current.filter((p) => p.id !== id))
      await deletePlace(id)
    },
    [commit]
  )

  // Places saved offline have no area name yet; fill them in one by one when online.
  const fillAreas = useCallback(async () => {
    if (filling.current) return
    filling.current = true
    try {
      for (const p of [...placesRef.current]) {
        if (p.area || p.lat == null) continue
        const name = await areaName(p.lat, p.lng)
        if (name) await update(p.id, { area: name })
        await new Promise((r) => setTimeout(r, 1100)) // be polite to the free map service
      }
    } finally {
      filling.current = false
    }
  }, [update])

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
      commit([place, ...placesRef.current])
      await putPlace(place)
      return place
    },
    [commit]
  )

  return { places, ready, add, update, remove }
}
