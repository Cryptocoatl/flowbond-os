'use client'
import { useState } from 'react'

interface LinkEditorProps {
  initialHref: string
  onSave:      (href: string, note: string) => void
  onClose:     () => void
  saving:      boolean
}

export function LinkEditor({ initialHref, onSave, onClose, saving }: LinkEditorProps) {
  const [href, setHref] = useState(initialHref)
  const [note, setNote] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://..." style={inputStyle} autoFocus />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Change note (optional)" style={{ ...inputStyle, fontSize: 12 }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={() => onSave(href, note)} disabled={saving} style={btnPrimary}>
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
