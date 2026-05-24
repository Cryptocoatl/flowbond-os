'use client'
import { useState, useEffect } from 'react'
import { createPortal }        from 'react-dom'
import { useFlowEdit }         from '../context'
import { TextEditor }          from './editors/TextEditor'
import { ImageEditor }         from './editors/ImageEditor'
import { LinkEditor }          from './editors/LinkEditor'
import { StyleEditor }         from './editors/StyleEditor'
import type { Selection }      from './useSelection'

interface PanelProps {
  selection: Selection
  onClose:   () => void
}

const PANEL_WIDTH  = 340
const PANEL_OFFSET = 12

export function Panel({ selection, onClose }: PanelProps) {
  const { overrides, saveOverride } = useFlowEdit()
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const key      = `${selection.path}:${selection.field}`
  const existing = overrides.get(key)

  // Position the panel near the selected element
  const { rect } = selection
  const spaceBelow = window.innerHeight - rect.bottom
  const top        = spaceBelow > 320
    ? rect.bottom + PANEL_OFFSET + window.scrollY
    : rect.top - PANEL_OFFSET + window.scrollY - 320  // approx panel height
  const left = Math.min(
    rect.left + window.scrollX,
    window.innerWidth - PANEL_WIDTH - 16,
  )

  async function handleSave(value: Record<string, unknown>, note?: string) {
    setSaving(true)
    try {
      await saveOverride({ path: selection.path, field: selection.field, value, ...(note ? { changeNote: note } : {}) })
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } finally {
      setSaving(false)
    }
  }

  const fieldLabel: Record<string, string> = {
    text: 'Text', src: 'Image', href: 'Link', alt: 'Alt text', style: 'Style',
  }

  if (!mounted) return null

  const panel = (
    <div
      style={{
        position: 'absolute', top, left,
        width: PANEL_WIDTH, zIndex: 99999,
        background: '#fff', borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1.5px 4px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14, color: '#111',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #f3f4f6',
        background: '#18181b', borderRadius: '10px 10px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            FlowEdit · {fieldLabel[selection.field] ?? selection.field}
          </span>
          <div style={{ color: '#e5e7eb', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }}>
            {selection.path}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>

      {/* Editor */}
      <div style={{ padding: 14 }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#16a34a', fontWeight: 600 }}>
            ✓ Draft saved
          </div>
        ) : selection.field === 'text' ? (
          <TextEditor
            initial={existing?.value?.text as string ?? selection.el.textContent ?? ''}
            onSave={(text, note) => handleSave({ text }, note)}
            onClose={onClose} saving={saving}
          />
        ) : selection.field === 'src' ? (
          <ImageEditor
            initialSrc={existing?.value?.src as string ?? (selection.el as HTMLImageElement).src ?? ''}
            initialAlt={existing?.value?.alt as string ?? (selection.el as HTMLImageElement).alt ?? ''}
            onSave={(src, alt, note) => handleSave({ src, alt }, note)}
            onClose={onClose} saving={saving}
          />
        ) : selection.field === 'href' ? (
          <LinkEditor
            initialHref={existing?.value?.href as string ?? (selection.el as HTMLAnchorElement).href ?? ''}
            onSave={(href, note) => handleSave({ href }, note)}
            onClose={onClose} saving={saving}
          />
        ) : selection.field === 'style' ? (
          <StyleEditor
            initialStyle={existing?.value?.style as Record<string, string> ?? {}}
            onSave={(style, note) => handleSave({ style }, note)}
            onClose={onClose} saving={saving}
          />
        ) : null}
      </div>

      {/* Status badge */}
      {existing && (
        <div style={{ padding: '6px 14px 10px', borderTop: '1px solid #f3f4f6' }}>
          <StatusBadge status={existing.status} />
        </div>
      )}
    </div>
  )

  return createPortal(panel, document.body)
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    draft:    ['#fef3c7', '#92400e'],
    pending:  ['#dbeafe', '#1d4ed8'],
    approved: ['#d1fae5', '#065f46'],
    rejected: ['#fee2e2', '#991b1b'],
    live:     ['#dcfce7', '#15803d'],
  }
  const [bg, text] = colors[status] ?? ['#f3f4f6', '#374151']
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: bg, color: text, fontWeight: 600 }}>
      {status}
    </span>
  )
}
