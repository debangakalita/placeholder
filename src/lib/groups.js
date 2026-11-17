// Facts about each group, worked out from the places list (which is newest first).
// Returns { [groupId]: { count, cover } } where cover is the newest place in it that has a photo.
export function groupStats(groups, places) {
  const stats = {}
  for (const g of groups) stats[g.id] = { count: 0, cover: null }
  for (const p of places) {
    for (const id of p.groups || []) {
      const s = stats[id]
      if (!s) continue
      s.count++
      if (!s.cover && p.photo && p.kind !== 'pin') s.cover = p
    }
  }
  return stats
}

export const placesLabel = (n) => `${n} ${n === 1 ? 'place' : 'places'}`

// Group names for a place, in the order the groups were made (unknown ids are skipped).
export function groupNames(ids, groups) {
  const set = new Set(ids || [])
  return groups.filter((g) => set.has(g.id))
}
