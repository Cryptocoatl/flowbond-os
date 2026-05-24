'use client'
import { useEffect } from 'react'
import { useFlowEdit } from '../context'

export function EditModeToggle() {
  const { isEditMode, setEditMode } = useFlowEdit()

  // Keyboard shortcut: Cmd+E / Ctrl+E
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        setEditMode(!isEditMode)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isEditMode, setEditMode])

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      zIndex: 99998,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <button
        onClick={() => setEditMode(!isEditMode)}
        title={`${isEditMode ? 'Exit' : 'Enter'} edit mode (⌘E)`}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: isEditMode ? '#18181b' : '#fff',
          color: isEditMode ? '#fff' : '#18181b',
          border: '1.5px solid #18181b',
          borderRadius: 99, cursor: 'pointer',
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isEditMode ? '#4ade80' : '#d1d5db',
          flexShrink: 0,
          boxShadow: isEditMode ? '0 0 6px #4ade80' : 'none',
          transition: 'all 0.15s ease',
        }} />
        {isEditMode ? 'Editing' : 'FlowEdit'}
      </button>
    </div>
  )
}
