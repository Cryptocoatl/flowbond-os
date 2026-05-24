'use client'
import { useFlowEdit } from '../context'
import type { ContentOverride } from '../types'

/** Returns all currently loaded overrides as a flat array. */
export function useAllOverrides(): ContentOverride[] {
  const { overrides } = useFlowEdit()
  return Array.from(overrides.values())
}

/** Returns overrides scoped to a specific path prefix. */
export function usePathOverrides(pathPrefix: string): ContentOverride[] {
  const { overrides } = useFlowEdit()
  return Array.from(overrides.values()).filter((o) => o.path.startsWith(pathPrefix))
}
