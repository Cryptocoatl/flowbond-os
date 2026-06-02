import type { ProjectStatus, TaskStatus, TaskPriority, ContractStatus } from '@/lib/types'

const projectColors: Record<ProjectStatus, string> = {
  planning: 'bg-purple-500/15 text-purple-400',
  active:   'bg-violet-500/15 text-violet-400',
  live:     'bg-emerald-500/15 text-emerald-400',
  paused:   'bg-amber-500/15 text-amber-400',
  archived: 'bg-zinc-500/15 text-zinc-400',
}

const taskColors: Record<TaskStatus, string> = {
  todo:        'bg-zinc-500/15 text-zinc-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  blocked:     'bg-red-500/15 text-red-400',
  done:        'bg-emerald-500/15 text-emerald-400',
}

const priorityColors: Record<TaskPriority, string> = {
  low:      'bg-zinc-500/10 text-zinc-500',
  medium:   'bg-yellow-500/15 text-yellow-400',
  high:     'bg-orange-500/15 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}

const contractColors: Record<ContractStatus, string> = {
  draft:     'bg-zinc-500/15 text-zinc-400',
  active:    'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

const labels: Record<string, string> = {
  planning: 'Planning', active: 'Active', live: 'Live', paused: 'Paused', archived: 'Archived',
  todo: 'Todo', in_progress: 'In Progress', blocked: 'Blocked', done: 'Done',
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
  draft: 'Draft', completed: 'Completed', cancelled: 'Cancelled',
}

type BadgeType = 'project' | 'task' | 'priority' | 'contract'

export default function StatusBadge({ value, type }: { value: string; type: BadgeType }) {
  const colorMap =
    type === 'project'  ? projectColors  :
    type === 'task'     ? taskColors     :
    type === 'priority' ? priorityColors :
    contractColors

  const color = (colorMap as Record<string, string>)[value] ?? 'bg-zinc-500/15 text-zinc-400'
  return (
    <span className={`badge ${color}`}>
      {labels[value] ?? value}
    </span>
  )
}
