export type ApprovalMode = 'auto' | 'review' | 'admin_only'
export type EditStatus   = 'draft' | 'pending' | 'approved' | 'rejected' | 'live'
export type EditTier     = 'simple' | 'ai' | 'agent'
export type EditRole     = 'viewer' | 'editor' | 'approver' | 'admin'

export interface ContentOverride {
  id:              string
  siteId:          string
  changeRequestId: string | null
  path:            string
  field:           string
  value:           Record<string, unknown>
  status:          EditStatus
  tier:            EditTier
  version:         number
  createdBy:       string | null
  approvedBy:      string | null
  changeNote:      string | null
  createdAt:       string
  publishedAt:     string | null
}

export interface Site {
  id:           string
  slug:         string
  name:         string
  domain:       string | null
  approvalMode: ApprovalMode
  createdAt:    string
}

export interface ChangeRequest {
  id:         string
  siteId:     string
  title:      string | null
  status:     EditStatus
  githubPr:   string | null
  previewUrl: string | null
  createdBy:  string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt:  string
}

export interface FlowEditConfig {
  siteId:  string
  apiUrl:  string
}

export interface CreateOverrideInput {
  path:            string
  field:           string
  value:           Record<string, unknown>
  tier?:           EditTier
  changeNote?:     string
  changeRequestId?: string
}

export interface UpdateOverrideInput {
  status?:     EditStatus
  value?:      Record<string, unknown>
  changeNote?: string
  approvedBy?: string
}
