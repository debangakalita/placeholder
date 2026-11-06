// Saves places on the phone itself (IndexedDB), so nothing needs the internet.
// A place: { id, createdAt, kind: 'photo' | 'pin', photo: Blob | null, title, note, tags[],
//            lat, lng, accuracy, area: string | null, synced: false }
const DB_NAME = 'placeholder'
const STORE = 'places'

let dbPromise
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const result = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(result?.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export const putPlace = (place) => run('readwrite', (s) => s.put(place))
export const deletePlace = (id) => run('readwrite', (s) => s.delete(id))
export const getAllPlaces = () =>
  run('readonly', (s) => s.getAll()).then((list) => (list || []).sort((a, b) => b.createdAt - a.createdAt))

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Ask the browser not to clear our saved places when the phone is low on space.
export function keepStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
