'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Deal } from '@/lib/types';
import { apiUrl } from '@/lib/path';

export function CounselActions({
  deal,
  allPhaseBConfirmed,
}: {
  deal: Deal;
  allPhaseBConfirmed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call(endpoint: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'failed');
      return;
    }
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Counsel controls</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#9fb0a4', lineHeight: 1.5 }}>
        Counsel gates the closing. Approval is required before release even when every checkpoint
        is green.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {deal.status === 'draft' && (
          <button className="btn btn-ghost" disabled={busy} onClick={() => call('/api/counsel/open-transfers')}>
            Open transfer phase
          </button>
        )}
        {!deal.counsel_approved && deal.status === 'signed_pending_transfers' && (
          <button className="btn btn-gold" disabled={busy} onClick={() => call('/api/counsel/approve')}>
            Record counsel approval
          </button>
        )}
        {deal.counsel_approved && <span className="pill" style={{ color: '#8FA98F' }}>approved</span>}
        {deal.status === 'cleared' && (
          <button className="btn btn-gold" disabled={busy} onClick={() => call('/api/release')}>
            Release documents
          </button>
        )}
      </div>
      {deal.counsel_approved && !allPhaseBConfirmed && deal.status !== 'cleared' && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#C9A961' }}>
          Approval recorded — the deal will clear automatically once every Phase-B transfer is
          confirmed.
        </p>
      )}
      {err && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#d98c7a' }}>{err}</p>}
    </div>
  );
}
