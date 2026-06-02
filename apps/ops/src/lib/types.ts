export type ProjectCategory = 'platform' | 'product' | 'client' | 'mission' | 'community' | 'personal'
export type ProjectStatus = 'planning' | 'active' | 'live' | 'paused' | 'archived'
export type ActivityType = 'github_commit' | 'vercel_deploy' | 'client_call' | 'client_message' | 'client_email' | 'client_meeting' | 'note' | 'milestone'
export type DeployState = 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface OpsProject {
  id: string
  name: string
  slug: string
  status: ProjectStatus
  phase: string | null
  description: string | null
  icon: string
  color: string
  url_live: string | null
  url_github: string | null
  url_local: string | null
  url_vercel: string | null
  vercel_project_id: string | null
  github_repo: string | null
  github_org: string | null
  category: ProjectCategory
  tech_stack: string[]
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  tasks?: OpsTask[]
  people?: OpsPerson[]
  latest_deploy?: OpsDeployStatus | null
}

export interface OpsDeployStatus {
  id: string
  project_id: string
  vercel_project_id: string | null
  state: DeployState | null
  url: string | null
  created_at_vercel: string | null
  commit_message: string | null
  branch: string | null
  synced_at: string
}

export interface OpsActivityLog {
  id: string
  project_id: string | null
  person_id: string | null
  type: ActivityType
  title: string
  body: string | null
  url: string | null
  metadata: Record<string, unknown>
  happened_at: string
  created_at: string
  // joined
  project?: Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon'>
  person?: Pick<OpsPerson, 'id' | 'name'>
}

export interface OpsTask {
  id: string
  project_id: string | null
  title: string
  status: TaskStatus
  priority: TaskPriority
  notes: string | null
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // joined
  project?: Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon' | 'color'>
}

export interface OpsPerson {
  id: string
  name: string
  email: string | null
  whatsapp: string | null
  role: string | null
  notes: string | null
  created_at: string
  // joined
  projects?: Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon'>[]
}

export interface OpsProjectPerson {
  project_id: string
  person_id: string
  role: string | null
}

export interface OpsContract {
  id: string
  project_id: string | null
  person_id: string | null
  title: string
  status: ContractStatus
  value_usd: number | null
  currency: string
  notes: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  // joined
  project?: Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon'>
  person?: Pick<OpsPerson, 'id' | 'name'>
}
