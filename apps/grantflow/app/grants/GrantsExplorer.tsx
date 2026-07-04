'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Grant, LAYERS, LAYER_LABEL } from '@/lib/types';
import { LayerPill, StatusPill, FitMeter, Effort } from '../components/ui';

export type GrantRow = Grant & { matchCount: number };

const STATUSES = ['open', 'rolling', 'upcoming', 'round-based'];
type Sort = 'fit' | 'deadline' | 'name';

export default function GrantsExplorer({
  rows,
  initialLayer,
  initialStatus,
}: {
  rows: GrantRow[];
  initialLayer?: string;
  initialStatus?: string;
}) {
  const [q, setQ] = useState('');
  const [layer, setLayer] = useState(initialLayer ?? 'all');
  const [status, setStatus] = useState(initialStatus ?? 'all');
  const [sort, setSort] = useState<Sort>('fit');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [noEquity, setNoEquity] = useState(false);

  const filtered = useMemo(() => {
    let r = rows.slice();
    if (layer !== 'all') r = r.filter((g) => g.layers?.includes(layer));
    if (status !== 'all') r = r.filter((g) => g.status === status);
    if (onlyVerified) r = r.filter((g) => g.verified);
    if (noEquity) r = r.filter((g) => g.tags?.includes('no-equity'));
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(
        (g) =>
          g.name.toLowerCase().includes(s) ||
          (g.organization ?? '').toLowerCase().includes(s) ||
          (g.notes ?? '').toLowerCase().includes(s) ||
          g.tags?.some((t) => t.includes(s)) ||
          g.chains?.some((c) => c.includes(s)),
      );
    }
    r.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'deadline') {
        const ad = a.deadline_date ?? '9999';
        const bd = b.deadline_date ?? '9999';
        return ad.localeCompare(bd);
      }
      return (b.fit_score ?? 0) - (a.fit_score ?? 0);
    });
    return r;
  }, [rows, q, layer, status, sort, onlyVerified, noEquity]);

  return (
    <main className="gf-wrap gf-rise" style={{ padding: '28px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 30, margin: 0 }}>
          Grants
        </h1>
        <span style={{ color: 'var(--gf-muted)', fontSize: 14 }}>
          {filtered.length} of {rows.length} shown
        </span>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          margin: '16px 0 22px',
        }}
      >
        <input
          className="gf-input"
          placeholder="Search name, org, chain, tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select className="gf-select" value={layer} onChange={(e) => setLayer(e.target.value)}>
          <option value="all">All layers</option>
          {LAYERS.map((l) => (
            <option key={l} value={l}>
              {LAYER_LABEL[l]}
            </option>
          ))}
        </select>
        <select className="gf-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="gf-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="fit">Sort: best fit</option>
          <option value="deadline">Sort: deadline</option>
          <option value="name">Sort: name</option>
        </select>
        <label className="gf-tag" style={{ display: 'flex', gap: 6, cursor: 'pointer', padding: '6px 8px' }}>
          <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} />
          verified
        </label>
        <label className="gf-tag" style={{ display: 'flex', gap: 6, cursor: 'pointer', padding: '6px 8px' }}>
          <input type="checkbox" checked={noEquity} onChange={(e) => setNoEquity(e.target.checked)} />
          no-equity
        </label>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 14 }}>
        {filtered.map((g) => (
          <Link key={g.id} href={`/grants/${g.id}`} className="gf-card link">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <StatusPill status={g.status} />
              <FitMeter score={g.fit_score} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
              {g.name} {!g.verified && <span title="unverified" style={{ opacity: 0.6 }}>⚠️</span>}
            </div>
            <div style={{ color: 'var(--gf-muted)', fontSize: 13 }}>{g.organization}</div>
            <div style={{ color: 'var(--gf-text)', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
              💰 {g.funding_amount}
            </div>
            <div style={{ color: 'var(--gf-muted)', fontSize: 12, marginTop: 4 }}>🗓 {g.deadline}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              {g.layers?.map((l) => <LayerPill key={l} layer={l} />)}
              <Effort level={g.effort_level} />
              {g.matchCount > 0 && (
                <span className="gf-tag" style={{ color: 'var(--gf-emerald)' }}>
                  {g.matchCount} project{g.matchCount > 1 ? 's' : ''} fit
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ color: 'var(--gf-muted)', marginTop: 40, textAlign: 'center' }}>
          No grants match these filters.
        </p>
      )}
    </main>
  );
}
