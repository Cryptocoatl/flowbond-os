'use client';

import { useMemo, useState } from 'react';
import { AuditRound, REVIEW_STATES, REVIEW_STATE_LABEL, ReviewState } from '@/lib/types';
import { daysUntil } from '@/lib/review';
import { ReviewCardData } from './load';
import DraftReviewCard from './DraftReviewCard';

type Sort = 'deadline' | 'fit';

export default function ReviewBoard({
  cards,
  rounds,
}: {
  cards: ReviewCardData[];
  rounds: AuditRound[];
}) {
  const [sort, setSort] = useState<Sort>('deadline');

  const sorted = useMemo(() => {
    const copy = [...cards];
    if (sort === 'fit') {
      copy.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
    } else {
      // Soonest first; anything without a deadline sinks to the bottom.
      copy.sort((a, b) => {
        const da = daysUntil(a.deadline);
        const db = daysUntil(b.deadline);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    }
    return copy;
  }, [cards, sort]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <span style={{ color: 'var(--gf-muted)', fontSize: 12 }}>Sort by</span>
        <select
          className="gf-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          style={{ fontSize: 12 }}
        >
          <option value="deadline">Deadline — soonest first</option>
          <option value="fit">Fit score — highest first</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${REVIEW_STATES.length}, minmax(280px, 1fr))`,
          gap: 12,
          marginTop: 16,
          overflowX: 'auto',
          alignItems: 'start',
          paddingBottom: 14,
        }}
      >
        {REVIEW_STATES.map((state) => {
          const items = sorted.filter((c) => c.reviewState === state);
          return (
            <section
              key={state}
              className="gf-card"
              style={{ background: 'transparent', padding: 10 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {REVIEW_STATE_LABEL[state as ReviewState]}
                </span>
                <span style={{ color: 'var(--gf-muted)', fontSize: 12 }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((c) => (
                  <DraftReviewCard key={c.id} card={c} rounds={rounds} />
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
