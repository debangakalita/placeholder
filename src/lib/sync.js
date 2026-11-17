// Two-way backup between this phone and the cloud, for places and groups.
// The phone is always the first copy; the cloud catches up whenever there is internet.
// When the same thing changed in both places, the newer change wins.
import { supabase } from './supabase.js'
import {
  deleteGroup, deletePlace, getAllGroups, getAllPlaces, getGroup, getPlace, putGroup, putPlace,
} from './db.js'

const BUCKET = 'photos'
const updatedOf = (p) => p.updatedAt || p.createdAt

function placeRow(p, photoPath) {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title || '',
    note: p.note || '',
    tags: [], // tags were replaced by groups
    group_ids: p.groups || [],
    lat: p.lat,
    lng: p.lng,
    accuracy: p.accuracy,
    area: p.area,
    photo_path: photoPath,
    created_at: new Date(p.createdAt).toISOString(),
    updated_at: new Date(updatedOf(p)).toISOString(),
    deleted: false,
  }
}

function groupRow(g) {
  return {
    id: g.id,
    name: g.name || '',
    created_at: new Date(g.createdAt).toISOString(),
    updated_at: new Date(updatedOf(g)).toISOString(),
    deleted: !!g.deleted,
  }
}

// Marks something as backed up, unless it was edited again while uploading.
async function markSynced(get, put, id, pushedAt, extra = {}) {
  const fresh = await get(id)
  if (!fresh) return
  if (updatedOf(fresh) === pushedAt) await put({ ...fresh, ...extra, synced: true })
  else if (Object.keys(extra).length) await put({ ...fresh, ...extra })
}

async function pushGroups() {
  let left = 0
  for (const g of await getAllGroups()) {
    if (g.synced) continue
    try {
      await supabase.from('groups').upsert(groupRow(g)).throwOnError()
      if (g.deleted) await deleteGroup(g.id)
      else await markSynced(getGroup, putGroup, g.id, updatedOf(g))
    } catch {
      left++
    }
  }
  return left
}

async function pushPlaces(userId) {
  let left = 0
  for (const p of await getAllPlaces()) {
    if (p.synced) continue
    try {
      if (p.deleted) {
        await supabase.from('places').upsert({ ...placeRow(p, null), deleted: true, updated_at: new Date().toISOString() })
          .throwOnError()
        if (p.photoPath) await supabase.storage.from(BUCKET).remove([p.photoPath])
        await deletePlace(p.id)
        continue
      }
      let photoPath = p.photoPath || null
      if (p.photo && !photoPath) {
        const path = `${userId}/${p.id}.jpg`
        const { error } = await supabase.storage.from(BUCKET).upload(path, p.photo, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        photoPath = path
      }
      await supabase.from('places').upsert(placeRow(p, photoPath)).throwOnError()
      await markSynced(getPlace, putPlace, p.id, updatedOf(p), { photoPath })
    } catch {
      left++
    }
  }
  return left
}

async function pullGroups() {
  const { data: rows, error } = await supabase.from('groups').select('*')
  if (error) throw error
  let changed = false
  for (const row of rows) {
    const local = await getGroup(row.id)
    const rowUpdated = Date.parse(row.updated_at)
    if (row.deleted) {
      if (local) { await deleteGroup(row.id); changed = true }
      continue
    }
    if (local && updatedOf(local) >= rowUpdated) continue
    await putGroup({
      id: row.id,
      name: row.name,
      createdAt: Date.parse(row.created_at),
      updatedAt: rowUpdated,
      synced: true,
      deleted: false,
    })
    changed = true
  }
  return changed
}

async function pullPlaces() {
  const { data: rows, error } = await supabase.from('places').select('*')
  if (error) throw error
  let changed = false
  for (const row of rows) {
    const local = await getPlace(row.id)
    const rowUpdated = Date.parse(row.updated_at)

    if (row.deleted) {
      if (local) { await deletePlace(row.id); changed = true }
      continue
    }
    // Keep the phone's copy if it is the same age or newer.
    if (local && updatedOf(local) >= rowUpdated) continue

    let photo = local?.photo || null
    if (!photo && row.photo_path) {
      const { data } = await supabase.storage.from(BUCKET).download(row.photo_path)
      photo = data || null
    }
    await putPlace({
      id: row.id,
      kind: row.kind,
      title: row.title,
      note: row.note,
      groups: row.group_ids || [],
      lat: row.lat,
      lng: row.lng,
      accuracy: row.accuracy,
      area: row.area,
      photo,
      photoPath: row.photo_path,
      createdAt: Date.parse(row.created_at),
      updatedAt: rowUpdated,
      synced: true,
      deleted: false,
    })
    changed = true
  }
  return changed
}

// One full round: send local changes up (groups first), then bring the cloud's changes down.
// Returns { waiting: things still not backed up, changed: did the phone's lists change }
export async function syncOnce(userId) {
  const waiting = (await pushGroups()) + (await pushPlaces(userId))
  const groupsChanged = await pullGroups()
  const placesChanged = await pullPlaces()
  return { waiting, changed: groupsChanged || placesChanged }
}

export async function countWaiting() {
  const [places, groups] = await Promise.all([getAllPlaces(), getAllGroups()])
  return places.filter((p) => !p.synced).length + groups.filter((g) => !g.synced).length
}
