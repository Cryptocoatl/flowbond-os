'use client'
import { useState, useEffect } from 'react'

export interface Selection {
  el:    HTMLElement
  rect:  DOMRect
  path:  string
  field: string
}

export function useSelection(isEditMode: boolean) {
  const [selection, setSelection] = useState<Selection | null>(null)

  useEffect(() => {
    if (!isEditMode) {
      setSelection(null)
      return
    }

    function onClick(e: MouseEvent) {
      const target   = e.target as HTMLElement
      const editable = target.closest('[data-fe-edit="true"]') as HTMLElement | null

      if (!editable) {
        setSelection(null)
        return
      }

      e.preventDefault()
      e.stopPropagation()

      setSelection({
        el:    editable,
        rect:  editable.getBoundingClientRect(),
        path:  editable.dataset.fePath  ?? '',
        field: editable.dataset.feField ?? 'text',
      })
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelection(null)
    }

    // capture phase so we intercept before native link/button handlers
    document.addEventListener('click',   onClick,   true)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('click',   onClick,   true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isEditMode])

  return { selection, setSelection, clear: () => setSelection(null) }
}
