import { useEffect, useMemo, useRef, useState } from 'react'
import { groupStats, placesLabel } from '../lib/groups.js'
import { PinIcon } from '../components/Icons.jsx'

// All your groups, two per row, each with its newest photo as the cover.
export default function GroupsScreen({ groups, places, urls, onBack, onOpen, onCreate }) {
  const stats = useMemo(() => groupStats(groups, places), [groups, places])
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { if (naming) inputRef.current?.focus() }, [naming])

  const create = async () => {
    const g = await onCreate(name)
    setName('')
    setNaming(false)
    if (g) onOpen(g.id)
  }

  return (
    <div className="groupscreen">
      <header className="mapscreen__top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to places">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 className="mapscreen__title">Groups</h1>
        <span className="icon-btn" aria-hidden="true" />
      </header>

      <div className="groups" data-noswipe>
        {groups.length === 0 && !naming && (
          <p className="groups__hint">Make a group, like Cafes or Indiranagar. A place can be in more than one.</p>
        )}
        <div className="groups__grid">
          {groups.map((g) => {
            const s = stats[g.id] || { count: 0, cover: null }
            const cover = s.cover && urls[s.cover.id]
            return (
              <button key={g.id} type="button" className="gcard" onClick={() => onOpen(g.id)}>
                <span className={`gcard__cover${cover ? '' : ' gcard__cover--empty'}`}
                  style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                  {!cover && <PinIcon size={22} color="#6A6A6A" />}
                </span>
                <span className="gcard__name">{g.name}</span>
                <span className="gcard__count">{placesLabel(s.count)}</span>
              </button>
            )
          })}

          {naming ? (
            <form className="gcard" onSubmit={(e) => { e.preventDefault(); create() }}>
              <span className="gcard__cover gcard__cover--new">
                <label className="sr-only" htmlFor="new-group">Group name</label>
                <input id="new-group" ref={inputRef} className="gcard__input" value={name} maxLength={40}
                  placeholder="Group name" enterKeyHint="done" autoComplete="off"
                  onChange={(e) => setName(e.target.value)} />
                <button type="submit" className="picker__create" disabled={!name.trim()}>Create</button>
              </span>
              <button type="button" className="gcard__cancel" onClick={() => { setNaming(false); setName('') }}>Cancel</button>
            </form>
          ) : (
            <button type="button" className="gcard gcard--new" onClick={() => setNaming(true)}>
              <span className="gcard__cover gcard__cover--dashed">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2"
                  strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </span>
              <span className="gcard__name">New group</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
