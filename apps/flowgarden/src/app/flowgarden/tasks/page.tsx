import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const urgencyConfig: Record<string, { color: string; bg: string; order: number }> = {
  urgent: { color: 'text-red-700',    bg: 'bg-red-100',    order: 0 },
  high:   { color: 'text-amber-700',  bg: 'bg-amber-100',  order: 1 },
  medium: { color: 'text-stone-600',  bg: 'bg-stone-100',  order: 2 },
  low:    { color: 'text-stone-500',  bg: 'bg-stone-50',   order: 3 },
  none:   { color: 'text-stone-400',  bg: 'bg-stone-50',   order: 4 },
}

interface Task {
  id: string
  title: string
  description: string | null
  urgency: string
  status: string
  is_mission: boolean
  due_at: string | null
  created_at: string
}

function TaskCard({ task }: { task: Task }) {
  const urg = urgencyConfig[task.urgency] ?? urgencyConfig.none
  const isDone = task.status === 'completed' || task.status === 'dismissed'
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status === 'pending'

  const dueStr = task.due_at
    ? new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div className={`card flex gap-4 ${isDone ? 'opacity-50' : ''}`}>
      <div className="flex flex-col items-center pt-0.5 shrink-0">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'
        }`}>
          {isDone && (
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>
            {task.title}
          </p>
          {task.urgency !== 'none' && (
            <span className={`badge ${urg.bg} ${urg.color} shrink-0 capitalize`}>{task.urgency}</span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {task.is_mission && (
            <span className="text-xs text-amber-600 font-medium">⚡ Mission</span>
          )}
          {dueStr && (
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
              {isOverdue ? 'Overdue · ' : 'Due '}{dueStr}
            </span>
          )}
          <span className="text-xs text-stone-400">
            {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default async function TasksPage() {
  const ctx = await getGardenContext()
  if (!ctx) redirect('/auth/login')
  if (!ctx.garden) redirect('/onboarding')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks } = await (admin as any)
    .from('flowgarden_tasks')
    .select('id, title, description, urgency, status, is_mission, due_at, created_at')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: false })

  const allTasks: Task[] = tasks ?? []

  const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
  const active = allTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4))
  const done = allTasks.filter(t => t.status === 'completed' || t.status === 'dismissed')

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Missions</h1>
        <p className="text-sm text-stone-400 mt-1">
          {active.length} active{done.length > 0 ? ` · ${done.length} completed` : ''}
        </p>
      </div>

      {allTasks.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">⚡</p>
          <p className="text-stone-600 font-medium">No missions yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Tell the Garden Intelligence what needs doing and missions will appear here.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Active — {active.length}
              </h2>
              <div className="space-y-3">
                {active.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Completed — {done.length}
              </h2>
              <div className="space-y-3">
                {done.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
