'use client'
import { useState, useTransition } from 'react'
import StatusBadge from '@/components/StatusBadge'
import type { OpsTask, TaskStatus, TaskPriority } from '@/lib/types'

const statusOrder: TaskStatus[] = ['blocked', 'in_progress', 'todo', 'done']

export default function TaskList({ projectId, initialTasks }: { projectId: string; initialTasks: OpsTask[] }) {
  const [tasks, setTasks] = useState<OpsTask[]>(initialTasks)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [, startTransition] = useTransition()

  const openTasks = tasks.filter(t => t.status !== 'done')
  const grouped = statusOrder.reduce<Record<string, OpsTask[]>>((acc, s) => {
    acc[s] = openTasks.filter(t => t.status === s)
    return acc
  }, {})

  async function updateStatus(taskId: string, status: TaskStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status }),
    })
  }

  async function addTask() {
    if (!newTitle.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, title: newTitle.trim(), priority: newPriority }),
    })
    const { task } = await res.json()
    if (task) {
      setTasks(prev => [...prev, task])
      setNewTitle('')
      setAdding(false)
    }
  }

  return (
    <div className="space-y-2">
      {openTasks.length === 0 && !adding && (
        <div className="card text-center py-6 text-ops-dim text-sm">No open tasks</div>
      )}

      {statusOrder.filter(s => s !== 'done' && grouped[s].length > 0).map(status => (
        <div key={status} className="space-y-1.5">
          {grouped[status].length > 0 && (
            <p className="text-[10px] font-semibold text-ops-muted uppercase tracking-wider px-1">
              {status.replace('_', ' ')} ({grouped[status].length})
            </p>
          )}
          {grouped[status].map(t => (
            <div key={t.id} className="card flex items-start gap-3 group">
              <button
                onClick={() => updateStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
                className="mt-0.5 w-4 h-4 rounded border border-ops-muted shrink-0 hover:border-emerald-400 hover:bg-emerald-400/10 transition-colors"
                title="Mark done"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ops-text">{t.title}</p>
                {t.notes && <p className="text-xs text-ops-dim mt-0.5">{t.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge value={t.priority} type="priority" />
                <select
                  value={t.status}
                  onChange={e => updateStatus(t.id, e.target.value as TaskStatus)}
                  className="text-[10px] bg-ops-border text-ops-dim rounded px-1 py-0.5 border-none outline-none cursor-pointer"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ))}

      {adding ? (
        <div className="card space-y-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Task description..."
            className="input"
          />
          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TaskPriority)}
              className="select w-auto text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button onClick={addTask} className="btn-primary text-xs px-3 py-1.5">Add</button>
            <button onClick={() => setAdding(false)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full card text-sm text-ops-dim hover:text-ops-text hover:border-ops-muted transition-colors text-left"
        >
          + Add task
        </button>
      )}
    </div>
  )
}
