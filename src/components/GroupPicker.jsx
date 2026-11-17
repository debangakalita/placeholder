import { useEffect, useMemo, useRef, useState } from 'react'
import { usePhotoUrls } from '../hooks/usePhotoUrls.js'
import { groupStats, placesLabel } from '../lib/groups.js'
import { haptic } from '../lib/haptics.js'

const Plus = ({ color = '#A3A3A3', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

// Keeps the sheet above the phone keyboard while typing a new group's name.
function useKeyboardLift() {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setLift(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])
  return lift
}

// The "Add to groups" sheet. Ticking a group changes `selected` straight away; Done just closes.
export default function GroupPicker({ groups, places, selected, onChange, onCreate, onClose }) {
  const [naming, setNaming] = useState(groups.length === 0)
  const [name, setName] = useState('')
  const inputRef = useRef(null)
  const lift = useKeyboardLift()

  const stats = useMemo(() => groupStats(groups, places), [groups, places])
  const covers = useMemo(() => groups.map((g) => stats[g.id]?.cover).filter(Boolean), [groups, stats])
  const urls = usePhotoUrls(covers)

  useEffect(() => { if (naming) inputRef.current?.focus() }, [naming])

  const toggle = (id) => {
    haptic('light')
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const create = async () => {
    const group = await onCreate(name)
    setName('')
    setNaming(false)
    if (group && !selected.includes(group.id)) onChange([...selected, group.id])
    if (group) haptic('medium')
  }

  return (
    <div className="picker" data-noswipe>
      <button type="button" className="picker__scrim" aria-label="Close" onClick={onClose} />
      <div className="picker__sheet" role="dialog" aria-modal="true" aria-label="Add to groups" style={lift ? { bottom: lift } : undefined}>
        <span className="picker__grabber" aria-hidden="true" />
        <h2 className="picker__title">Add to groups</h2>
        {groups.length === 0 && (
          <p className="picker__hint">Groups keep places together, like Cafes or Indiranagar. A place can be in more than one.</p>
        )}

        <div className="picker__list">
          {naming ? (
            <form className="picker__new" onSubmit={(e) => { e.preventDefault(); create() }}>
              <span className="picker__thumb picker__thumb--dashed"><Plus /></span>
              <label className="sr-only" htmlFor="group-name">Group name</label>
              <input
                id="group-name"
                ref={inputRef}
                className="picker__input"
                value={name}
                maxLength={40}
                placeholder="Group name"
                enterKeyHint="done"
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="picker__create" disabled={!name.trim()}>Create</button>
            </form>
          ) : (
            <button type="button" className="picker__row picker__row--new" onClick={() => setNaming(true)}>
              <span className="picker__thumb picker__thumb--dashed"><Plus /></span>
              New group
            </button>
          )}

          {groups.map((g) => {
            const on = selected.includes(g.id)
            const s = stats[g.id] || { count: 0 }
            const cover = s.cover && urls[s.cover.id]
            return (
              <button key={g.id} type="button" role="checkbox" aria-checked={on} className="picker__row" onClick={() => toggle(g.id)}>
                <span
                  className={`picker__thumb${cover ? '' : ' picker__thumb--empty'}`}
                  style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                />
                <span className="picker__text">
                  <span className="picker__name">{g.name}</span>
                  <span className="picker__count">{placesLabel(s.count)}</span>
                </span>
                <span className={`picker__check${on ? ' picker__check--on' : ''}`} aria-hidden="true">
                  {on && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {groups.length > 0 && <button type="button" className="picker__done" onClick={onClose}>Done</button>}
      </div>
    </div>
  )
}
