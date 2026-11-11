import { useEffect, useMemo, useState } from 'react'
import { PinIcon } from '../components/Icons.jsx'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { areaName } from '../lib/geo.js'

export default function PreviewScreen({ photo, coords, onRetake, onSave }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [area, setArea] = useState(null)
  const [saving, setSaving] = useState(false)
  const keyboard = useKeyboard()

  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  useEffect(() => {
    let alive = true
    areaName(coords?.lat, coords?.lng).then((name) => alive && setArea(name))
    return () => { alive = false }
  }, [coords?.lat, coords?.lng])

  const remove = (tag) => setPicked((p) => p.filter((t) => t !== tag))

  const addCustom = () => {
    const tag = draft.trim().toLowerCase()
    setDraft('')
    setAdding(false)
    if (!tag) return
    setPicked((p) => (p.includes(tag) ? p : [...p, tag]))
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    await onSave({ title: title.trim(), note: note.trim(), tags: picked, area })
  }

  const locationText = !coords ? 'No location yet' : area || 'Near your location'

  return (
    <main
      className={`preview${keyboard.open ? ' preview--typing' : ''}`}
      style={keyboard.open && keyboard.height ? { height: `${keyboard.height}px` } : undefined}
    >
      <div className="preview__photo" style={url ? { backgroundImage: `url(${url})` } : undefined} role="img" aria-label="Your photo" />

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

      <div className="preview__tags" role="group" aria-label="Tags">
        {picked.map((tag) => (
          <button key={tag} type="button" className="tag tag--on" aria-label={`Remove tag ${tag}`} onClick={() => remove(tag)}>
            {tag}<span aria-hidden="true"> ×</span>
          </button>
        ))}
        {adding ? (
          <input
            className="tag tag--input"
            autoFocus
            value={draft}
            maxLength={24}
            placeholder="new tag"
            aria-label="New tag"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={addCustom}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <button type="button" className="tag" onClick={() => setAdding(true)}>+ tag</button>
        )}
      </div>

      <div className="preview__bar">
        <button type="button" className="retake" onClick={onRetake}>
          <span className="retake__circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v5h5" />
            </svg>
          </span>
          Retake
        </button>
        <button type="button" className="save-btn" onClick={save} disabled={saving}>Save</button>
      </div>
    </main>
  )
}
