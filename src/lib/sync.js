// Two-way backup between this phone and the cloud.
// The phone is always the first copy; the cloud catches up whenever there is internet.
import { supabase } from './supabase.js'
import { deletePlace, getAllPlaces, getPlace, putPlace } from './db.js'

const BUCKET = 'photos'
const updatedOf = (p) => p.updatedAt || p.createdAt

function toRow(p, photoPath) {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title || '',
    note: p.note || '',
    tags: p.tags || [],
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

// Marks a place as backed up, unless it was edited again while uploading.
async function markSynced(id, pushedAt, extra = {}) {
  const fresh = await getPlace(id)
  if (!fresh) return
  if (updatedOf(fresh) === pushedAt) await putPlace({ ...fresh, ...extra, synced: true })
  else if (Object.keys(extra).length) await putPlace({ ...fresh, ...extra })
}

async function push(userId) {
  const all = await getAllPlaces()
  let left = 0
  for (const p of all) {
    if (p.synced) continue
    try {
      if (p.deleted) {
        await supabase.from('places').upsert({ ...toRow(p, null), deleted: true, updated_at: new Date().toISOString() })
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
      await supabase.from('places').upsert(toRow(p, photoPath)).throwOnError()
      await markSynced(p.id, updatedOf(p), { photoPath })
    } catch {
      left++
    }
  }
  return left
}

async function pull() {
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
      tags: row.tags || [],
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

// One full round: send local changes up, then bring the cloud's changes down.
// Returns { waiting: number of places still not backed up, changed: did the phone's list change }
export async function syncOnce(userId) {
  const waitingAfterPush = await push(userId)
  const changed = await pull()
  return { waiting: waitingAfterPush, changed }
}

export async function countWaiting() {
  const all = await getAllPlaces()
  return all.filter((p) => !p.synced).length
}
