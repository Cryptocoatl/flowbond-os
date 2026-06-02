import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import type { OpsTask, OpsProject } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const sb = createServiceClient()

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    sb.from('ops_tasks').select('*').order('priority', { ascending: false }).order('created_at'),
    sb.from('ops_projects').select('id, name, slug, icon, color'),
  ])

  const ts = (tasks ?? []) as OpsTask[]
  const ps = (projects ?? []) as Pick<OpsProject, 'id' | 'name' | 'slug' | 'icon' | 'color'>[]
  const projectMap = Object.fromEntries(ps.map(p => [p.id, p]))

  const open = ts.filter(t => t.status !== 'done')
  const done = ts.filter(t => t.status === 'done')

  const groups: { label: string; items: OpsTask[]; color: string }[] = [
    { label: 'Blocked', items: open.filter(t => t.status === 'blocked'), color: 'text-red-400' },
    { label: 'Critical', items: open.filter(t => t.status !== 'blocked' && t.priority === 'critical'), color: 'text-orange-400' },
    { label: 'In Progress', items: open.filter(t => t.status === 'in_progress' && t.priority !== 'critical'), color: 'text-blue-400' },
    { label: 'High Priority', items: open.filter(t => t.status === 'todo' && t.priority === 'high'), color: 'text-orange-300' },
    { label: 'Normal', items: open.filter(t => t.status === 'todo' && t.priority !== 'high' && t.priority !== 'critical'), color: 'text-ops-dim' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-sm text-ops-dim mt-1">{open.length} open · {done.length} done</p>
      </div>

      <div className="space-y-6">
        {groups.filter(g => g.items.length > 0).map(group => (
          <div key={group.label}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${group.color}`}>
              {group.label} ({group.items.length})
            </h2>
            <div className="space-y-2">
              {group.items.map(t => {
                const proj = t.project_id ? projectMap[t.project_id] : null
                return (
                  <div key={t.id} className="card flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ops-text">{t.title}</p>
                      {proj && (
                        <Link
                          href={`/dashboard/projects/${proj.slug}`}
                          className="text-[10px] text-ops-dim hover:text-ops-accent mt-0.5 inline-flex items-center gap-1"
                        >
                          <span>{proj.icon}</span> {proj.name}
                        </Link>
                      )}
                      {t.notes && <p className="text-xs text-ops-muted mt-1">{t.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge value={t.status} type="task" />
                      <StatusBadge value={t.priority} type="priority" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <details>
            <summary className="text-xs text-ops-dim cursor-pointer hover:text-ops-text list-none">
              ▶ {done.length} completed tasks
            </summary>
            <div className="mt-2 space-y-1">
              {done.map(t => {
                const proj = t.project_id ? projectMap[t.project_id] : null
                return (
                  <div key={t.id} className="card flex items-center gap-3 opacity-40">
                    <span className="text-emerald-400 text-sm">✓</span>
                    <div className="flex-1">
                      <p className="text-sm text-ops-dim line-through">{t.title}</p>
                      {proj && <p className="text-[10px] text-ops-muted">{proj.icon} {proj.name}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
