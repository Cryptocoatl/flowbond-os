import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import DeployBadge from '@/components/DeployBadge'
import type { OpsProject, OpsTask, OpsDeployStatus, OpsActivityLog, DeployState } from '@/lib/types'

export const dynamic = 'force-dynamic'

const typeIcon: Record<string, string> = {
  github_commit: '⌥', vercel_deploy: '▲', client_call: '📞',
  client_message: '💬', client_email: '✉️', client_meeting: '🤝', note: '◻', milestone: '⭐',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function OverviewPage() {
  const sb = createServiceClient()

  const [{ data: projects }, { data: tasks }, { data: deploys }, { data: recentLogs }] = await Promise.all([
    sb.from('ops_projects').select('*').order('sort_order'),
    sb.from('ops_tasks').select('*').neq('status', 'done').order('priority', { ascending: false }),
    sb.from('ops_deploys').select('*'),
    sb.from('ops_activity_logs')
      .select('*, ops_projects(id,name,slug,icon)')
      .order('happened_at', { ascending: false })
      .limit(8),
  ])

  const ps = (projects ?? []) as OpsProject[]
  const ts = (tasks ?? []) as OpsTask[]
  const deployMap = Object.fromEntries(
    ((deploys ?? []) as OpsDeployStatus[]).map(d => [d.project_id, d])
  )
  const logs = (recentLogs ?? []) as OpsActivityLog[]

  const stats = {
    total: ps.length,
    live: ps.filter(p => p.status === 'live').length,
    active: ps.filter(p => p.status === 'active').length,
    paused: ps.filter(p => p.status === 'paused').length,
    openTasks: ts.length,
    blocked: ts.filter(t => t.status === 'blocked').length + ts.filter(t => t.priority === 'critical').length,
  }

  const urgent = ts.filter(t => t.priority === 'critical' || t.status === 'blocked').slice(0, 5)
  const live = ps.filter(p => p.status === 'live' || p.status === 'active').slice(0, 8)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ops-text">Command Center</h1>
          <p className="text-sm text-ops-dim mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/brain" className="btn-primary text-xs">
          ◬ AI Brain
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Projects', value: stats.total, color: 'text-ops-text' },
          { label: 'Live', value: stats.live, color: 'text-emerald-400' },
          { label: 'Building', value: stats.active, color: 'text-violet-400' },
          { label: 'Paused', value: stats.paused, color: 'text-amber-400' },
          { label: 'Open Tasks', value: stats.openTasks, color: 'text-blue-400' },
          { label: 'Blocked', value: stats.blocked, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="card py-3 px-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-ops-muted mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active projects (left 2 cols) */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-ops-dim uppercase tracking-wider">Active & Live</h2>
            <Link href="/dashboard/projects" className="text-xs text-ops-accent hover:underline">All {stats.total} →</Link>
          </div>
          <div className="space-y-1.5">
            {live.map(p => {
              const deploy = deployMap[p.id]
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.slug}`}
                  className="card flex items-center gap-3 py-3 hover:border-ops-muted transition-colors"
                >
                  <span className="text-base shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ops-text">{p.name}</span>
                    <span className="text-[10px] text-ops-muted ml-2">{p.phase}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DeployBadge state={deploy?.state as DeployState | null} url={deploy?.url} />
                    <StatusBadge value={p.status} type="project" />
                  </div>
                </Link>
              )
            })}
            {ps.length > 8 && (
              <Link href="/dashboard/projects" className="card text-center text-xs text-ops-dim hover:text-ops-accent py-2 block">
                +{ps.length - 8} more projects →
              </Link>
            )}
          </div>
        </div>

        {/* Right col: urgent + activity */}
        <div className="space-y-4">
          {/* Urgent */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Urgent</h2>
              <Link href="/dashboard/tasks" className="text-xs text-ops-accent hover:underline">All tasks →</Link>
            </div>
            {urgent.length === 0 ? (
              <div className="card text-center py-4">
                <p className="text-xs text-ops-dim">Nothing critical 🚀</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {urgent.map(t => (
                  <div key={t.id} className="card py-2.5">
                    <p className="text-xs text-ops-text line-clamp-2">{t.title}</p>
                    <div className="flex gap-1 mt-1.5">
                      <StatusBadge value={t.status} type="task" />
                      <StatusBadge value={t.priority} type="priority" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-ops-dim uppercase tracking-wider">Recent Activity</h2>
              <Link href="/dashboard/activity" className="text-xs text-ops-accent hover:underline">All →</Link>
            </div>
            {logs.length === 0 ? (
              <div className="card text-center py-4">
                <p className="text-xs text-ops-dim">No activity yet</p>
                <Link href="/dashboard/brain" className="text-[10px] text-ops-accent">Sync via AI Brain →</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log: OpsActivityLog) => (
                  <div key={log.id} className="card py-2.5 flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5">{typeIcon[log.type] ?? '·'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ops-text line-clamp-1">{log.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {log.project && <span className="text-[9px] text-ops-muted">{log.project.icon} {log.project.name}</span>}
                        <span className="text-[9px] text-ops-muted">{timeAgo(log.happened_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
