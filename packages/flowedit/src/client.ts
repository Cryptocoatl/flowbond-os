import type {
  ContentOverride,
  Site,
  ChangeRequest,
  FlowEditConfig,
  CreateOverrideInput,
  UpdateOverrideInput,
} from './types'

interface ApiResponse<T = unknown> {
  success: boolean
  data?:   T
  error?:  { code: string; message: string }
}

export class FlowEditClient {
  constructor(private config: FlowEditConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res  = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    const json = (await res.json()) as ApiResponse<T>
    if (!json.success || !res.ok) {
      throw new Error(json.error?.message ?? `FlowEdit API error: ${res.status}`)
    }
    return json.data as T
  }

  // ── Sites ──────────────────────────────────────────────────────────────────

  getSite(slug: string): Promise<Site> {
    return this.request<Site>(`/api/v1/flowedit/sites/${slug}`)
  }

  // ── Content overrides ──────────────────────────────────────────────────────

  /** Fetch all live overrides for a site. Used by the SDK on page load. */
  getLiveContent(): Promise<ContentOverride[]> {
    return this.request<ContentOverride[]>(`/api/v1/flowedit/content/${this.config.siteId}/live`)
  }

  /** Fetch all overrides (any status) — used by the dashboard. */
  getAllContent(status?: string): Promise<ContentOverride[]> {
    const qs = status ? `?status=${status}` : ''
    return this.request<ContentOverride[]>(`/api/v1/flowedit/content/${this.config.siteId}${qs}`)
  }

  /** Create a draft content override. */
  createOverride(input: CreateOverrideInput): Promise<ContentOverride> {
    return this.request<ContentOverride>(`/api/v1/flowedit/content/${this.config.siteId}`, {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  }

  /** Approve, reject, or update an existing override. */
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
