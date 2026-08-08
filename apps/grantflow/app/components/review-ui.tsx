'use client';

import { deadlineLabel, deadlineTone, RoundState } from '@/lib/review';
import { REVIEW_STATE_LABEL, ReviewState } from '@/lib/types';

const DEADLINE_STYLE: Record<string, { color: string; border: string; bg: string }> = {
  red: { color: '#fca5a5', border: 'rgba(248,113,113,0.45)', bg: 'rgba(239,68,68,0.14)' },
  amber: { color: '#fcd34d', border: 'rgba(251,191,36,0.45)', bg: 'rgba(245,158,11,0.12)' },
  green: { color: '#6ee7b7', border: 'rgba(52,211,153,0.4)', bg: 'rgba(16,185,129,0.12)' },
  none: { color: 'var(--gf-muted)', border: 'var(--gf-border)', bg: 'transparent' },
};

/** Red under 7 days, amber under 21, green beyond. */
export function DeadlineChip({ deadline }: { deadline: string | null }) {
  const tone = deadlineTone(deadline);
  const s = DEADLINE_STYLE[tone];
  return (
    <span
      className="pill"
      title={deadline ?? 'No deadline recorded'}
      style={{ color: s.color, borderColor: s.border, background: s.bg }}
    >
      {tone === 'red' ? '◆' : tone === 'amber' ? '◈' : tone === 'green' ? '◇' : '—'}{' '}
      {deadlineLabel(deadline)}
    </span>
  );
}

const STATE_STYLE: Record<ReviewState, { color: string; border: string; bg: string }> = {
  drafting: { color: '#94a3b8', border: 'rgba(148,163,184,0.35)', bg: 'rgba(148,163,184,0.10)' },
  in_audit: { color: '#fcd34d', border: 'rgba(251,191,36,0.45)', bg: 'rgba(245,158,11,0.12)' },
  ready: { color: '#6ee7b7', border: 'rgba(52,211,153,0.5)', bg: 'rgba(16,185,129,0.14)' },
  submitted: { color: 'var(--cl-gold)', border: 'rgba(231,193,135,0.5)', bg: 'rgba(231,193,135,0.12)' },
};

export function ReviewStatePill({ state }: { state: ReviewState }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.drafting;
  return (
    <span className="pill" style={{ color: s.color, borderColor: s.border, background: s.bg }}>
      {REVIEW_STATE_LABEL[state] ?? state}
    </span>
  );
}

const ROUND_MARK: Record<RoundState, { glyph: string; color: string; title: string }> = {
  pass: { glyph: '●', color: '#34d399', title: 'Passed' },
  fail: { glyph: '●', color: '#f87171', title: 'Failed' },
  waived: { glyph: '◐', color: '#c4b5fd', title: 'Waived' },
  stale: { glyph: '◍', color: '#fcd34d', title: 'Passed, then the draft was edited — re-run' },
  pending: { glyph: '○', color: '#64748b', title: 'Not yet run' },
};

/** Four dots: the audit at a glance, without opening the card. */
export function AuditStrip({
  states,
}: {
  states: { key: string; label: string; no: number; state: RoundState }[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {states.map((r) => {
        const m = ROUND_MARK[r.state];
        return (
          <span
            key={r.key}
            title={`Round ${r.no} · ${r.label} — ${m.title}`}
            style={{ color: m.color, fontSize: 13, lineHeight: 1 }}
          >
            {m.glyph}
          </span>
        );
      })}
      <span style={{ color: 'var(--gf-muted)', fontSize: 11, marginLeft: 3 }}>
        {states.filter((r) => r.state === 'pass' || r.state === 'waived').length}/{states.length}
      </span>
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    pass: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.14)', border: 'rgba(52,211,153,0.5)' },
    fail: { color: '#fca5a5', bg: 'rgba(239,68,68,0.14)', border: 'rgba(248,113,113,0.45)' },
    waived: { color: '#c4b5fd', bg: 'rgba(124,58,237,0.12)', border: 'rgba(167,139,250,0.45)' },
  };
  const s = map[verdict] ?? map.fail;
  return (
    <span className="pill" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {verdict.toUpperCase()}
    </span>
  );
}

export const SEVERITY_COLOR: Record<string, string> = {
  blocker: '#fca5a5',
  warning: '#fcd34d',
  note: '#8aa79a',
};
