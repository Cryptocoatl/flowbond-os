import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import VaultGate from '@/vault/VaultGate'
import InviteKeys from '@/vault/InviteKeys'
import FlowMe from '@/flowme/FlowMe'
import ErrorBoundary from '@/components/ErrorBoundary'
import { can, clearSession, loadSession, saveSession, type Session } from '@/vault/session'
import { emptyNotes, fetchNotes, pushComment, pushMark, type NotesState } from '@/vault/notes'
import type { BlockRow, CommentRow } from '@/lib/room'
import type { MarkKey } from '@/content/types'
import room1mwd from '@/content/rooms/1mwd'

const ScrollRoom = lazy(() => import('@/scroll/ScrollRoom'))

/**
 * Routes.
 *
 * `/1MWDproposal` is the one that gets sent. `/preview` is the same room with
 * the vault skipped, for looking at the design without turning a key.
 */
const PROPOSAL_PATH = '/1mwdproposal'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase()
  if (path === '/preview') return <Room session={{ name: 'Preview', role: 'owner' }} preview />
  if (path === PROPOSAL_PATH || path === '') return <Proposal />
  return <NotFound />
}

function Proposal() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  if (!session) {
    return (
      <VaultGate
        onOpen={(s) => {
          saveSession(s)
          // Drop the key from the URL once it has been used, so a shared
          // screenshot of the address bar does not hand it on again.
          if (window.location.search) {
            window.history.replaceState({}, '', window.location.pathname)
          }
          setSession(s)
        }}
      />
    )
  }
  return <Room session={session} />
}

/* ------------------------------------------------------------------ */

function Room({ session, preview = false }: { session: Session; preview?: boolean }) {
  const permissions = can(session.role)
  const [notes, setNotes] = useState<NotesState>(emptyNotes)

  const blocks = useMemo(() => {
    const m = new Map<string, BlockRow>()
    room1mwd.blocks.forEach((b, i) =>
      m.set(b.key, {
        id: b.key,
        block_key: b.key,
        section_key: b.section,
        ordinal: i,
        kind: b.kind,
        annotatable: b.annotatable !== false,
        payload: b,
      }),
    )
    return m
  }, [])

  /* Everyone's notes, from the server. Polled gently so a crew reading
     together sees each other's questions appear without a refresh. */
  const reload = useCallback(() => {
    void fetchNotes().then(setNotes)
  }, [])

  useEffect(() => {
    reload()
    const t = setInterval(reload, 25000)
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [reload])

  const onMark = useCallback(
    async (blockId: string, mark: MarkKey | null) => {
      if (!permissions.mark) return
      // Optimistic: the square fills instantly, then the server confirms.
      setNotes((n) => {
        const forBlock = { ...(n.marks[blockId] ?? {}) }
        if (mark === null) delete forBlock[session.name]
        else forBlock[session.name] = mark
        return { ...n, marks: { ...n.marks, [blockId]: forBlock } }
      })
      await pushMark(session, blockId, mark)
    },
    [permissions.mark, session],
  )

  const onComment = useCallback(
    async (blockId: string, body: string) => {
      if (!permissions.comment) return null
      const saved = await pushComment(session, blockId, body)
      const note = saved ?? {
        id: `local:${Date.now()}`,
        block_key: blockId,
        author: session.name,
        role: session.role,
        mark: null,
        body,
        created_at: new Date().toISOString(),
      }
      setNotes((n) => ({
        ...n,
        comments: { ...n.comments, [blockId]: [...(n.comments[blockId] ?? []), note] },
      }))
      return note
    },
    [permissions.comment, session],
  )

  /** Her own marks drive the gutter; everyone else's are visible in the console. */
  const myMarks = useMemo(() => {
    const out: Record<string, MarkKey> = {}
    for (const [block, byAuthor] of Object.entries(notes.marks)) {
      const mine = byAuthor[session.name]
      if (mine) out[block] = mine
    }
    return out
  }, [notes.marks, session.name])

  const commentsByBlock = useMemo(() => {
    const out: Record<string, CommentRow[]> = {}
    for (const [block, list] of Object.entries(notes.comments)) {
      out[block] = list.map((c) => ({
        id: c.id,
        block_id: block,
        parent_id: null,
        user_id: c.author,
        body: c.body ?? '',
        resolved_at: null,
        deleted_at: null,
        created_at: c.created_at,
      }))
    }
    return out
  }, [notes.comments])

  const noop = useCallback(async () => {}, [])

  return (
    <Suspense fallback={<Booting />}>
      <ScrollRoom
        blocks={blocks}
        role={session.role === 'owner' ? 'owner' : 'guest'}
        userId={session.name}
        slug="1mwd"
        myMarks={permissions.mark ? myMarks : {}}
        commentsByBlock={commentsByBlock}
        onMark={onMark}
        onComment={onComment}
        onResolve={noop}
        onDelete={noop}
        canMark={permissions.mark}
        canComment={permissions.comment}
      />

      {/* Fenced: neither of these is worth losing the room over. */}
      <ErrorBoundary label="FlowMe">
        <FlowMe canMark={permissions.mark} canComment={permissions.comment} />
      </ErrorBoundary>

      {permissions.invite && !preview && (
        <ErrorBoundary label="Share the key">
          <InviteKeys from={session.name} ownerKey={session.key} />
        </ErrorBoundary>
      )}

      {preview ? (
        <p
          className="t-mono fixed left-4 top-4 z-50 px-3 py-1.5"
          style={{ background: 'var(--gold)', color: 'var(--ink)' }}
        >
          Preview · nothing is saved
        </p>
      ) : (
        <>
          <span
            className="t-mono fixed left-4 top-11 z-50 px-2 py-1"
            style={{
              background: 'rgb(13 7 22 / 0.82)',
              border: '1px solid var(--hair)',
              color: notes.online ? 'var(--aqua)' : 'var(--sun)',
            }}
            title={
              notes.online
                ? 'Your notes are saved and shared with Steph'
                : 'Saved on this device — they will sync when the connection returns'
            }
          >
            {notes.online ? '● saved & shared' : '○ saved on this device'}
          </span>
          <button
            type="button"
            onClick={() => {
              clearSession()
              window.location.reload()
            }}
            className="t-mono fixed left-4 top-4 z-50 px-3 py-1.5 text-white/70 transition-colors hover:text-white"
            style={{ background: 'rgb(13 7 22 / 0.82)', border: '1px solid var(--hair)' }}
          >
            {session.from ? `${session.name} · key from ${session.from}` : session.name} · lock
          </button>
        </>
      )}
    </Suspense>
  )
}

function Booting() {
  return (
    <div className="grid h-[100svh] place-items-center bg-ink">
      <p className="t-tag" style={{ color: 'var(--gold)' }}>
        Opening
      </p>
    </div>
  )
}

function NotFound() {
  return (
    <div className="grid h-[100svh] place-items-center bg-ink px-6">
      <div className="max-w-[24rem] text-center">
        <p className="t-display mb-4 text-[2.4rem] text-white">Check your link.</p>
        <p className="t-body mx-auto">
          This flow is only reachable from the invitation it was sent with.
        </p>
      </div>
    </div>
  )
}
