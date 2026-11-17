import { useCallback, useEffect, useRef, useState } from 'react'
import { clearGroups, clearPlaces, getAllGroups, getAllPlaces, keepStorage, newId, putGroup, putPlace } from '../lib/db.js'
import { areaName } from '../lib/geo.js'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [groups, setGroups] = useState([])
  const groupsRef = useRef([])
  const [ready, setReady] = useState(false)
  const [edits, setEdits] = useState(0) // goes up on every local change, so backup knows to run
  const placesRef = useRef([])
  const filling = useRef(false)

  const commit = useCallback((list) => {
    placesRef.current = list
    setPlaces(list)
  }, [])

  const commitGroups = useCallback((list) => {
    groupsRef.current = list
    setGroups(list)
  }, [])

  // Things marked deleted are kept only until the cloud hears about it; never show them.
  const reload = useCallback(
    () => Promise.all([getAllPlaces(), getAllGroups()])
      .then(([list, gs]) => {
        commitGroups(gs.filter((g) => !g.deleted))
        const shown = list.filter((p) => !p.deleted)
        commit(shown)
        return shown
      })
      .catch(() => []),
    [commit, commitGroups]
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
        groups: [],
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

  // --- Groups
  // Make a group (or return the one that already has this name, ignoring capitals).
  const addGroup = useCallback(async (rawName) => {
    const name = rawName.trim().slice(0, 40)
    if (!name) return null
    const same = groupsRef.current.find((g) => g.name.toLowerCase() === name.toLowerCase())
    if (same) return same
    const now = Date.now()
    const group = { id: newId(), name, createdAt: now, updatedAt: now, synced: false, deleted: false }
    commitGroups([...groupsRef.current, group])
    await putGroup(group)
    setEdits((n) => n + 1)
    return group
  }, [commitGroups])

  const renameGroup = useCallback(async (id, rawName) => {
    const name = rawName.trim().slice(0, 40)
    const cur = groupsRef.current.find((g) => g.id === id)
    if (!cur || !name || name === cur.name) return
    const next = { ...cur, name, updatedAt: Date.now(), synced: false }
    commitGroups(groupsRef.current.map((g) => (g.id === id ? next : g)))
    await putGroup(next)
    setEdits((n) => n + 1)
  }, [commitGroups])

  // Deleting a group never deletes its places; they just leave the group.
  const removeGroup = useCallback(async (id) => {
    const cur = groupsRef.current.find((g) => g.id === id)
    if (!cur) return
    commitGroups(groupsRef.current.filter((g) => g.id !== id))
    await putGroup({ ...cur, deleted: true, synced: false, updatedAt: Date.now() })
    for (const p of placesRef.current) {
      if (p.groups?.includes(id)) await update(p.id, { groups: p.groups.filter((g) => g !== id) })
    }
    setEdits((n) => n + 1)
  }, [commitGroups, update])

  // Used when signing out: this phone forgets everything (the cloud keeps it).
  const forgetAll = useCallback(async () => {
    await Promise.all([clearPlaces(), clearGroups()])
    commit([])
    commitGroups([])
  }, [commit, commitGroups])

  return {
    places, groups, ready, edits, add, update, remove, reload, forgetAll,
    addGroup, renameGroup, removeGroup,
  }
}
