'use client';

import { AuditResult, AuditRound, DraftSection } from '@/lib/types';
import { VerdictBadge } from '@/app/components/review-ui';

/**
 * The append-only history, grouped by cycle. A cycle is one pass over the draft:
 * a new one begins whenever a section is edited after the last verdict — which is
 * exactly what makes "did round 2 improve?" answerable.
 */
export default function AuditTrail({
  rounds,
  results,
  sections,
}: {
  rounds: AuditRound[];
  results: AuditResult[];
  sections: DraftSection[];
}) {
  if (!results.length) {
    return (
      <div style={{ color: 'var(--gf-muted)', fontSize: 12, padding: '10px 0' }}>
        No audit history yet.
      </div>
    );
  }

  const label = new Map(rounds.map((r) => [r.key, r]));
  const cycles = [...new Set(results.map((r) => r.cycle))].sort((a, b) => b - a);
  const lastEdit = sections.length
    ? sections.reduce((m, s) => (s.updated_at > m ? s.updated_at : m), sections[0].updated_at)
    : null;

  return (
    <div style={{ marginTop: 6 }}>
      {cycles.map((cycle) => {
        const inCycle = results
          .filter((r) => r.cycle === cycle)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const blockers = inCycle.reduce(
          (n, r) => n + r.findings.filter((f) => f.severity === 'blocker').length,
          0,
        );
        const passed = inCycle.filter((r) => r.verdict === 'pass').length;

        return (
          <div key={cycle} style={{ borderTop: '1px solid var(--gf-border)', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Cycle {cycle}</span>
              <span style={{ color: 'var(--gf-muted)', fontSize: 11 }}>
                {passed}/{inCycle.length} passed · {blockers} blocker{blockers === 1 ? '' : 's'} ·{' '}
                {new Date(inCycle[0].created_at).toLocaleString()}
              </span>
            </div>

            {inCycle.map((r) => {
              const round = label.get(r.round_key);
              const stale = lastEdit ? r.created_at < lastEdit : false;
              return (
                <div key={r.id} style={{ marginTop: 8, paddingLeft: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--gf-muted)', fontSize: 11 }}>
                      R{round?.round_no ?? '?'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {round?.label ?? r.round_key}
                    </span>
                    <VerdictBadge verdict={r.verdict} />
                    {stale && (
                      <span style={{ color: '#fcd34d', fontSize: 11 }}>superseded by an edit</span>
                    )}
                    <span style={{ color: 'var(--gf-muted)', fontSize: 11, marginLeft: 'auto' }}>
                      {new Date(r.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {r.notes && (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        margin: '3px 0 0',
                        color: 'var(--gf-muted)',
                      }}
                    >
                      {r.notes}
                    </p>
                  )}
                  {r.findings.length > 0 && (
                    <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 3 }}>
                      {r.findings.length} finding{r.findings.length === 1 ? '' : 's'}:{' '}
                      {r.findings
                        .slice(0, 3)
                        .map((f) => f.issue)
                        .join(' · ')}
                      {r.findings.length > 3 ? ' …' : ''}
                    </div>
                  )}
                  <div style={{ color: 'var(--gf-muted)', fontSize: 11, marginTop: 3 }}>
                    {r.auditor === 'claudia' ? '✦ ClaudIA' : r.auditor}
                    {r.model ? ` · ${r.model}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
