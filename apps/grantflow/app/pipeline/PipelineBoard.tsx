'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STAGES, Stage } from '@/lib/types';

export interface PipelineCard {
  id: string;
  grant_id: string | null;
  grantName: string;
  projectName: string | null;
  stage: string;
  owner: string | null;
  amount_requested: string | null;
  notes: string | null;
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
