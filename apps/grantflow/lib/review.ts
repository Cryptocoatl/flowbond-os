import { AuditResult, AuditRound, DraftSection, ReviewState } from './types';

/**
 * Client/server-shared gate logic. This mirrors grantflow.audit_gate() in
 * 20260725_draft_review_audit.sql — the database is the enforcer, this is so the
 * UI can explain *why* a card can't advance without a round trip.
 */

/** Latest result per round, newest first. */
export function latestByRound(results: AuditResult[]): Map<string, AuditResult> {
  const out = new Map<string, AuditResult>();
  for (const r of [...results].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    out.set(r.round_key, r);
  }
  return out;
}

/** The moment the document last changed. Any verdict older than this is stale. */
export function lastEditedAt(sections: DraftSection[]): string | null {
  if (!sections.length) return null;
  return sections.reduce((max, s) => (s.updated_at > max ? s.updated_at : max), sections[0].updated_at);
}

export type RoundState = 'pending' | 'pass' | 'fail' | 'waived' | 'stale';

export function roundState(
  round: AuditRound,
  results: AuditResult[],
  sections: DraftSection[],
): RoundState {
  const latest = latestByRound(results).get(round.key);
  if (!latest) return 'pending';
  const edited = lastEditedAt(sections);
  // A pass earned before the last edit no longer describes this document.
  if (edited && latest.created_at < edited && latest.verdict !== 'fail') return 'stale';
  return latest.verdict;
}

/** True when every active+required round holds a fresh pass (or waiver). */
export function canAdvanceToReady(
  rounds: AuditRound[],
  results: AuditResult[],
  sections: DraftSection[],
): boolean {
  return rounds
    .filter((r) => r.active && r.required)
    .every((r) => {
      const s = roundState(r, results, sections);
      return s === 'pass' || s === 'waived';
    });
}

/** Human-readable reason the card is stuck, or null when it can advance. */
export function blockedReason(
  rounds: AuditRound[],
  results: AuditResult[],
  sections: DraftSection[],
): string | null {
  const blocking = rounds
    .filter((r) => r.active && r.required)
    .map((r) => ({ round: r, state: roundState(r, results, sections) }))
    .filter(({ state }) => state !== 'pass' && state !== 'waived');
  if (!blocking.length) return null;

  const stale = blocking.filter(({ state }) => state === 'stale');
  if (stale.length === blocking.length) {
    return `Sections were edited after the last audit — re-run ${stale.map((b) => b.round.label).join(', ')}.`;
  }
  const failed = blocking.filter(({ state }) => state === 'fail');
  const pending = blocking.filter(({ state }) => state === 'pending');
  const parts: string[] = [];
  if (failed.length) parts.push(`${failed.map((b) => b.round.label).join(', ')} failed`);
  if (pending.length) parts.push(`${pending.map((b) => b.round.label).join(', ')} not yet run`);
  if (stale.length) parts.push(`${stale.map((b) => b.round.label).join(', ')} went stale after an edit`);
  return `${parts.join('; ')}.`;
}

/** The state a draft should sit in, given its audit history. Never returns 'submitted'. */
export function deriveReviewState(
  current: ReviewState,
  rounds: AuditRound[],
  results: AuditResult[],
  sections: DraftSection[],
): ReviewState {
  if (current === 'submitted') return 'submitted'; // only a human moves it here, and it stays
  if (canAdvanceToReady(rounds, results, sections)) return 'ready';
  return results.length ? 'in_audit' : 'drafting';
}

// ── Deadlines ─────────────────────────────────────────────────

export type DeadlineTone = 'red' | 'amber' | 'green' | 'none';

export function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const then = new Date(`${deadline}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  const today = new Date();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((then - now) / 86_400_000);
}

export function deadlineTone(deadline: string | null): DeadlineTone {
  const d = daysUntil(deadline);
  if (d === null) return 'none';
  if (d < 7) return 'red';
  if (d < 21) return 'amber';
  return 'green';
}

export function deadlineLabel(deadline: string | null): string {
  const d = daysUntil(deadline);
  if (d === null) return 'No deadline';
  if (d < 0) return `Closed ${Math.abs(d)}d ago`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `${d}d left`;
}

export function wordCount(body: string): number {
  const trimmed = body.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
