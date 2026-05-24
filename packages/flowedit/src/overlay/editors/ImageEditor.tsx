'use client'
import { useState } from 'react'

interface ImageEditorProps {
  initialSrc: string
  initialAlt: string
  onSave:     (src: string, alt: string, note: string) => void
  onClose:    () => void
  saving:     boolean
}

export function ImageEditor({ initialSrc, initialAlt, onSave, onClose, saving }: ImageEditorProps) {
  const [src,  setSrc]  = useState(initialSrc)
  const [alt,  setAlt]  = useState(initialAlt)
  const [note, setNote] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {src && (
        <img
          src={src} alt={alt}
          style={{ maxHeight: 100, borderRadius: 6, objectFit: 'cover', border: '1px solid #e5e7eb' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Image URL" style={inputStyle} autoFocus />
      <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text" style={inputStyle} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Change note (optional)" style={{ ...inputStyle, fontSize: 12 }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={() => onSave(src, alt, note)} disabled={saving} style={btnPrimary}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: '#18181b', color: '#fff', fontSize: 13, fontWeight: 600,
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6, border: '1px solid #d1d5db',
  cursor: 'pointer', background: '#fff', fontSize: 13, color: '#374151',
}
