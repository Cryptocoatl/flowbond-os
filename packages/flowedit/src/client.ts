import type {
  ContentOverride,
  Site,
  ChangeRequest,
  FlowEditConfig,
  CreateOverrideInput,
  UpdateOverrideInput,
  FlowEditUser,
} from './types'

export class FlowEditClient {
  private token: string | null = null

  constructor(private config: FlowEditConfig) {}

  setToken(token: string | null) { this.token = token }

  private headers(extra?: HeadersInit): HeadersInit {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return { ...h, ...(extra as Record<string, string>) }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res  = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: this.headers(init?.headers),
    })
    const json = await res.json() as Record<string, unknown>

    if (!res.ok) {
      throw new Error((json.error as string) ?? `FlowEdit API error: ${res.status}`)
    }
    // Auth endpoints return data directly (not wrapped in {success,data})
    if ('token' in json || 'user' in json || 'members' in json) return json as T
    if ('success' in json) return (json.data ?? json) as T
    return json as T
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ token: string; user: FlowEditUser }> {
    return this.request<{ token: string; user: FlowEditUser }>(
      '/api/v1/flowedit/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, siteId: this.config.siteId }) }
    )
  }

  async getMe(): Promise<{ user: FlowEditUser }> {
    return this.request<{ user: FlowEditUser }>('/api/v1/flowedit/auth/me')
  }

  async getSiteMembers(): Promise<{ members: FlowEditUser[] }> {
    return this.request<{ members: FlowEditUser[] }>(
      `/api/v1/flowedit/auth/site/${this.config.siteId}/members`
    )
  }

  // ── Sites ──────────────────────────────────────────────────────────────────

  getSite(slug: string): Promise<Site> {
    return this.request<Site>(`/api/v1/flowedit/sites/${slug}`)
  }

  // ── Content overrides ──────────────────────────────────────────────────────

  getLiveContent(): Promise<ContentOverride[]> {
    return this.request<ContentOverride[]>(`/api/v1/flowedit/content/${this.config.siteId}/live`)
  }

  getAllContent(status?: string): Promise<ContentOverride[]> {
    const qs = status ? `?status=${status}` : ''
    return this.request<ContentOverride[]>(`/api/v1/flowedit/content/${this.config.siteId}${qs}`)
  }

  createOverride(input: CreateOverrideInput): Promise<ContentOverride> {
    return this.request<ContentOverride>(`/api/v1/flowedit/content/${this.config.siteId}`, {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  }

  updateOverride(id: string, input: UpdateOverrideInput): Promise<ContentOverride> {
    return this.request<ContentOverride>(`/api/v1/flowedit/content/${this.config.siteId}/overrides/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(input),
    })
  }

  deleteOverride(id: string): Promise<void> {
    return this.request<void>(`/api/v1/flowedit/content/${this.config.siteId}/overrides/${id}`, {
      method: 'DELETE',
    })
  }

  // ── Change requests ────────────────────────────────────────────────────────

  getChangeRequests(status?: string): Promise<ChangeRequest[]> {
    const qs = status ? `?status=${status}` : ''
    return this.request<ChangeRequest[]>(`/api/v1/flowedit/changes/${this.config.siteId}${qs}`)
  }

  createChangeRequest(input: { title?: string; overrideIds: string[] }): Promise<ChangeRequest> {
    return this.request<ChangeRequest>(`/api/v1/flowedit/changes/${this.config.siteId}`, {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  }

  updateChangeRequest(id: string, input: { status: string; reviewedBy?: string }): Promise<ChangeRequest> {
    return this.request<ChangeRequest>(`/api/v1/flowedit/changes/${this.config.siteId}/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(input),
    })
  }
}
