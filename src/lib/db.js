// Saves places and groups on the phone itself (IndexedDB), so nothing needs the internet.
// A place: { id, createdAt, updatedAt, kind: 'photo' | 'pin', photo: Blob | null, photoPath,
//            title, note, groups: [group ids], lat, lng, accuracy, area: string | null,
//            synced: boolean (backed up to the cloud), deleted: boolean (waiting to be removed from the cloud) }
// A group: { id, name, createdAt, updatedAt, synced, deleted }
// (Old places may still carry a `tags` list; tags were replaced by groups and are ignored.)
const DB_NAME = 'placeholder'
const PLACES = 'places'
const GROUPS = 'groups'

let dbPromise
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(PLACES)) db.createObjectStore(PLACES, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(GROUPS)) db.createObjectStore(GROUPS, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const result = fn(tx.objectStore(store))
        tx.oncomplete = () => resolve(result?.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export const putPlace = (place) => run(PLACES, 'readwrite', (s) => s.put(place))
export const getPlace = (id) => run(PLACES, 'readonly', (s) => s.get(id))
export const clearPlaces = () => run(PLACES, 'readwrite', (s) => s.clear())
export const deletePlace = (id) => run(PLACES, 'readwrite', (s) => s.delete(id))
export const getAllPlaces = () =>
  run(PLACES, 'readonly', (s) => s.getAll()).then((list) => (list || []).sort((a, b) => b.createdAt - a.createdAt))

export const putGroup = (group) => run(GROUPS, 'readwrite', (s) => s.put(group))
export const getGroup = (id) => run(GROUPS, 'readonly', (s) => s.get(id))
export const clearGroups = () => run(GROUPS, 'readwrite', (s) => s.clear())
export const deleteGroup = (id) => run(GROUPS, 'readwrite', (s) => s.delete(id))
// Groups, oldest first, so the list stays in the order you made them.
export const getAllGroups = () =>
  run(GROUPS, 'readonly', (s) => s.getAll()).then((list) => (list || []).sort((a, b) => a.createdAt - b.createdAt))

// A random UUID (the cloud's id columns need one). Older phones without randomUUID get one built by hand.
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// Ask the browser not to clear our saved places when the phone is low on space.
export function keepStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
