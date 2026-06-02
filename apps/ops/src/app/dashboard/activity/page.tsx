import { createServiceClient } from '@/lib/supabase-server'
import Link from 'next/link'
import LogForm from './LogForm'

export const dynamic = 'force-dynamic'

const typeIcon: Record<string, string> = {
  github_commit:  '⌥',
  vercel_deploy:  '▲',
  client_call:    '📞',
  client_message: '💬',
  client_email:   '✉️',
  client_meeting: '🤝',
  note:           '◻',
  milestone:      '⭐',
}

const typeColor: Record<string, string> = {
  github_commit:  'text-zinc-400',
  vercel_deploy:  'text-blue-400',
  client_call:    'text-emerald-400',
  client_message: 'text-emerald-400',
  client_email:   'text-emerald-400',
  client_meeting: 'text-emerald-400',
  note:           'text-ops-dim',
  milestone:      'text-amber-400',
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

export default async function ActivityPage() {
  const sb = createServiceClient()

  const [{ data: logs }, { data: projects }] = await Promise.all([
    sb.from('ops_activity_logs')
      .select('*, ops_projects(id,name,slug,icon,color), ops_people(id,name)')
      .order('happened_at', { ascending: false })
      .limit(100),
    sb.from('ops_projects').select('id,name,slug,icon').order('sort_order'),
  ])

  const entries = (logs ?? []) as LogEntry[]
  const today = entries.filter((l: LogEntry) => {
    const d = new Date(l.happened_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const older = entries.filter((l: LogEntry) => {
    const d = new Date(l.happened_at)
    const now = new Date()
    return d.toDateString() !== now.toDateString()
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-sm text-ops-dim mt-1">GitHub commits · Vercel deploys · Client conversations</p>
        </div>
      </div>

      {/* Log a conversation / note */}
      <LogForm projects={(projects ?? []) as { id: string; name: string; slug: string; icon: string }[]} />

      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ops-dim text-sm">No activity yet.</p>
          <p className="text-xs text-ops-muted mt-1">Click "Sync Vercel + GitHub" in the AI Brain to pull live data.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-2">Today</h2>
              <ActivityList items={today} />
            </div>
          )}
          {older.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-ops-dim uppercase tracking-wider mb-2">Earlier</h2>
              <ActivityList items={older} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type LogEntry = {
  id: string
  type: string
  title: string
  body: string | null
  url: string | null
  happened_at: string
  ops_projects: { id: string; name: string; slug: string; icon: string; color: string } | null
  ops_people: { id: string; name: string } | null
}

function ActivityList({ items }: { items: LogEntry[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-ops-border" />
      <div className="space-y-1">
        {items.map(log => (
          <div key={log.id} className="flex gap-3 items-start relative pl-1">
            <div className={`w-8 h-8 shrink-0 rounded-full bg-ops-surface border border-ops-border flex items-center justify-center text-sm z-10 ${typeColor[log.type] ?? 'text-ops-dim'}`}>
              {typeIcon[log.type] ?? '·'}
            </div>
            <div className="card flex-1 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ops-text leading-snug">
                    {log.url ? (
                      <a href={log.url} target="_blank" className="hover:text-ops-accent hover:underline">{log.title}</a>
                    ) : log.title}
                  </p>
                  {log.body && <p className="text-xs text-ops-dim mt-0.5">{log.body}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-ops-muted">{timeAgo(log.happened_at)}</p>
                  {log.ops_projects && (
                    <Link href={`/dashboard/projects/${log.ops_projects.slug}`}
                      className="text-[10px] text-ops-dim hover:text-ops-accent">
                      {log.ops_projects.icon} {log.ops_projects.name}
                    </Link>
                  )}
                  {log.ops_people && <p className="text-[10px] text-ops-muted">{log.ops_people.name}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
