'use client'
import { useState } from 'react'

interface StyleEditorProps {
  initialStyle: Record<string, string>
  onSave:       (style: Record<string, string>, note: string) => void
  onClose:      () => void
  saving:       boolean
}

const FONT_FAMILIES = ['inherit', 'system-ui', 'Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'monospace']
const FONT_WEIGHTS  = ['300', '400', '500', '600', '700', '800']

export function StyleEditor({ initialStyle, onSave, onClose, saving }: StyleEditorProps) {
  const [style, setStyle] = useState<Record<string, string>>({
    fontSize:   initialStyle.fontSize   ?? '',
    color:      initialStyle.color      ?? '',
    fontFamily: initialStyle.fontFamily ?? 'inherit',
    fontWeight: initialStyle.fontWeight ?? '400',
    ...initialStyle,
  })
  const [note, setNote] = useState('')

  const update = (key: string, val: string) => setStyle((s) => ({ ...s, [key]: val }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={labelStyle}>
          Font size
          <input
            value={style.fontSize} onChange={(e) => update('fontSize', e.target.value)}
            placeholder="e.g. 16px or 1rem" style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Color
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={style.color || '#000000'} onChange={(e) => update('color', e.target.value)}
              style={{ width: 36, height: 34, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
            <input value={style.color} onChange={(e) => update('color', e.target.value)}
              placeholder="#000000" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </label>
        <label style={labelStyle}>
          Font family
          <select value={style.fontFamily} onChange={(e) => update('fontFamily', e.target.value)} style={inputStyle}>
            {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Font weight
          <select value={style.fontWeight} onChange={(e) => update('fontWeight', e.target.value)} style={inputStyle}>
            {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Change note (optional)" style={{ ...inputStyle, fontSize: 12 }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={() => onSave(style, note)} disabled={saving} style={btnPrimary}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: '#18181b', color: '#fff', fontSize: 13, fontWeight: 600,
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6, border: '1px solid #d1d5db',
  cursor: 'pointer', background: '#fff', fontSize: 13, color: '#374151',
}
