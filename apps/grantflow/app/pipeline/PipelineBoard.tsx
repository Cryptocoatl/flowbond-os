'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STAGES, Stage } from '@/lib/types';

interface Draft {
  summary: string;
  answers: { q: string; a: string }[];
  budget_ask: string;
  fit_rationale: string;
  open_questions: string[];
  sources_used: string[];
}

export interface PipelineCard {
  id: string;
  grant_id: string | null;
  grantName: string;
  projectName: string | null;
  hasProject: boolean;
  stage: string;
  owner: string | null;
  amount_requested: string | null;
  notes: string | null;
  draft: Draft | null;
  draftStatus: string;
  draftedBy: string | null;
}

const STAGE_LABEL: Record<string, string> = {
  discovered: 'Discovered',
  researching: 'Researching',
  drafting: 'Drafting',
  submitted: 'Submitted',
  won: 'Won',
  rejected: 'Rejected',
  skipped: 'Skipped',
};

export default function PipelineBoard({ cards }: { cards: PipelineCard[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function move(id: string, stage: string) {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, stage }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function draft(id: string) {
    setDrafting(id);
    setErr(null);
    try {
      const res = await fetch(`/api/applications/${id}/draft`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Drafting failed');
      setOpen(id);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Drafting failed');
    } finally {
      setDrafting(null);
    }
  }

  const byStage = (s: string) => cards.filter((c) => c.stage === s);

  return (
    <>
      {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STAGES.length}, minmax(220px, 1fr))`,
          gap: 12,
          marginTop: 18,
          overflowX: 'auto',
          paddingBottom: 12,
        }}
      >
        {(STAGES as readonly Stage[]).map((s) => {
          const items = byStage(s);
          return (
            <section key={s} className="gf-card" style={{ background: 'transparent', padding: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{STAGE_LABEL[s] ?? s}</span>
                <span style={{ color: 'var(--gf-muted)', fontSize: 12 }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((c) => (
                  <div key={c.id} className="gf-card" style={{ padding: '10px 12px' }}>
                    {c.grant_id ? (
                      <Link href={`/grants/${c.grant_id}`} className="link" style={{ fontWeight: 600, fontSize: 14 }}>
                        {c.grantName}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.grantName}</span>
                    )}
                    {c.projectName && (
                      <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 2 }}>
                        → {c.projectName}
                      </div>
                    )}
                    {(c.owner || c.amount_requested) && (
                      <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 6 }}>
                        {[c.owner, c.amount_requested].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {c.notes && (
                      <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{c.notes}</div>
                    )}

                    {/* ClaudIA grant writer */}
                    <div style={{ marginTop: 10 }}>
                      {c.draftStatus === 'drafted' || c.draftStatus === 'edited' || c.draftStatus === 'approved' ? (
                        <button
                          className="gf-btn"
                          onClick={() => setOpen(open === c.id ? null : c.id)}
                          style={{ width: '100%', justifyContent: 'center', fontSize: 12, background: 'transparent' }}
                        >
                          ✦ {open === c.id ? 'Hide' : 'View'} ClaudIA draft
                        </button>
                      ) : (
                        <button
                          className="gf-btn"
                          disabled={drafting === c.id || !c.hasProject}
                          onClick={() => draft(c.id)}
                          title={c.hasProject ? 'ClaudIA drafts this application' : 'Attach a project first'}
                          style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                        >
                          {drafting === c.id ? 'ClaudIA is drafting…' : '✦ Draft with ClaudIA'}
                        </button>
                      )}
                    </div>

                    {open === c.id && c.draft && (
                      <div
                        className="gf-card"
                        style={{ marginTop: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.5 }}
                      >
                        <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginBottom: 6 }}>
                          ✦ drafted by ClaudIA · review before submitting
                        </div>
                        <strong>Summary</strong>
                        <p style={{ marginTop: 2 }}>{c.draft.summary}</p>
                        <strong>Budget ask</strong>
                        <p style={{ marginTop: 2 }}>{c.draft.budget_ask}</p>
                        <strong>Why it fits</strong>
                        <p style={{ marginTop: 2 }}>{c.draft.fit_rationale}</p>
                        <strong>Answers</strong>
                        {c.draft.answers.map((a, i) => (
                          <div key={i} style={{ marginTop: 6 }}>
                            <div style={{ fontWeight: 600 }}>{a.q}</div>
                            <div style={{ color: 'var(--gf-muted)' }}>{a.a}</div>
                          </div>
                        ))}
                        {c.draft.open_questions.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <strong style={{ color: 'var(--gf-gold)' }}>Steph must supply</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                              {c.draft.open_questions.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <label style={{ display: 'block', marginTop: 10 }}>
                      <select
                        className="gf-select"
                        value={c.stage}
                        disabled={busy === c.id}
                        onChange={(e) => move(c.id, e.target.value)}
                        style={{ width: '100%', fontSize: 12 }}
                      >
                        {STAGES.map((st) => (
                          <option key={st} value={st}>
                            Move to: {STAGE_LABEL[st] ?? st}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ color: 'var(--gf-muted)', fontSize: 12, padding: '8px 2px' }}>—</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
