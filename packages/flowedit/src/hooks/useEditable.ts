'use client'
import { useFlowEdit } from '../context'
import type { ContentOverride, CreateOverrideInput } from '../types'

export interface UseEditableResult {
  /** The active override record, or undefined if no override exists. */
  override:    ContentOverride | undefined
  /** The resolved value for this field (override → default). */
  value:       string | undefined
  isEditMode:  boolean
  /** Save a new draft override for this path+field. */
  save:        (value: Record<string, unknown>, note?: string) => Promise<ContentOverride>
  /** Data attributes to spread onto the editable DOM element. */
  dataAttrs:   Record<string, string>
}

export function useEditable(path: string, field = 'text'): UseEditableResult {
  const { overrides, isEditMode, saveOverride } = useFlowEdit()

  const key      = `${path}:${field}`
  const override = overrides.get(key)
  const rawValue = override?.value?.[field]
  const value    = rawValue !== undefined ? String(rawValue) : undefined

  const dataAttrs: Record<string, string> = {
    'data-fe-path':  path,
    'data-fe-field': field,
  }
  if (isEditMode) dataAttrs['data-fe-edit'] = 'true'

  const save = (val: Record<string, unknown>, note?: string) =>
    saveOverride({ path, field, value: val, ...(note ? { changeNote: note } : {}) } satisfies CreateOverrideInput)

  return { override, value, isEditMode, save, dataAttrs }
}
