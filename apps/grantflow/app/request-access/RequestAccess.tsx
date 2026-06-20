'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function RequestAccess({ email }: { email: string | null }) {
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    await fetch('/api/access/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note }),
    }).catch(() => {});
    setSent(true);
    setBusy(false);
  }

  async function signOut() {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await sb.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {sent ? (
        <div style={{ color: 'var(--cl-gold)', fontSize: 14 }}>✦ Request sent. ClaudIA will reach out.</div>
      ) : (
        <>
          <textarea
            className="gf-input"
            rows={2}
            placeholder="A word on who you are / why (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="cl-btn" onClick={request} disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? 'Sending…' : 'Request access'}
          </button>
        </>
      )}
      <button className="gf-btn" onClick={signOut} style={{ background: 'transparent', justifyContent: 'center' }}>
        Sign out
      </button>
    </div>
  );
}
