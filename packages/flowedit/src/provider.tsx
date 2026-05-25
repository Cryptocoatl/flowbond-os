'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { FlowEditContext }  from './context'
import { FlowEditClient }   from './client'
import { FlowEditOverlay }  from './overlay'
import type { ContentOverride, CreateOverrideInput, FlowEditUser } from './types'

const STORAGE_KEY = 'flowedit_token'

interface FlowEditProviderProps {
  siteId:   string
  apiUrl:   string
  children: React.ReactNode
}

export function FlowEditProvider({ siteId, apiUrl, children }: FlowEditProviderProps) {
  const [overrides,    setOverrides]    = useState<Map<string, ContentOverride>>(new Map())
  const [isEditMode,   setEditMode]     = useState(false)
  const [currentUser,  setCurrentUser]  = useState<FlowEditUser | null>(null)
  const [showLogin,    setShowLogin]    = useState(false)

  const config = useMemo(() => ({ siteId, apiUrl }), [siteId, apiUrl])
  const client = useMemo(() => new FlowEditClient(config), [config])

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!stored) return
    client.setToken(stored)
    client.getMe()
      .then(({ user }) => setCurrentUser({ ...user, role: user.role ?? 'admin' }))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        client.setToken(null)
      })
  }, [client])

  // Fetch live content on mount
  useEffect(() => {
    client.getLiveContent().then((items) => {
      setOverrides(buildOverrideMap(items))
    }).catch(() => {/* non-fatal */})
  }, [client])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await client.login(email, password)
    client.setToken(token)
    localStorage.setItem(STORAGE_KEY, token)
    setCurrentUser(user)
    setShowLogin(false)
    setEditMode(true)
  }, [client])

  const logout = useCallback(() => {
    client.setToken(null)
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
    setEditMode(false)
  }, [client])

  const saveOverride = useCallback(async (input: CreateOverrideInput): Promise<ContentOverride> => {
    const inputWithUser = currentUser
      ? { ...input, createdBy: currentUser.id }
      : input

    const created = await client.createOverride(inputWithUser)

    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(`${created.path}:${created.field}`, created)
      return next
    })

    return created
  }, [client, currentUser])

  const value = useMemo(() => ({
    config,
    client,
    overrides,
    isEditMode,
    setEditMode,
    saveOverride,
    currentUser,
    login,
    logout,
    showLogin,
    setShowLogin,
  }), [config, client, overrides, isEditMode, saveOverride, currentUser, login, logout, showLogin])

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
