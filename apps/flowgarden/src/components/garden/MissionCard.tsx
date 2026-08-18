'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { shortDate } from '@/lib/format'

export interface MissionCardProps {
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
  claimer_name: string | null
  completer_name: string | null
  xp_reward: number
  currentUserId: string
  gardenId: string
}

export function MissionCard(props: MissionCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showComplete, setShowComplete] = useState(false)
  const [notes, setNotes] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error' | 'done'>('idle')
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isMine = props.claimed_by_user_id === props.currentUserId
  const isDone = props.status === 'completed' || props.status === 'dismissed'
  const isOverdue = !!props.due_at && new Date(props.due_at) < new Date() && props.status !== 'completed' && props.status !== 'dismissed'
  const dueStr = props.due_at ? shortDate(props.due_at) : null

  async function handleUpload(file: File) {
    setUploadStatus('uploading')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/flowgarden/upload', { method: 'POST', body: form })
      if (!res.ok) { setUploadStatus('error'); return }
      const { path } = await res.json()
      setPhotoPath(path)
      setUploadStatus('done')
    } catch {
      setUploadStatus('error')
    }
  }

  function claim() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/flowgarden/tasks/${props.id}/claim`, { method: 'POST' })
      if (!res.ok) { setError('Could not take this mission. Try again.'); return }
      router.refresh()
    })
  }

  function complete() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/flowgarden/tasks/${props.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_notes: notes || null, photo_path: photoPath }),
      })
      if (!res.ok) { setError('Could not save. Try again.'); return }
      setShowComplete(false)
      router.refresh()
    })
  }

  return (
    <div
      className={`card flex gap-4 transition-opacity ${isDone ? 'opacity-70' : ''}`}
      style={
        isOverdue
          ? { borderColor: 'var(--fg-danger-line)' }
          : props.urgency === 'urgent' || props.urgency === 'high'
            ? { borderColor: 'var(--fg-warn-line)' }
            : undefined
      }
    >
      {/* Status dot */}
      <div className="shrink-0 pt-0.5">
        <span
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
          style={
            isDone
              ? { backgroundColor: 'var(--fg-green)', borderColor: 'var(--fg-green)' }
              : { borderColor: 'var(--fg-border-accent)' }
          }
          aria-hidden
        >
          {isDone && (
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Title + urgency */}
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-semibold leading-snug"
            style={{
              color: isDone ? 'var(--fg-text-muted)' : 'var(--fg-text)',
              textDecoration: isDone ? 'line-through' : undefined,
            }}
          >
            {props.title}
          </p>
          {props.urgency !== 'none' && !isDone && (
            <span className={`urgency-${props.urgency} shrink-0 capitalize`}>{props.urgency}</span>
          )}
        </div>

        {props.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-text-secondary)' }}>
            {props.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
          {props.is_mission && (
            <span className="font-medium" style={{ color: 'var(--fg-gold)' }}>⚡ Mission</span>
          )}
          {props.xp_reward > 0 && !isDone && (
            <span className="font-medium" style={{ color: 'var(--fg-success)' }}>+{props.xp_reward} XP</span>
          )}
          {dueStr && (
            <span
              className={isOverdue ? 'font-semibold' : ''}
              style={{ color: isOverdue ? 'var(--fg-danger)' : 'var(--fg-text-muted)' }}
            >
              {isOverdue ? `Overdue · ${dueStr}` : `Due ${dueStr}`}
            </span>
          )}
        </div>

        {/* Status banner */}
        {props.status === 'in_progress' && (
          <div
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--fg-warn-bg)', border: '1px solid var(--fg-warn-line)', color: 'var(--fg-warn)' }}
          >
            In progress by {isMine ? 'you' : (props.claimer_name ?? 'a member')}
          </div>
        )}

        {props.status === 'completed' && props.completer_name && (
          <div
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--fg-success-bg)', border: '1px solid var(--fg-success-line)', color: 'var(--fg-success)' }}
          >
            ✓ Completed by {props.completer_name}
            {props.completed_at ? ` · ${shortDate(props.completed_at)}` : ''}
            {props.completion_photo_url ? ' · 📷 photo' : ''}
          </div>
        )}

        {props.status === 'completed' && props.completion_notes && (
          <p className="text-xs italic mt-1.5" style={{ color: 'var(--fg-text-muted)' }}>
            &ldquo;{props.completion_notes}&rdquo;
          </p>
        )}

        {error && <p className="alert-error mt-2">{error}</p>}

        {/* Actions */}
        {!isDone && (
          <div className="mt-3 flex flex-wrap gap-2">
            {props.status === 'pending' && (
              <button
                type="button"
                onClick={claim}
                disabled={isPending}
                className="btn-primary text-xs px-3.5 py-2 disabled:opacity-60 active:scale-95 touch-manipulation"
              >
                {isPending ? 'Claiming…' : '⚡ Take this mission'}
              </button>
            )}

            {props.status === 'in_progress' && isMine && !showComplete && (
              <button
                type="button"
                onClick={() => setShowComplete(true)}
                className="btn-gold text-xs px-3.5 py-2 active:scale-95 touch-manipulation"
              >
                ✓ I finished it
              </button>
            )}

            {props.status === 'in_progress' && !isMine && (
              <p className="text-xs" style={{ color: 'var(--fg-text-dim)' }}>
                {props.claimer_name ?? 'A member'} is on it.
              </p>
            )}
          </div>
        )}

        {/* Completion panel */}
        {showComplete && (
          <div
            className="mt-3 rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--fg-panel)', border: '1px solid var(--fg-border)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--fg-text)' }}>Mark mission complete</p>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it go? (optional)"
              rows={2}
              className="input-field resize-none"
              aria-label="Completion notes"
            />

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary text-xs px-3 py-2"
              >
                {uploadStatus === 'uploading' ? 'Uploading…'
                  : uploadStatus === 'done' ? '📷 Photo attached ✓'
                  : uploadStatus === 'error' ? '⚠️ Upload failed — retry'
                  : '📷 Add photo proof'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={complete}
                disabled={isPending}
                className="btn-primary text-xs px-4 py-2 disabled:opacity-60"
              >
                {isPending ? 'Saving…' : `✓ Complete${props.xp_reward > 0 ? ` · +${props.xp_reward} XP` : ''}`}
              </button>
              <button
                type="button"
                onClick={() => setShowComplete(false)}
                className="btn-ghost text-xs px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
