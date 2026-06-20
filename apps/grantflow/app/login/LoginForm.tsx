'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    const e = email.trim().toLowerCase();
    if (!e) { setErr('Enter your email'); return; }
    setBusy(true); setErr(null);
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await sb.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not send the link');
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--cl-gold)', marginBottom: 6 }}>✦ Check your email</div>
        <p style={{ color: 'var(--gf-muted)', fontSize: 14 }}>
          ClaudIA sent a sign-in link to <strong style={{ color: 'var(--gf-text)' }}>{email}</strong>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        className="gf-input"
        type="email"
        placeholder="you@flowbond.life"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        autoFocus
      />
      {err && <div style={{ color: '#fca5a5', fontSize: 12 }}>{err}</div>}
      <button className="cl-btn" onClick={send} disabled={busy} style={{ justifyContent: 'center' }}>
        {busy ? 'Sending…' : '✦ Send me a sign-in link'}
      </button>
      <p style={{ color: 'var(--gf-muted)', fontSize: 12, textAlign: 'center', margin: 0 }}>
        Your FlowBond identity. Access is by invitation or membership.
      </p>
    </div>
  );
}
