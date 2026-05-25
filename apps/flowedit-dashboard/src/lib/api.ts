import { FlowEditClient } from '@flowbond/flowedit'
import type { ContentOverride, Site, ChangeRequest } from '@flowbond/flowedit'

export type { ContentOverride, Site, ChangeRequest }

const API_URL = process.env.FLOWEDIT_API_URL ?? 'http://localhost:4000'

export function getClient(siteId: string) {
  return new FlowEditClient({ siteId, apiUrl: API_URL })
}

export async function getAllSites(): Promise<Site[]> {
  const res  = await fetch(`${API_URL}/api/v1/flowedit/sites`, { cache: 'no-store' })
  const json = await res.json()
  return json.data ?? []
}

export async function getSite(slug: string): Promise<Site | null> {
  const res  = await fetch(`${API_URL}/api/v1/flowedit/sites/${slug}`, { cache: 'no-store' })
  const json = await res.json()
  return json.success ? json.data : null
}

export async function getOverrides(siteId: string, status?: string): Promise<ContentOverride[]> {
  const qs   = status ? `?status=${status}` : ''
  const res  = await fetch(`${API_URL}/api/v1/flowedit/content/${siteId}${qs}`, { cache: 'no-store' })
  const json = await res.json()
  return json.data ?? []
}

export async function getChangeRequests(siteId: string, status?: string): Promise<ChangeRequest[]> {
  const qs   = status ? `?status=${status}` : ''
  const res  = await fetch(`${API_URL}/api/v1/flowedit/changes/${siteId}${qs}`, { cache: 'no-store' })
  const json = await res.json()
  return json.data ?? []
}

export interface SiteMember {
  userId:    string
  email:     string
  name:      string
  avatarUrl: string | null
  role:      'viewer' | 'editor' | 'approver' | 'admin'
}

export async function getSiteMembers(siteId: string): Promise<SiteMember[]> {
  const res  = await fetch(`${API_URL}/api/v1/flowedit/auth/site/${siteId}/members`, { cache: 'no-store' })
  const json = await res.json()
  return json.members ?? []
}

export interface InviteResult {
  user:         { id: string; email: string; name: string }
  site:         { id: string; name: string }
  role:         string
  tempPassword: string | null
  setupToken:   string
  isNewUser:    boolean
}
