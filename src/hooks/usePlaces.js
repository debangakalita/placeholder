import { useCallback, useEffect, useRef, useState } from 'react'
import { clearPlaces, getAllPlaces, keepStorage, newId, putPlace } from '../lib/db.js'
import { areaName } from '../lib/geo.js'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [ready, setReady] = useState(false)
  const [edits, setEdits] = useState(0) // goes up on every local change, so backup knows to run
  const placesRef = useRef([])
  const filling = useRef(false)

  const commit = useCallback((list) => {
    placesRef.current = list
    setPlaces(list)
  }, [])

  // Places marked deleted are kept only until the cloud hears about it; never show them.
  const reload = useCallback(
    () => getAllPlaces()
      .then((list) => { const shown = list.filter((p) => !p.deleted); commit(shown); return shown })
      .catch(() => []),
    [commit]
  )

  const save = useCallback(async (place) => {
    await putPlace(place)
    setEdits((n) => n + 1)
  }, [])

  // Change some fields of a place. The screen updates at once; the phone's storage follows.
  const update = useCallback(
    async (id, patch) => {
      const cur = placesRef.current.find((p) => p.id === id)
      if (!cur) return
      const next = { ...cur, ...patch, updatedAt: Date.now(), synced: false }
      commit(placesRef.current.map((p) => (p.id === id ? next : p)))
      await save(next)
    },
    [commit, save]
  )

  const remove = useCallback(
    async (id) => {
      const cur = placesRef.current.find((p) => p.id === id)
      if (!cur) return
      commit(placesRef.current.filter((p) => p.id !== id))
      await save({ ...cur, photo: null, deleted: true, synced: false, updatedAt: Date.now() })
    },
    [commit, save]
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
      const now = Date.now()
      const place = {
        id: newId(),
        createdAt: now,
        updatedAt: now,
        kind: 'photo',
        photo: null,
        photoPath: null,
        title: '',
        note: '',
        tags: [],
        lat: null,
        lng: null,
        accuracy: null,
        area: null,
        synced: false,
        deleted: false,
        ...data,
      }
      commit([place, ...placesRef.current])
      await save(place)
      return place
    },
    [commit, save]
  )

  // Used when signing out: this phone forgets everything (the cloud keeps it).
  const forgetAll = useCallback(async () => {
    await clearPlaces()
    commit([])
  }, [commit])

  return { places, ready, edits, add, update, remove, reload, forgetAll }
}
