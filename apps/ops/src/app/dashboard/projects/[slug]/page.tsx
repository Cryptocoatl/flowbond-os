import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import type { OpsProject, OpsTask, OpsPerson } from '@/lib/types'
import TaskList from './TaskList'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = createServiceClient()

  const { data: project } = await sb.from('ops_projects').select('*').eq('slug', slug).single()

  if (!project) notFound()

  const projectId = (project as OpsProject).id

  const [{ data: tasks }, { data: peopleRaw }] = await Promise.all([
    sb.from('ops_tasks').select('*').eq('project_id', projectId).order('sort_order'),
    sb.from('ops_project_people')
      .select('role, ops_people(id, name, email, whatsapp, role, notes)')
      .eq('project_id', projectId),
  ])

  const p = project as OpsProject
  const ts = (tasks ?? []) as OpsTask[]

  type PeopleRow = { role: string | null; ops_people: OpsPerson | null }
  const people = (peopleRaw ?? [] as PeopleRow[]).map((r: PeopleRow) => ({
    ...(r.ops_people as OpsPerson),
    project_role: r.role,
  }))

  const tasksByStatus = {
    blocked:     ts.filter(t => t.status === 'blocked'),
    in_progress: ts.filter(t => t.status === 'in_progress'),
    todo:        ts.filter(t => t.status === 'todo'),
    done:        ts.filter(t => t.status === 'done'),
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/dashboard/projects" className="text-xs text-ops-dim hover:text-ops-text">
        ← Projects
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}44` }}
        >
          {p.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <StatusBadge value={p.status} type="project" />
            {p.phase && <span className="text-sm text-ops-dim">{p.phase}</span>}
          </div>
          <p className="text-sm text-ops-dim mt-2">{p.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tasks (left 2/3) */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ops-dim uppercase tracking-wider">Tasks</h2>
            <span className="text-xs text-ops-dim">{ts.filter(t => t.status !== 'done').length} open</span>
          </div>

          <TaskList projectId={p.id} initialTasks={ts} />

          {/* Done section (collapsed) */}
          {tasksByStatus.done.length > 0 && (
            <details className="group">
              <summary className="text-xs text-ops-dim cursor-pointer hover:text-ops-text list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                {tasksByStatus.done.length} completed
              </summary>
              <div className="mt-2 space-y-1">
                {tasksByStatus.done.map(t => (
                  <div key={t.id} className="card flex items-center gap-3 opacity-50">
                    <span className="text-emerald-400 text-sm">✓</span>
                    <p className="text-sm text-ops-dim line-through">{t.title}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Sidebar (right 1/3) */}
        <div className="space-y-4">
          {/* Links */}
          <div className="card space-y-2">
            <h3 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-3">Links</h3>
            {p.url_live && <a href={p.url_live} target="_blank" className="flex items-center gap-2 text-sm text-emerald-400 hover:underline">
              <span>🌐</span> Live site
            </a>}
            {p.url_github && <a href={p.url_github} target="_blank" className="flex items-center gap-2 text-sm text-ops-dim hover:text-ops-text">
              <span>⌥</span> GitHub
            </a>}
            {p.url_local && <p className="flex items-center gap-2 text-sm text-ops-dim font-mono text-xs">
              <span>⊹</span> {p.url_local}
            </p>}
          </div>

          {/* Tech stack */}
          {p.tech_stack.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-3">Stack</h3>
              <div className="flex flex-wrap gap-1.5">
                {p.tech_stack.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ops-border text-ops-dim font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* People */}
          {people.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-3">People</h3>
              <div className="space-y-2">
                {people.map((person: OpsPerson & { project_role: string | null }) => (
                  <div key={person.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-ops-muted flex items-center justify-center text-[10px] font-bold text-ops-text shrink-0">
                      {person.name[0]}
                    </div>
                    <div>
                      <p className="text-sm text-ops-text">{person.name}</p>
                      <p className="text-[10px] text-ops-dim">{person.project_role ?? person.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div className="card">
              <h3 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-xs text-ops-dim leading-relaxed">{p.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
