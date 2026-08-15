import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { MissionCard, type MissionCardProps } from '@/components/garden/MissionCard'
import { CreateTaskButton } from '@/components/garden/CreateTaskButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { plural } from '@/lib/format'

export const dynamic = 'force-dynamic'

interface Task {
  id: string
  title: string
  description: string | null
  urgency: string
  status: string
  is_mission: boolean
  due_at: string | null
  created_at: string
  claimed_by_user_id: string | null
  claimed_at: string | null
  completed_by_user_id: string | null
  completed_at: string | null
  completion_photo_url: string | null
  completion_notes: string | null
  xp_reward: number
}

export default async function TasksPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  const [tasksRes, zonesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('flowgarden_tasks')
      .select('id, title, description, urgency, status, is_mission, due_at, created_at, claimed_by_user_id, claimed_at, completed_by_user_id, completed_at, completion_photo_url, completion_notes, xp_reward')
      .eq('garden_id', ctx.garden.id)
      .order('created_at', { ascending: false }),
    admin.from('flowgarden_zones').select('id, name').eq('garden_id', ctx.garden.id).order('name'),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: Task[] = (tasksRes as any).data ?? []
  const zones = zonesRes.data ?? []

  const nameMap = new Map(ctx.members.map(m => [m.user_id, m.display_name ?? 'A member']))

  function toCardProps(task: Task): MissionCardProps {
    return {
      ...task,
      claimer_name: task.claimed_by_user_id ? (nameMap.get(task.claimed_by_user_id) ?? 'A member') : null,
      completer_name: task.completed_by_user_id ? (nameMap.get(task.completed_by_user_id) ?? 'A member') : null,
      currentUserId: ctx!.user.id,
      gardenId: ctx!.garden!.id,
    }
  }

  const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
  const byUrgency = (a: Task, b: Task) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4)

  const active = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const done = allTasks.filter(t => t.status === 'completed' || t.status === 'dismissed')

  // Group by when it's due, not just by urgency — "what do I do right now"
  // is the question this page exists to answer.
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const overdue = active.filter(t => t.due_at && new Date(t.due_at) < now).sort(byUrgency)
  const today = active
    .filter(t => t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= endOfToday)
    .sort(byUrgency)
  const mine = active
    .filter(t => t.claimed_by_user_id === ctx.user.id && !overdue.includes(t) && !today.includes(t))
    .sort(byUrgency)
  const rest = active
    .filter(t => !overdue.includes(t) && !today.includes(t) && !mine.includes(t))
    .sort(byUrgency)

  const totalXp = active.reduce((s, t) => s + (t.xp_reward ?? 0), 0)

  const groups: { key: string; label: string; tone?: string; items: Task[] }[] = [
    { key: 'overdue', label: `Overdue — ${overdue.length}`, tone: 'var(--fg-danger)', items: overdue },
    { key: 'today',   label: `Due today — ${today.length}`,  tone: 'var(--fg-gold)',   items: today },
    { key: 'mine',    label: `Yours — ${mine.length}`,        items: mine },
    { key: 'rest',    label: `Open — ${rest.length}`,         items: rest },
  ].filter(g => g.items.length > 0)

  return (
    <div className="page-narrow space-y-6">
      <PageHeader
        title="Missions"
        subtitle={
          active.length === 0 && done.length === 0
            ? 'Small jobs that keep the garden alive'
            : <>
                {plural(active.length, 'active mission')}
                {totalXp > 0 ? ` · ${totalXp} XP up for grabs` : ''}
                {done.length > 0 ? ` · ${done.length} done` : ''}
              </>
        }
        action={<CreateTaskButton zones={zones} />}
      />

      {allTasks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">⚡</span>
          <p className="empty-title">No missions yet</p>
          <p className="empty-body">
            Missions are the small jobs that keep a garden alive — water the beds, check the traps,
            harvest the basil. Create one, or just tell FlowMe what needs doing.
          </p>
          <CreateTaskButton zones={zones} label="Create first mission" />
        </div>
      ) : (
        <>
          {active.length === 0 && (
            <div className="empty-state">
              <span className="empty-emoji">🌿</span>
              <p className="empty-title">All caught up</p>
              <p className="empty-body">Every mission is done. The garden is in good hands.</p>
            </div>
          )}

          {groups.map(g => (
            <section key={g.key}>
              <h2 className="section-label" style={g.tone ? { color: g.tone } : undefined}>
                {g.label}
              </h2>
              <div className="space-y-3">
                {g.items.map(t => <MissionCard key={t.id} {...toCardProps(t)} />)}
              </div>
            </section>
          ))}

          {done.length > 0 && (
            <details className="group">
              <summary
                className="section-label cursor-pointer list-none flex items-center gap-1.5 select-none"
                style={{ marginBottom: 0 }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 transition-transform group-open:rotate-90">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Completed — {done.length}
              </summary>
              <div className="space-y-3 mt-3">
                {done.map(t => <MissionCard key={t.id} {...toCardProps(t)} />)}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
