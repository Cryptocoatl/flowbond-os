'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuditFinding, AuditRound } from '@/lib/types';
import { canAdvanceToReady, latestByRound, roundState } from '@/lib/review';
import { AuditStrip, DeadlineChip, ReviewStatePill } from '@/app/components/review-ui';
import { FitMeter, LayerPill } from '@/app/components/ui';
import { ReviewCardData } from './load';
import DraftSections, { FindingsBySection } from './DraftSections';
import AuditPanel from './AuditPanel';
import SubmissionBlock from './SubmissionBlock';
import AuditTrail from './AuditTrail';

type Tab = 'draft' | 'audit' | 'submit' | 'trail';

/** Findings from the freshest verdict of each round, bucketed by section. */
function collectFindings(card: ReviewCardData, rounds: AuditRound[]): FindingsBySection {
  const out: FindingsBySection = new Map();
  const latest = latestByRound(card.results);
  for (const round of rounds) {
    const res = latest.get(round.key);
    if (!res || res.verdict === 'pass') continue;
    for (const f of res.findings as AuditFinding[]) {
      const key = f.section_key ?? '';
      const list = out.get(key) ?? [];
      list.push({ ...f, round: round.label });
      out.set(key, list);
    }
  }
  return out;
}

export default function DraftReviewCard({
  card,
  rounds,
  defaultOpen = false,
  showLink = true,
}: {
  card: ReviewCardData;
  rounds: AuditRound[];
  defaultOpen?: boolean;
  showLink?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>('draft');

  const ready = canAdvanceToReady(rounds, card.results, card.sections);
  const submitted = card.reviewState === 'submitted';
  const strip = rounds.map((r) => ({
    key: r.key,
    label: r.label,
    no: r.round_no,
    state: roundState(r, card.results, card.sections),
  }));
  const findings = collectFindings(card, rounds);
  const blockers = [...findings.values()].flat().filter((f) => f.severity === 'blocker').length;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'draft', label: `Draft (${card.sections.length})` },
    { id: 'audit', label: blockers ? `Audit · ${blockers}` : 'Audit' },
    { id: 'submit', label: 'Submission' },
    { id: 'trail', label: `Trail (${card.results.length})` },
  ];

  return (
    <div className="gf-card" style={{ padding: '11px 13px' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {card.grantId && showLink ? (
            <Link
              href={`/grants/${card.grantId}`}
              className="link"
              style={{ fontWeight: 600, fontSize: 14 }}
            >
              {card.grantName}
            </Link>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 14 }}>{card.grantName}</span>
          )}
          {card.organization && (
            <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 1 }}>
              {card.organization}
            </div>
          )}
          {card.projectName && (
            <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 2 }}>
              → {card.projectName}
            </div>
          )}
        </div>
        {card.layer && <LayerPill layer={card.layer} />}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 9,
        }}
      >
        <FitMeter score={card.fitScore} />
        <DeadlineChip deadline={card.deadline} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 8,
        }}
      >
        <ReviewStatePill state={card.reviewState} />
        <AuditStrip states={strip} />
      </div>

      {card.amountRequested && (
        <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 6 }}>
          Asking {card.amountRequested}
        </div>
      )}

      <button
        className="gf-btn"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          justifyContent: 'center',
          fontSize: 12,
          marginTop: 10,
          background: 'transparent',
        }}
      >
        {open ? 'Collapse' : 'Open draft review'}
      </button>

      {/* ── Body ───────────────────────────────────────── */}
      {open && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: 'flex',
              gap: 4,
              borderBottom: '1px solid var(--gf-border)',
              paddingBottom: 6,
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? 'var(--gf-panel-2)' : 'transparent',
                  border: '1px solid',
                  borderColor: tab === t.id ? 'var(--gf-border-strong)' : 'transparent',
                  borderRadius: 5,
                  color: tab === t.id ? 'var(--gf-text)' : 'var(--gf-muted)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '3px 8px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'draft' && (
            <DraftSections
              applicationId={card.id}
              sections={card.sections}
              findings={findings}
              openQuestions={card.openQuestions}
              locked={submitted}
            />
          )}
          {tab === 'audit' && (
            <AuditPanel
              applicationId={card.id}
              rounds={rounds}
              results={card.results}
              sections={card.sections}
              locked={submitted}
            />
          )}
          {tab === 'submit' && <SubmissionBlock card={card} ready={ready} />}
          {tab === 'trail' && (
            <AuditTrail rounds={rounds} results={card.results} sections={card.sections} />
          )}

          {showLink && (
            <Link
              href={`/review/${card.id}`}
              className="link"
              style={{ display: 'inline-block', fontSize: 11, marginTop: 10 }}
            >
              Open full workspace →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
