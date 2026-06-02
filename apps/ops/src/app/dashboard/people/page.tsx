import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { OpsPerson, OpsProject } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
  const sb = createServiceClient()

  const [{ data: people }, { data: links }] = await Promise.all([
    sb.from('ops_people').select('*').order('name'),
    sb.from('ops_project_people').select('person_id, role, ops_projects(id, name, slug, icon, color)'),
  ])

  const ps = (people ?? []) as OpsPerson[]
  const raw = (links ?? []) as Array<{ person_id: string; role: string | null; ops_projects: Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon' | 'color'> | null }>

  const personProjects: Record<string, Array<Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon' | 'color'> & { project_role: string | null }>> = {}
  raw.forEach(r => {
    if (!personProjects[r.person_id]) personProjects[r.person_id] = []
    if (r.ops_projects) personProjects[r.person_id].push({ ...r.ops_projects, project_role: r.role })
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="text-sm text-ops-dim mt-1">{ps.length} contacts</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ps.map(person => {
          const projects = personProjects[person.id] ?? []
          return (
            <div key={person.id} className="card flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-ops-muted flex items-center justify-center text-lg font-bold text-ops-text shrink-0">
                {person.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-ops-text">{person.name}</h2>
                  {person.role && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ops-border text-ops-dim">{person.role}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {person.email && <span className="text-xs text-ops-dim">{person.email}</span>}
                  {person.whatsapp && <span className="text-xs text-ops-dim">+{person.whatsapp}</span>}
                </div>
                {projects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {projects.map(p => (
                      <Link
                        key={p.id}
                        href={`/dashboard/projects/${p.slug}`}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-ops-border text-ops-dim hover:text-ops-accent flex items-center gap-1"
                      >
                        <span>{p.icon}</span> {p.name}
                        {p.project_role && <span className="text-ops-muted">· {p.project_role}</span>}
                      </Link>
                    ))}
                  </div>
                )}
                {person.notes && <p className="text-xs text-ops-muted mt-2">{person.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
