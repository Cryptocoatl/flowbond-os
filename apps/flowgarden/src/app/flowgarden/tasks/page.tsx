import { store } from '@/lib/mock-data'
import type { GardenTask } from '@flowbond/core'

export const dynamic = 'force-dynamic'

const priorityConfig: Record<string, { color: string; bg: string }> = {
  urgent: { color: 'text-red-700', bg: 'bg-red-100' },
  high: { color: 'text-amber-700', bg: 'bg-amber-100' },
  medium: { color: 'text-stone-600', bg: 'bg-stone-100' },
  low: { color: 'text-stone-500', bg: 'bg-stone-50' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-stone-500' },
  in_progress: { label: 'In Progress', color: 'text-blue-600' },
  done: { label: 'Done', color: 'text-emerald-600' },
  skipped: { label: 'Skipped', color: 'text-stone-300' },
}

function TaskCard({ task }: { task: GardenTask }) {
  const zone = store.zones.find(z => z.id === task.zoneId)
  const plant = store.plants.find(p => p.id === task.plantId)
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const isDone = task.status === 'done' || task.status === 'skipped'

  const dueStr = task.dueDate
    ? task.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status === 'pending'

  return (
    <div className={`card flex gap-4 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex flex-col items-center pt-0.5">
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'}`}>
          {isDone && (
            <svg viewBox="0 0 12 12" fill="white" className="w-2.5 h-2.5">
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
          <span className={`badge ${priority.bg} ${priority.color} shrink-0`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          {zone && <span className="text-xs text-stone-400">{zone.name}</span>}
          {plant && <span className="text-xs text-stone-400">{plant.name}</span>}
          {dueStr && (
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
              {isOverdue ? 'Overdue · ' : 'Due '}{dueStr}
            </span>
          )}
          {task.rewardPoints > 0 && (
            <span className="text-xs text-amber-600">+{task.rewardPoints} pts</span>
          )}
          {task.proofRequired && (
            <span className="text-xs text-stone-400">📷 Proof needed</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { tasks } = store

  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 }
      return order[a.priority] - order[b.priority]
    })

  const done = tasks.filter(t => t.status === 'done' || t.status === 'skipped')
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))

  const totalPoints = done.reduce((sum, t) => sum + t.rewardPoints, 0)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Missions</h1>
          <p className="text-sm text-stone-400 mt-1">
            {pending.length} active · {done.length} completed · {totalPoints} pts earned
          </p>
        </div>
        <button className="btn-primary">+ New Mission</button>
      </div>

      {/* Active missions */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Active — {pending.length}
          </h2>
          <div className="space-y-3">
            {pending.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* Completed */}
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

      {tasks.length === 0 && (
        <div className="card border-dashed border-stone-200 text-center py-12">
          <p className="text-stone-400">No missions yet. Create your first task.</p>
          <button className="btn-primary mt-4">+ New Mission</button>
        </div>
      )}
    </div>
  )
}
