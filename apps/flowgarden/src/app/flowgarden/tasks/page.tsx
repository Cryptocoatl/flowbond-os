import { redirect } from 'next/navigation'
import { getGardenContext } from '@/lib/garden-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { MissionCard, type MissionCardProps } from '@/components/garden/MissionCard'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks } = await (admin as any)
    .from('flowgarden_tasks')
    .select('id, title, description, urgency, status, is_mission, due_at, created_at, claimed_by_user_id, claimed_at, completed_by_user_id, completed_at, completion_photo_url, completion_notes, xp_reward')
    .eq('garden_id', ctx.garden.id)
    .order('created_at', { ascending: false })

  const allTasks: Task[] = tasks ?? []

  // Build a name map from garden members
  const nameMap = new Map(ctx.members.map(m => [m.user_id, m.display_name ?? 'A member']))

  const urgencyOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
  const active = allTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4))
  const done = allTasks.filter(t => t.status === 'completed' || t.status === 'dismissed')

  function toCardProps(task: Task): MissionCardProps {
    return {
      ...task,
      claimer_name: task.claimed_by_user_id ? (nameMap.get(task.claimed_by_user_id) ?? 'A member') : null,
      completer_name: task.completed_by_user_id ? (nameMap.get(task.completed_by_user_id) ?? 'A member') : null,
      currentUserId: ctx!.user.id,
      gardenId: ctx!.garden!.id,
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Missions</h1>
        <p className="text-sm text-stone-400 mt-1">
          {active.length} active{done.length > 0 ? ` · ${done.length} completed` : ''}
          {' · '}5 XP per mission
        </p>
      </div>

      {allTasks.length === 0 ? (
        <div className="card border-dashed border-stone-200 bg-stone-50/50 text-center py-16">
          <p className="text-2xl mb-3">⚡</p>
          <p className="text-stone-600 font-medium">No missions yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Share a photo with the Garden Intelligence and it will generate missions based on what it observes.
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
                {active.map(t => <MissionCard key={t.id} {...toCardProps(t)} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Completed — {done.length}
              </h2>
              <div className="space-y-3">
                {done.map(t => <MissionCard key={t.id} {...toCardProps(t)} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
