import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MARK_COLORS, MARK_LABELS, MARK_ORDER } from '@/lib/marks';
import {
  type BlockRow,
  type CommentRow,
  type MarkRow,
  type MemberRow,
} from '@/lib/room';
import type { Block, MarkKey } from '@/content/types';

interface ActivityRow {
  id: number;
  user_id: string | null;
  event: string;
  target_block_key: string | null;
  created_at: string;
}

interface Props {
  roomId: string;
  slug: string;
  roomTitle: string;
  blocks: BlockRow[];
  marks: Record<string, MarkRow>;
  comments: CommentRow[];
  members: MemberRow[];
  onResolve: (id: string, resolved: boolean) => Promise<void>;
  onComment: (blockId: string, body: string, parentId?: string) => Promise<unknown>;
}

export default function Console({
  roomId,
  slug,
  roomTitle,
  blocks,
  marks,
  comments,
  members,
  onResolve,
  onComment,
}: Props) {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [present, setPresent] = useState<string[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});

  useEffect(() => {
    void supabase
      .from('flowroom_activity')
      .select('id, user_id, event, target_block_key, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setActivity((data ?? []) as ActivityRow[]));
  }, [roomId]);

  /* -- who is in the room right now ---------------------------------- */
  useEffect(() => {
    const ch = supabase.channel(`flowroom-presence:${roomId}`, {
      config: { presence: { key: 'console' } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState() as Record<string, { email?: string }[]>;
      setPresent(Object.values(st).flatMap((v) => v.map((m) => m.email ?? 'someone')));
    }).subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [roomId]);

  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const markList = useMemo(() => Object.values(marks), [marks]);

  const markByBlock = useMemo(() => {
    const m: Record<string, MarkKey> = {};
    for (const r of markList) m[r.block_id] = r.mark;
    return m;
  }, [markList]);

  const tally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of markList) t[r.mark] = (t[r.mark] ?? 0) + 1;
    return t;
  }, [markList]);

  const openComments = useMemo(
    () =>
      comments
        .filter((c) => !c.deleted_at && !c.resolved_at)
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [comments],
  );

  const sectionsRead = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of activity) {
      if (a.event === 'section_read' && a.target_block_key && !seen.has(a.target_block_key)) {
        seen.set(a.target_block_key, a.created_at);
      }
    }
    return seen;
  }, [activity]);

  const sectionOrder = useMemo(() => {
    const out: string[] = [];
    for (const b of blocks) if (!out.includes(b.section_key)) out.push(b.section_key);
    return out;
  }, [blocks]);

  /* -- the export ----------------------------------------------------- */
  function exportSummary() {
    const lines: string[] = [
      `# ${roomTitle} — Resolution Summary`,
      '',
      `Generated ${new Date().toLocaleString()}`,
      `Room: /r/${slug}`,
      '',
      `Marks: ${markList.length} · Comments: ${comments.filter((c) => !c.deleted_at).length}`,
      '',
    ];

    for (const mark of MARK_ORDER) {
      const rows = markList.filter((m) => m.mark === mark);
      if (!rows.length) continue;
      lines.push(`## ${MARK_LABELS[mark]} (${rows.length})`, '');
      for (const r of rows) {
        const b = byId.get(r.block_id);
        if (!b) continue;
        lines.push(`### ${title(b.payload as Block)}`);
        lines.push(`\`${b.block_key}\` · §${b.section_key}`);
        const thread = comments.filter((c) => c.block_id === r.block_id && !c.deleted_at);
        for (const c of thread) {
          lines.push('', `> ${c.body.replace(/\n/g, '\n> ')}`);
          lines.push(`> — ${new Date(c.created_at).toLocaleString()}${c.resolved_at ? ' · resolved' : ''}`);
        }
        lines.push('');
      }
    }

    const unmarked = blocks.filter((b) => b.annotatable && !markByBlock[b.id]);
    if (unmarked.length) {
      lines.push(`## No response (${unmarked.length})`, '');
      for (const b of unmarked) lines.push(`- ${title(b.payload as Block)} · \`${b.block_key}\``);
      lines.push('');
    }

    lines.push('## Sections reached', '');
    for (const s of sectionOrder) {
      const at = sectionsRead.get(s);
      lines.push(`- §${s} — ${at ? `read ${new Date(at).toLocaleString()}` : 'not reached'}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-resolution-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="h-full overflow-y-auto bg-ink" data-scrollable>

      <div className="mx-auto w-full max-w-[1180px] px-6 py-14">
        <header className="mb-14 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--hair)] pb-8">
          <div>
            <p className="t-tag mb-3" style={{ color: 'var(--gold)' }}>Owner console</p>
            <h1 className="t-display text-[clamp(2rem,5vw,3rem)] text-white">{roomTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="u-slab t-mono px-4 py-2 text-white/70">
              {present.length ? `${present.length} in the room` : 'nobody in the room'}
            </span>
            <button
              type="button"
              onClick={exportSummary}
              className="t-tag px-5 py-2.5 transition-opacity hover:opacity-85"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              Export resolution summary
            </button>
          </div>
        </header>

        {/* Tally */}
        <section className="mb-16">
          <p className="t-tag mb-5" style={{ color: 'var(--gold)' }}>Where she landed</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MARK_ORDER.map((m) => (
              <div key={m} className="u-slab rounded-sm p-5">
                <p className="t-display text-[2.4rem] leading-none" style={{ color: MARK_COLORS[m] }}>
                  {tally[m] ?? 0}
                </p>
                <p className="t-mono mt-2 text-white/70">
                  {MARK_LABELS[m]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Heatmap */}
        <section className="mb-16">
          <p className="t-tag mb-5" style={{ color: 'var(--gold)' }}>The document, marked</p>
          <div className="u-slab rounded-sm p-6">
            {sectionOrder.map((s) => (
              <div key={s} className="mb-5 last:mb-0">
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="t-mono text-[var(--gold)]">
                    §{s}
                  </span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-white/65">
                    {sectionsRead.has(s) ? 'read' : 'not reached'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {blocks
                    .filter((b) => b.section_key === s)
                    .map((b) => {
                      const m = markByBlock[b.id];
                      const n = comments.filter((c) => c.block_id === b.id && !c.deleted_at).length;
                      return (
                        <span
                          key={b.id}
                          title={`${title(b.payload as Block)}${m ? ` — ${MARK_LABELS[m]}` : ''}${
                            n ? ` · ${n} comment${n > 1 ? 's' : ''}` : ''
                          }`}
                          className="h-6 w-6 rounded-[2px] transition-transform duration-300 hover:scale-125"
                          style={{
                            background: m ? MARK_COLORS[m] : 'rgba(255,255,255,0.06)',
                            outline: n ? '1px solid var(--gold)' : 'none',
                            outlineOffset: '1px',
                            opacity: b.annotatable ? 1 : 0.25,
                          }}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inbox */}
        <section className="mb-16">
          <p className="t-tag mb-5" style={{ color: 'var(--gold)' }}>Open comments · newest first</p>
          {openComments.length === 0 ? (
            <div className="u-slab rounded-sm p-8 text-center">
              <p className="text-[0.94rem] text-white/65">Nothing open. The room is quiet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {openComments.map((c) => {
                const b = byId.get(c.block_id);
                return (
                  <li key={c.id} className="u-slab rounded-sm p-6">
                    <p className="mb-2 t-mono text-[var(--gold)]">
                      {b ? title(b.payload as Block) : 'unknown block'} · §{b?.section_key}
                    </p>
                    <p className="mb-4 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-white/90">
                      {c.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        value={reply[c.id] ?? ''}
                        onChange={(e) => setReply((r) => ({ ...r, [c.id]: e.target.value }))}
                        placeholder="Reply in place…"
                        className="min-w-[14rem] flex-1 rounded-sm border border-[color:var(--hair)] bg-black/25 px-3 py-2
                                   text-[0.9rem] text-white placeholder:text-white/65/45 focus:border-[color:var(--gold)] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!reply[c.id]?.trim()}
                        onClick={async () => {
                          await onComment(c.block_id, reply[c.id].trim(), c.parent_id ?? c.id);
                          setReply((r) => ({ ...r, [c.id]: '' }));
                        }}
                        className="rounded-sm border border-[color:var(--hair)] px-4 py-2 font-mono text-[0.62rem]
                                   uppercase tracking-[0.14em] text-white hover:border-[color:var(--gold)] disabled:opacity-40"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => void onResolve(c.id, true)}
                        className="rounded-sm border border-[color:var(--hair)] px-4 py-2 font-mono text-[0.62rem]
                                   uppercase tracking-[0.14em] text-white/65 hover:border-[color:var(--gold)] hover:text-white"
                      >
                        Resolve
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Members */}
        <section>
          <p className="t-tag mb-5" style={{ color: 'var(--gold)' }}>Who is in this room</p>
          <div className="u-slab rounded-sm p-6">
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-[0.93rem] text-white/90">{m.email}</span>
                  <span className="t-mono text-white/65">
                    {m.role} ·{' '}
                    {m.last_seen_at
                      ? `seen ${new Date(m.last_seen_at).toLocaleDateString()}`
                      : 'never opened'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

/** A human label for any block kind, for the heatmap and the export. */
function title(b: Block): string {
  switch (b.kind) {
    case 'hero':
      return b.headline.replace(/_/g, '');
    case 'section_head':
      return b.title;
    case 'table_row':
      return b.system;
    case 'need_item':
      return b.label;
    case 'timeline_step':
      return `${b.when} — ${b.title}`;
    case 'option':
      return `Structure ${b.letter} — ${b.title}`;
    case 'stat':
      return `${b.figure} — ${b.label}`;
    case 'stage':
      return `${b.n} ${b.title}`;
    case 'compare':
      return `${b.left.title} vs ${b.right.title}`;
    case 'site_map':
      return b.spine.title;
    case 'prose':
      return b.title ?? b.body[0]?.slice(0, 60) ?? 'Prose';
    case 'next_item':
    case 'callout':
    case 'card':
    case 'world':
      return b.title;
    default:
      return 'Block';
  }
}
