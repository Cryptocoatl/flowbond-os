'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuditResult, AuditRound, DraftSection } from '@/lib/types';
import { blockedReason, latestByRound, roundState, RoundState } from '@/lib/review';
import { SEVERITY_COLOR, VerdictBadge } from '@/app/components/review-ui';

const STATE_NOTE: Record<RoundState, string> = {
  pending: 'Not yet run',
  pass: 'Passed',
  fail: 'Failed',
  waived: 'Waived by Steph',
  stale: 'Passed earlier, but the draft changed since — re-run',
};

export default function AuditPanel({
  applicationId,
  rounds,
  results,
  sections,
  locked,
}: {
  applicationId: string;
  rounds: AuditRound[];
  results: AuditResult[];
  sections: DraftSection[];
  locked: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [chain, setChain] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const latest = latestByRound(results);
  const blocked = blockedReason(rounds, results, sections);

  async function run(key: string): Promise<boolean> {
    setRunning(key);
    setErr(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/audit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ round: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Audit failed');
      setOpen(key);
      router.refresh();
      return json.result?.verdict === 'pass';
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Audit failed');
      return false;
    } finally {
      setRunning(null);
    }
  }

  /** Rounds are ordered for a reason — stop at the first failure. */
  async function runAll() {
    setChain(true);
    setErr(null);
    for (const r of rounds) {
      const passed = await run(r.key);
      if (!passed) {
        setErr((prev) => prev ?? `Stopped at Round ${r.round_no} — ${r.label} did not pass.`);
        break;
      }
    }
    setChain(false);
  }

  const busy = running !== null || chain;

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Audit rounds</span>
        <button
          className="gf-btn"
          onClick={runAll}
          disabled={busy || locked}
          title="Runs rounds in order and stops at the first failure"
          style={{ marginLeft: 'auto', fontSize: 12 }}
        >
          {chain ? 'Running…' : '✦ Run all rounds'}
        </button>
      </div>

      {blocked ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--gf-gold)',
            background: 'rgba(245,196,81,0.08)',
            border: '1px solid rgba(245,196,81,0.2)',
            borderRadius: 6,
            padding: '6px 9px',
            marginBottom: 8,
          }}
        >
          Not ready for review. {blocked}
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: '#6ee7b7',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(52,211,153,0.22)',
            borderRadius: 6,
            padding: '6px 9px',
            marginBottom: 8,
          }}
        >
          All rounds passed on the current text. Ready for Steph&apos;s review.
        </div>
      )}

      {err && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 8 }}>{err}</div>}

      {rounds.map((r) => {
        const state = roundState(r, results, sections);
        const res = latest.get(r.key);
        const isOpen = open === r.key;
        return (
          <div key={r.key} style={{ borderTop: '1px solid var(--gf-border)', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--gf-muted)', fontSize: 11, width: 18 }}>R{r.round_no}</span>
              <button
                onClick={() => setOpen(isOpen ? null : r.key)}
                disabled={!res}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: 'inherit',
                  cursor: res ? 'pointer' : 'default',
                  padding: 0,
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: 'left',
                  flex: 1,
                }}
              >
                {r.label}
                {!r.required && (
                  <span style={{ color: 'var(--gf-muted)', fontWeight: 400, fontSize: 11 }}>
                    {' '}
                    · optional
                  </span>
                )}
              </button>
              {res && <VerdictBadge verdict={state === 'stale' ? 'waived' : res.verdict} />}
              <button
                className="gf-btn"
                onClick={() => run(r.key)}
                disabled={busy || locked}
                style={{ fontSize: 11, padding: '3px 9px' }}
              >
                {running === r.key ? '…' : res ? 'Re-run' : 'Run'}
              </button>
            </div>

            <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginLeft: 26, marginTop: 2 }}>
              {STATE_NOTE[state]}
              {res ? ` · cycle ${res.cycle} · ${new Date(res.created_at).toLocaleString()}` : ''}
            </div>

            {isOpen && res && (
              <div style={{ marginLeft: 26, marginTop: 7 }}>
                {res.notes && (
                  <p style={{ fontSize: 12, lineHeight: 1.55, margin: '0 0 6px' }}>{res.notes}</p>
                )}
                {res.findings.length === 0 ? (
                  <div style={{ color: 'var(--gf-muted)', fontSize: 12 }}>No findings.</div>
                ) : (
                  res.findings.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        borderLeft: `2px solid ${SEVERITY_COLOR[f.severity] ?? SEVERITY_COLOR.note}`,
                        paddingLeft: 9,
                        marginTop: 7,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <div
                        style={{
                          color: SEVERITY_COLOR[f.severity] ?? SEVERITY_COLOR.note,
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {f.severity.toUpperCase()}
                        {f.section_key ? ` · ${f.section_key}` : ''}
                        {f.traceability ? ` · ${f.traceability}` : ''}
                      </div>
                      {f.claim && (
                        <div style={{ color: 'var(--gf-muted)', fontStyle: 'italic' }}>“{f.claim}”</div>
                      )}
                      <div>{f.issue}</div>
                      {f.suggestion && (
                        <div style={{ color: 'var(--gf-muted)' }}>→ {f.suggestion}</div>
                      )}
                    </div>
                  ))
                )}
                <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 7 }}>
                  {res.auditor === 'claudia' ? '✦ ClaudIA' : res.auditor}
                  {res.model ? ` · ${res.model}` : ''}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
