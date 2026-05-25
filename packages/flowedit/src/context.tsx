'use client'
import { createContext, useContext } from 'react'
import type { ContentOverride, FlowEditConfig, CreateOverrideInput, FlowEditUser } from './types'
import type { FlowEditClient } from './client'

export interface FlowEditContextValue {
  config:       FlowEditConfig
  client:       FlowEditClient
  overrides:    Map<string, ContentOverride>   // key: `${path}:${field}`
  isEditMode:   boolean
  setEditMode:  (value: boolean) => void
  saveOverride: (input: CreateOverrideInput) => Promise<ContentOverride>
  // auth
  currentUser:  FlowEditUser | null
  login:        (email: string, password: string) => Promise<void>
  logout:       () => void
  showLogin:    boolean
  setShowLogin: (v: boolean) => void
}

export const FlowEditContext = createContext<FlowEditContextValue | null>(null)

export function useFlowEdit(): FlowEditContextValue {
  const ctx = useContext(FlowEditContext)
  if (!ctx) throw new Error('useFlowEdit must be used within <FlowEditProvider>')
  return ctx
}
