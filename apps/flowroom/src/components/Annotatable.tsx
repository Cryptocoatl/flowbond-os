import { useEffect, useState } from 'react'
import type { MarkKey } from '@/content/types'
import { MARK_COLORS, MARK_LABELS, MARK_ORDER } from '@/lib/marks';
import { type CommentRow } from '@/lib/room'
import CommentThread from './CommentThread'

/**
 * The mark gutter, deck edition.
 *
 * Five marks as hard-edged swatches, sitting on the block's top-right corner.
 * On a pointer device they surface on hover; on touch they are always there,
 * because she will open this on a phone and hover does not exist.
 *
 * One tap sets a mark, a second tap on the same mark clears it. A marked block
 * carries a solid colour bar down its left edge so the deck reads as annotated
 * at a glance without anything shifting position.
 */
export interface AnnotatableProps {
  blockId: string
  blockKey: string
  accent: string
  onColor: boolean
  mark?: MarkKey
  comments: CommentRow[]
  userId: string
  isOwner: boolean
  onMark: (blockId: string, mark: MarkKey | null) => Promise<void>
  onComment: (blockId: string, body: string, parentId?: string) => Promise<unknown>
  onResolve: (commentId: string, resolved: boolean) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  canMark?: boolean
  canComment?: boolean
  children: React.ReactNode
}

export default function Annotatable({
  blockId,
  blockKey,
  onColor,
  mark,
  comments,
  userId,
  isOwner,
  onMark,
  onComment,
  onResolve,
  onDelete,
  canMark = true,
  canComment = true,
  children,
}: AnnotatableProps) {
  const [hover, setHover] = useState(false)
  const [thread, setThread] = useState(false)
  const [failed, setFailed] = useState(false)

  const live = comments.filter((c) => !c.deleted_at)
  const unresolved = live.filter((c) => !c.resolved_at).length
  const visible = hover || Boolean(mark) || unresolved > 0

  useEffect(() => {
    if (!thread) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setThread(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [thread])

  async function choose(m: MarkKey) {
    setFailed(false)
    try {
      await onMark(blockId, mark === m ? null : m)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div
      data-anim
      data-block-key={blockKey}
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="h-full transition-[padding] duration-300 ease-deck"
        style={
          mark
            ? { boxShadow: `inset 5px 0 0 0 ${MARK_COLORS[mark]}`, paddingLeft: '0.85rem' }
            : undefined
        }
      >
        {children}
      </div>

      <div
        className={[
          'absolute -top-3 right-0 z-30 flex items-stretch',
          'transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          '[@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:pointer-events-auto',
        ].join(' ')}
        style={{ background: 'var(--ink)', border: '1px solid var(--hair)' }}
      >
        {canMark &&
          MARK_ORDER.map((m) => {
            const active = mark === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => choose(m)}
                aria-pressed={active}
                aria-label={MARK_LABELS[m]}
                title={MARK_LABELS[m]}
                className="group/dot relative grid h-7 w-7 place-items-center"
              >
                <span
                  className="block transition-all duration-200"
                  style={{
                    width: active ? 15 : 9,
                    height: active ? 15 : 9,
                    background: active ? MARK_COLORS[m] : 'transparent',
                    border: `2px solid ${MARK_COLORS[m]}`,
                    opacity: active ? 1 : 0.62,
                  }}
                />
                <span
                  className="t-tag pointer-events-none absolute -top-7 right-0 whitespace-nowrap px-2 py-[3px]
                           opacity-0 transition-opacity duration-150 group-hover/dot:opacity-100"
                  style={{ background: MARK_COLORS[m], color: 'var(--ink)', fontSize: '0.62rem' }}
                >
                  {MARK_LABELS[m]}
                </span>
              </button>
            )
          })}

        {canComment && (
          <button
            type="button"
            onClick={() => setThread((t) => !t)}
            aria-expanded={thread}
            aria-label={unresolved ? `${unresolved} open comments` : 'Add a comment'}
            className="t-mono grid h-7 min-w-7 place-items-center border-l px-2"
            style={{
              borderColor: 'var(--hair)',
              color: unresolved ? 'var(--gold)' : 'rgb(255 255 255 / 0.6)',
            }}
          >
            {unresolved > 0 ? unresolved : '＋'}
          </button>
        )}
      </div>

      {failed && (
        <p className="t-mono mt-2" role="alert" style={{ color: 'var(--rose)' }}>
          Didn’t save — check your connection
        </p>
      )}

      {thread && (
        <div
          className="absolute right-0 top-6 z-40"
          style={{ width: 'min(24rem, calc(100vw - 4rem))' }}
        >
          <CommentThread
            blockId={blockId}
            comments={live}
            userId={userId}
            isOwner={isOwner}
            onComment={onComment}
            onResolve={onResolve}
            onDelete={onDelete}
            onClose={() => setThread(false)}
          />
        </div>
      )}
      {onColor && null}
    </div>
  )
}
