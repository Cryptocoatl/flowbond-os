'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'

const urgencyConfig: Record<string, { color: string; bg: string }> = {
  urgent: { color: 'text-red-700',   bg: 'bg-red-100' },
  high:   { color: 'text-amber-700', bg: 'bg-amber-100' },
  medium: { color: 'text-stone-600', bg: 'bg-stone-100' },
  low:    { color: 'text-stone-500', bg: 'bg-stone-50' },
  none:   { color: 'text-stone-400', bg: 'bg-stone-50' },
}

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const urg = urgencyConfig[props.urgency] ?? urgencyConfig.none
  const isMine = props.claimed_by_user_id === props.currentUserId
  const isDone = props.status === 'completed' || props.status === 'dismissed'
  const isOverdue = props.due_at && new Date(props.due_at) < new Date() && props.status === 'pending'

  const dueStr = props.due_at
    ? new Date(props.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  async function handleUpload(file: File) {
    setUploadStatus('uploading')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/flowgarden/upload', { method: 'POST', body: form })
    if (!res.ok) { setUploadStatus('idle'); return }
    const { path } = await res.json()
    setPhotoPath(path)
    setUploadStatus('done')
  }

  function claim() {
    startTransition(async () => {
      await fetch(`/api/flowgarden/tasks/${props.id}/claim`, { method: 'POST' })
      router.refresh()
    })
  }

  function complete() {
    startTransition(async () => {
      await fetch(`/api/flowgarden/tasks/${props.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_notes: notes || null, photo_path: photoPath }),
      })
      setShowComplete(false)
      router.refresh()
    })
  }

  return (
    <div className={`card flex gap-4 ${isDone ? 'opacity-60' : ''}`}>
      {/* Checkbox */}
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
        {/* Title + urgency */}
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>
            {props.title}
          </p>
          {props.urgency !== 'none' && (
            <span className={`badge ${urg.bg} ${urg.color} shrink-0 capitalize`}>{props.urgency}</span>
          )}
        </div>

        {props.description && (
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{props.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {props.is_mission && <span className="text-xs text-amber-600 font-medium">⚡ Mission</span>}
          {props.xp_reward > 0 && !isDone && (
            <span className="text-xs text-emerald-600 font-medium">+{props.xp_reward} XP</span>
          )}
          {dueStr && (
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
              {isOverdue ? 'Overdue · ' : 'Due '}{dueStr}
            </span>
          )}
        </div>

        {/* Status banner */}
        {props.status === 'in_progress' && (
          <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            <span className="text-xs text-amber-700 font-medium">
              In progress by {isMine ? 'you' : (props.claimer_name ?? 'a member')}
            </span>
          </div>
        )}

        {props.status === 'completed' && props.completer_name && (
          <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
            <span className="text-xs text-emerald-700 font-medium">
              ✓ Completed by {props.completer_name}
              {props.completed_at ? ` · ${new Date(props.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
            </span>
            {props.completion_photo_url && (
              <span className="text-xs text-emerald-500">· 📷 photo</span>
            )}
          </div>
        )}

        {/* Completion notes */}
        {props.status === 'completed' && props.completion_notes && (
          <p className="text-xs text-stone-400 italic mt-1">&ldquo;{props.completion_notes}&rdquo;</p>
        )}

        {/* Action buttons */}
        {!isDone && (
          <div className="mt-3 flex flex-wrap gap-2">
            {props.status === 'pending' && (
              <button
                onClick={claim}
                disabled={isPending}
                className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg px-3 py-1.5 transition-colors touch-manipulation active:scale-95"
              >
                {isPending ? 'Claiming…' : '⚡ Take this mission'}
              </button>
            )}

            {props.status === 'in_progress' && isMine && !showComplete && (
              <button
                onClick={() => setShowComplete(true)}
                className="text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-white rounded-lg px-3 py-1.5 transition-colors touch-manipulation active:scale-95"
              >
                ✓ I finished it
              </button>
            )}
          </div>
        )}

        {/* Completion panel */}
        {showComplete && (
          <div className="mt-3 bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-700">Mark mission complete</p>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it go? (optional)"
              rows={2}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,image/heic,image/heif"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-100 transition-colors"
              >
                {uploadStatus === 'uploading' ? 'Uploading…' : uploadStatus === 'done' ? '📷 Photo attached ✓' : '📷 Add photo proof'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={complete}
                disabled={isPending}
                className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg px-4 py-1.5 transition-colors"
              >
                {isPending ? 'Saving…' : '✓ Complete mission'}
              </button>
              <button
                onClick={() => setShowComplete(false)}
                className="text-xs text-stone-400 hover:text-stone-600 px-2"
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
