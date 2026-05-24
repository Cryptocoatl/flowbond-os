'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { FlowEditContext }  from './context'
import { FlowEditClient }   from './client'
import { FlowEditOverlay }  from './overlay'
import type { ContentOverride, CreateOverrideInput } from './types'

interface FlowEditProviderProps {
  siteId:   string
  apiUrl:   string
  children: React.ReactNode
}

export function FlowEditProvider({ siteId, apiUrl, children }: FlowEditProviderProps) {
  const [overrides, setOverrides] = useState<Map<string, ContentOverride>>(new Map())
  const [isEditMode, setEditMode] = useState(false)

  const config = useMemo(() => ({ siteId, apiUrl }), [siteId, apiUrl])
  const client = useMemo(() => new FlowEditClient(config), [config])

  useEffect(() => {
    client.getLiveContent().then((items) => {
      setOverrides(buildOverrideMap(items))
    }).catch(() => {
      // Non-fatal: site renders with default content if the API is unreachable
    })
  }, [client])

  const saveOverride = useCallback(async (input: CreateOverrideInput): Promise<ContentOverride> => {
    const created = await client.createOverride(input)

    // If the site is auto-approve, the API returns it as 'live' immediately.
    // Either way, optimistically reflect the new override in the local map.
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(`${created.path}:${created.field}`, created)
      return next
    })

    return created
  }, [client])

  const value = useMemo(() => ({
    config,
    client,
    overrides,
    isEditMode,
    setEditMode,
    saveOverride,
  }), [config, client, overrides, isEditMode, saveOverride])

  return (
    <FlowEditContext.Provider value={value}>
      {children}
      <FlowEditOverlay />
    </FlowEditContext.Provider>
  )
}

function buildOverrideMap(items: ContentOverride[]): Map<string, ContentOverride> {
  const map = new Map<string, ContentOverride>()
  for (const item of items) {
    map.set(`${item.path}:${item.field}`, item)
  }
  return map
}
