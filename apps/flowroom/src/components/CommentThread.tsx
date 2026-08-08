import { useMemo, useRef, useState } from 'react';
import type { CommentRow } from '@/lib/room';

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface Props {
  blockId: string;
  comments: CommentRow[];
  userId: string;
  isOwner: boolean;
  onComment: (blockId: string, body: string, parentId?: string) => Promise<unknown>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onClose: () => void;
}

export default function CommentThread({
  blockId,
  comments,
  userId,
  isOwner,
  onComment,
  onResolve,
  onDelete,
  onClose,
}: Props) {
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { roots, repliesOf } = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const repliesOf: Record<string, CommentRow[]> = {};
    for (const c of comments) if (c.parent_id) (repliesOf[c.parent_id] ??= []).push(c);
    return { roots, repliesOf };
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onComment(blockId, text, replyTo ?? undefined);
      setBody('');
      setReplyTo(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-30 p-5" style={{ background: 'var(--ink)', border: '1px solid var(--hair)' }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="t-tag">
          {comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Comment'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="t-mono text-white/60 transition-colors hover:text-white"
        >
          Close
        </button>
      </div>

      {roots.length > 0 && (
        <ul className="mb-5 space-y-4">
          {roots.map((c) => (
            <li key={c.id} className={c.resolved_at ? 'opacity-50' : undefined}>
              <Comment
                c={c}
                mine={c.user_id === userId}
                isOwner={isOwner}
                onReply={() => {
                  setReplyTo(c.id);
                  inputRef.current?.focus();
                }}
                onResolve={onResolve}
                onDelete={onDelete}
              />
              {repliesOf[c.id]?.length > 0 && (
                <ul className="mt-3 space-y-3 border-l border-[color:var(--hair)] pl-4">
                  {repliesOf[c.id].map((r) => (
                    <li key={r.id}>
                      <Comment
                        c={r}
                        mine={r.user_id === userId}
                        isOwner={isOwner}
                        onResolve={onResolve}
                        onDelete={onDelete}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit}>
        {replyTo && (
          <p className="t-mono mb-2 text-[color:var(--gold)]">
            Replying ·{' '}
            <button type="button" onClick={() => setReplyTo(null)} className="underline">
              cancel
            </button>
          </p>
        )}
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit(e);
          }}
          rows={3}
          maxLength={8000}
          placeholder="What’s the question?"
          className="w-full resize-none rounded-sm border border-[color:var(--hair)] bg-black/25 px-3.5 py-3
                     text-[0.95rem] text-white placeholder:text-white/40 transition-colors
                     focus:border-[color:var(--gold)] focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="t-mono text-white/50">⌘↵ to send</span>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="t-tag px-4 py-2 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            {busy ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Comment({
  c,
  mine,
  isOwner,
  onReply,
  onResolve,
  onDelete,
}: {
  c: CommentRow;
  mine: boolean;
  isOwner: boolean;
  onReply?: () => void;
  onResolve: (id: string, resolved: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div>
      <p className="t-mono mb-1.5 text-white/60">
        {mine ? 'You' : 'Them'} · {when(c.created_at)}
        {c.resolved_at && <span className="ml-2" style={{ color: 'var(--gold)' }}>resolved</span>}
      </p>
      <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-white/92">{c.body}</p>
      <div className="mt-2 flex gap-4">
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="t-mono text-white/60 transition-colors hover:text-white"
          >
            Reply
          </button>
        )}
        {(isOwner || mine) && (
          <button
            type="button"
            onClick={() => void onResolve(c.id, !c.resolved_at)}
            className="t-mono text-white/60 transition-colors hover:text-white"
          >
            {c.resolved_at ? 'Reopen' : 'Resolve'}
          </button>
        )}
        {mine && (
          <button
            type="button"
            onClick={() => void onDelete(c.id)}
            className="t-mono text-white/60 transition-colors hover:text-[color:var(--rose)]"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
