import { useEffect, useMemo, useRef, useState } from 'react'
import { haptic } from '../lib/haptics.js'
import { PinIcon } from '../components/Icons.jsx'
import GroupPicker from '../components/GroupPicker.jsx'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { areaName } from '../lib/geo.js'
import { groupNames } from '../lib/groups.js'

export default function PreviewScreen({ photo, coords, groups, places, onCreateGroup, onRetake, onSave }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState([]) // group ids
  const [picking, setPicking] = useState(false)
  const [area, setArea] = useState(null)
  const [saving, setSaving] = useState(false)
  const keyboard = useKeyboard()

  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  // On save the photo URL is handed to the Saved screen (same image, no reload flash).
  const handedOff = useRef(false)
  useEffect(() => () => { if (url && !handedOff.current) URL.revokeObjectURL(url) }, [url])
  const photoRef = useRef(null)

  useEffect(() => {
    let alive = true
    areaName(coords?.lat, coords?.lng).then((name) => alive && setArea(name))
    return () => { alive = false }
  }, [coords?.lat, coords?.lng])

  const save = async () => {
    if (saving) return
    setSaving(true)
    haptic('medium')
    const fromRect = photoRef.current?.getBoundingClientRect()
    handedOff.current = true
    await onSave({ title: title.trim(), note: note.trim(), groups: picked, area, fromRect, photoUrl: url })
  }

  const chosen = groupNames(picked, groups)
  const locationText = !coords ? 'No location yet' : area || 'Near your location'

  return (
    <main
      className={`preview${keyboard.open ? ' preview--typing' : ''}${saving ? ' preview--saving' : ''}`}
      style={keyboard.open && keyboard.height ? { height: `${keyboard.height}px` } : undefined}
    >
      <div className="preview__media">
        <div className="preview__photo" ref={photoRef} style={url ? { backgroundImage: `url(${url})` } : undefined} role="img" aria-label="Your photo" />
        <button type="button" className="retake" onClick={onRetake} aria-label="Retake">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2"
            strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <p className="preview__where">
        <PinIcon size={14} color="var(--accent)" />
        {locationText}
      </p>

      <label className="sr-only" htmlFor="ph-title">Title</label>
      <input
        id="ph-title"
        className="preview__title"
        type="text"
        placeholder="Add a title"
        value={title}
        maxLength={80}
        enterKeyHint="next"
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="sr-only" htmlFor="ph-note">Note</label>
      <textarea
        id="ph-note"
        className="preview__note"
        rows={2}
        placeholder="Add a note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {chosen.length > 0 && (
        <div className="gpills preview__groups" role="group" aria-label="Groups">
          {chosen.map((g) => (
            <button key={g.id} type="button" className="gpill" onClick={() => setPicking(true)}>{g.name}</button>
          ))}
        </div>
      )}

      <div className="preview__bar">
        <button type="button" className="groups-btn" onClick={() => setPicking(true)}
          aria-label={chosen.length ? 'Change groups' : 'Add to groups'}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
            strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" className="save-btn" onClick={save} disabled={saving}>Save</button>
      </div>

      {picking && (
        <GroupPicker
          groups={groups}
          places={places}
          selected={picked}
          onChange={setPicked}
          onCreate={onCreateGroup}
          onClose={() => setPicking(false)}
        />
      )}
    </main>
  )
}
